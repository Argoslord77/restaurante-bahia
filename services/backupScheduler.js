// services/backupScheduler.js
// Respaldo automático diario de la base de datos (sin dependencias nuevas).
//
// - Reutiliza BackupService.crearBackup (mysqldump con --single-transaction:
//   no bloquea el restaurante mientras respalda).
// - Se ejecuta una vez al día a la hora configurada (por defecto 03:00).
// - Conserva los últimos N respaldos (por defecto 7) y borra el resto.
// - Verifica integridad mínima: tamaño > 0 y cabecera de mysqldump.
// - El estado queda disponible para /salud y el log.
//
// Variables (.env): RESPALDO_AUTO=1, RESPALDO_HORA=3, RESPALDO_DIR=./backups,
// RESPALDO_DIAS=7. Si mysqldump no existe, registra el error y reintenta
// al día siguiente (nunca tumba la app).
'use strict';

const fsp = require('fs').promises;
const path = require('path');
const BackupService = require('./backupService');
const logger = require('../config/logger');

const PREFIJO_AUTO = 'auto_restaurante_bahia_';
const INTERVALO_REVISION_MS = 5 * 60 * 1000;

const estado = {
    ultimo: null,   // { fecha, archivo, bytes, ok, error }
    enCurso: false
};

function leerConfig() {
    const hora = Number(process.env.RESPALDO_HORA ?? 3);
    const dias = Number(process.env.RESPALDO_DIAS ?? 7);
    return {
        activo: String(process.env.RESPALDO_AUTO ?? '1') === '1',
        hora: Number.isFinite(hora) ? Math.min(23, Math.max(0, Math.floor(hora))) : 3,
        dir: process.env.RESPALDO_DIR || path.join(__dirname, '..', 'backups'),
        dias: Number.isFinite(dias) ? Math.min(30, Math.max(1, Math.floor(dias))) : 7
    };
}

function mismoDia(a, b) {
    return a.getFullYear() === b.getFullYear()
        && a.getMonth() === b.getMonth()
        && a.getDate() === b.getDate();
}

//Hora local del servidor.
function esHoraDeRespaldar(ahora, hora, yaRespaldadoHoy) {
    return !yaRespaldadoHoy && ahora.getHours() === hora;
}

// Recibe [{ nombre, mtimeMs }] y devuelve los que sobran (los más viejos
// después de conservar los `conservar` más recientes).
function seleccionarParaBorrar(archivos, conservar) {
    const ordenados = [...archivos].sort((a, b) => b.mtimeMs - a.mtimeMs);
    return ordenados.slice(Math.max(0, conservar));
}

async function listarRespaldos(dir) {
    let entradas;
    try {
        entradas = await fsp.readdir(dir);
    } catch (_) {
        return [];
    }
    const propios = entradas.filter(n => n.startsWith(PREFIJO_AUTO) && n.endsWith('.sql'));
    const conFecha = [];
    for (const nombre of propios) {
        try {
            const st = await fsp.stat(path.join(dir, nombre));
            if (st.isFile()) conFecha.push({ nombre, mtimeMs: st.mtimeMs, size: st.size });
        } catch (_) { /* desapareció entre readdir y stat: se ignora */ }
    }
    return conFecha.sort((a, b) => b.mtimeMs - a.mtimeMs);
}

async function hayRespaldoDeHoy(dir, ahora = new Date()) {
    const lista = await listarRespaldos(dir);
    return lista.some(a => mismoDia(new Date(a.mtimeMs), ahora));
}

async function verificarRespaldo(filePath) {
    const handle = await fsp.open(filePath, 'r');
    try {
        const stat = await handle.stat();
        if (!stat.size || stat.size <= 0) throw new Error('el respaldo quedó vacío');
        const { buffer, bytesRead } = await handle.read(Buffer.alloc(400), 0, 400, 0);
        const cabeza = buffer.toString('utf8', 0, bytesRead);
        if (!/MySQL dump/i.test(cabeza)) throw new Error('sin cabecera de mysqldump');
        return stat.size;
    } finally {
        await handle.close();
    }
}

async function podarRespaldos(dir, conservar) {
    const lista = await listarRespaldos(dir);
    const sobrantes = seleccionarParaBorrar(lista, conservar);
    for (const viejo of sobrantes) {
        try {
            await fsp.unlink(path.join(dir, viejo.nombre));
            logger.info(`[respaldo] eliminado antiguo: ${viejo.nombre}`);
        } catch (err) {
            logger.error(`[respaldo] no se pudo borrar ${viejo.nombre}: ${err.message}`);
        }
    }
    return sobrantes.length;
}

async function ejecutarRespaldo(cfg = leerConfig()) {
    if (estado.enCurso) return estado.ultimo;
    estado.enCurso = true;
    try {
        const backup = await BackupService.crearBackup({ directorio: cfg.dir, prefijo: PREFIJO_AUTO });
        const bytes = await verificarRespaldo(backup.filePath);
        await podarRespaldos(cfg.dir, cfg.dias);
        estado.ultimo = {
            fecha: new Date().toISOString(),
            archivo: backup.filename,
            bytes,
            ok: true,
            error: null
        };
        logger.info(`[respaldo] automático OK: ${backup.filename} (${bytes} bytes)`);
    } catch (err) {
        estado.ultimo = {
            fecha: new Date().toISOString(),
            archivo: null,
            bytes: 0,
            ok: false,
            error: err.message
        };
        logger.error(`[respaldo] automático FALLÓ: ${err.message}`);
    } finally {
        estado.enCurso = false;
    }
    return estado.ultimo;
}

async function revision(cfg) {
    try {
        const ahora = new Date();
        const yaHoy = await hayRespaldoDeHoy(cfg.dir, ahora);
        if (esHoraDeRespaldar(ahora, cfg.hora, yaHoy)) {
            await ejecutarRespaldo(cfg);
        } else if (!estado.ultimo) {
            // Estado inicial para /salud sin haber respaldado aún.
            const lista = await listarRespaldos(cfg.dir);
            estado.ultimo = lista.length
                ? { fecha: new Date(lista[0].mtimeMs).toISOString(), archivo: lista[0].nombre, bytes: lista[0].size, ok: true, error: null }
                : null;
        }
    } catch (err) {
        logger.error(`[respaldo] revisión: ${err.message}`);
    }
}

let timer = null;

function iniciar() {
    if (timer) return { detener };
    const cfg = leerConfig();
    if (!cfg.activo) {
        logger.info('[respaldo] automático desactivado (RESPALDO_AUTO=0)');
        return { detener };
    }
    logger.info(`[respaldo] automático activo: ${String(cfg.hora).padStart(2, '0')}:00, conserva ${cfg.dias} días en ${cfg.dir}`);
    setImmediate(() => { revision(cfg).catch(() => {}); });
    timer = setInterval(() => { revision(cfg).catch(() => {}); }, INTERVALO_REVISION_MS);
    if (timer.unref) timer.unref();
    return { detener };
}

function detener() {
    if (timer) clearInterval(timer);
    timer = null;
}

function obtenerEstado() {
    return { ...estado, ultimo: estado.ultimo ? { ...estado.ultimo } : null };
}

module.exports = {
    leerConfig,
    esHoraDeRespaldar,
    seleccionarParaBorrar,
    listarRespaldos,
    hayRespaldoDeHoy,
    ejecutarRespaldo,
    obtenerEstado,
    iniciar,
    detener
};
