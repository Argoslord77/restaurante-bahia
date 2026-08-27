const db = require('../config/db');

const Receta = {
    // Obtener todos los ingredientes de una receta por su receta_id (Stock global)
    getByPlatillo: async (recetaId) => {
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
                rd.orden_preparacion,
                rd.es_opcional,
                p.nombre AS producto_nombre,
                p.codigo AS producto_codigo,
                c.nombre AS categoria_nombre,
                COALESCE((SELECT SUM(l.cantidad_actual) FROM lotes l WHERE l.producto_id = rd.producto_id AND l.cantidad_actual > 0), 0) AS stock_disponible
            FROM receta_detalles rd
            INNER JOIN productos p ON rd.producto_id = p.id
            LEFT JOIN categorias c ON p.categoria_id = c.id
            WHERE rd.receta_id = ?
            ORDER BY rd.orden_preparacion ASC, p.nombre ASC
        `;
        const [rows] = await db.query(query, [recetaId]);
        return rows;
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
                COALESCE((SELECT SUM(l.cantidad_actual) FROM lotes l WHERE l.producto_id = rd.producto_id AND l.almacen_id = ? AND l.cantidad_actual > 0), 0) AS stock_disponible
            FROM receta_detalles rd
            INNER JOIN productos p ON rd.producto_id = p.id
            LEFT JOIN categorias c ON p.categoria_id = c.id
            WHERE rd.receta_id = ?
            ORDER BY rd.orden_preparacion ASC, p.nombre ASC
        `;
        const [rows] = await db.query(query, [almacenId, recetaId]);
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
