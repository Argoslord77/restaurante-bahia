// models/distributionModel.js
const db = require('../config/db');

const Distribution = {
    // Obtener la asignación de una ubicación en la fecha actual
    getByDateAndLocation: async (fecha, ubicacion) => {
        const [rows] = await db.query(
            'SELECT id FROM asignaciones_diarias WHERE fecha = ? AND ubicacion = ?',
            [fecha, ubicacion]
        );
        return rows[0];
    },

    // Obtener el desglose de mesas y dependientes asignados para una asignación principal
    getDetailsByAssignmentId: async (asignacionId) => {
        const [rows] = await db.query(
            `SELECT dam.mesa_id, dam.dependiente_id, u.nombre as dependiente_nombre 
             FROM detalle_asignacion_mesa dam
             JOIN usuarios u ON dam.dependiente_id = u.id
             WHERE dam.asignacion_diaria_id = ?`,
            [asignacionId]
        );
        return rows;
    },

    // Crear el encabezado de la asignación diaria
    createAssignment: async (fecha, ubicacion) => {
        const [result] = await db.query(
            'INSERT INTO asignaciones_diarias (fecha, ubicacion) VALUES (?, ?)',
            [fecha, ubicacion]
        );
        return result.insertId;
    },

    // NUEVO MÉTODO: Guarda o actualiza el registro por lote/fila individual (Upsert por Mesa)
    upsertDetail: async (asignacionId, mesaId, dependienteId) => {
        return await db.query(
            `INSERT INTO detalle_asignacion_mesa (asignacion_diaria_id, mesa_id, dependiente_id) 
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE dependiente_id = VALUES(dependiente_id)`,
            [asignacionId, mesaId, dependienteId]
        );
    }
};

module.exports = Distribution;