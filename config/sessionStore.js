// config/sessionStore.js
// Store de sesiones en MySQL para express-session (sin dependencias nuevas).
//
// Por qué: el MemoryStore por defecto pierde TODAS las sesiones en cada
// reinicio y crece sin control en memoria. Con este store las sesiones
// sobreviven a reinicios/despliegues y la limpieza de expiradas es una
// sola consulta DELETE cada 15 minutos (carga despreciable).
//
// Degradación elegante: si la BD falla, get() devuelve "sin sesión" y
// set()/touch() solo registran el error. El usuario podrá verse como
// invitado hasta que la BD vuelva, pero la app nunca devuelve 500 por
// culpa del store de sesiones.
'use strict';

const session = require('express-session');
const logger = require('./logger');

// Si falta la tabla, se avisa UNA vez con la solución (las siguientes
// solo registran el error escueto para no inundar el log).
let migracionAvisada = false;
function avisarMigracion(err) {
    if (migracionAvisada || !err || err.code !== 'ER_NO_SUCH_TABLE') return;
    migracionAvisada = true;
    logger.warn('[sesiones] Falta la tabla `sesiones`: aplica scripts/migracion_sesiones.sql (ver LEEME V10).');
}

class MysqlSessionStore extends session.Store {
    constructor(db, opciones = {}) {
        super(opciones);
        this.db = db;
        this.tabla = opciones.tabla || 'sesiones';
        this.ttlMs = Number(opciones.ttlMs) > 0 ? Number(opciones.ttlMs) : 3600000;
        this.limpiezaMs = Number(opciones.limpiezaMs) > 0 ? Number(opciones.limpiezaMs) : 15 * 60 * 1000;
        this._timer = null;
    }

    _expiraEn(sess) {
        const maxAge = sess && sess.cookie && Number(sess.cookie.maxAge);
        const ttl = Number.isFinite(maxAge) && maxAge > 0 ? maxAge : this.ttlMs;
        return new Date(Date.now() + ttl);
    }

    get(sid, cb) {
        this.db.query(
            `SELECT sess FROM ${this.tabla} WHERE sid = ? AND expira_en > NOW() LIMIT 1`,
            [sid]
        ).then(([rows]) => {
            if (!rows || !rows.length) return cb(null, null);
            try {
                return cb(null, JSON.parse(rows[0].sess));
            } catch (_) {
                return cb(null, null);
            }
        }).catch(err => {
            logger.error(`[sesiones] get(${sid}): ${err.message}`);
            avisarMigracion(err);
            return cb(null, null);
        });
    }

    set(sid, sess, cb) {
        let cuerpo;
        try {
            cuerpo = JSON.stringify(sess);
        } catch (err) {
            logger.error(`[sesiones] set(${sid}): sesión no serializable: ${err.message}`);
            if (typeof cb === 'function') cb(err);
            return;
        }
        this.db.query(
            `INSERT INTO ${this.tabla} (sid, sess, expira_en) VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE sess = VALUES(sess), expira_en = VALUES(expira_en)`,
            [sid, cuerpo, this._expiraEn(sess)]
        ).then(() => {
            if (typeof cb === 'function') cb(null);
        }).catch(err => {
            // No se propaga: la petición ya está resuelta; la sesión se
            // reintentará guardar en la próxima petición modificada.
            logger.error(`[sesiones] set(${sid}): ${err.message}`);
            avisarMigracion(err);
            if (typeof cb === 'function') cb(null);
        });
    }

    touch(sid, sess, cb) {
        this.db.query(
            `UPDATE ${this.tabla} SET expira_en = ? WHERE sid = ?`,
            [this._expiraEn(sess), sid]
        ).then(() => {
            if (typeof cb === 'function') cb(null);
        }).catch(err => {
            logger.error(`[sesiones] touch(${sid}): ${err.message}`);
            avisarMigracion(err);
            if (typeof cb === 'function') cb(null);
        });
    }

    destroy(sid, cb) {
        this.db.query(`DELETE FROM ${this.tabla} WHERE sid = ?`, [sid])
            .then(() => { if (typeof cb === 'function') cb(null); })
            .catch(err => {
                logger.error(`[sesiones] destroy(${sid}): ${err.message}`);
            avisarMigracion(err);
                if (typeof cb === 'function') cb(null);
            });
    }

    async limpiarExpiradas() {
        const [r] = await this.db.query(`DELETE FROM ${this.tabla} WHERE expira_en <= NOW()`);
        return (r && r.affectedRows) || 0;
    }

    iniciarLimpieza() {
        if (this._timer) return this._timer;
        const barrer = async () => {
            try {
                const n = await this.limpiarExpiradas();
                if (n > 0) logger.info(`[sesiones] ${n} expiradas eliminadas`);
            } catch (err) {
                logger.error(`[sesiones] limpieza: ${err.message}`);
                avisarMigracion(err);
            }
        };
        // Primera pasada al arrancar (sin bloquear), luego periódica.
        setImmediate(() => { barrer().catch(() => {}); });
        this._timer = setInterval(barrer, this.limpiezaMs);
        if (this._timer.unref) this._timer.unref();
        return this._timer;
    }

    detenerLimpieza() {
        if (this._timer) clearInterval(this._timer);
        this._timer = null;
    }
}

module.exports = MysqlSessionStore;
