const db = require('../config/db');
const RecetaService = require('./recetaService');
const logger = require('../config/logger');
const orderEngine = require('./orderEngineService');
const PedidoModel = require('../models/pedidoModel');
const STATUS = require('../config/orderStatus');

const pedidoService = { 

    // Agrega producto a un pedido
    agregarProducto: async (
        idPedido,
        idPlatillo,
        cantidad = 1,
        notas = null
    ) => {

        const pedido = await PedidoModel.getById(idPedido);

        if (!pedido)
            throw new Error('Pedido inexistente');

        if (!orderEngine.canEditOrder(pedido.estado_pedido)) {
            throw new Error('El pedido no admite modificaciones.');
        }

        await db.query(
            `INSERT INTO detalles_pedido
            (id_pedido, id_platillo, cantidad, notas_especiales, estado_item)
            VALUES (?, ?, ?, ?, ?)`,
            [idPedido, idPlatillo, cantidad, notas, STATUS.ITEM.EN_ESPERA]
        );

        return true;
    },

    // Cambia el estado de un pedido
    cambiarEstadoPedido: async (idPedido, nuevoEstado) => {
        const pedido = await PedidoModel.getById(idPedido);
        if (!pedido) {
            throw new Error('Pedido no encontrado.');
        }

        orderEngine.validateOrderStatus(pedido.estado_pedido, nuevoEstado);
        return await PedidoModel.updateEstadoPedido(idPedido, nuevoEstado);
    },

    // Cambia el estado de un item
    cambiarEstadoItem: async (idDetalle, nuevoEstado) => {
        const item = await PedidoModel.getDetalleById(idDetalle);
        if (!item) {
            throw new Error('Detalle no encontrado.');
        }

        orderEngine.validateItemStatus(item.estado_item, nuevoEstado);
        return await PedidoModel.updateEstadoItem(idDetalle, nuevoEstado);
    },

    // Obtener pedidos en consumo
    obtenerTodosActivos: async () => {
        const [rows] = await db.query(
            `SELECT p.*, m.numero AS numero_mesa, u.nombre AS mesero 
             FROM pedidos p
             INNER JOIN mesas m ON p.id_mesa = m.id
             LEFT JOIN usuarios u ON p.id_usuario_mesero = u.id
             WHERE p.fecha_cierre IS NULL`
        );
        return rows;
    },

    // Extracción de detalles mapeando los identificadores de la orden
    obtenerPorId: async (id) => {
        const [pedidoRow] = await db.query(
            `SELECT p.*, m.numero AS numero_mesa, u.nombre AS mesero 
             FROM pedidos p
             INNER JOIN mesas m ON p.id_mesa = m.id
             LEFT JOIN usuarios u ON p.id_usuario_mesero = u.id
             WHERE p.id = ?`, [id]
        );
        
        if (pedidoRow.length === 0) return null;

        const [detalles] = await db.query(
            `SELECT dp.id AS id_detalle, dp.id_pedido, dp.id_platillo, dp.cantidad, dp.estado_item, dp.afecta_inventario,
                    pl.nombre AS nombre_platillo 
             FROM detalles_pedido dp
             INNER JOIN platillos_menu pl ON dp.id_platillo = pl.id
             WHERE dp.id_pedido = ?`, [id]
        );

        // Agregamos la lógica para traer los modificadores por cada detalle
        for (let item of detalles) {
            const [mods] = await db.query(
                `SELECT mm.nombre, mm.tipo 
                 FROM detalles_pedido_modificadores dpm
                 INNER JOIN modificadores_menu mm ON dpm.modificador_id = mm.id
                 WHERE dpm.detalle_pedido_id = ?`,
                [item.id_detalle]
            );
            item.modificadores = mods; // Esto inyecta el array en el objeto para la vista
        }

        const pedido = pedidoRow[0];
        pedido.detalles = detalles;
        return pedido;
    },

    // Iniciar el servicio e indicar que la mesa está ocupada
    crearNuevoPedido: async (id_mesa, id_usuario_mesero, turno_servicio_id, comensales = null) => {
        if (!id_usuario_mesero) {
            throw new Error('Se requiere un usuario mesero válido (sesión activa) para abrir la mesa.');
        }
        if (!turno_servicio_id) {
            throw new Error('No hay un turno de servicio activo para asociar el pedido.');
        }

        const connection = await db.getConnection();
        const [mesa] = await connection.query(`SELECT estado FROM mesas WHERE id=?`, [id_mesa]);

        if (mesa.length === 0) throw new Error('Mesa inexistente');
        if (mesa[0].estado !== STATUS.MESA.LIBRE) throw new Error('La mesa ya posee un pedido activo.');

        try {
            await connection.beginTransaction();
            // FIX: se usa PedidoModel.create(), que ya insertaba correctamente
            // (id_mesa, id_usuario_mesero, turno_servicio_id, creado_en) según el
            // esquema real de la tabla `pedidos`. El INSERT manual anterior usaba
            // una columna 'fecha_apertura' inexistente y omitía dos campos NOT NULL.
            const nuevoId = await PedidoModel.create(id_mesa, id_usuario_mesero, turno_servicio_id, connection, comensales);
            await PedidoModel.actualizarEstadoMesa(id_mesa, STATUS.MESA.OCUPADA, connection);
            await connection.commit();
            return nuevoId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    // Procesa el bloque completo de la orden usando el modelo actualizado para modificadores
    adicionarOrdenLote: async (id_pedido, items, externalConn = null) => {
        // items espera una estructura: { id_platillo, cantidad, modificadores: [] }
        for (const item of items) {
            await PedidoModel.addDetailWithModifiers(
                id_pedido,
                item.id_platillo,
                item.cantidad,
                item.modificadores || [],
                externalConn || db
            );
        }
        return true;
    },

    // Cierre estándar de cuenta con descuento de inventario
    procesarCierreFinanciero: async (id_pedido, id_usuario_cajero) => {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const [pedido] = await connection.query("SELECT id_mesa FROM pedidos WHERE id = ?", [id_pedido]);
            if (pedido.length === 0) throw new Error('Pedido no encontrado');

            // Se incluye `es_platillo_dia`: los platillos del día viven en otra
            // tabla, no tienen receta y sus IDs pueden colisionar con los de
            // platillos_menu. Sin esta bandera se explotaría la receta equivocada.
            const [detalles] = await connection.query(
                `SELECT id_platillo, es_platillo_dia, cantidad FROM detalles_pedido 
                 WHERE id_pedido = ? 
                   AND estado_item != 'cancelado'
                   AND (afecta_inventario = 1 OR afecta_inventario IS NULL)`, [id_pedido]
            );

            if (detalles.length > 0) {
                try {
                    // El almacén se resuelve por platillo dentro del servicio: siempre un
                    // almacén de PRODUCCIÓN (el logístico nunca se descuenta por venta).
                    await RecetaService.descontarStockPedido(detalles, null, id_pedido, id_usuario_cajero);
                    logger.info(`Stock descontado para pedido ${id_pedido} desde almacenes de producción`);
                } catch (error) {
                    logger.error(`Error al descontar stock para pedido ${id_pedido}:`, error);
                }
            }

            await connection.query(
                `UPDATE pedidos SET fecha_cierre = NOW(), id_usuario_cajero = ? WHERE id = ?`, 
                [id_usuario_cajero, id_pedido]
            );

            await connection.query("UPDATE mesas SET estado = ? WHERE id = ?", [STATUS.MESA.DESOCUPANDOSE, pedido[0].id_mesa]);
            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    // Control centralizado de cancelaciones y alteración de stocks
    procesarCancelacionFlujo: async (id_pedido, productosAfectados, motivo, id_usuario) => {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const [pedidoRows] = await connection.query("SELECT id_mesa FROM pedidos WHERE id = ?", [id_pedido]);
            if (pedidoRows.length === 0) throw new Error('Pedido no encontrado.');
            const id_mesa = pedidoRows[0].id_mesa;

            for (const item of productosAfectados) {
                const [detalleRows] = await connection.query(
                    'SELECT id_platillo, cantidad FROM detalles_pedido WHERE id = ?', [item.id_detalle]
                );
                
                if (detalleRows.length > 0) {
                    const actualItem = detalleRows[0];
                    if (item.accion === 'reingresar') {
                        await connection.query(`UPDATE detalles_pedido SET estado_item = 'cancelado', afecta_inventario = 0 WHERE id = ?`, [item.id_detalle]);
                        await connection.query(`UPDATE inventario SET stock = stock + ? WHERE id_platillo = ?`, [actualItem.cantidad, actualItem.id_platillo]);
                    } else {
                        await connection.query(`UPDATE detalles_pedido SET estado_item = 'cancelado', afecta_inventario = 1 WHERE id = ?`, [item.id_detalle]);
                        await connection.query(`INSERT INTO mermas_auditoria (id_pedido, id_platillo, cantidad, motivo, id_usuario, fecha_registro) VALUES (?, ?, ?, ?, ?, NOW())`,
                            [id_pedido, actualItem.id_platillo, actualItem.cantidad, motivo, id_usuario]
                        );
                    }
                }
            }

            const [restantes] = await connection.query(`SELECT COUNT(*) as activos FROM detalles_pedido WHERE id_pedido = ? AND estado_item != 'cancelado'`, [id_pedido]);

            if (restantes[0].activos === 0) {
                await connection.query(`UPDATE pedidos SET fecha_cierre = NOW(), id_usuario_cajero = ? WHERE id = ?`, [id_usuario, id_pedido]);
                await connection.query("UPDATE mesas SET estado = ? WHERE id = ?", [STATUS.MESA.DESOCUPANDOSE, id_mesa]);
            }

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }

    },

    /**
     * Reporte de Pedidos/Ventas por rango de fechas (vista profesional).
     * Devuelve pedidos enriquecidos + desglose de ítems (con tiempos de entrega
     * y elaborador) + desglose de pagos por moneda + KPIs + turnos del rango.
     */
    obtenerPedidosPorRango: async (desde, hasta) => {
        const [pedidos] = await db.query(`
            SELECT 
                p.id, p.id_mesa, m.numero AS mesa_numero,
                p.cliente_nombre, p.comensales,
                p.estado_pedido, p.estado_pago,
                p.subtotal, p.descuento, p.impuesto, p.total, p.propina,
                p.excedente_cobro,
                p.creado_en, p.fecha_cierre,
                p.turno_servicio_id, ts.estado AS turno_estado,
                CONCAT(um.nombre, ' ', um.apellidos) AS mesero,
                CONCAT(uc.nombre, ' ', uc.apellidos) AS cajero,
                CONCAT(uco.nombre, ' ', uco.apellidos) AS cocinero_turno,
                TIMESTAMPDIFF(SECOND, p.creado_en, COALESCE(p.fecha_cierre, NOW())) AS duracion_seg,
                (SELECT COUNT(*) FROM detalles_pedido d WHERE d.id_pedido = p.id) AS items_total,
                (SELECT COUNT(*) FROM detalles_pedido d WHERE d.id_pedido = p.id AND d.estado_item = 'entregado') AS items_entregados,
                (SELECT COUNT(*) FROM detalles_pedido d WHERE d.id_pedido = p.id AND d.estado_item = 'cancelado') AS items_cancelados
            FROM pedidos p
            LEFT JOIN mesas m ON p.id_mesa = m.id
            LEFT JOIN usuarios um ON p.id_usuario_mesero = um.id
            LEFT JOIN usuarios uc ON p.id_usuario_cajero = uc.id
            LEFT JOIN turnos_servicio ts ON p.turno_servicio_id = ts.id
            LEFT JOIN usuarios uco ON ts.cocinero_id = uco.id
            WHERE DATE(p.creado_en) BETWEEN ? AND ?
            ORDER BY p.creado_en DESC
        `, [desde, hasta]);

        const ids = pedidos.map(p => p.id);
        let itemsPorPedido = {};
        let pagosPorPedido = {};

        if (ids.length > 0) {
            const [items] = await db.query(`
                SELECT 
                    d.id_pedido, d.cantidad, d.precio_unitario, d.estado_item,
                    d.notas_especiales, d.creado_en, d.entregado_en,
                    TIMESTAMPDIFF(SECOND, d.creado_en, d.entregado_en) AS entrega_seg,
                    COALESCE(pd.nombre, pm.nombre, 'Ítem') AS nombre,
                    CONCAT(ue.nombre, ' ', ue.apellidos) AS cocinero
                FROM detalles_pedido d
                LEFT JOIN platillos_menu pm ON (d.es_platillo_dia = 0 OR d.es_platillo_dia IS NULL) AND pm.id = d.id_platillo
                LEFT JOIN platillos_dia pd ON d.es_platillo_dia = 1 AND pd.id = d.id_platillo
                LEFT JOIN usuarios ue ON d.usuario_elaboro_id = ue.id
                WHERE d.id_pedido IN (?)
                ORDER BY d.id_pedido, d.id ASC
            `, [ids]);
            itemsPorPedido = items.reduce((acc, it) => { (acc[it.id_pedido] = acc[it.id_pedido] || []).push(it); return acc; }, {});

        const [pagos] = await db.query(`
                SELECT pp.pedido_id, mo.codigo, mo.simbolo,
                       SUM(pp.monto_moneda_origen) AS monto,
                       GROUP_CONCAT(DISTINCT pp.metodo_pago SEPARATOR '+') AS metodos
                FROM pagos_pedido pp
                LEFT JOIN monedas mo ON pp.moneda_id = mo.id
                WHERE pp.pedido_id IN (?)
                GROUP BY pp.pedido_id, mo.codigo, mo.simbolo
            `, [ids]);
            // «Elaboró» = cocinero del turno (fallback al estampado)
            const cocineroPorPedido = {};
            pedidos.forEach(p => { cocineroPorPedido[p.id] = p.cocinero_turno || null; });
            Object.keys(itemsPorPedido).forEach(pid => {
                if (!cocineroPorPedido[pid]) return;
                itemsPorPedido[pid].forEach(it => { it.cocinero = cocineroPorPedido[pid]; });
            });
            
            pagosPorPedido = pagos.reduce((acc, pg) => { (acc[pg.pedido_id] = acc[pg.pedido_id] || []).push(pg); return acc; }, {});
        }

        const kpis = pedidos.reduce((acc, p) => {
            acc.total++;
            const total = parseFloat(p.total || 0);
            if (p.estado_pedido === 'cancelado') { acc.cancelados++; return acc; }
            if (['pagado', 'facturado', 'cortesia', 'pendiente_pago'].includes(p.estado_pago)) {
                acc.cobrados++;
                acc.ventas += (p.estado_pago === 'cortesia' ? 0 : total);
                acc.propinas += parseFloat(p.propina || 0);
                acc.excedentes += parseFloat(p.excedente_cobro || 0);
            } else {
                acc.en_curso++;
                acc.en_curso_importe += total;
            }
            return acc;
        }, { total: 0, cobrados: 0, en_curso: 0, cancelados: 0, ventas: 0, propinas: 0, excedentes: 0, en_curso_importe: 0 });

        kpis.ticket_promedio = kpis.cobrados > 0 ? kpis.ventas / kpis.cobrados : 0;

        const [turnos] = await db.query(`
            SELECT id, estado, fecha_apertura, fecha_cierre
            FROM turnos_servicio
            WHERE DATE(fecha_apertura) <= ?
              AND DATE(COALESCE(fecha_cierre, NOW())) >= ?
            ORDER BY id DESC
        `, [hasta, desde]);

        return { pedidos, itemsPorPedido, pagosPorPedido, kpis, turnos };
    },

    /**
     * Reporte completo de un pedido (vista de detalle/reporte independiente
     * del estado: en captura, en curso, entregado o pagado).
     */
    obtenerReportePedido: async (id) => {
        // La tabla ubicacion_mesa es opcional (migracion_ubicacion_mesa)
        let selUbic = 'm.ubicacion';
        let joinUbic = '';
        try {
            const [tablas] = await db.query("SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'ubicacion_mesa'");
            if (tablas[0].n > 0) {
                selUbic = 'COALESCE(um.nombre, m.ubicacion)';
                joinUbic = 'LEFT JOIN ubicacion_mesa um ON m.ubicacion_id = um.id';
            }
        } catch (e) { /*queda el fallback*/ }

        const [pedidos] = await db.query(`
            SELECT 
                p.id, p.id_mesa, m.numero AS mesa_numero, m.capacidad AS mesa_capacidad,
                ${selUbic} AS mesa_ubicacion,
                p.cliente_nombre, p.comensales,
                p.estado_pedido, p.estado_pago,
                p.subtotal, p.descuento, p.impuesto, p.total, p.propina,
                p.excedente_cobro,
                p.creado_en, p.fecha_cierre, p.fecha_precuenta,
                p.impresiones_precuenta, p.actualizado_en,
                p.turno_servicio_id, ts.estado AS turno_estado,
                ts.fecha_apertura AS turno_apertura, ts.fecha_cierre AS turno_cierre,
                CONCAT(um2.nombre, ' ', um2.apellidos) AS mesero,
                CONCAT(uc.nombre, ' ', uc.apellidos) AS cajero,
                CONCAT(uco.nombre, ' ', uco.apellidos) AS cocinero_turno,
                TIMESTAMPDIFF(SECOND, p.creado_en, COALESCE(p.fecha_cierre, NOW())) AS duracion_seg
            FROM pedidos p
            LEFT JOIN mesas m ON p.id_mesa = m.id
            LEFT JOIN turnos_servicio ts ON p.turno_servicio_id = ts.id
            LEFT JOIN usuarios um2 ON p.id_usuario_mesero = um2.id
            LEFT JOIN usuarios uc ON p.id_usuario_cajero = uc.id
            LEFT JOIN usuarios uco ON ts.cocinero_id = uco.id
            ${joinUbic}
            WHERE p.id = ?
            LIMIT 1
        `, [id]);
        if (pedidos.length === 0) return null;
        const pedido = pedidos[0];

        const [items] = await db.query(`
            SELECT 
                d.id, d.cantidad, d.precio_unitario, d.estado_item, d.notas_especiales,
                d.es_platillo_dia, d.afecta_inventario, d.creado_en, d.entregado_en,
                TIMESTAMPDIFF(SECOND, d.creado_en, d.entregado_en) AS entrega_seg,
                COALESCE(pd.nombre, pm.nombre, 'Ítem') AS nombre,
                CONCAT(ue.nombre, ' ', ue.apellidos) AS cocinero,
                (SELECT GROUP_CONCAT(mm.nombre SEPARATOR ', ')
                   FROM detalles_pedido_modificadores dpm
                   LEFT JOIN modificadores_menu mm ON dpm.modificador_id = mm.id
                  WHERE dpm.detalle_pedido_id = d.id) AS modificadores
            FROM detalles_pedido d
            LEFT JOIN platillos_menu pm ON (d.es_platillo_dia = 0 OR d.es_platillo_dia IS NULL) AND pm.id = d.id_platillo
            LEFT JOIN platillos_dia pd ON d.es_platillo_dia = 1 AND pd.id = d.id_platillo
            LEFT JOIN usuarios ue ON d.usuario_elaboro_id = ue.id
            WHERE d.id_pedido = ?
            ORDER BY d.id ASC
        `, [id]);
        // «Elaboró» = cocinero activo del turno (no quien marcó la entrega).
        // Fallback al estampado para turnos antiguos sin cocinero asignado.
        if (pedido.cocinero_turno) {
            items.forEach(it => { it.cocinero = pedido.cocinero_turno; });
        }

        const [pagos] = await db.query(`
            SELECT pp.id, pp.metodo_pago, pp.monto_moneda_origen, pp.monto_equivalente_local,
                   pp.factor_cambio_aplicado, pp.referencia_transaccion, pp.creado_en,
                   mo.codigo AS moneda_codigo, mo.simbolo AS moneda_simbolo, mo.nombre AS moneda_nombre
            FROM pagos_pedido pp
            LEFT JOIN monedas mo ON pp.moneda_id = mo.id
            WHERE pp.pedido_id = ?
            ORDER BY pp.id ASC
        `, [id]);

        // KPIs del pedido
        const entregados = items.filter(i => i.estado_item === 'entregado');
        const cancelados = items.filter(i => i.estado_item === 'cancelado');
        const enProceso  = items.filter(i => !['entregado','cancelado'].includes(i.estado_item));
        const tiemposEntrega = entregados.map(i => Number(i.entrega_seg)).filter(t => t !== null && !isNaN(t) && t >= 0);
        const kpis = {
            items_total: items.length,
            entregados: entregados.length,
            cancelados: cancelados.length,
            en_proceso: enProceso.length,
            importe_cancelado: cancelados.reduce((a, i) => a + parseFloat(i.precio_unitario) * i.cantidad, 0),
            entrega_media_seg: tiemposEntrega.length ? Math.round(tiemposEntrega.reduce((a, b) => a + b, 0) / tiemposEntrega.length) : null,
            entrega_max_seg: tiemposEntrega.length ? Math.max(...tiemposEntrega) : null
        };

        // Línea de tiempo (eventos con fecha conocida)
        const eventos = [];
        eventos.push({ t: pedido.creado_en, titulo: 'Apertura del servicio', detalle: 'Mesa ' + (pedido.mesa_numero || pedido.id_mesa) + ' · Turno #' + (pedido.turno_servicio_id || '—') });
        const rondas = {};
        items.forEach(i => {
            if (!i.creado_en) return;
            const k = new Date(i.creado_en).toISOString().slice(0, 16);
            rondas[k] = (rondas[k] || 0) + 1;
        });
        Object.keys(rondas).sort().forEach(k => {
            eventos.push({ t: new Date(k + ':00'), titulo: 'Ronda agregada a la comanda', detalle: rondas[k] + ' ítem(s)' });
        });
        if (entregados.length > 0) {
            const fechas = entregados.map(i => new Date(i.entregado_en)).filter(d => !isNaN(d)).sort((a, b) => a - b);
            if (fechas.length > 0) eventos.push({ t: fechas[0], titulo: 'Primera entrega en mesa', detalle: '' });
            if (fechas.length > 1) eventos.push({ t: fechas[fechas.length - 1], titulo: 'Última entrega en mesa', detalle: '' });
        }
        if (pedido.fecha_precuenta) eventos.push({ t: pedido.fecha_precuenta, titulo: 'Pre-cuenta impresa', detalle: 'Impresiones: ' + (pedido.impresiones_precuenta || 0) });
        if (pagos.length > 0) eventos.push({ t: pagos[0].creado_en, titulo: 'Primer pago registrado', detalle: (pagos[0].metodo_pago || '') + ' ' + (pagos[0].moneda_codigo || '') });
        if (pedido.fecha_cierre) eventos.push({ t: pedido.fecha_cierre, titulo: 'Cierre de la cuenta', detalle: 'Estado de pago: ' + pedido.estado_pago });
        eventos.sort((a, b) => new Date(a.t) - new Date(b.t));

        return { pedido, items, pagos, kpis, eventos };
    }
};

module.exports = pedidoService;