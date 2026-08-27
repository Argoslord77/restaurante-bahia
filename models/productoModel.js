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
            unidad_compra_id, unidad_inventario_id, unidad_consumo_id, stock_minimo, costo_promedio,
            requiere_lote, controla_vencimiento, permitida_venta, foto_url 
        } = data;

        const query = `
            INSERT INTO productos 
            (codigo, nombre, descripcion, categoria_id, tipo, unidad_compra_id, unidad_inventario_id, unidad_consumo_id, stock_minimo, costo_promedio, requiere_lote, controla_vencimiento, permitida_venta, foto_url) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        
        const [result] = await db.query(query, [
            codigo, nombre, descripcion || null, categoria_id, tipo, 
            unidad_compra_id, unidad_inventario_id, unidad_consumo_id, stock_minimo || 0,
            parseFloat(costo_promedio) || 0,
            requiere_lote ? 1 : 0, controla_vencimiento ? 1 : 0,
            permitida_venta ? 1 : 0,
            foto_url || null
        ]);
        return result.insertId;
    },

    /**
     * Modifica los datos de un producto existente incluyendo su foto_url
     */
    update: async (id, data) => {
        const { 
            codigo, nombre, descripcion, categoria_id, tipo, 
            unidad_compra_id, unidad_inventario_id, unidad_consumo_id, stock_minimo, costo_promedio,
            requiere_lote, controla_vencimiento, activo, permitida_venta, foto_url 
        } = data;

        const query = `
            UPDATE productos SET 
                codigo = ?, nombre = ?, descripcion = ?, categoria_id = ?, tipo = ?, 
                unidad_compra_id = ?, unidad_inventario_id = ?, unidad_consumo_id = ?, stock_minimo = ?, 
                costo_promedio = ?,
                requiere_lote = ?, controla_vencimiento = ?, activo = ?,
                permitida_venta = ?, foto_url = ?
            WHERE id = ?`;

        const [result] = await db.query(query, [
            codigo, nombre, descripcion || null, categoria_id, tipo, 
            unidad_compra_id, unidad_inventario_id, unidad_consumo_id, stock_minimo || 0,
            parseFloat(costo_promedio) || 0,
            requiere_lote ? 1 : 0, controla_vencimiento ? 1 : 0, 
            activo, permitida_venta ? 1 : 0, foto_url || null,
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
    },

    /**
     * Obtiene únicamente los productos activos marcados como 'producto_preparado'
     */
    getPreparados: async () => {
        const query = `
            SELECT 
                p.id, p.codigo, p.nombre, p.tipo, p.activo, p.foto_url,
                c.nombre as categoria_nombre,
                u.nombre as unidad_medida_nombre,
                u.abreviatura as unidad_nombre
            FROM productos p
            LEFT JOIN categorias c ON p.categoria_id = c.id
            LEFT JOIN unidades_medida u ON p.unidad_inventario_id = u.id
            WHERE p.tipo = 'producto_preparado' AND p.activo = 1
            ORDER BY p.nombre ASC`;
        const [rows] = await db.query(query);
        return rows;
    },

    /**
     * Obtiene únicamente los productos activos marcados como 'materia_prima'
     */
    getMateriasPrimas: async () => {
        const query = `
            SELECT 
                p.id, p.codigo, p.nombre, p.tipo, p.activo, p.foto_url,
                c.nombre as categoria_nombre,
                u.nombre as unidad_medida_nombre,
                u.abreviatura as unidad_nombre
            FROM productos p
            LEFT JOIN categorias c ON p.categoria_id = c.id
            LEFT JOIN unidades_medida u ON p.unidad_inventario_id = u.id
            WHERE p.tipo = 'materia_prima' AND p.activo = 1
            ORDER BY p.nombre ASC`;
        const [rows] = await db.query(query);
        return rows;
    },

    /**
     * Obtiene únicamente los productos activos marcados como 'producto_venta'
     */
    getProductosVenta: async () => {
        const query = `
            SELECT 
                p.id, p.codigo, p.nombre, p.tipo, p.activo, p.foto_url,
                c.nombre as categoria_nombre,
                u.nombre as unidad_medida_nombre,
                u.abreviatura as unidad_nombre
            FROM productos p
            LEFT JOIN categorias c ON p.categoria_id = c.id
            LEFT JOIN unidades_medida u ON p.unidad_inventario_id = u.id
            WHERE p.tipo = 'producto_venta' AND p.activo = 1
            ORDER BY p.nombre ASC`;
        const [rows] = await db.query(query);
        return rows;
    },

    /**
     * Obtiene únicamente los productos activos marcados como 'material_operativo'
     */
    getMaterialOperativo: async () => {
        const query = `
            SELECT 
                p.id, p.codigo, p.nombre, p.tipo, p.activo, p.foto_url,
                c.nombre as categoria_nombre,
                u.nombre as unidad_medida_nombre,
                u.abreviatura as unidad_nombre
            FROM productos p
            LEFT JOIN categorias c ON p.categoria_id = c.id
            LEFT JOIN unidades_medida u ON p.unidad_inventario_id = u.id
            WHERE p.tipo = 'material_operativo' AND p.activo = 1
            ORDER BY p.nombre ASC`;
        const [rows] = await db.query(query);
        return rows;
    }
};

module.exports = ProductoModel;