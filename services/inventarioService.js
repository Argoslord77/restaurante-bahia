// services/inventarioService.js - Gestión de inventario: descuento FIFO por receta,
// descuento por pedido (POS), vencimiento de lotes y alertas.
const db = require('../config/db');
const UnidadMedidaService = require('./unidadMedidaService');
const AlmacenService = require('./almacenService');

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
     * Resuelve el almacén de producción PREFERIDO y el ALTERNO para un platillo,
     * replicando exactamente la lógica de descontarInventarioPorPedido:
     *   - Bebida (tipo BEBIDAS o categoría con 'bebida'/'infusión') -> Bar
     *   - resto -> Cocina
     *   - Si la categoría del platillo tiene almacén asignado (producción),
     *     ese almacén manda (como hace resolverAlmacenProduccion).
     */
    _resloverAreasProduccionPlatillo: async (platilloId) => {
        const [rows] = await db.query(`
            SELECT
                CASE
                    WHEN pd.tipo = 'BEBIDAS' THEN ${ALMACEN_BAR}
                    WHEN cp.nombre LIKE '%bebida%' OR cp.nombre LIKE '%infusion%' OR cp.nombre LIKE '%infusión%' THEN ${ALMACEN_BAR}
                    ELSE ${ALMACEN_COCINA}
                END AS almacen_destino,
                cp.almacen_id AS almacen_categoria
            FROM platillos_menu pm
            LEFT JOIN platillos_dia pd ON pd.id = pm.id
            LEFT JOIN categorias_platillos cp ON cp.id = pm.categoria
            WHERE pm.id = ?
            LIMIT 1
        `, [platilloId]);

        let preferido = null;
        if (rows.length) {
            // Si la categoría define un almacén de producción, ese es el preferido
            if (rows[0].almacen_categoria) {
                const [aRows] = await db.query(
                    'SELECT id, nombre, categoria FROM almacenes WHERE id = ? AND activo = 1 LIMIT 1',
                    [rows[0].almacen_categoria]
                );
                const a = aRows[0];
                if (a && (a.categoria === 'produccion' || !a.categoria)) preferido = { id: a.id, nombre: a.nombre };
            }
            if (!preferido) {
                preferido = { id: Number(rows[0].almacen_destino), nombre: null };
            }
        }

        const idPref = preferido ? Number(preferido.id) : ALMACEN_COCINA;
        const alternoId = idPref === ALMACEN_BAR ? ALMACEN_COCINA : ALMACEN_BAR;

        const [nombres] = await db.query(
            'SELECT id, nombre FROM almacenes WHERE id IN (?, ?)',
            [idPref, alternoId]
        );
        const nombreDe = (id) => {
            const f = nombres.find(n => Number(n.id) === Number(id));
            return f ? f.nombre : (id === ALMACEN_BAR ? 'Bar' : id === ALMACEN_COCINA ? 'Cocina' : `Almacén ${id}`);
        };

        return {
            preferido: { id: idPref, nombre: nombreDe(idPref) },
            alterno: { id: alternoId, nombre: nombreDe(alternoId) }
        };
    },

    /**
     * VERIFICACIÓN EXHAUSTIVA DE STOCK EN ÁREAS PRODUCTIVAS para una RONDA
     * (lista de platillos a agregar a la orden).
     *
     * Simula el consumo que hará el descuento de venta: por cada platillo de la
     * ronda se explosiona su receta ACTIVA y, para cada INSUMO NO OPCIONAL,
     * se comprueba que las áreas de producción correspondientes (almacén
     * preferido + alterno) cubran la cantidad requerida (con merma y unidades
     * convertidas). Los insumos opcionales NO bloquean: solo se reportan como
     * advertencia.
     *
     * El consumo se acumula DENTRO de la ronda: si dos platillos usan el mismo
     * insumo, el segundo compite con el primero por el mismo stock.
     *
     * @param {Array<{platillo_id:number, es_platillo_dia:boolean, cantidad:number}>} items
     * @returns {Promise<{suficiente:boolean, faltantes:Array, advertencias:Array, detalle:Array}>}
     */
    verificarStockRonda: async (items) => {
        const faltantes = [];
        const advertencias = [];
        const detalle = [];
        if (!Array.isArray(items) || items.length === 0) {
            return { suficiente: true, faltantes, advertencias, detalle };
        }

        // Stock disponible por (insumo, area) en unidades de inventario.
        // Se carga una sola vez y se va consumiendo simuladamente.
        const stockMap = new Map(); // clave `${productoId}:${almacenId}` -> { cant, unidad, producto, almacen }

        const areasCache = new Map(); // platillo_id -> {preferido, alterno}
        const recipeCache = new Map(); // platillo_id -> ingredientes[]

        const cargarStockParaProducto = async (productoId, unidadInventario) => {
            if (!unidadInventario) return;
            // Áreas productivas: cocina + bar (las dos áreas de producción del POS)
            for (const areaId of [ALMACEN_COCINA, ALMACEN_BAR]) {
                const clave = `${productoId}:${areaId}`;
                if (stockMap.has(clave)) continue;
                try {
                    const conv = await UnidadMedidaService.stockLotesConvertidos(
                        productoId, unidadInventario, { almacenId: areaId, estrictoActivo: true }
                    );
                    stockMap.set(clave, {
                        cant: conv.total,
                        unidad: unidadInventario,
                        productoId,
                        almacenId: areaId
                    });
                } catch (e) {
                    stockMap.set(clave, { cant: 0, unidad: unidadInventario, productoId, almacenId: areaId });
                }
            }
        };

        const obtenerIngredientesPlatillo = async (platilloId) => {
            if (recipeCache.has(platilloId)) return recipeCache.get(platilloId);
            const [ingredientes] = await db.query(`
                SELECT rd.producto_id AS insumo_id,
                       rd.cantidad AS cantidad_receta,
                       rd.unidad_medida AS unidad_receta,
                       rd.porcentaje_merma,
                       rd.es_opcional,
                       p.nombre AS insumo_nombre,
                       ui.abreviatura AS unidad_inventario,
                       ui.nombre AS unidad_inventario_nombre,
                       ur.nombre AS unidad_produccion_nombre,
                       ur.abreviatura AS unidad_produccion_abrev,
                       ur.codigo AS unidad_produccion_codigo
                FROM receta_detalles rd
                INNER JOIN recetas r ON rd.receta_id = r.id
                INNER JOIN productos p ON p.id = rd.producto_id
                LEFT JOIN unidades_medida ui ON ui.id = p.unidad_inventario_id
                LEFT JOIN unidades_medida ur ON ur.id = (
                    SELECT u2.id FROM unidades_medida u2
                    WHERE u2.activa = 1
                      AND (u2.codigo = rd.unidad_medida
                           OR u2.abreviatura = rd.unidad_medida
                           OR u2.nombre = rd.unidad_medida)
                    ORDER BY CASE
                               WHEN u2.codigo = rd.unidad_medida THEN 0
                               WHEN u2.abreviatura = rd.unidad_medida THEN 1
                               ELSE 2 END
                    LIMIT 1
                )
                WHERE r.activa = 1
                  AND (r.platillo_id = ? OR r.producto_resultante_id = ?)
            `, [platilloId, platilloId]);
            recipeCache.set(platilloId, ingredientes);
            return ingredientes;
        };

        // Etiqueta legible de la UNIDAD DE PRODUCCIÓN/CONSUMO (la de la receta):
        // es la que muestra cocina/bar en el aviso de stock insuficiente.
        const etiquetaProduccion = (ing) =>
            ing.unidad_produccion_nombre || ing.unidad_receta || ing.unidad_produccion_abrev || ing.unidad_produccion_codigo || '';
        const etiquetaInventario = (ing) =>
            ing.unidad_inventario_nombre || ing.unidad_inventario || '';

        const areasDe = async (platilloId) => {
            if (!areasCache.has(platilloId)) {
                try {
                    areasCache.set(platilloId, await InventarioService._resloverAreasProduccionPlatillo(platilloId));
                } catch (e) {
                    areasCache.set(platilloId, {
                        preferido: { id: ALMACEN_COCINA, nombre: 'Cocina' },
                        alterno: { id: ALMACEN_BAR, nombre: 'Bar' }
                    });
                }
            }
            return areasCache.get(platilloId);
        };

        for (const item of items) {
            const platilloId = Number(item.platillo_id);
            const esDia = Boolean(item.es_platillo_dia);
            const cantidad = Math.max(1, Math.floor(Number(item.cantidad) || 1));
            if (esDia || !platilloId) continue; // platillos del día no explotan receta

            const ingredientes = await obtenerIngredientesPlatillo(platilloId);
            if (ingredientes.length === 0) continue; // sin receta: nada que verificar

            const areas = await areasDe(platilloId);

            for (const ing of ingredientes) {
                // Cantidad en la UNIDAD DE PRODUCCIÓN/CONSUMO de la receta (con merma)
                let cantidadProduccion = parseFloat(ing.cantidad_receta) * cantidad;
                const merma = parseFloat(ing.porcentaje_merma || 0);
                if (merma > 0) cantidadProduccion = (parseFloat(ing.cantidad_receta) / (1 - merma / 100)) * cantidad;
                cantidadProduccion = Number.isFinite(cantidadProduccion) ? cantidadProduccion : 0;
                if (cantidadProduccion <= 0) continue;

                // Conversión a la unidad de inventario (igual que el descuento)
                const uReceta = (ing.unidad_receta || '').trim().toLowerCase();
                const uInv = (ing.unidad_inventario || '').trim().toLowerCase();
                const mismaUnidad = !uInv || uReceta === uInv;
                let factor = null;
                if (!mismaUnidad) {
                    try {
                        factor = await UnidadMedidaService.obtenerFactor(ing.unidad_receta, ing.unidad_inventario, ing.insumo_id);
                    } catch (e) { factor = null; }
                }
                const conversionOk = mismaUnidad || factor !== null;
                // Cantidad necesaria en versión ALMACÉN/COMPRA (base de la simulación)
                const cantidadInventario = conversionOk
                    ? (mismaUnidad ? cantidadProduccion : cantidadProduccion * factor)
                    : cantidadProduccion;

                await cargarStockParaProducto(ing.insumo_id, uInv);
                const etiquetaProd = etiquetaProduccion(ing);
                const etiquetaInv = etiquetaInventario(ing);

                // Simular consumo (en unidad de inventario, como el descuento):
                // primero el área preferida, luego la alterna
                let pendiente = cantidadInventario;
                let disponibleTotal = 0;
                for (const area of [areas.preferido, areas.alterno]) {
                    const clave = `${ing.insumo_id}:${area.id}`;
                    const slot = stockMap.get(clave);
                    const hay = slot ? slot.cant : 0;
                    disponibleTotal += Math.max(0, hay);
                    if (pendiente <= 0) break;
                    if (hay > 0) {
                        const consumo = Math.min(hay, pendiente);
                        slot.cant -= consumo;
                        pendiente -= consumo;
                    }
                }
                // Equivalente en unidad de producción para exhibirlo en el aviso
                const disponibleProduccion = (conversionOk && !mismaUnidad && factor)
                    ? disponibleTotal / factor
                    : disponibleTotal;

                const esOpcional = Number(ing.es_opcional) === 1;
                const registro = {
                    platillo_id: platilloId,
                    insumo_id: ing.insumo_id,
                    insumo_nombre: ing.insumo_nombre,
                    // PRIMARIO: unidad de producción/consumo (la de la receta)
                    requerido: Number(cantidadProduccion.toFixed(6)),
                    disponible: Number(disponibleProduccion.toFixed(6)),
                    unidad: etiquetaProd,
                    unidad_medida: ing.unidad_receta || etiquetaProd,
                    // SECUNDARIO: equivalente en unidad de almacén/compra
                    requerido_inventario: conversionOk && !mismaUnidad ? Number(cantidadInventario.toFixed(6)) : null,
                    disponible_inventario: conversionOk && !mismaUnidad ? Number(disponibleTotal.toFixed(6)) : null,
                    unidad_inventario: etiquetaInv,
                    unidad_inventario_abrev: ing.unidad_inventario || null,
                    areas: `${areas.preferido.nombre} + ${areas.alterno.nombre}`,
                    es_opcional: esOpcional
                };
                detalle.push(registro);

                if (pendiente > 0.000001) {
                    registro.faltante = Number(pendiente.toFixed(6));
                    if (esOpcional) {
                        advertencias.push({ ...registro, detalle: 'Insumo opcional sin stock suficiente' });
                    } else {
                        faltantes.push(registro);
                    }
                }
            }
        }

        return { suficiente: faltantes.length === 0, faltantes, advertencias, detalle };
    },

    /**
     * Verifica existencias antes de una captura en el POS. Esta consulta no
     * modifica stock y aplica la misma conversión que el descuento de venta.
     * Por defecto restringe el stock a las ÁREAS PRODUCTIVAS (preferido +
     * alterno del platillo); si se pasa almacenId explícito se usa ese.
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
                   ui.abreviatura AS unidad_inventario,
                   ui.nombre AS unidad_inventario_nombre,
                   ur.nombre AS unidad_produccion_nombre,
                   ur.abreviatura AS unidad_produccion_abrev,
                   ur.codigo AS unidad_produccion_codigo
            FROM receta_detalles rd
            INNER JOIN recetas r ON rd.receta_id = r.id
            INNER JOIN productos p ON p.id = rd.producto_id
            LEFT JOIN unidades_medida ui ON ui.id = p.unidad_inventario_id
            LEFT JOIN unidades_medida ur ON ur.id = (
                SELECT u2.id FROM unidades_medida u2
                WHERE u2.activa = 1
                  AND (u2.codigo = rd.unidad_medida
                       OR u2.abreviatura = rd.unidad_medida
                       OR u2.nombre = rd.unidad_medida)
                ORDER BY CASE
                           WHEN u2.codigo = rd.unidad_medida THEN 0
                           WHEN u2.abreviatura = rd.unidad_medida THEN 1
                           ELSE 2 END
                LIMIT 1
            )
            WHERE r.activa = 1
              AND (r.platillo_id = ? OR r.producto_resultante_id = ?)
        `, [platilloId, platilloId]);

        if (ingredientes.length === 0) {
            return { suficiente: true, sin_receta: true, faltantes: [], advertencias: [] };
        }

        // Áreas productivas consideradas (para el detalle legible del mensaje)
        let areasLabel = 'Áreas de producción';
        try {
            if (almacenId) {
                const [aRows] = await db.query(
                    'SELECT nombre FROM almacenes WHERE id = ? LIMIT 1', [almacenId]
                );
                areasLabel = aRows.length ? aRows[0].nombre : `Almacén ${almacenId}`;
            } else {
                const areas = await InventarioService._resloverAreasProduccionPlatillo(platilloId);
                areasLabel = (Number(areas.alterno.id) === Number(areas.preferido.id))
                    ? areas.preferido.nombre
                    : `${areas.preferido.nombre} + ${areas.alterno.nombre}`;
            }
        } catch (eAreas) {
            areasLabel = 'Áreas de producción';
        }

        // Etiqueta legible de la unidad de medida: PRIMARIO = la unidad de
        // PRODUCCIÓN/CONSUMO de la receta (la que maneja cocina/bar); el
        // equivalente en ALMACÉN/COMPRA se envía como dato secundario.
        const etiquetaProduccion = (ing) =>
            ing.unidad_produccion_nombre || ing.unidad_receta || ing.unidad_produccion_abrev || ing.unidad_produccion_codigo || '';
        const etiquetaInventario = (ing) =>
            ing.unidad_inventario_nombre || ing.unidad_inventario || '';

        // Stock disponible (con conversión por lote) de un insumo en una unidad
        // destino, restringido a las áreas de producción (o un almacén dado).
        const disponibleEn = async (ingrediente, unidadDestino) => {
            if (!unidadDestino) return 0;
            try {
                if (almacenId) {
                    const conv = await UnidadMedidaService.stockLotesConvertidos(
                        ingrediente.insumo_id, unidadDestino,
                        { almacenId, estrictoActivo: true }
                    );
                    return conv.total;
                }
                const areas = await InventarioService._resloverAreasProduccionPlatillo(platilloId);
                const areasUnicas = [areas.preferido];
                if (Number(areas.alterno.id) !== Number(areas.preferido.id)) areasUnicas.push(areas.alterno);
                let total = 0;
                for (const area of areasUnicas) {
                    const conv = await UnidadMedidaService.stockLotesConvertidos(
                        ingrediente.insumo_id, unidadDestino,
                        { almacenId: area.id, estrictoActivo: true }
                    );
                    total += conv.total;
                }
                return total;
            } catch (e) {
                // Sin conversión disponible: se conserva el comportamiento
                // anterior (suma cruda de cantidades activas).
                const params = [ingrediente.insumo_id];
                const filtroAlmacen = almacenId ? ' AND almacen_id = ?' : '';
                if (almacenId) params.push(almacenId);
                const [stockRows] = await db.query(`
                    SELECT COALESCE(SUM(cantidad_actual), 0) AS disponible
                    FROM lotes
                    WHERE producto_id = ?${filtroAlmacen}
                      AND estado = 'ACTIVO' AND cantidad_actual > 0
                `, params);
                return parseFloat(stockRows[0]?.disponible || 0);
            }
        };

        const faltantes = [];
        const advertencias = [];
        const detalle = [];
        for (const ingrediente of ingredientes) {
            // 1) Cantidad en la UNIDAD DE PRODUCCIÓN/CONSUMO de la receta (con merma)
            let cantidadProduccion = parseFloat(ingrediente.cantidad_receta) * cantidadVenta;
            const merma = parseFloat(ingrediente.porcentaje_merma || 0);
            if (merma > 0) cantidadProduccion = (parseFloat(ingrediente.cantidad_receta) / (1 - merma / 100)) * cantidadVenta;
            cantidadProduccion = Number.isFinite(cantidadProduccion) ? cantidadProduccion : 0;

            const uReceta = (ingrediente.unidad_receta || '').trim().toLowerCase();
            const uInv = (ingrediente.unidad_inventario || '').trim().toLowerCase();
            const mismaUnidad = !uInv || uReceta === uInv;

            // 2) Factor receta → almacén/compra (igual que el descuento de venta)
            let factor = null;
            if (!mismaUnidad) {
                try {
                    factor = await UnidadMedidaService.obtenerFactor(
                        ingrediente.unidad_receta,
                        ingrediente.unidad_inventario,
                        ingrediente.insumo_id
                    );
                } catch (e) {
                    factor = null;
                }
            }
            const conversionOk = mismaUnidad || factor !== null;
            const cantidadInventario = conversionOk
                ? (mismaUnidad ? cantidadProduccion : cantidadProduccion * factor)
                : cantidadProduccion;

            if (!conversionOk) {
                // Sin factor: si el producto NO tiene stock alguno no hace
                // falta convertir (comparar requerido contra 0). Solo si
                // SÍ tiene stock y no hay conversión se reporta el error.
                const [stockCualquier] = await db.query(`
                    SELECT COALESCE(SUM(cantidad_actual), 0) AS total
                    FROM lotes
                    WHERE producto_id = ? AND cantidad_actual > 0
                      AND (estado IS NULL OR estado = 'ACTIVO')
                `, [ingrediente.insumo_id]);
                if (parseFloat(stockCualquier[0]?.total || 0) > 0) {
                    const base = {
                        insumo_id: ingrediente.insumo_id,
                        insumo_nombre: ingrediente.insumo_nombre,
                        requerido: null,
                        disponible: null,
                        unidad: etiquetaProduccion(ingrediente),
                        unidad_medida: ingrediente.unidad_receta || etiquetaProduccion(ingrediente),
                        unidad_inventario: etiquetaInventario(ingrediente),
                        areas: areasLabel,
                        error: `Sin factor de conversión ${ingrediente.unidad_receta} → ${ingrediente.unidad_inventario} con stock presente: insumo sin descontar`
                    };
                    if (!ingrediente.es_opcional) faltantes.push(base);
                    else advertencias.push({ ...base, detalle: base.error });
                    continue;
                }
                // Sin stock: se continúa comparando en la unidad de la receta.
            }

            // 3) Stock disponible CON CONVERSIÓN por lote en ambas unidades:
            //    producción (para el aviso) y almacén/compra (para comparar).
            //    IMPORTANTE: cuenta solo el stock de las ÁREAS PRODUCTIVAS
            //    (almacén preferido + alterno del platillo), no el logístico:
            //    el descuento de venta solo consume de producción.
            const disponibleProduccion = await disponibleEn(ingrediente, ingrediente.unidad_receta || ingrediente.unidad_inventario);
            const disponibleInventario = await disponibleEn(ingrediente, ingrediente.unidad_inventario || ingrediente.unidad_receta);

            const itemDetalle = {
                insumo_id: ingrediente.insumo_id,
                insumo_nombre: ingrediente.insumo_nombre,
                // PRIMARIO: unidad de producción/consumo (la de la receta)
                requerido: Number(cantidadProduccion.toFixed(6)),
                disponible: Number(disponibleProduccion.toFixed(6)),
                unidad: etiquetaProduccion(ingrediente),
                unidad_medida: ingrediente.unidad_receta || etiquetaProduccion(ingrediente),
                // SECUNDARIO: equivalente en unidad de almacén/compra
                requerido_inventario: conversionOk && !mismaUnidad ? Number(cantidadInventario.toFixed(6)) : null,
                disponible_inventario: conversionOk && !mismaUnidad ? Number(disponibleInventario.toFixed(6)) : null,
                unidad_inventario: etiquetaInventario(ingrediente),
                unidad_inventario_abrev: ingrediente.unidad_inventario || null,
                areas: areasLabel,
                es_opcional: Number(ingrediente.es_opcional || 0) === 1
            };
            detalle.push(itemDetalle);

            // La decisión de faltante se toma en la unidad en que se comparó
            // (almacén si hay conversión; receta si no).
            const hayStock = conversionOk ? disponibleInventario : disponibleProduccion;
            const requeridoComparar = conversionOk ? cantidadInventario : cantidadProduccion;
            if (hayStock + 0.000001 < requeridoComparar) {
                const conFaltante = { ...itemDetalle, faltante: Number((requeridoComparar - hayStock).toFixed(6)) };
                if (Number(ingrediente.es_opcional || 0) === 1) {
                    advertencias.push({ ...conFaltante, detalle: 'Insumo opcional sin stock suficiente' });
                } else {
                    faltantes.push(conFaltante);
                }
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
