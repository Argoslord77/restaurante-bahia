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
     * Inserta un nuevo registro de apertura de turno y congela las monedas seleccionadas (Transaccional)
     */
    static async createAperturaConMonedas(usuarioId, montoApertura, observaciones, monedasTurno = [], cocineroId = null, bartenderId = null) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const queryTurno = `
                INSERT INTO turnos_servicio 
                (usuario_apertura_id, cocinero_id, bartender_id, monto_apertura, observaciones, estado, fecha_apertura) 
                VALUES (?, ?, ?, ?, ?, 'abierto', NOW())
            `;
            const [result] = await connection.query(queryTurno, [usuarioId, cocineroId || null, bartenderId || null, montoApertura, observaciones || null]);
            const turnoId = result.insertId;

            // Registrar snapshot de monedas para el turno activo.
            // Se limpian filas previas del mismo turno para que un guardado
            // repetido nunca deje monedas duplicadas (que duplicaban los
            // selects de cobro).
            if (Array.isArray(monedasTurno) && monedasTurno.length > 0) {
                await connection.query(
                    'DELETE FROM monedas_turno WHERE turno_servicio_id = ?',
                    [turnoId]
                );
                const queryMoneda = `
                    INSERT INTO monedas_turno (turno_servicio_id, moneda_id, factor_cambio_turno)
                    VALUES ?
                `;
                const values = monedasTurno.map(m => [turnoId, m.moneda_id, m.factor_cambio_turno]);
                await connection.query(queryMoneda, [values]);
            }

            await connection.commit();
            return turnoId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Inserta un nuevo registro de apertura de turno (Retrocompatibilidad)
     */
    static async createApertura(usuarioId, montoApertura, observaciones) {
        return this.createAperturaConMonedas(usuarioId, montoApertura, observaciones, []);
    }

    /**
     * Obtiene la sumatoria total de los pedidos pagados durante un turno específico
     */
    static async sumVentasPorTurno(turnoId) {
        const [rows] = await db.query(
            `SELECT COALESCE(SUM(total), 0) AS total_ventas 
             FROM pedidos 
             WHERE turno_servicio_id = ? 
               AND estado_pago IN ('pagado', 'facturado', 'cortesia')`,
            [turnoId]
        );
        return parseFloat(rows[0].total_ventas || 0);
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
                u2.nombre AS usuario_cierre,
                COALESCE(cs.total_propinas, 0) AS total_propinas
            FROM turnos_servicio t
            LEFT JOIN usuarios u1 ON t.usuario_apertura_id = u1.id
            LEFT JOIN usuarios u2 ON t.usuario_cierre_id = u2.id
            LEFT JOIN cierres_servicio cs ON cs.turno_servicio_id = t.id
            ORDER BY t.fecha_apertura DESC 
            LIMIT ?
        `;
        const [rows] = await db.query(query, [limit]);
        return rows;
    }
}

module.exports = TurnoModel;