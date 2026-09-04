const db = require('../config/db');
const Schema = require('../config/schema');
const UnidadMedidaService = require('../services/unidadMedidaService');

const Receta = {
    // Obtener todos los ingredientes de una receta por su receta_id.
    // Además del stock global, devuelve el stock segmentado por categoría
    // operativa de almacén: logístico (abastecedor) y producción (el que
    // realmente consume el POS al vender).
    getByPlatillo: async (recetaId) => {
        if (!db) return [];
        const categoriaExpr = await Schema.categoriaAlmacenExpr('a');
        const subStock = (filtroCategoria) => `
            COALESCE((
                SELECT SUM(l.cantidad_actual)
                  FROM lotes l
                  INNER JOIN almacenes a ON a.id = l.almacen_id
                 WHERE l.producto_id = rd.producto_id
                   AND l.cantidad_actual > 0
                   AND (l.estado IS NULL OR l.estado = 'ACTIVO')
                   AND a.activo = 1
                   ${filtroCategoria}
            ), 0)`;

        const query = `
            SELECT 
                rd.id,
                rd.receta_id,
                rd.producto_id,
                rd.cantidad AS cantidad_requerida,
                rd.unidad_medida,
                rd.porcentaje_merma,
                rd.costo_estimado,
                rd.orden_preparacion,
                rd.es_opcional,
                p.nombre AS producto_nombre,
                p.codigo AS producto_codigo,
                c.nombre AS categoria_nombre,
                COALESCE((SELECT SUM(l.cantidad_actual) FROM lotes l WHERE l.producto_id = rd.producto_id AND l.cantidad_actual > 0), 0) AS stock_disponible,
                ${subStock(`AND ${categoriaExpr} = 'logistico'`)} AS stock_logistico,
                ${subStock(`AND ${categoriaExpr} = 'produccion'`)} AS stock_produccion
            FROM receta_detalles rd
            INNER JOIN productos p ON rd.producto_id = p.id
            LEFT JOIN categorias c ON p.categoria_id = c.id
            WHERE rd.receta_id = ?
            ORDER BY rd.orden_preparacion ASC, p.nombre ASC
        `;
        const [rows] = await db.query(query, [recetaId]);
        return await Receta._converitirStockADetalles(rows, categoriaExpr);
    },

    /**
     * Recalcula los campos de stock de cada detalle aplicando la CONVERSIÓN
     * de unidades de cada lote a la unidad de la receta (rd.unidad_medida).
     *
     * Sin esto, un insumo con lotes en "Botella 700ml" mostraba la cantidad de
     * botellas (7) como si fueran mililitros, cuando la receta lo pide en ML.
     * `stock_disponible/logistico/produccion` pasan a estar expresados en la
     * MISMA unidad que `cantidad_requerida`, permitiendo la comparación real.
     */
    _converitirStockADetalles: async (rows, categoriaExpr) => {
        if (!rows || rows.length === 0) return rows || [];

        // Mapa almacen_id -> categoria operativa (logistico | produccion)
        let categoriaPorAlmacen = {};
        try {
            const [almacenes] = await db.query(`
                SELECT a.id AS almacen_id, ${categoriaExpr} AS almacen_categoria
                FROM almacenes a
                WHERE a.activo = 1
            `);
            for (const a of almacenes) {
                categoriaPorAlmacen[a.almacen_id] = a.almacen_categoria;
            }
        } catch (e) {
            // Si no se puede leer la categoría, se asume todo como produccion
            // para no romper la vista; el total disponible sigue siendo correcto.
        }

        // Caché por producto para no repetir la conversión entre filas
        const cacheStock = new Map();

        for (const fila of rows) {
            const clave = `${fila.producto_id}::${fila.unidad_medida}`;
            if (!cacheStock.has(clave)) {
                let conv = { total: 0, porAlmacen: {} };
                try {
                    conv = await UnidadMedidaService.stockLotesConvertidos(
                        fila.producto_id,
                        fila.unidad_medida,
                        { estrictoActivo: false }
                    );
                } catch (e) {
                    // Sin conversión disponible: se conserva el valor crudo del SQL
                    conv = {
                        total: parseFloat(fila.stock_disponible || 0),
                        porAlmacen: {}
                    };
                }
                cacheStock.set(clave, conv);
            }
            const conv = cacheStock.get(clave);

            // El valor crudo del SQL se usa como referencia cuando la conversión
            // devolvió cero pero el SQL tenía stock (no debería ocurrir).
            fila.stock_disponible = conv.total > 0 ? conv.total : parseFloat(fila.stock_disponible || 0);

            let logistico = 0;
            let produccion = 0;
            for (const [almacenId, cant] of Object.entries(conv.porAlmacen)) {
                const categoria = categoriaPorAlmacen[Number(almacenId)];
                if (categoria === 'logistico') logistico += cant;
                else produccion += cant; // produccion o sin categoría conocida
            }
            // Si la conversión no produjo desglose, se conservan los valores crudos
            fila.stock_logistico = logistico > 0 ? logistico : parseFloat(fila.stock_logistico || 0);
            fila.stock_produccion = produccion > 0 ? produccion : parseFloat(fila.stock_produccion || 0);
        }
        return rows;
    },

    /**
     * Desglose fino: una fila por (ingrediente de la receta × almacén operativo).
     * Incluye los almacenes con existencia CERO para que la ficha técnica muestre
     * explícitamente dónde falta el insumo, no solo dónde lo hay.
     *
     * @returns {Array<{producto_id, almacen_id, almacen_codigo, almacen_nombre, almacen_categoria, stock}>}
     */
    getDesgloseStockPorAlmacen: async (recetaId) => {
        if (!db) return [];
        const categoriaExpr = await Schema.categoriaAlmacenExpr('a');
        const query = `
            SELECT
                rd.producto_id,
                a.id       AS almacen_id,
                a.codigo   AS almacen_codigo,
                a.nombre   AS almacen_nombre,
                ${categoriaExpr} AS almacen_categoria,
                COALESCE(SUM(l.cantidad_actual), 0) AS stock
            FROM receta_detalles rd
            CROSS JOIN almacenes a
            LEFT JOIN lotes l
                   ON l.producto_id = rd.producto_id
                  AND l.almacen_id  = a.id
                  AND l.cantidad_actual > 0
                  AND (l.estado IS NULL OR l.estado = 'ACTIVO')
            WHERE rd.receta_id = ?
              AND a.activo = 1
              AND ${categoriaExpr} IN ('logistico', 'produccion')
            GROUP BY rd.producto_id, a.id, a.codigo, a.nombre, ${categoriaExpr}
            ORDER BY ${categoriaExpr} DESC, a.nombre ASC
        `;
        const [rows] = await db.query(query, [recetaId]);

        // Reemplaza el stock crudo por el stock CONVERTIDO a la unidad de la
        // receta (el SQL suma cantidad_actual en la unidad de cada lote).
        const [detallesReceta] = await db.query(
            'SELECT producto_id, unidad_medida FROM receta_detalles WHERE receta_id = ?',
            [recetaId]
        );
        const unidadPorProducto = new Map(detallesReceta.map(d => [d.producto_id, d.unidad_medida]));

        const cacheStock = new Map();
        for (const fila of rows) {
            const clave = String(fila.producto_id);
            if (!cacheStock.has(clave)) {
                const unidadReceta = unidadPorProducto.get(fila.producto_id) || null;
                let conv = { porAlmacen: {} };
                if (unidadReceta) {
                    try {
                        conv = await UnidadMedidaService.stockLotesConvertidos(fila.producto_id, unidadReceta, { estrictoActivo: false });
                    } catch (e) {
                        conv = { porAlmacen: {} };
                    }
                }
                cacheStock.set(clave, conv);
            }
            const conv = cacheStock.get(clave);
            if (conv.porAlmacen && conv.porAlmacen[fila.almacen_id] > 0) {
                fila.stock = conv.porAlmacen[fila.almacen_id];
            }
        }
        return rows;
    },

    /**
     * Resuelve el ID de la receta ACTIVA que produce un platillo del menú.
     *
     * ⚠️ `detalles_pedido.id_platillo` apunta a `platillos_menu.id`, NO a
     * `recetas.id`. El enlace canónico es `recetas.platillo_id` (y, en
     * instalaciones que la tengan, `recetas.producto_resultante_id`), tal como
     * ya lo resuelve InventarioService.descontarPorReceta.
     *
     * @returns {number|null} receta_id, o null si el platillo no tiene receta activa.
     */
    resolverRecetaIdPorPlatillo: async (platilloId) => {
        if (!db || !platilloId) return null;
        const tieneResultante = await Schema.hasColumn('recetas', 'producto_resultante_id');
        const condicion = tieneResultante
            ? '(r.platillo_id = ? OR r.producto_resultante_id = ?)'
            : 'r.platillo_id = ?';
        const params = tieneResultante ? [platilloId, platilloId] : [platilloId];

        const [rows] = await db.query(
            `SELECT r.id
               FROM recetas r
              WHERE r.activa = 1
                AND ${condicion}
              ORDER BY r.id ASC
              LIMIT 1`,
            params
        );
        return rows.length ? rows[0].id : null;
    },

    /**
     * Ingredientes a descontar por la venta de un PLATILLO DEL MENÚ, con el
     * stock disponible en un almacén concreto (que siempre debe ser de
     * producción).
     *
     * A diferencia de `getByPlatilloAndAlmacen`, que recibe un `receta_id`,
     * esta función parte del `platillos_menu.id` que viaja en el pedido y
     * resuelve la receta por el enlace correcto.
     *
     * @returns {Array} Vacío si el platillo no tiene receta activa (no lleva
     *                  explosión de inventario, p. ej. una bebida embotellada).
     */
    getIngredientesParaVenta: async (platilloId, almacenId) => {
        if (!db) return [];
        const recetaId = await Receta.resolverRecetaIdPorPlatillo(platilloId);
        if (!recetaId) return [];
        return await Receta.getByPlatilloAndAlmacen(recetaId, almacenId);
    },

    getByPlatilloAndAlmacen: async (recetaId, almacenId) => {
        if (!db) return [];
        const query = `
            SELECT 
                rd.id,
                rd.receta_id,
                rd.producto_id,
                rd.cantidad AS cantidad_requerida,
                rd.unidad_medida,
                rd.porcentaje_merma,
                rd.costo_estimado,
                rd.es_opcional,
                p.nombre AS producto_nombre,
                p.codigo AS producto_codigo,
                c.nombre AS categoria_nombre,
                COALESCE((SELECT SUM(l.cantidad_actual) FROM lotes l WHERE l.producto_id = rd.producto_id AND l.almacen_id = ? AND l.cantidad_actual > 0 AND (l.estado IS NULL OR l.estado = 'ACTIVO')), 0) AS stock_disponible
            FROM receta_detalles rd
            INNER JOIN productos p ON rd.producto_id = p.id
            LEFT JOIN categorias c ON p.categoria_id = c.id
            WHERE rd.receta_id = ?
            ORDER BY rd.orden_preparacion ASC, p.nombre ASC
        `;
        const [rows] = await db.query(query, [almacenId, recetaId]);

        // Stock disponible convertido a la unidad de la receta (el subquery SQL
        // suma cantidad_actual en la unidad de cada lote).
        for (const fila of rows) {
            if (!fila.unidad_medida) continue;
            try {
                const conv = await UnidadMedidaService.stockLotesConvertidos(
                    fila.producto_id,
                    fila.unidad_medida,
                    { almacenId, estrictoActivo: false }
                );
                if (conv.total > 0) fila.stock_disponible = conv.total;
            } catch (e) {
                // Sin conversión: se conserva el valor crudo
            }
        }
        return rows;
    },

    // Obtener todas las recetas con datos del platillo vinculado
    getAll: async () => {
        if (!db) return [];
        const query = `
            SELECT 
                r.id,
                r.codigo,
                r.nombre AS receta_nombre,
                r.descripcion,
                r.tipo,
                r.platillo_id,
                r.rendimiento,
                r.unidad_rendimiento,
                r.tiempo_preparacion_minutos,
                r.costo_estimado,
                r.precio_sugerido,
                r.activa,
                r.observaciones,
                pm.nombre AS producto_resultante_nombre
            FROM recetas r
            LEFT JOIN platillos_menu pm ON r.platillo_id = pm.id
            ORDER BY r.nombre ASC
        `;
        const [rows] = await db.query(query);
        return rows;
    },

    // Obtener una sola cabecera por ID
    getById: async (id) => {
        if (!db) return null;
        const query = 'SELECT * FROM recetas WHERE id = ?';
        const [rows] = await db.query(query, [id]);
        return rows[0] || null;
    },

    // Buscar receta por código exacto (para validación de duplicados)
    getByCodigo: async (codigo, excludeId = null) => {
        if (!db || !codigo) return null;
        let query = 'SELECT id, codigo, nombre FROM recetas WHERE UPPER(TRIM(codigo)) = UPPER(TRIM(?))';
        const params = [codigo.toString().trim()];
        if (excludeId) {
            query += ' AND id != ?';
            params.push(excludeId);
        }
        const [rows] = await db.query(query, params);
        return rows[0] || null;
    },

    // Crear la cabecera de la nueva receta (Sujeto a Transacción)
    createTransactional: async (connection, recetaData) => {
        const query = `
            INSERT INTO recetas (codigo, nombre, descripcion, tipo, platillo_id, rendimiento, unidad_rendimiento, tiempo_preparacion_minutos, costo_estimado, precio_sugerido, activa, version, observaciones, creada_por)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = await connection.query(query, [
            recetaData.codigo,
            recetaData.nombre,
            recetaData.descripcion || null,
            recetaData.tipo || 'VENTA',
            recetaData.platillo_id || null,
            recetaData.rendimiento || 1.000,
            recetaData.unidad_rendimiento || 'Porción',
            recetaData.tiempo_preparacion_minutos || null,
            recetaData.costo_estimado || 0.0000,
            recetaData.precio_sugerido || null,
            recetaData.activa !== undefined ? recetaData.activa : 1,
            recetaData.version || 1,
            recetaData.observaciones || null,
            recetaData.creada_por || null
        ]);
        return result.insertId;
    },

    // Insertar desglose de ingredientes masivo (Sujeto a Transacción)
    insertDetallesTransactional: async (connection, recetaId, detalles) => {
        if (!detalles || detalles.length === 0) return;
        // area_exigida (cocina/bar/ambas) — tolerante a BD sin migrar
        let tieneArea = false;
        try {
            const cols = await connection.query("SHOW COLUMNS FROM receta_detalles LIKE 'area_exigida'");
            tieneArea = Array.isArray(cols) && Array.isArray(cols[0]) ? cols[0].length > 0 : !!cols;
        } catch (_) { tieneArea = false; }
        const normalizaArea = (v) => {
            const s = String(v || 'ambas').toLowerCase();
            return ['cocina','bar','ambas'].includes(s) ? s : 'ambas';
        };
        if (tieneArea) {
            const query = `
                INSERT INTO receta_detalles
                (receta_id, producto_id, cantidad, unidad_medida, porcentaje_merma, costo_estimado, orden_preparacion, es_opcional, area_exigida)
                VALUES ?
            `;
            const values = detalles.map((d, index) => [
                recetaId,
                d.producto_id,
                d.cantidad_requerida || d.cantidad || 0,
                d.unidad_medida || 'Unidad',
                d.porcentaje_merma || 0.00,
                d.costo_estimado || 0.0000,
                d.orden_preparacion || (index + 1),
                d.es_opcional ? 1 : 0,
                normalizaArea(d.area_exigida)
            ]);
            await connection.query(query, [values]);
        } else {
            const query = `
                INSERT INTO receta_detalles
                (receta_id, producto_id, cantidad, unidad_medida, porcentaje_merma, costo_estimado, orden_preparacion, es_opcional)
                VALUES ?
            `;
            const values = detalles.map((d, index) => [
                recetaId,
                d.producto_id,
                d.cantidad_requerida || d.cantidad || 0,
                d.unidad_medida || 'Unidad',
                d.porcentaje_merma || 0.00,
                d.costo_estimado || 0.0000,
                d.orden_preparacion || (index + 1),
                d.es_opcional ? 1 : 0
            ]);
            await connection.query(query, [values]);
        }
    },

    // Actualizar cabecera de la receta (Sujeto a Transacción)
    updateTransactional: async (connection, id, recetaData) => {
        const query = `
            UPDATE recetas 
            SET codigo = ?, nombre = ?, descripcion = ?, tipo = ?, platillo_id = ?, rendimiento = ?, unidad_rendimiento = ?, tiempo_preparacion_minutos = ?, costo_estimado = ?, precio_sugerido = ?, activa = ?, version = ?, observaciones = ?
            WHERE id = ?
        `;
        await connection.query(query, [
            recetaData.codigo,
            recetaData.nombre,
            recetaData.descripcion || null,
            recetaData.tipo || 'VENTA',
            recetaData.platillo_id || null,
            recetaData.rendimiento || 1.000,
            recetaData.unidad_rendimiento || 'Porción',
            recetaData.tiempo_preparacion_minutos || null,
            recetaData.costo_estimado || 0.0000,
            recetaData.precio_sugerido || null,
            recetaData.activa !== undefined ? recetaData.activa : 1,
            recetaData.version || 1,
            recetaData.observaciones || null,
            id
        ]);
    },

    // Limpiar ingredientes viejos antes de reescribir (Sujeto a Transacción)
    deleteDetallesTransactional: async (connection, recetaId) => {
        const query = 'DELETE FROM receta_detalles WHERE receta_id = ?';
        await connection.query(query, [recetaId]);
    },

    // ELIMINACIÓN DEFINITIVA DE LA BASE DE DATOS (Hard Delete)
    // Borra de forma atómica los ingredientes asociados en receta_detalles y la cabecera en recetas
    delete: async (id) => {
        if (!db) return;
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            // 1. Borrar todos los ingredientes dependientes de la receta
            await connection.query('DELETE FROM receta_detalles WHERE receta_id = ?', [id]);
            // 2. Borrar la fila principal de la receta
            await connection.query('DELETE FROM recetas WHERE id = ?', [id]);
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    /**
     * Obtiene los platillos de la tabla platillos_menu vinculados a recetas 
     * que utilicen un producto específico como ingrediente.
     */
    getPlatillosByProducto: async (productoId) => {
        if (!db) return [];
        const query = `
            SELECT 
                pm.id AS platillo_menu_id,
                pm.nombre AS platillo_menu_nombre,
                r.id AS receta_id,
                r.codigo AS receta_codigo,
                r.nombre AS receta_nombre,
                r.tipo AS receta_tipo,
                rd.cantidad AS cantidad_requerida,
                rd.unidad_medida AS unidad_medida_receta,
                rd.es_opcional
            FROM receta_detalles rd
            INNER JOIN recetas r ON rd.receta_id = r.id
            INNER JOIN platillos_menu pm ON r.platillo_id = pm.id
            WHERE rd.producto_id = ? AND r.activa = 1
            ORDER BY pm.nombre ASC;
        `;
        const [rows] = await db.query(query, [productoId]);
        return rows;
    },

    // Desactivar / Activar lógicamente (cambio de estado)
    updateEstado: async (id, activa) => {
        if (!db) return;
        const query = 'UPDATE recetas SET activa = ? WHERE id = ?';
        await db.query(query, [activa, id]);
    },

    // Eliminar un ingrediente individual por su ID de detalle
    deleteDetalle: async (detalleId) => {
        if (!db) return;
        const query = 'DELETE FROM receta_detalles WHERE id = ?';
        const [result] = await db.query(query, [detalleId]);
        return result;
    },

    // Agregar un ingrediente individual a una receta existente
    addDetalle: async (detalleData) => {
        if (!db) return;
        const query = `
            INSERT INTO receta_detalles 
            (receta_id, producto_id, cantidad, unidad_medida, porcentaje_merma, es_opcional, orden_preparacion)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = await db.query(query, [
            detalleData.receta_id,
            detalleData.producto_id,
            detalleData.cantidad_requerida || detalleData.cantidad || 0,
            detalleData.unidad_medida || 'Unidad',
            detalleData.porcentaje_merma || 0,
            detalleData.es_opcional ? 1 : 0,
            detalleData.orden_preparacion || 1
        ]);
        return result.insertId;
    }
};

module.exports = Receta;
