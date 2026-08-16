const db = require('../config/db');

const CategoriaPlatillo = {
    getAll: async () => {
        const query = `
            SELECT 
                cp.id, 
                cp.nombre, 
                cp.descripcion,
                cp.almacen_id, 
                cp.tipo, 
                COALESCE(a.nombre, 'Sin almacén asignado') AS almacen_nombre,
                cp.activo,
                (SELECT COUNT(*) FROM platillos_menu p WHERE p.categoria = cp.id) AS total_platillos
            FROM categorias_platillos cp
            LEFT JOIN almacenes a ON cp.almacen_id = a.id
            ORDER BY cp.nombre ASC
        `;
        const [rows] = await db.query(query);
        return rows;
    },

    getById: async (id) => {
        const [rows] = await db.query('SELECT * FROM categorias_platillos WHERE id = ?', [id]);
        return rows[0] || null;
    },

    create: async (data) => {
        const { nombre, descripcion, almacen_id } = data;
        const [result] = await db.query(
            'INSERT INTO categorias_platillos (nombre, descripcion, almacen_id, tipo, activo) VALUES (?, ?, ?, ?, 1)',
            [nombre, descripcion || null, almacen_id || null, tipo || null]
        );
        return result.insertId;
    },

    update: async (id, data) => {
        const { nombre, descripcion, almacen_id, tipo } = data;
        await db.query(
            'UPDATE categorias_platillos SET nombre = ?, descripcion = ?, almacen_id = ?, tipo = ? WHERE id = ?',
            [nombre, descripcion || null, almacen_id || null, tipo || null, id]
        );
    },

    toggleEstado: async (id, activo) => {
        await db.query('UPDATE categorias_platillos SET activo = ? WHERE id = ?', [activo, id]);
    },

    delete: async (id) => {
        await db.query('DELETE FROM categorias_platillos WHERE id = ?', [id]);
    }
};

module.exports = CategoriaPlatillo;