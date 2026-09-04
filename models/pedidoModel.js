const db = require('../config/db');
const PrecioService = require('../services/precioService');

class Pedido {

    // ------------------------------------------------------------------------
    // MÉTODOS DE CONSULTA (LECTURA)
    // ------------------------------------------------------------------------

    // Obtener un pedido rápido por ID (Solo datos de la tabla pedidos)
    static async getById(id) {
        const [rows] = await db.query(
            `SELECT * FROM pedidos WHERE id = ?`,
            [id]
        );
        return rows[0] || null;
    }

    // Obtener todos los pedidos activos (Para el POS y monitores de piso)
    static async fetchAllActive() {
        const query = `
            SELECT p.*, m.numero AS numero_mesa, u.usuario AS mesero 
            FROM pedidos p
            INNER JOIN mesas m ON p.id_mesa = m.id
            LEFT JOIN usuarios u ON p.id_usuario_mesero = u.id
            WHERE p.fecha_cierre IS NULL
            ORDER BY p.id DESC
        `;
        const [rows] = await db.query(query);
        return rows;
    }

    // Obtener el pedido COMPLETO: Datos generales + Detalles + Modificadores por ítem
    static async findById(id) {
        // 1. Obtener cabecera del pedido
        const queryPedido = `
            SELECT p.*, m.numero AS numero_mesa, u.usuario AS mesero 
            FROM pedidos p
            INNER JOIN mesas m ON p.id_mesa = m.id
            LEFT JOIN usuarios u ON p.id_usuario_mesero = u.id
            WHERE p.id = ?
        `;
        const [pedido] = await db.query(queryPedido, [id]);
        
        if (pedido.length === 0) return null;

        // 2. Obtener los platillos (detalles) del pedido
        const queryDetalles = `
            SELECT dp.*, COALESCE(pd.nombre, pm.nombre) AS nombre_platillo,
                   COALESCE(pm.precio, pd.precio) AS precio_catalogo
            FROM detalles_pedido dp
            LEFT JOIN platillos_menu pm ON dp.id_platillo = pm.id AND dp.es_platillo_dia = 0
            LEFT JOIN platillos_dia pd ON dp.id_platillo = pd.id AND dp.es_platillo_dia = 1
            WHERE dp.id_pedido = ?
        `;
        const [detalles] = await db.query(queryDetalles, [id]);

        // 3. Obtener los modificadores asociados a este pedido (si los hay)
        if (detalles.length > 0) {
            const detallesIds = detalles.map(d => d.id);
            const queryModificadores = `
                SELECT dpm.*, mm.nombre, mm.tipo, mm.precio_adicional
                FROM detalles_pedido_modificadores dpm
                INNER JOIN modificadores_menu mm ON dpm.modificador_id = mm.id
                WHERE dpm.detalle_pedido_id IN (?)
            `;
            const [modificadores] = await db.query(queryModificadores, [detallesIds]);

            // Mapear los modificadores dentro de su respectivo platillo en el array
            detalles.forEach(detalle => {
                detalle.modificadores = modificadores.filter(
                    m => m.detalle_pedido_id === detalle.id
                );
            });
        }
        
        pedido[0].detalles = detalles;
        return pedido[0];
    }

    // Obtener un detalle específico por su ID
    static async getDetalleById(idDetalle) {
        const [rows] = await db.query(
            `SELECT * FROM detalles_pedido WHERE id = ?`,
            [idDetalle]
        );
        return rows[0] || null;
    }

    // ------------------------------------------------------------------------
    // MÉTODOS DE ACTUALIZACIÓN DE ESTADOS
    // ------------------------------------------------------------------------

    // Actualizar estado general del pedido (ej. 'RECIBIDO', 'EN_PREPARACION', 'LISTO')
    static async updateEstadoPedido(id, estado, connection = db) {
        const [result] = await connection.query(
            `UPDATE pedidos SET estado_pedido = ? WHERE id = ?`,
            [estado, id]
        );
        return result.affectedRows;
    }

