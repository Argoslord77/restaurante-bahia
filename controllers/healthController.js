// controllers/healthController.js
// GET /salud — healthcheck para monitoreo y pm2 (público, sin sesión).
//
// Responde JSON con: base de datos (ping cronometrado), memoria del
// proceso, disco libre donde viven los respaldos, uptime y estado del
// último respaldo automático. Devuelve 503 si la BD no responde.
// Nunca lanza excepciones: cada sonda está aislada en try/catch.
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const db = require('../config/db');
const backupScheduler = require('../services/backupScheduler');

const MB = 1024 * 1024;

async function sondaBd() {
    const t0 = Date.now();
    await db.query('SELECT 1 AS ok');
    return { ok: true, ms: Date.now() - t0 };
}

function sondaMemoria() {
    const m = process.memoryUsage();
    return {
        rss_mb: Math.round(m.rss / MB),
        heap_mb: Math.round(m.heapUsed / MB)
    };
}

function sondaDisco() {
    try {
        const dir = process.env.RESPALDO_DIR || path.join(__dirname, '..', 'backups');
        const st = fs.statfsSync(dir);
        return {
            ruta: dir,
            libre_mb: Math.round((st.bavail * st.bsize) / MB),
            total_mb: Math.round((st.blocks * st.bsize) / MB)
        };
    } catch (_) {
        try {
            const st = fs.statfsSync(os.tmpdir());
            return {
                ruta: os.tmpdir(),
                libre_mb: Math.round((st.bavail * st.bsize) / MB),
                total_mb: Math.round((st.blocks * st.bsize) / MB)
            };
        } catch (_) {
            return null;
        }
    }
}

async function estadoSalud(req, res) {
    const salud = {
        ok: true,
        hora: new Date().toISOString(),
        uptime_s: Math.round(process.uptime()),
        db: { ok: false, ms: null },
        memoria: sondaMemoria(),
        disco: sondaDisco(),
        respaldo: backupScheduler.obtenerEstado().ultimo
    };
    try {
        salud.db = await sondaBd();
    } catch (_) {
        salud.ok = false;
        salud.db = { ok: false, ms: null };
    }
    return res.status(salud.ok ? 200 : 503).json(salud);
}

module.exports = { estadoSalud };
