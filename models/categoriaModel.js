// models/categoriaModel.js
const db = require('../config/db');

const Categoria = {
    // Obtener todas las categorías con el nombre de su almacén asignado
    getAll: async () => {
        const query = `
            SELECT 
                c.id, 
                c.nombre, 
                c.descripcion,
                c.tipo,
                c.almacen_id, 
                COALESCE(a.nombre, 'Sin almacén') AS almacen_nombre,
                c.activo,
                (SELECT COUNT(*) FROM platillos_menu p WHERE p.categoria = c.id) AS total_platillos
            FROM categorias c
            LEFT JOIN almacenes a ON c.almacen_id = a.id
            ORDER BY c.nombre ASC
        `;
        const [rows] = await db.query(query);
        return rows;
    },

    getById: async (id) => {
        const [rows] = await db.query('SELECT * FROM categorias WHERE id = ?', [id]);
        return rows[0] || null;
    },

    create: async (data) => {
        const { nombre, descripcion, tipo, almacen_id } = data;
        const [result] = await db.query(
            'INSERT INTO categorias (nombre, descripcion, tipo, almacen_id, activo) VALUES (?, ?, ?, ?, 1)',
            [nombre, descripcion || null, tipo || 'producto_venta', almacen_id || null]
        );
        return result.insertId;
    },

    update: async (id, data) => {
        const { nombre, descripcion, tipo, almacen_id } = data;
        await db.query(
            'UPDATE categorias SET nombre = ?, descripcion = ?, tipo = ?, almacen_id = ? WHERE id = ?',
            [nombre, descripcion || null, tipo || 'producto_venta', almacen_id || null, id]
        );
    },

    toggleEstado: async (id, activo) => {
        await db.query('UPDATE categorias SET activo = ? WHERE id = ?', [activo, id]);
    },

    delete: async (id) => {
        await db.query('DELETE FROM categorias WHERE id = ?', [id]);
    }
};

module.exports = Categoria;