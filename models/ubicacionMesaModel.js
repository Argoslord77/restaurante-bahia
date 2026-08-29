// models/ubicacionMesaModel.js
// Catálogo de áreas de servicio (salones/zonas) del establecimiento.
// Las mesas referencian este catálogo mediante mesas.ubicacion_id.
const db = require('../config/db');

const UbicacionMesa = {
    // Listar todas las áreas con el total de mesas asociadas (para Configuración)
    getAllWithMesas: async () => {
        const queryStr = `
            SELECT
                u.id,
                u.nombre,
                u.descripcion,
                u.orden,
                u.activo,
                u.creado_en,
                u.actualizado_en,
                COUNT(m.id) AS total_mesas
            FROM ubicacion_mesa u
            LEFT JOIN mesas m ON m.ubicacion_id = u.id
            GROUP BY u.id
            ORDER BY u.orden ASC, u.nombre ASC
        `;
        const [rows] = await db.query(queryStr);
        return rows;
    },

    // Listar solo áreas activas (para selects de alta/edición de mesas)
    getActivos: async () => {
        const [rows] = await db.query(
            'SELECT id, nombre, orden FROM ubicacion_mesa WHERE activo = 1 ORDER BY orden ASC, nombre ASC'
        );
        return rows;
    },

    getById: async (id) => {
        const [rows] = await db.query(
            'SELECT id, nombre, descripcion, orden, activo FROM ubicacion_mesa WHERE id = ? LIMIT 1',
            [id]
        );
        return rows[0] || null;
    },

    getByNombre: async (nombre) => {
        const [rows] = await db.query(
            'SELECT id, nombre, descripcion, orden, activo FROM ubicacion_mesa WHERE nombre = ? LIMIT 1',
            [nombre]
        );
        return rows[0] || null;
    },

    create: async (data) => {
        const { nombre, descripcion, orden } = data;
        const [result] = await db.query(
            'INSERT INTO ubicacion_mesa (nombre, descripcion, orden, activo) VALUES (?, ?, ?, 1)',
            [nombre, descripcion || null, parseInt(orden, 10) || 0]
        );
        return result;
    },

    update: async (id, data) => {
        const { nombre, descripcion, orden } = data;
        return await db.query(
            'UPDATE ubicacion_mesa SET nombre = ?, descripcion = ?, orden = ? WHERE id = ?',
            [nombre, descripcion || null, parseInt(orden, 10) || 0, id]
        );
    },

    setEstado: async (id, activo) => {
        return await db.query(
            'UPDATE ubicacion_mesa SET activo = ? WHERE id = ?',
            [activo ? 1 : 0, id]
        );
    },

    // Propagar el renombrado de un área al espejo legado mesas.ubicacion
    sincronizarNombreMesas: async (id, nombre) => {
        return await db.query(
            'UPDATE mesas SET ubicacion = ? WHERE ubicacion_id = ?',
            [nombre, id]
        );
    },

    // Propagar el renombrado a la distribución del día en curso
    // (asignaciones_diarias guarda el nombre del área como etiqueta)
    sincronizarAsignacionesHoy: async (nombreAntiguo, nombreNuevo) => {
        return await db.query(
            'UPDATE asignaciones_diarias SET ubicacion = ? WHERE ubicacion = ? AND fecha = CURDATE()',
            [nombreNuevo, nombreAntiguo]
        );
    },

    countMesasAsociadas: async (id) => {
        const [rows] = await db.query(
            'SELECT COUNT(*) AS total FROM mesas WHERE ubicacion_id = ?',
            [id]
        );
        return rows[0] ? parseInt(rows[0].total, 10) : 0;
    },

    delete: async (id) => {
        return await db.query('DELETE FROM ubicacion_mesa WHERE id = ?', [id]);
    }
};

module.exports = UbicacionMesa;
