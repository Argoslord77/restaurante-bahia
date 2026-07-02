// models/turnoModel.js
const db = require('../config/db');

class TurnoModel {
    /**
     * Busca el turno que actualmente se encuentra abierto
     */
    static async findActive() {
        const [rows] = await db.query(
            "SELECT id, fecha_apertura, monto_apertura, observaciones FROM turnos_servicio WHERE estado = 'abierto' LIMIT 1"
        );
        return rows.length > 0 ? rows[0] : null;
    }

    /**
     * Inserta un nuevo registro de apertura de turno
     */
    static async createApertura(usuarioId, montoApertura, observaciones) {
        const query = `
            INSERT INTO turnos_servicio 
            (usuario_apertura_id, monto_apertura, observaciones, estado, fecha_apertura) 
            VALUES (?, ?, ?, 'abierto', NOW())
        `;
        const [result] = await db.query(query, [usuarioId, montoApertura, observaciones || null]);
        return result.insertId;
    }

    /**
     * Obtiene la sumatoria total de los pedidos pagados durante un turno específico
     */
    static async sumVentasPorTurno(turnoId) {
        const [rows] = await db.query(
            "SELECT COALESCE(SUM(total), 0) AS total_ventas FROM pedidos WHERE turno_servicio_id = ? AND estado = 'pagado'",
            [turnoId]
        );
        return parseFloat(rows[0].total_ventas);
    }

    /**
     * Actualiza el turno para efectuar el cierre financiero formal
     */
    static async updateCierre(turnoId, usuarioCierreId, montoEsperado, montoCierreReal, notasFinales) {
        const query = `
            UPDATE turnos_servicio 
            SET 
                usuario_cierre_id = ?, 
                fecha_cierre = NOW(), 
                monto_cierre_esperado = ?, 
                monto_cierre_real = ?, 
                estado = 'cerrado', 
                observaciones = ?
            WHERE id = ?
        `;
        await db.query(query, [usuarioCierreId, montoEsperado, montoCierreReal, notasFinales, turnoId]);
        return true;
    }

    /**
     * Trae el historial general con JOINs integrados para auditoría
     */
    static async getHistorialCompleto(limit = 15) {
        const query = `
            SELECT 
                t.id,
                t.fecha_apertura,
                t.fecha_cierre,
                t.monto_apertura,
                t.monto_cierre_esperado,
                t.monto_cierre_real,
                t.estado,
                t.observaciones,
                u1.nombre AS usuario_apertura,
                u2.nombre AS usuario_cierre
            FROM turnos_servicio t
            LEFT JOIN usuarios u1 ON t.usuario_apertura_id = u1.id
            LEFT JOIN usuarios u2 ON t.usuario_cierre_id = u2.id
            ORDER BY t.fecha_apertura DESC 
            LIMIT ?
        `;
        const [rows] = await db.query(query, [limit]);
        return rows;
    }
}

module.exports = TurnoModel;