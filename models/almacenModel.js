const db = require('../config/db');

const Almacen = {
    getAll: async () => {
        const [rows] = await db.query('SELECT * FROM almacenes ORDER BY codigo ASC');
        return rows;
    },

    getById: async (id) => {
        const [rows] = await db.query('SELECT *, responsable_usuario_id AS responsable_id FROM almacenes WHERE id = ?', [id]);
        return rows[0];
    },

    getByCodigo: async (codigo) => {
        const [rows] = await db.query('SELECT * FROM almacenes WHERE codigo = ?', [codigo]);
        return rows[0];
    },

    create: async (d) => {
        const query = `INSERT INTO almacenes (codigo, nombre, descripcion, tipo, ubicacion, responsable_usuario_id, permite_ventas, permite_consumo, activo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const [result] = await db.query(query, [d.codigo, d.nombre, d.descripcion, d.tipo, d.ubicacion, d.responsable_usuario_id || null, d.permite_ventas, d.permite_consumo, 1]);
        return result.insertId;
    },

    update: async (id, d) => {
        const query = `UPDATE almacenes SET codigo=?, nombre=?, descripcion=?, tipo=?, ubicacion=?, responsable_usuario_id=?, permite_ventas=?, permite_consumo=?, activo=? WHERE id=?`;
        const [result] = await db.query(query, [d.codigo, d.nombre, d.descripcion, d.tipo, d.ubicacion, d.responsable_usuario_id, d.permite_ventas, d.permite_consumo, d.activo, id]);
        return result.affectedRows > 0;
    },

    updateStatus: async (id, status) => {
        const [result] = await db.query('UPDATE almacenes SET activo = ? WHERE id = ?', [status, id]);
        return result.affectedRows > 0;
    }
};

module.exports = Almacen;