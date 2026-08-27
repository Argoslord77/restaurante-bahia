// services/inventarioService.js - Gestión de inventario: descuento FIFO por receta,
// descuento por pedido (POS), vencimiento de lotes y alertas.
const db = require('../config/db');
const UnidadMedidaService = require('./unidadMedidaService');

// Almacenes operativos por defecto (cocina/bar). Central actúa como reserva.
const ALMACEN_COCINA = 2;
const ALMACEN_BAR = 5;
const ALMACEN_CENTRAL = 1;

const InventarioService = {
    /**
     * Descuenta del inventario los insumos correspondientes a un producto vendido
     * explotando su receta activa (FEFO/FIFO por fecha de ingreso).
     *
     * @param {number} productoVendidoId - ID del plato/bebida (recetas.platillo_id o producto_resultante_id)
     * @param {number} cantidadVendida - Unidades vendidas
     * @param {number} almacenDefaultId - Almacén del que se extraen los insumos
     * @param {connection} [externalConn] - Conexión externa (transacción mayor)
     * @param {object} [opts] - { strict: lanzar error si falta stock (default false),
     *                           referencia_tipo, referencia_id, documento_numero }
     */
    descontarPorReceta: async (productoVendidoId, cantidadVendida, almacenDefaultId, externalConn = null, opts = {}) => {
        const conn = externalConn || await db.getConnection();
        if (!externalConn) await conn.beginTransaction();

        try {
            // 1. Explosión de ingredientes desde la receta ACTIVA. Nota: el enlace real
            //    de las recetas existentes es `platillo_id` (producto_resultante_id
            //    está a NULL en los registros históricos), se aceptan ambos.
            const queryReceta = `
                SELECT 
                    rd.producto_id AS insumo_id, 
                    rd.cantidad AS cantidad_receta,
                    rd.porcentaje_merma,
                    rd.unidad_medida AS unidad_receta,
                    ui.abreviatura AS unidad_inventario
                FROM receta_detalles rd
                INNER JOIN recetas r ON rd.receta_id = r.id
                LEFT JOIN productos pi ON pi.id = rd.producto_id
                LEFT JOIN unidades_medida ui ON ui.id = pi.unidad_inventario_id
                WHERE r.activa = 1 AND (r.platillo_id = ? OR r.producto_resultante_id = ?)
            `;
            const [ingredientes] = await conn.query(queryReceta, [productoVendidoId, productoVendidoId]);

            if (ingredientes.length === 0) {
                if (!externalConn) await conn.commit();
                return { success: true, sin_receta: true, faltantes: [], advertencias: [], message: 'El producto no requiere receta para deducción automática.' };
            }

            const faltantes = [];
            const advertencias = [];
            let descuentos = [];

                // 2. Iterar por cada insumo de la receta
            for (const ingrediente of ingredientes) {
                const insumoId = ingrediente.insumo_id;
                const cantidadReceta = parseFloat(ingrediente.cantidad_receta);
                const merma = parseFloat(ingrediente.porcentaje_merma || 0);

                // Cantidad bruta real (neta / (1 - %merma))
                let cantidadNecesaria = (merma > 0)
                    ? (cantidadReceta / (1 - (merma / 100))) * cantidadVendida
                    : cantidadReceta * cantidadVendida;
                cantidadNecesaria = isNaN(cantidadNecesaria) ? 0 : cantidadNecesaria;

                // 2b. CONVERSIÓN AUTOMÁTICA DE UNIDADES. Sólo se ejecuta si
                //     existe una entrada de almacén con unidad registrada y un
                //     factor activo aplicable al producto; nunca se asume 1:1.
                const uReceta = (ingrediente.unidad_receta || '').trim().toLowerCase();
                const uInv = (ingrediente.unidad_inventario || '').trim().toLowerCase();
                if (cantidadNecesaria > 0 && uReceta && uInv && uReceta !== uInv) {
                    try {
                        const infoConversion = await UnidadMedidaService.validarProductoParaConversion(
                            insumoId,
                            ingrediente.unidad_receta,
                            ingrediente.unidad_inventario
                        );
                        cantidadNecesaria *= infoConversion.factor;
                    } catch (conversionError) {
                        advertencias.push({
                            insumo_id: insumoId,
                            detalle: `${conversionError.message} (receta en ${ingrediente.unidad_receta}, inventario en ${ingrediente.unidad_inventario}) — insumo sin descontar`
                        });
                        continue;
                    }
                }

                // 3. Lotes ACTIVOS del insumo en el almacén (FIFO, bloqueados)
                const [lotes] = await conn.query(`
                    SELECT id, cantidad_actual, numero_lote, costo_unitario
                    FROM lotes
                    WHERE producto_id = ? AND almacen_id = ? AND estado = 'ACTIVO' AND cantidad_actual > 0
                    ORDER BY fecha_ingreso ASC, id ASC
                    FOR UPDATE
                `, [insumoId, almacenDefaultId]);

                // 4. Consumir lotes de forma secuencial
                for (const lote of lotes) {
                    if (cantidadNecesaria <= 0) break;

                    const stockAnterior = parseFloat(lote.cantidad_actual);
                    const cantidadADescontar = Math.min(stockAnterior, cantidadNecesaria);
                    const stockNuevo = stockAnterior - cantidadADescontar;
                    const costoUnitario = parseFloat(lote.costo_unitario || 0);
                    cantidadNecesaria -= cantidadADescontar;

                    await conn.query(`
                        UPDATE lotes 
                        SET cantidad_actual = ?, estado = ?, updated_at = NOW()
                        WHERE id = ?
                    `, [stockNuevo, stockNuevo <= 0 ? 'AGOTADO' : 'ACTIVO', lote.id]);

                    // 5. Kardex con el esquema real de movimientos_inventario
                    await conn.query(`
                        INSERT INTO movimientos_inventario
                        (producto_id, almacen_id, lote_id, tipo_movimiento, referencia_tipo, referencia_id,
                         cantidad, costo_unitario, costo_total, stock_anterior, stock_nuevo,
                         usuario_id, documento_numero, observaciones)
                        VALUES (?, ?, ?, 'VENTA', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        insumoId, almacenDefaultId, lote.id,
                        opts.referencia_tipo || 'receta',
                        opts.referencia_id || null,
                        cantidadADescontar,
                        costoUnitario,
                        costoUnitario * cantidadADescontar,
                        stockAnterior,
                        stockNuevo,
                        opts.usuario_id || null,
                        opts.documento_numero || `AUTO-${Date.now()}`,
                        'Deducción automática por receta (venta)'
                    ]);

                    descuentos.push({ insumo_id: insumoId, lote_id: lote.id, cantidad: cantidadADescontar });
                }

                // 6. Sin stock suficiente: NO detener la venta (salvaguarda de negocio),
                //    se reporta el faltante. Con opts.strict=true se lanza el error.
                if (cantidadNecesaria > 0.000001) {
                    if (opts.strict) {
                        throw new Error(`Stock insuficiente para el insumo ID ${insumoId}. Faltan ${cantidadNecesaria.toFixed(3)} unidades.`);
                    }
                    faltantes.push({ insumo_id: insumoId, faltante: Number(cantidadNecesaria.toFixed(3)) });
                }
            }

            if (!externalConn) await conn.commit();

            return {
                success: true,
                sin_receta: false,
                descuentos,
                faltantes,
                advertencias,
                message: faltantes.length === 0
                    ? 'Inventario reducido con éxito siguiendo la estrategia FIFO.'
                    : `Inventario reducido parcialmente: ${faltantes.length} insumo(s) con faltante.`
            };
        } catch (error) {
            if (!externalConn) await conn.rollback();
            throw error;
        } finally {
            if (!externalConn) conn.release();
        }
    },

    /**
     * Descuenta el inventario de TODOS los platillos de un pedido al cobrarlo (POS).
     * Cada platillo consume su receta desde el almacén que corresponda:
     * bebidas → Bar, cocina → Cocina. Los faltantes NO detienen el cobro; se reportan.
     * @param {number} pedidoId
     * @param {number} [usuarioId]
     */
    descontarInventarioPorPedido: async (pedidoId, usuarioId = null) => {
        const [detalles] = await db.query(`
            SELECT 
                dp.id_platillo, dp.es_platillo_dia, dp.cantidad,
                CASE 
                    WHEN pd.tipo = 'BEBIDAS' THEN ${ALMACEN_BAR}
                    WHEN cp.nombre LIKE '%bebida%' OR cp.nombre LIKE '%infusion%' THEN ${ALMACEN_BAR}
                    ELSE ${ALMACEN_COCINA}
                END AS almacen_destino
            FROM detalles_pedido dp
            LEFT JOIN platillos_dia pd  ON dp.es_platillo_dia = 1 AND pd.id = dp.id_platillo
            LEFT JOIN platillos_menu pm ON (dp.es_platillo_dia = 0 OR dp.es_platillo_dia IS NULL) AND pm.id = dp.id_platillo
            LEFT JOIN categorias_platillos cp ON pm.categoria = cp.id
            WHERE dp.id_pedido = ? 
              AND dp.estado_item NOT IN ('cancelado')
              AND (dp.afecta_inventario = 1 OR dp.afecta_inventario IS NULL)
        `, [pedidoId]);

        const resumen = { pedido_id: pedidoId, procesados: 0, sin_receta: 0, faltantes: [], advertencias: [] };

        for (const d of detalles) {
            const almacenPreferido = parseInt(d.almacen_destino, 10) === ALMACEN_BAR ? ALMACEN_BAR : ALMACEN_COCINA;
            const almacenAlterno = almacenPreferido === ALMACEN_BAR ? ALMACEN_COCINA : ALMACEN_BAR;
            const opts = {
                referencia_tipo: 'pedido',
                referencia_id: pedidoId,
                documento_numero: `PED-${String(pedidoId).padStart(6, '0')}`,
                usuario_id: usuarioId
            };
            try {
                let r = await InventarioService.descontarPorReceta(parseInt(d.id_platillo, 10), parseFloat(d.cantidad), almacenPreferido, null, opts);

                // Muchos platillos no tienen categoría asignada (NULL): si en el almacén
                // preferido no se pudo consumir NADA, se intenta el almacén alterno
                // (p. ej. un trago sin categoría cuyos insumos viven en el Bar).
                if (r.faltantes && r.faltantes.length > 0 && (!r.descuentos || r.descuentos.length === 0)) {
                    const rAlt = await InventarioService.descontarPorReceta(parseInt(d.id_platillo, 10), parseFloat(d.cantidad), almacenAlterno, null, opts);
                    if (rAlt.descuentos && rAlt.descuentos.length > 0) r = rAlt;
                }

                resumen.procesados++;
                if (r.sin_receta) resumen.sin_receta++;
                if (r.advertencias && r.advertencias.length) resumen.advertencias.push({ platillo_id: d.id_platillo, advertencias: r.advertencias });
                if (r.faltantes && r.faltantes.length) resumen.faltantes.push({ platillo_id: d.id_platillo, faltantes: r.faltantes });
            } catch (e) {
                // Nunca detener el cobro por el inventario; quedar registrado en el resumen
                resumen.faltantes.push({ platillo_id: d.id_platillo, error: e.message });
            }
        }

        if (resumen.faltantes.length > 0) {
            console.warn(`[Inventario] Pedido ${pedidoId}: faltantes de stock →`, JSON.stringify(resumen.faltantes));
        }
        return resumen;
    },

    /**
     * Verifica existencias antes de una captura en el POS. Esta consulta no
     * modifica stock y aplica la misma conversión que el descuento de venta.
     */
    verificarStockPlatillo: async (platilloId, cantidad = 1, almacenId = null) => {
        const cantidadVenta = parseFloat(cantidad);
        if (Number.isNaN(cantidadVenta) || cantidadVenta <= 0) {
            throw new Error('La cantidad a verificar no es válida.');
        }

        const [ingredientes] = await db.query(`
            SELECT rd.producto_id AS insumo_id,
                   rd.cantidad AS cantidad_receta,
                   rd.unidad_medida AS unidad_receta,
                   rd.porcentaje_merma,
                   rd.es_opcional,
                   p.nombre AS insumo_nombre,
                   ui.abreviatura AS unidad_inventario
            FROM receta_detalles rd
            INNER JOIN recetas r ON rd.receta_id = r.id
            INNER JOIN productos p ON p.id = rd.producto_id
            LEFT JOIN unidades_medida ui ON ui.id = p.unidad_inventario_id
            WHERE r.activa = 1
              AND (r.platillo_id = ? OR r.producto_resultante_id = ?)
        `, [platilloId, platilloId]);

        if (ingredientes.length === 0) {
            return { suficiente: true, sin_receta: true, faltantes: [], advertencias: [] };
        }

        const faltantes = [];
        const advertencias = [];
        const detalle = [];
        for (const ingrediente of ingredientes) {
            let cantidadNecesaria = parseFloat(ingrediente.cantidad_receta) * cantidadVenta;
            const merma = parseFloat(ingrediente.porcentaje_merma || 0);
            if (merma > 0) cantidadNecesaria = (parseFloat(ingrediente.cantidad_receta) / (1 - merma / 100)) * cantidadVenta;

            const uReceta = (ingrediente.unidad_receta || '').trim().toLowerCase();
            const uInv = (ingrediente.unidad_inventario || '').trim().toLowerCase();
            if (uReceta && uInv && uReceta !== uInv) {
                try {
                    const infoConversion = await UnidadMedidaService.validarProductoParaConversion(
                        ingrediente.insumo_id,
                        ingrediente.unidad_receta,
                        ingrediente.unidad_inventario
                    );
                    cantidadNecesaria *= infoConversion.factor;
                } catch (error) {
                    if (!ingrediente.es_opcional) {
                        faltantes.push({
                            insumo_id: ingrediente.insumo_id,
                            insumo_nombre: ingrediente.insumo_nombre,
                            requerido: null,
                            disponible: null,
                            unidad_medida: ingrediente.unidad_receta,
                            error: error.message
                        });
                    } else {
                        advertencias.push({ insumo_id: ingrediente.insumo_id, detalle: error.message });
                    }
                    continue;
                }
            }

            const params = [ingrediente.insumo_id];
            const filtroAlmacen = almacenId ? ' AND almacen_id = ?' : '';
            if (almacenId) params.push(almacenId);
            const [stockRows] = await db.query(`
                SELECT COALESCE(SUM(cantidad_actual), 0) AS disponible
                FROM lotes
                WHERE producto_id = ?${filtroAlmacen}
                  AND estado = 'ACTIVO' AND cantidad_actual > 0
            `, params);
            const disponible = parseFloat(stockRows[0]?.disponible || 0);
            const itemDetalle = {
                insumo_id: ingrediente.insumo_id,
                insumo_nombre: ingrediente.insumo_nombre,
                requerido: Number(cantidadNecesaria.toFixed(6)),
                disponible: Number(disponible.toFixed(6)),
                unidad_medida: ingrediente.unidad_inventario || ingrediente.unidad_receta,
                es_opcional: Number(ingrediente.es_opcional || 0) === 1
            };
            detalle.push(itemDetalle);
            if (disponible + 0.000001 < cantidadNecesaria && !ingrediente.es_opcional) {
                faltantes.push({ ...itemDetalle, faltante: Number((cantidadNecesaria - disponible).toFixed(6)) });
            }
        }

        return { suficiente: faltantes.length === 0, sin_receta: false, faltantes, advertencias, detalle };
    },

    /**
     * Marca automáticamente como VENCIDO todo lote activo cuya fecha de
     * vencimiento ya pasó. Devuelve la cantidad de lotes marcados.
     */
    marcarLotesVencidos: async () => {
        const [r] = await db.query(`
            UPDATE lotes 
            SET estado = 'VENCIDO', updated_at = NOW()
            WHERE estado = 'ACTIVO' 
              AND fecha_vencimiento IS NOT NULL 
              AND fecha_vencimiento < CURDATE()
        `);
        return r.affectedRows || 0;
    },

    /**
     * Lotes ACTIVOS que vencen dentro de los próximos `dias` días (alerta temprana).
     */
    lotesProximosAVencer: async (dias = 7) => {
        const [rows] = await db.query(`
            SELECT l.id, l.numero_lote, l.cantidad_actual, l.fecha_vencimiento, l.estado,
                   p.nombre AS producto_nombre, p.codigo AS producto_codigo,
                   a.nombre AS almacen_nombre,
                   DATEDIFF(l.fecha_vencimiento, CURDATE()) AS dias_restantes
            FROM lotes l
            INNER JOIN productos p ON l.producto_id = p.id
            INNER JOIN almacenes a ON l.almacen_id = a.id
            WHERE l.estado = 'ACTIVO' AND l.cantidad_actual > 0
              AND l.fecha_vencimiento IS NOT NULL
              AND l.fecha_vencimiento <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
            ORDER BY l.fecha_vencimiento ASC
        `, [dias]);
        return rows;
    }
};

module.exports = InventarioService;
