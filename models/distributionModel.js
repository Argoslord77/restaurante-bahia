// models/distributionModel.js
const db = require('../config/db');

const Distribution = {
    // Obtener la asignación principal vinculada a un turno activo y ubicación específica
    getByTurnoAndLocation: async (turnoId, ubicacion) => {
        const [rows] = await db.query(
            'SELECT id FROM asignaciones_diarias WHERE turno_id = ? AND ubicacion = ?',
            [turnoId, ubicacion]
        );
        return rows[0];
    },

    // Obtener la asignación por fecha y ubicación (compatibilidad con consultas históricas)
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

    // Crear la asignación diaria vinculada opcionalmente al turno_id y/o fecha
    createAssignment: async (fecha, ubicacion, turnoId = null) => {
        const [result] = await db.query(
            'INSERT INTO asignaciones_diarias (fecha, ubicacion, turno_id) VALUES (?, ?, ?)',
            [fecha, ubicacion, turnoId]
        );
        return result.insertId;
    },

    // Guarda o actualiza el registro de mesa por dependiente (Upsert por Mesa)
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