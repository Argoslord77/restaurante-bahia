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
            modulo VARCHAR(60) NULL,
            categoria VARCHAR(20) NULL,
            severidad VARCHAR(10) NULL,
            sesion_id VARCHAR(128) NULL,
            repeticiones INT UNSIGNED NOT NULL DEFAULT 1,
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
            KEY idx_auditoria_categoria (categoria, creado_en),
            KEY idx_auditoria_severidad (severidad, creado_en),
            KEY idx_auditoria_modulo (modulo, creado_en),
            KEY idx_auditoria_entidad (entidad, entidad_id),
            KEY idx_auditoria_sesion (sesion_id),
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
        truncar(evento.modulo || '', 60) || null,
        truncar(evento.categoria || '', 20) || null,
        truncar(evento.severidad || '', 10) || null,
        truncar(evento.sesion_id || '', 128) || null,
        Number.isFinite(Number(evento.repeticiones)) ? Math.max(1, Math.round(Number(evento.repeticiones))) : 1,
        Number.isFinite(Number(evento.estado_http)) ? Number(evento.estado_http) : null,
        evento.operacion_exitosa ? 1 : 0,
        truncar(evento.ip_origen || '', 100) || null,
        truncar(evento.user_agent || '', 500) || null,
        serializarDatos(datos),
        Number.isFinite(Number(evento.duracion_ms)) ? Math.max(0, Math.round(Number(evento.duracion_ms))) : null
    ];

    try {
        const [resultado] = await db.query(`
            INSERT INTO auditoria_usuarios (
                usuario_id, usuario_nombre, usuario_rol, metodo_http, ruta, url,
                accion, entidad, entidad_id, modulo, categoria, severidad, sesion_id,
                repeticiones, estado_http, operacion_exitosa,
                ip_origen, user_agent, datos_operacion, duracion_ms
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, parametros);
        // Se devuelve el id para que el middleware pueda cerrar después el
        // recuento de las peticiones agrupadas (ver actualizarRepeticiones).
        return resultado && resultado.insertId ? resultado.insertId : true;
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

/**
 * Construye la cláusula WHERE compartida por el listado, la exportación y las
 * estadísticas, para que los tres apliquen exactamente los mismos filtros.
 */
function construirFiltros(f = {}) {
    const where = [];
    const params = [];

    if (f.usuarioId && /^\d+$/.test(String(f.usuarioId))) {
        where.push('a.usuario_id = ?');
        params.push(Number(f.usuarioId));
    }
    // Búsqueda libre sobre acción, entidad, usuario y ruta
    if (f.accion && String(f.accion).trim()) {
        const termino = `%${String(f.accion).trim().slice(0, 150)}%`;
        where.push('(a.accion LIKE ? OR a.entidad LIKE ? OR a.usuario_nombre LIKE ? OR a.ruta LIKE ?)');
        params.push(termino, termino, termino, termino);
    }
    if (f.categoria && /^[A-Z_]{1,20}$/.test(String(f.categoria))) {
        where.push('a.categoria = ?');
        params.push(String(f.categoria));
    }
    if (f.severidad && /^[A-Z]{1,10}$/.test(String(f.severidad))) {
        where.push('a.severidad = ?');
        params.push(String(f.severidad));
    }
    if (f.modulo && String(f.modulo).trim()) {
        where.push('a.modulo = ?');
        params.push(String(f.modulo).trim().slice(0, 60));
    }
    if (f.entidad && String(f.entidad).trim()) {
        where.push('a.entidad = ?');
        params.push(String(f.entidad).trim().slice(0, 100));
    }
    if (f.entidadId && String(f.entidadId).trim()) {
        where.push('a.entidad_id = ?');
        params.push(String(f.entidadId).trim().slice(0, 100));
    }
    if (f.rol && String(f.rol).trim()) {
        where.push('a.usuario_rol = ?');
        params.push(String(f.rol).trim().slice(0, 60));
    }
    if (f.soloFallidas === true || f.soloFallidas === 'true' || f.soloFallidas === '1') {
        where.push('a.operacion_exitosa = 0');
    }
    if (f.desde && /^\d{4}-\d{2}-\d{2}$/.test(String(f.desde))) {
        where.push('a.creado_en >= ?');
        params.push(`${f.desde} 00:00:00`);
    }
    if (f.hasta && /^\d{4}-\d{2}-\d{2}$/.test(String(f.hasta))) {
        where.push('a.creado_en <= ?');
        params.push(`${f.hasta} 23:59:59`);
    }

    return { clause: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

async function listar(filtros = {}) {
    const { pagina = 1, porPagina = 50 } = filtros;
    const page = Math.max(1, parseInt(pagina, 10) || 1);
    const limit = Math.min(200, Math.max(10, parseInt(porPagina, 10) || 50));
    const offset = (page - 1) * limit;
    const { clause, params } = construirFiltros(filtros);
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

/**
 * Resumen agregado sobre el mismo conjunto filtrado: alimenta las tarjetas
 * superiores de la vista de auditoría.
 */
async function estadisticas(filtros = {}) {
    const { clause, params } = construirFiltros(filtros);

    const [[totales]] = await db.query(`
        SELECT
            COUNT(*)                                             AS total,
            COUNT(DISTINCT a.usuario_id)                         AS usuarios,
            SUM(CASE WHEN a.operacion_exitosa = 0 THEN 1 ELSE 0 END) AS fallidas,
            SUM(CASE WHEN a.severidad = 'CRITICO' THEN 1 ELSE 0 END) AS criticas
        FROM auditoria_usuarios a
        ${clause}
    `, params);

    const [porCategoria] = await db.query(`
        SELECT COALESCE(a.categoria, 'SIN CLASIFICAR') AS categoria, COUNT(*) AS total
        FROM auditoria_usuarios a
        ${clause}
        GROUP BY a.categoria
        ORDER BY total DESC
    `, params);

    return {
        total: Number(totales?.total || 0),
        usuarios: Number(totales?.usuarios || 0),
        fallidas: Number(totales?.fallidas || 0),
        criticas: Number(totales?.criticas || 0),
        porCategoria
    };
}

/** Valores presentes en la tabla, para poblar los desplegables de filtro. */
async function opcionesDeFiltro() {
    try {
        const [modulos] = await db.query(
            `SELECT DISTINCT modulo FROM auditoria_usuarios
              WHERE modulo IS NOT NULL AND modulo <> '' ORDER BY modulo`);
        const [entidades] = await db.query(
            `SELECT DISTINCT entidad FROM auditoria_usuarios
              WHERE entidad IS NOT NULL AND entidad <> '' ORDER BY entidad`);
        const [roles] = await db.query(
            `SELECT DISTINCT usuario_rol FROM auditoria_usuarios
              WHERE usuario_rol IS NOT NULL AND usuario_rol <> '' ORDER BY usuario_rol`);
        return {
            modulos: modulos.map(r => r.modulo),
            entidades: entidades.map(r => r.entidad),
            roles: roles.map(r => r.usuario_rol)
        };
    } catch (error) {
        logger.warn(`[Auditoria] No se pudieron cargar las opciones de filtro: ${error.message}`);
        return { modulos: [], entidades: [], roles: [] };
    }
}

/** Escapa un valor para CSV (comillas dobles y separador punto y coma). */
function campoCSV(valor) {
    if (valor === null || valor === undefined) return '';
    const texto = String(valor).replace(/"/g, '""').replace(/\r?\n/g, ' ');
    return `"${texto}"`;
}

/**
 * Exporta el registro filtrado a CSV. Se limita el volumen para no agotar la
 * memoria del proceso con exportaciones desmedidas.
 */
async function exportarCSV(filtros = {}, limite = 20000) {
    const { clause, params } = construirFiltros(filtros);
    const tope = Math.min(50000, Math.max(1, parseInt(limite, 10) || 20000));

    const [rows] = await db.query(`
        SELECT a.creado_en, a.usuario_id, a.usuario_nombre, a.usuario_rol,
               a.categoria, a.severidad, a.modulo, a.entidad, a.entidad_id,
               a.accion, a.metodo_http, a.ruta, a.estado_http, a.operacion_exitosa,
               a.repeticiones, a.ip_origen, a.duracion_ms, a.datos_operacion
        FROM auditoria_usuarios a
        ${clause}
        ORDER BY a.creado_en DESC, a.id DESC
        LIMIT ?
    `, [...params, tope]);

    const cabecera = [
        'Fecha', 'ID usuario', 'Usuario', 'Rol', 'Categoria', 'Severidad', 'Modulo',
        'Entidad', 'ID entidad', 'Accion', 'Metodo', 'Ruta', 'Estado HTTP',
        'Exitosa', 'Repeticiones', 'IP', 'Duracion (ms)', 'Datos'
    ].join(';');

    const lineas = rows.map(r => [
        r.creado_en ? new Date(r.creado_en).toISOString() : '',
        r.usuario_id, r.usuario_nombre, r.usuario_rol, r.categoria, r.severidad,
        r.modulo, r.entidad, r.entidad_id, r.accion, r.metodo_http, r.ruta,
        r.estado_http, r.operacion_exitosa ? 'SI' : 'NO', r.repeticiones,
        r.ip_origen, r.duracion_ms, r.datos_operacion
    ].map(campoCSV).join(';'));

    // BOM para que Excel reconozca el UTF-8 y respete los acentos
    return { csv: '\ufeff' + [cabecera, ...lineas].join('\r\n'), filas: rows.length };
}

/**
 * Purga de retención. La auditoría crece rápido, así que conviene ejecutarla
 * periódicamente (ver scripts/purgar-auditoria.js).
 *
 * Los asientos CRÍTICOS se conservan más tiempo que la actividad ordinaria.
 *
 * @param {number} dias        Antigüedad a partir de la cual se borra lo ordinario
 * @param {number} diasCritico Antigüedad para los asientos críticos
 */
async function purgar(dias = 180, diasCritico = 730) {
    const d = Math.max(1, parseInt(dias, 10) || 180);
    const dc = Math.max(d, parseInt(diasCritico, 10) || 730);

    const [ordinarias] = await db.query(`
        DELETE FROM auditoria_usuarios
         WHERE creado_en < DATE_SUB(NOW(), INTERVAL ? DAY)
           AND (severidad IS NULL OR severidad <> 'CRITICO')
    `, [d]);

    const [criticas] = await db.query(`
        DELETE FROM auditoria_usuarios
         WHERE creado_en < DATE_SUB(NOW(), INTERVAL ? DAY)
           AND severidad = 'CRITICO'
    `, [dc]);

    return {
        ordinarias: ordinarias.affectedRows || 0,
        criticas: criticas.affectedRows || 0,
        diasOrdinarias: d,
        diasCriticas: dc
    };
}

/**
 * Cierra el recuento de un asiento agrupado.
 *
 * Los endpoints de sondeo registran la primera petición de la ventana y cuentan
 * las siguientes en memoria. Al expirar la ventana se consolida aquí el total,
 * de modo que el historial refleje cuántas peticiones representó ese asiento.
 */
async function actualizarRepeticiones(id, repeticiones) {
    if (!id || !Number.isFinite(Number(id)) || Number(repeticiones) <= 1) return false;
    try {
        await db.query(
            'UPDATE auditoria_usuarios SET repeticiones = ? WHERE id = ?',
            [Math.max(1, Math.round(Number(repeticiones))), id]
        );
        return true;
    } catch (error) {
        logger.warn(`[Auditoria] No se pudo consolidar el recuento del asiento ${id}: ${error.message}`);
        return false;
    }
}

module.exports = {
    ensureTable,
    registrar,
    actualizarRepeticiones,
    listar,
    construirFiltros,
    estadisticas,
    exportarCSV,
    purgar,
    opcionesDeFiltro,
    sanitizar,
    serializarDatos
};