    // Actualizar estado de un ítem individual en cocina (ej. 'PENDIENTE', 'PREPARADO')
    //
    // Al cambiar de estado se van sellando las marcas de tiempo del circuito
    // del ítem (enviado a producción → listo → entregado), que alimenta el
    // reporte de Pedidos / Ventas (tiempos de elaboración y entrega en h:m:s).
    // `cocinado_por` queda registrado cuando producción (cocina/bar) marca el
    // ítem como listo; se conserva el primero que lo hizo (COALESCE).
    static async updateEstadoItem(idDetalle, estado, connection = db, usuarioId = null) {
        const campos = ['estado_item = ?'];
        const params = [estado];

        if (estado === 'en_cocina' || estado === 'en_bar' || estado === 'en_preparacion') {
            campos.push('hora_enviado = COALESCE(hora_enviado, NOW())');
        }
        if (estado === 'listo') {
            campos.push('hora_listo = COALESCE(hora_listo, NOW())');
            campos.push('cocinado_por = COALESCE(cocinado_por, ?)');
            params.push(usuarioId || null);
        }
        if (estado === 'entregado') {
            campos.push('hora_entregado = COALESCE(hora_entregado, NOW())');
        }

        const [result] = await connection.query(
            `UPDATE detalles_pedido SET ${campos.join(', ')} WHERE id = ?`,
            [...params, idDetalle]
        );
        return result.affectedRows;
    }

    static async actualizarEstadoMesa(id_mesa, estado, connection = db) {
        const [result] = await connection.query(
            `UPDATE mesas SET estado = ? WHERE id = ?`,
            [estado, id_mesa]
        );
        return result.affectedRows;
    }

    // ------------------------------------------------------------------------
    // MÉTODOS TRANSACCIONALES (ESCRITURA / CREACIÓN)
    // ------------------------------------------------------------------------

    // Crear un nuevo pedido (Ahora soporta el turno_servicio_id obligatorio)
    static async create(id_mesa, id_usuario_mesero, turno_servicio_id, connection = db) {
        const [result] = await connection.query(
            `INSERT INTO pedidos (id_mesa, id_usuario_mesero, turno_servicio_id, creado_en) 
             VALUES (?, ?, ?, NOW())`,
            [id_mesa, id_usuario_mesero, turno_servicio_id]
        );
        return result.insertId;
    }

    // Método simple: Agregar un detalle sin modificadores
    static async addDetail(id_pedido, id_platillo, cantidad, connection = db) {
        const [result] = await connection.query(
            `INSERT INTO detalles_pedido (id_pedido, id_platillo, cantidad) VALUES (?, ?, ?)`,
            [id_pedido, id_platillo, cantidad]
        );
        return result.insertId;
    }

    /**
     * MÉTODOS NUEVO E IMPRESCINDIBLE PARA EL POS:
     * Agrega un platillo y le adjunta sus modificadores en la misma consulta
     * @param {Array} modificadores - Array de objetos: [{ id: 1, precio: 5.00 }, { id: 2, precio: 0.00 }]
     */
    static async addDetailWithModifiers(id_pedido, id_platillo, cantidad, modificadores = [], connection = db) {
        // Esta ruta legacy también debe respetar la carta de la mesa. El valor
        // recibido desde el navegador no se usa para determinar el precio.
        const [pedidoRows] = await connection.query(
            'SELECT id_mesa, turno_servicio_id FROM pedidos WHERE id = ? LIMIT 1',
            [id_pedido]
        );
        if (!pedidoRows.length) throw new Error('Pedido no encontrado.');

        const [platillos] = await connection.query(`
            SELECT id, nombre, precio, precio_alt, precio_usd
            FROM platillos_menu
            WHERE id = ? AND activo = 1
            LIMIT 1
        `, [id_platillo]);
        if (!platillos.length) throw new Error('El platillo no existe o está inactivo.');

        const contexto = await PrecioService.obtenerContextoCobro({
            idMesa: pedidoRows[0].id_mesa,
            turnoId: pedidoRows[0].turno_servicio_id,
            connection
        });
        const precio = PrecioService.validarPrecioConfigurado(platillos[0], contexto.carta);

        const [resDetalle] = await connection.query(
            `INSERT INTO detalles_pedido
             (id_pedido, id_platillo, es_platillo_dia, cantidad, precio_unitario, estado_item, afecta_inventario, hora_enviado)
             VALUES (?, ?, 0, ?, ?, 'en_cocina', 1, NOW())`,
            [id_pedido, id_platillo, cantidad, precio]
        );
        const detalleId = resDetalle.insertId;

        if (modificadores && modificadores.length > 0) {
            const values = modificadores.map(mod => [detalleId, mod.id, mod.precio || 0.00]);
            await connection.query(
                `INSERT INTO detalles_pedido_modificadores
                 (detalle_pedido_id, modificador_id, precio_cobrado) VALUES ?`,
                [values]
            );
        }
        return detalleId;
    }

