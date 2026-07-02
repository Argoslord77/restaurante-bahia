const db = require('../config/db');

const ProductoModel = {
    /**
     * Obtiene el listado de productos con cruce de categorías, unidades y foto_url
     */
    getAll: async () => {
        const query = `
            SELECT 
                p.id, p.codigo, p.nombre, p.tipo, p.activo, p.stock_minimo, p.permitida_venta, p.foto_url,
                c.nombre as categoria_nombre,
                u.abreviatura as unidad_nombre
            FROM productos p
            LEFT JOIN categorias c ON p.categoria_id = c.id
            LEFT JOIN unidades_medida u ON p.unidad_inventario_id = u.id
            ORDER BY p.codigo ASC`;
        const [rows] = await db.query(query);
        return rows;
    },

    /**
     * Obtiene un producto específico por ID (incluye foto_url nativamente por el SELECT *)
     */
    getById: async (id) => {
        const [rows] = await db.query('SELECT * FROM productos WHERE id = ?', [id]);
        return rows[0];
    },

    /**
     * Inserta un nuevo producto en la base de datos con foto_url
     */
    create: async (data) => {
        const { 
            codigo, nombre, descripcion, categoria_id, tipo, 
            unidad_compra_id, unidad_inventario_id, stock_minimo, 
            requiere_lote, controla_vencimiento, permitida_venta, foto_url 
        } = data;

        const query = `
            INSERT INTO productos 
            (codigo, nombre, descripcion, categoria_id, tipo, unidad_compra_id, unidad_inventario_id, stock_minimo, requiere_lote, controla_vencimiento, permitida_venta, foto_url) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        
        const [result] = await db.query(query, [
            codigo, nombre, descripcion || null, categoria_id, tipo, 
            unidad_compra_id, unidad_inventario_id, stock_minimo || 0, 
            requiere_lote ? 1 : 0, controla_vencimiento ? 1 : 0,
            permitida_venta ? 1 : 0,
            foto_url || null // Sanitización para almacenar de forma explícita NULL si no hay imagen
        ]);
        return result.insertId;
    },

    /**
     * Modifica los datos de un producto existente incluyendo su foto_url
     */
    update: async (id, data) => {
        const { 
            codigo, nombre, descripcion, categoria_id, tipo, 
            unidad_compra_id, unidad_inventario_id, stock_minimo, 
            requiere_lote, controla_vencimiento, activo, permitida_venta, foto_url 
        } = data;

        const query = `
            UPDATE productos SET 
                codigo = ?, 
                nombre = ?, 
                descripcion = ?, 
                categoria_id = ?, 
                tipo = ?, 
                unidad_compra_id = ?, 
                unidad_inventario_id = ?, 
                stock_minimo = ?, 
                requiere_lote = ?, 
                controla_vencimiento = ?, 
                activo = ?,
                permitida_venta = ?,
                foto_url = ?
            WHERE id = ?`;

        const [result] = await db.query(query, [
            codigo, 
            nombre, 
            descripcion || null, 
            categoria_id, 
            tipo, 
            unidad_compra_id, 
            unidad_inventario_id, 
            stock_minimo || 0, 
            requiere_lote ? 1 : 0, 
            controla_vencimiento ? 1 : 0, 
            activo, 
            permitida_venta ? 1 : 0,
            foto_url || null,
            id
        ]);

        return result.affectedRows > 0;
    },

    /**
     * Elimina un producto permanentemente por su ID
     */
    delete: async (id) => {
        const query = `DELETE FROM productos WHERE id = ?`;
        const [result] = await db.query(query, [id]);
        return result.affectedRows > 0;
    }
};

module.exports = ProductoModel;