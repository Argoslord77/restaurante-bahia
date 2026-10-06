// tienda/services/ajusteService.js — Ajustes clave/valor (nombre del
// negocio, IVA %, pie del ticket).
const pool = require('../config/db');

const AjusteService = {
    async get(clave, defecto = '') {
        const [filas] = await pool.query('SELECT valor FROM ajustes WHERE clave = ? LIMIT 1', [clave]);
        if (!filas.length) return defecto;
        return filas[0].valor;
    },

    async set(clave, valor) {
        await pool.query(`
            INSERT INTO ajustes (clave, valor) VALUES (?, ?)
            ON DUPLICATE KEY UPDATE valor = ?
        `, [clave, String(valor ?? ''), String(valor ?? '')]);
    },

    async ivaPct() {
        const v = Number(await this.get('iva_pct', '16'));
        return Number.isFinite(v) && v >= 0 ? v : 0;
    },

    async todos() {
        const [filas] = await pool.query('SELECT clave, valor FROM ajustes');
        const mapa = {};
        for (const f of filas) mapa[f.clave] = f.valor;
        return mapa;
    }
};

module.exports = AjusteService;