    // Cerrar el pedido al cobrar en caja
    static async cerrarPedido(id_pedido, id_cajero, connection = db) {
        const [result] = await connection.query(
            `UPDATE pedidos 
             SET fecha_cierre = NOW(), id_usuario_cajero = ?, estado_pago = 'PAGADO' 
             WHERE id = ?`,
            [id_cajero, id_pedido]
        );
        return result.affectedRows;
    }

    // ------------------------------------------------------------------------
    // REPORTE PROFESIONAL DE PEDIDOS / VENTAS (rango de fechas, filtros,
    // desglose de ítems y pagos por moneda). Espejo del panel de salidas
    // manuales y del kardex.
    // ------------------------------------------------------------------------

    // Whitelist de columnas por las que se permite ordenar el listado
    static get COLUMNAS_ORDEN_VENTAS() {
        return {
            fecha: 'p.creado_en',
            id: 'p.id',
            mesa: 'm.numero',
            mesero: 'mesero_nombre',
            total: 'p.total',
            duracion: 'duracion_seg'
        };
    }

    /**
     * Cláusula WHERE compartida por listado, resumen y exportación.
     * Solo se aceptan valores validados (fechas ISO, enteros y estados conocidos).
     */
    static construirFiltrosVentas(f = {}) {
        const where = [];
        const params = [];

        if (f.desde && /^\d{4}-\d{2}-\d{2}$/.test(String(f.desde))) {
            where.push('p.creado_en >= ?');
            params.push(`${f.desde} 00:00:00`);
        }
        if (f.hasta && /^\d{4}-\d{2}-\d{2}$/.test(String(f.hasta))) {
            where.push('p.creado_en <= ?');
            params.push(`${f.hasta} 23:59:59`);
        }

        switch (f.estado) {
            case 'curso':
                where.push("p.fecha_cierre IS NULL AND p.estado_pago <> 'cancelado'");
                break;
            case 'cobrados':
                where.push("p.fecha_cierre IS NOT NULL AND p.estado_pago NOT IN ('cancelado','cortesia')");
                break;
            case 'cortesia':
                where.push("p.estado_pago = 'cortesia'");
                break;
            case 'anulados':
                where.push("p.estado_pago = 'cancelado'");
                break;
            default:
                break;
        }

        if (f.turnoId && /^\d+$/.test(String(f.turnoId))) {
            where.push('p.turno_servicio_id = ?');
            params.push(Number(f.turnoId));
        }
        if (f.meseroId && /^\d+$/.test(String(f.meseroId))) {
            where.push('p.id_usuario_mesero = ?');
            params.push(Number(f.meseroId));
        }
        if (f.mesa && String(f.mesa).trim().length) {
            where.push('m.numero = ?');
            params.push(String(f.mesa).trim().slice(0, 100));
        }
        // Búsqueda libre: número de pedido (exacto) o nombre del cliente
        if (f.buscar && String(f.buscar).trim()) {
            const termino = String(f.buscar).trim().slice(0, 100);
            if (/^\d+$/.test(termino)) {
                where.push('(p.id = ? OR p.cliente_nombre LIKE ?)');
                params.push(Number(termino), `%${termino}%`);
            } else {
                where.push('p.cliente_nombre LIKE ?');
                params.push(`%${termino}%`);
            }
        }

        return { clause: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
    }

    // FROM común: mesas + ubicación, turno de servicio, mesero y cajero, y
    // los totales de ítems de cada pedido (todos los joins son N:1: no
    // multiplican filas, por lo que sirven también para el COUNT).
    static get FROM_VENTAS() {
        return `
            FROM pedidos p
            INNER JOIN mesas m ON p.id_mesa = m.id
            LEFT JOIN ubicacion_mesa um ON m.ubicacion_id = um.id
            INNER JOIN turnos_servicio ts ON p.turno_servicio_id = ts.id
            LEFT JOIN usuarios tu ON ts.usuario_apertura_id = tu.id
            LEFT JOIN usuarios mu ON p.id_usuario_mesero = mu.id
            LEFT JOIN usuarios cu ON p.id_usuario_cajero = cu.id
            LEFT JOIN (
                SELECT id_pedido,
                       COUNT(*) AS items_total,
                       SUM(estado_item = 'entregado') AS items_entregados,
                       SUM(estado_item = 'cancelado') AS items_cancelados,
                       COALESCE(SUM(cantidad * precio_unitario), 0) AS importe_items
                FROM detalles_pedido
                GROUP BY id_pedido
            ) it ON it.id_pedido = p.id`;
    }

    static get SELECT_VENTAS() {
        return `
            SELECT
                p.id, p.id_mesa, p.cliente_nombre, p.comensales,
                p.estado_pedido, p.estado_pago, p.fecha_precuenta,
                p.subtotal, p.descuento, p.impuesto, p.total, p.propina,
                p.creado_en, p.fecha_cierre,
                m.numero AS numero_mesa, um.nombre AS ubicacion_mesa,
                p.id_usuario_mesero,
                mu.usuario AS mesero_usuario,
                TRIM(BOTH ' ' FROM CONCAT(COALESCE(mu.nombre, ''), ' ', COALESCE(mu.apellidos, ''))) AS mesero_nombre,
                cu.usuario AS cajero_usuario,
                ts.id AS turno_id, tu.usuario AS turno_usuario,
                ts.fecha_apertura AS turno_apertura, ts.estado AS turno_estado,
                TIMESTAMPDIFF(SECOND, p.creado_en, COALESCE(p.fecha_cierre, NOW())) AS duracion_seg,
                COALESCE(it.items_total, 0) AS items_total,
                COALESCE(it.items_entregados, 0) AS items_entregados,
                COALESCE(it.items_cancelados, 0) AS items_cancelados,
                COALESCE(it.importe_items, 0) AS importe_items`;
    }

    // Listado filtrado + ordenado + paginado. Devuelve { rows, total, pagina, porPagina, totalPaginas }
    static async getVentasFiltradas(filtros = {}) {
        const { clause, params } = Pedido.construirFiltrosVentas(filtros);

        const columna = Pedido.COLUMNAS_ORDEN_VENTAS[filtros.orden] || Pedido.COLUMNAS_ORDEN_VENTAS.fecha;
        const direccion = String(filtros.dir).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
        const pagina = Math.max(1, parseInt(filtros.pagina, 10) || 1);
        const porPagina = [25, 50, 100, 200].includes(parseInt(filtros.porPagina, 10))
            ? parseInt(filtros.porPagina, 10) : 50;
        const offset = (pagina - 1) * porPagina;

        const [[{ total }]] = await db.query(
            `SELECT COUNT(*) AS total ${Pedido.FROM_VENTAS} ${clause}`,
            params
        );

        const [rows] = await db.query(
            `${Pedido.SELECT_VENTAS} ${Pedido.FROM_VENTAS} ${clause}
             ORDER BY ${columna} ${direccion}, p.id DESC
             LIMIT ? OFFSET ?`,
            [...params, porPagina, offset]
        );

        return {
            rows,
            total,
            pagina,
            porPagina,
            totalPaginas: Math.max(1, Math.ceil(total / porPagina))
        };
    }

    // Totales del conjunto filtrado (tarjetas del encabezado del reporte)
    static async getResumenVentas(filtros = {}) {
        const { clause, params } = Pedido.construirFiltrosVentas(filtros);
        const [rows] = await db.query(`
            SELECT
                COUNT(*) AS total_pedidos,
                COALESCE(SUM(p.fecha_cierre IS NULL AND p.estado_pago <> 'cancelado'), 0) AS en_curso,
                COALESCE(SUM(p.fecha_cierre IS NOT NULL AND p.estado_pago NOT IN ('cancelado','cortesia')), 0) AS cobrados,
                COALESCE(SUM(CASE WHEN p.fecha_cierre IS NOT NULL AND p.estado_pago NOT IN ('cancelado','cortesia') THEN p.total END), 0) AS importe_cobrado,
                COALESCE(SUM(p.propina), 0) AS propinas
            ${Pedido.FROM_VENTAS}
            ${clause}
        `, params);
        return rows[0] || { total_pedidos: 0, en_curso: 0, cobrados: 0, importe_cobrado: 0, propinas: 0 };
    }

    // Desglose de ítems de los pedidos indicados (para las filas expandibles)
    static async getItemsPorPedidos(pedidoIds = []) {
        if (!Array.isArray(pedidoIds) || pedidoIds.length === 0) return [];
        const [rows] = await db.query(`
            SELECT
                dp.id, dp.id_pedido, dp.es_platillo_dia, dp.cantidad, dp.precio_unitario,
                dp.estado_item, dp.notas_especiales,
                dp.hora_enviado, dp.hora_listo, dp.hora_entregado,
                COALESCE(pd.nombre, pm.nombre, 'Platillo') AS nombre_platillo,
                TRIM(BOTH ' ' FROM CONCAT(COALESCE(cu.nombre, ''), ' ', COALESCE(cu.apellidos, ''))) AS cocinero_nombre
            FROM detalles_pedido dp
            LEFT JOIN platillos_menu pm
                ON dp.id_platillo = pm.id AND (dp.es_platillo_dia = 0 OR dp.es_platillo_dia IS NULL)
            LEFT JOIN platillos_dia pd
                ON dp.id_platillo = pd.id AND dp.es_platillo_dia = 1
            LEFT JOIN usuarios cu ON dp.cocinado_por = cu.id
            WHERE dp.id_pedido IN (?)
            ORDER BY dp.id_pedido ASC, dp.id ASC
        `, [pedidoIds]);
        return rows;
    }

    // Pagos de los pedidos indicados, con la moneda de cada abono (desglose)
    static async getPagosPorPedidos(pedidoIds = []) {
        if (!Array.isArray(pedidoIds) || pedidoIds.length === 0) return [];
        const [rows] = await db.query(`
            SELECT
                pp.pedido_id, pp.metodo_pago, pp.monto_moneda_origen, pp.monto_equivalente_local,
                pp.factor_cambio_aplicado, pp.referencia_transaccion,
                mo.codigo AS moneda_codigo, mo.simbolo AS moneda_simbolo
            FROM pagos_pedido pp
            LEFT JOIN monedas mo ON pp.moneda_id = mo.id
            WHERE pp.pedido_id IN (?)
            ORDER BY pp.id ASC
        `, [pedidoIds]);
        return rows;
    }

    // Turnos con pedidos registrados (filtro especializado del panel)
    static async getTurnosConPedidos(limite = 100) {
        const [rows] = await db.query(`
            SELECT ts.id, tu.usuario AS turno_usuario, ts.fecha_apertura, ts.estado,
                   COUNT(p.id) AS total_pedidos
            FROM turnos_servicio ts
            INNER JOIN pedidos p ON p.turno_servicio_id = ts.id
            LEFT JOIN usuarios tu ON ts.usuario_apertura_id = tu.id
            GROUP BY ts.id, tu.usuario, ts.fecha_apertura, ts.estado
            ORDER BY ts.id DESC
            LIMIT ?
        `, [Math.min(500, Math.max(1, parseInt(limite, 10) || 100))]);
        return rows;
    }

    // Dependientes con pedidos registrados (filtro especializado del panel)
    static async getMeserosConPedidos(limite = 100) {
        const [rows] = await db.query(`
            SELECT DISTINCT u.id, u.nombre, u.apellidos, u.usuario, u.rol
            FROM pedidos p
            INNER JOIN usuarios u ON p.id_usuario_mesero = u.id
            ORDER BY u.nombre ASC
            LIMIT ?
        `, [Math.min(500, Math.max(1, parseInt(limite, 10) || 100))]);
        return rows;
    }

    // Filas completas (sin paginar, con tope) para la exportación a CSV
    static async getParaExportarVentas(filtros = {}, limite = 20000) {
        const { clause, params } = Pedido.construirFiltrosVentas(filtros);
        const tope = Math.min(50000, Math.max(1, parseInt(limite, 10) || 20000));
        const [rows] = await db.query(
            `${Pedido.SELECT_VENTAS} ${Pedido.FROM_VENTAS} ${clause}
             ORDER BY p.creado_en DESC, p.id DESC
             LIMIT ?`,
            [...params, tope]
        );
        return rows;
    }
}

module.exports = Pedido;