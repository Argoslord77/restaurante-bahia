// tienda/services/cajaService.js — Turnos de caja: apertura con fondo,
// cierre con conteo de efectivo e historial. Solo un turno abierto.
const pool = require('../config/db');

function redondear(n) {
    return Math.round((Number(n) || 0) * 100) / 100;
}

const CajaService = {
    async turnoAbierto() {
        const [filas] = await pool.query(`
            SELECT t.*, u.nombre AS abierto_por_nombre
            FROM turnos_caja t
            LEFT JOIN usuarios u ON t.abierto_por = u.id
            WHERE t.estado = 'abierto'
            ORDER BY t.id DESC LIMIT 1
        `);
        return filas.length ? filas[0] : null;
    },

    async abrir({ usuario_id, fondo = 0 }) {
        const f = Math.max(0, Number(fondo) || 0);
        if (await this.turnoAbierto()) throw new Error('Ya hay un turno de caja abierto.');
        const [r] = await pool.query(`
            INSERT INTO turnos_caja (abierto_por, fondo_inicial) VALUES (?, ?)
        `, [usuario_id || null, f]);
        return r.insertId;
    },

    // Resumen del turno: ventas cobradas, pagos por método y efectivo esperado
    // (fondo + efectivo recibido − cambio entregado).
    async resumenTurno(turno_id) {
        const [turnos] = await pool.query(`
            SELECT t.*, a.nombre AS abierto_por_nombre, c.nombre AS cerrado_por_nombre
            FROM turnos_caja t
            LEFT JOIN usuarios a ON t.abierto_por = a.id
            LEFT JOIN usuarios c ON t.cerrado_por = c.id
            WHERE t.id = ? LIMIT 1
        `, [turno_id]);
        if (!turnos.length) throw new Error('El turno no existe.');
        const turno = turnos[0];
        const [ventas] = await pool.query(`
            SELECT COUNT(*) AS n, COALESCE(SUM(total), 0) AS total, COALESCE(SUM(cambio), 0) AS cambio
            FROM ventas WHERE turno_id = ? AND estado = 'cobrada'
        `, [turno_id]);
        const [pagos] = await pool.query(`
            SELECT pg.metodo, COALESCE(SUM(pg.monto), 0) AS monto
            FROM pagos_venta pg
            INNER JOIN ventas v ON pg.venta_id = v.id
            WHERE v.turno_id = ? AND v.estado = 'cobrada'
            GROUP BY pg.metodo
        `, [turno_id]);
        const porMetodo = { efectivo: 0, tarjeta: 0, transferencia: 0 };
        for (const p of pagos) porMetodo[p.metodo] = Number(p.monto) || 0;
        const fondo = Number(turno.fondo_inicial) || 0;
        const esperado = redondear(fondo + porMetodo.efectivo - (Number(ventas[0].cambio) || 0));
        return {
            turno,
            ventas_n: Number(ventas[0].n) || 0,
            ventas_total: redondear(ventas[0].total),
            porMetodo: {
                efectivo: redondear(porMetodo.efectivo),
                tarjeta: redondear(porMetodo.tarjeta),
                transferencia: redondear(porMetodo.transferencia)
            },
            fondo: redondear(fondo),
            esperado_efectivo: esperado
        };
    },

    async cerrar({ turno_id, usuario_id, conteo_efectivo, nota = null }) {
        const conteo = Number(conteo_efectivo);
        if (!Number.isFinite(conteo) || conteo < 0) throw new Error('Conteo no válido.');
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();
            const [turnos] = await conn.query(
                'SELECT * FROM turnos_caja WHERE id = ? FOR UPDATE', [turno_id]);
            if (!turnos.length) throw new Error('El turno no existe.');
            if (turnos[0].estado !== 'abierto') throw new Error('El turno ya está cerrado.');
            const resumen = await this.resumenTurno(turno_id);
            const diferencia = redondear(conteo - resumen.esperado_efectivo);
            await conn.query(`
                UPDATE turnos_caja
                SET estado = 'cerrado', cerrado_por = ?, cerrado_en = NOW(),
                    conteo_efectivo = ?, diferencia = ?, nota = ?
                WHERE id = ?
            `, [usuario_id || null, redondear(conteo), diferencia, nota || null, turno_id]);
            await conn.commit();
            return { ...resumen, conteo: redondear(conteo), diferencia };
        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }
    },

    async historial(limite = 30) {
        const [filas] = await pool.query(`
            SELECT t.*, a.nombre AS abierto_por_nombre, c.nombre AS cerrado_por_nombre,
                   (SELECT COUNT(*) FROM ventas v WHERE v.turno_id = t.id AND v.estado = 'cobrada') AS ventas_n,
                   (SELECT COALESCE(SUM(v.total), 0) FROM ventas v WHERE v.turno_id = t.id AND v.estado = 'cobrada') AS ventas_total
            FROM turnos_caja t
            LEFT JOIN usuarios a ON t.abierto_por = a.id
            LEFT JOIN usuarios c ON t.cerrado_por = c.id
            ORDER BY t.id DESC
            LIMIT ?
        `, [Math.min(100, Math.max(1, parseInt(limite, 10) || 30))]);
        return filas;
    }
};

module.exports = CajaService;
