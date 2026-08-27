// services/auditLogService.js
// Auditoría de operaciones HTTP de usuarios y operaciones administrativas.
'use strict';

const db = require('../config/db');
const logger = require('../config/logger');

const CLAVES_SENSIBLES = /password|passwd|pass|secret|token|authorization|cookie|session|csrf|firma|filedata|contenido/i;
const MAX_TEXTO = 2000;

function truncar(valor, limite = MAX_TEXTO) {
    const texto = String(valor ?? '');
    return texto.length > limite ? `${texto.slice(0, limite)}…` : texto;
}

function sanitizar(valor, profundidad = 0) {
    if (profundidad > 5) return '[profundidad excedida]';
    if (valor === null || valor === undefined) return valor;
    if (typeof valor === 'string') return truncar(valor);
    if (typeof valor === 'number' || typeof valor === 'boolean') return valor;
    if (Array.isArray(valor)) return valor.slice(0, 50).map(item => sanitizar(item, profundidad + 1));
    if (typeof valor === 'object') {
        return Object.entries(valor).slice(0, 100).reduce((obj, [clave, dato]) => {
            obj[clave] = CLAVES_SENSIBLES.test(clave) ? '[redactado]' : sanitizar(dato, profundidad + 1);
            return obj;
        }, {});
    }
    return truncar(valor);
}

function serializarDatos(datos) {
    if (!datos || typeof datos !== 'object') return null;
    try {
        return JSON.stringify(sanitizar(datos));
    } catch (_) {
        return JSON.stringify({ aviso: 'No se pudieron serializar los datos de la operación.' });
    }
}

async function ensureTable() {
    await db.query(`
        CREATE TABLE IF NOT EXISTS auditoria_usuarios (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            usuario_id INT NULL,
            usuario_nombre VARCHAR(150) NULL,
            usuario_rol VARCHAR(60) NULL,
            metodo_http VARCHAR(10) NOT NULL,
            ruta VARCHAR(255) NOT NULL,
            url VARCHAR(1024) NULL,
            accion VARCHAR(150) NOT NULL,
            entidad VARCHAR(100) NULL,
            entidad_id VARCHAR(100) NULL,
            estado_http SMALLINT UNSIGNED NULL,
            operacion_exitosa TINYINT(1) NOT NULL DEFAULT 0,
            ip_origen VARCHAR(100) NULL,
            user_agent VARCHAR(500) NULL,
            datos_operacion LONGTEXT NULL,
            duracion_ms INT UNSIGNED NULL,
            creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_auditoria_usuario (usuario_id),
            KEY idx_auditoria_fecha (creado_en),
            KEY idx_auditoria_accion (accion),
            KEY idx_auditoria_ruta (ruta),
            KEY idx_auditoria_estado (estado_http),
            CONSTRAINT fk_auditoria_usuario FOREIGN KEY (usuario_id)
                REFERENCES usuarios (id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    return true;
}

async function registrar(evento = {}) {
    const datos = evento.datos_operacion || evento.datos || null;
    const parametros = [
        evento.usuario_id || null,
        truncar(evento.usuario_nombre || '', 150) || null,
        truncar(evento.usuario_rol || '', 60) || null,
        truncar(evento.metodo_http || 'GET', 10),
        truncar(evento.ruta || '/', 255),
        truncar(evento.url || '', 1024) || null,
        truncar(evento.accion || `${evento.metodo_http || 'GET'} ${evento.ruta || '/'}`, 150),
        truncar(evento.entidad || '', 100) || null,
        evento.entidad_id === undefined || evento.entidad_id === null ? null : truncar(evento.entidad_id, 100),
        Number.isFinite(Number(evento.estado_http)) ? Number(evento.estado_http) : null,
        evento.operacion_exitosa ? 1 : 0,
        truncar(evento.ip_origen || '', 100) || null,
        truncar(evento.user_agent || '', 500) || null,
        serializarDatos(datos),
        Number.isFinite(Number(evento.duracion_ms)) ? Math.max(0, Math.round(Number(evento.duracion_ms))) : null
    ];

    try {
        await db.query(`
            INSERT INTO auditoria_usuarios (
                usuario_id, usuario_nombre, usuario_rol, metodo_http, ruta, url,
                accion, entidad, entidad_id, estado_http, operacion_exitosa,
                ip_origen, user_agent, datos_operacion, duracion_ms
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, parametros);
        return true;
    } catch (error) {
        // Si la tabla aún no existe (por ejemplo, justo después de restaurar
        // una salva antigua), se intenta crear una sola vez y repetir el log.
        if (!evento._reintento && error.code === 'ER_NO_SUCH_TABLE') {
            try {
                await ensureTable();
                return registrar({ ...evento, _reintento: true });
            } catch (_) { /* se registra la advertencia abajo */ }
        }
        // La auditoría no debe tumbar ni retrasar la respuesta de la aplicación.
        logger.warn(`[Auditoria] No se pudo registrar la operación: ${error.message}`);
        return false;
    }
}

async function listar({ pagina = 1, porPagina = 50, usuarioId = '', accion = '', desde = '', hasta = '' } = {}) {
    const page = Math.max(1, parseInt(pagina, 10) || 1);
    const limit = Math.min(200, Math.max(10, parseInt(porPagina, 10) || 50));
    const offset = (page - 1) * limit;
    const where = [];
    const params = [];

    if (usuarioId && /^\d+$/.test(String(usuarioId))) {
        where.push('a.usuario_id = ?');
        params.push(Number(usuarioId));
    }
    if (accion && /^[a-zA-Z0-9_ /:-]{1,150}$/.test(String(accion))) {
        where.push('a.accion LIKE ?');
        params.push(`%${accion}%`);
    }
    if (desde && /^\d{4}-\d{2}-\d{2}$/.test(String(desde))) {
        where.push('a.creado_en >= ?');
        params.push(`${desde} 00:00:00`);
    }
    if (hasta && /^\d{4}-\d{2}-\d{2}$/.test(String(hasta))) {
        where.push('a.creado_en <= ?');
        params.push(`${hasta} 23:59:59`);
    }

    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [rows] = await db.query(`
        SELECT a.*
        FROM auditoria_usuarios a
        ${clause}
        ORDER BY a.creado_en DESC, a.id DESC
        LIMIT ? OFFSET ?
    `, [...params, limit, offset]);
    const [[countRow]] = await db.query(
        `SELECT COUNT(*) AS total FROM auditoria_usuarios a ${clause}`,
        params
    );

    return {
        rows,
        total: Number(countRow?.total || 0),
        pagina: page,
        porPagina: limit,
        totalPaginas: Math.max(1, Math.ceil(Number(countRow?.total || 0) / limit))
    };
}

module.exports = {
    ensureTable,
    registrar,
    listar,
    sanitizar,
    serializarDatos
};
