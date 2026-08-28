// controllers/auditoriaController.js
const AuditLogService = require('../services/auditLogService');
const { CATEGORIAS, SEVERIDADES } = require('../config/auditoriaCatalogo');
const logger = require('../config/logger');

/** Recoge los filtros admitidos desde la query string. */
function leerFiltros(query = {}) {
    return {
        pagina: query.pagina || 1,
        porPagina: query.porPagina || 50,
        usuarioId: query.usuarioId || '',
        accion: query.accion || '',
        categoria: query.categoria || '',
        severidad: query.severidad || '',
        modulo: query.modulo || '',
        entidad: query.entidad || '',
        entidadId: query.entidadId || '',
        rol: query.rol || '',
        soloFallidas: query.soloFallidas || '',
        desde: query.desde || '',
        hasta: query.hasta || ''
    };
}

exports.viewAuditoria = async (req, res) => {
    try {
        const filtros = leerFiltros(req.query);

        const [resultado, resumen, opciones] = await Promise.all([
            AuditLogService.listar(filtros),
            AuditLogService.estadisticas(filtros).catch(() => null),
            AuditLogService.opcionesDeFiltro().catch(() => ({ modulos: [], entidades: [], roles: [] }))
        ]);

        return res.render('admin/auditoria', {
            pageTitle: 'Auditoría de Operaciones',
            view: 'auditoria',
            user: req.user || null,
            logs: resultado.rows,
            paginacion: resultado,
            filtros,
            resumen,
            opciones,
            categorias: Object.values(CATEGORIAS),
            severidades: Object.values(SEVERIDADES)
        });
    } catch (error) {
        logger.error('Error al cargar auditoría:', error);
        if (req.flash) req.flash('error_msg', 'No se pudo cargar el registro de auditoría.');
        return res.redirect('/admin/configuracion');
    }
};

exports.apiAuditoria = async (req, res) => {
    try {
        const resultado = await AuditLogService.listar(leerFiltros(req.query));
        return res.json({ success: true, ...resultado });
    } catch (error) {
        logger.error('Error en API de auditoría:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Exporta a CSV el registro con los filtros aplicados.
 * La propia exportación queda auditada por el middleware global como
 * operación de categoría EXPORTACION y severidad CRÍTICA: sacar el historial
 * de operaciones fuera del sistema es en sí mismo un hecho auditable.
 */
exports.exportarAuditoria = async (req, res) => {
    try {
        const filtros = leerFiltros(req.query);
        const { csv, filas } = await AuditLogService.exportarCSV(filtros);

        const marca = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="auditoria_${marca}.csv"`);
        res.setHeader('X-Auditoria-Filas', String(filas));
        return res.send(csv);
    } catch (error) {
        logger.error('Error al exportar auditoría:', error);
        if (req.flash) req.flash('error_msg', 'No se pudo exportar el registro de auditoría.');
        return res.redirect('/admin/auditoria');
    }
};

/**
 * Baliza de impresión enviada por public/js/auditoria-impresion.js.
 *
 * El servidor solo sabe que se abrió la vista del ticket; este endpoint
 * confirma que el documento se envió realmente a la impresora, incluyendo
 * las impresiones lanzadas con Ctrl+P.
 */
exports.registrarImpresion = async (req, res) => {
    try {
        const cuerpo = req.body || {};
        const usuario = req.user || (req.session && req.session.user) || null;
        const ipReenviada = req.headers['x-forwarded-for'];

        await AuditLogService.registrar({
            usuario_id: usuario ? usuario.id : null,
            usuario_nombre: usuario
                ? [usuario.nombre, usuario.apellidos].filter(Boolean).join(' ').trim() || usuario.usuario
                : null,
            usuario_rol: usuario ? usuario.rol : null,
            metodo_http: 'POST',
            ruta: '/admin/api/auditoria/impresion',
            url: String(cuerpo.url || '').slice(0, 1024) || null,
            accion: `Imprimir documento: ${String(cuerpo.documento || 'Documento').slice(0, 80)}`,
            entidad: cuerpo.entidad ? String(cuerpo.entidad).slice(0, 100) : 'Documento',
            entidad_id: cuerpo.entidad_id ? String(cuerpo.entidad_id).slice(0, 100) : null,
            modulo: 'Impresión',
            categoria: CATEGORIAS.IMPRESION,
            severidad: SEVERIDADES.AVISO,
            estado_http: 200,
            operacion_exitosa: true,
            ip_origen: ipReenviada ? String(ipReenviada).split(',')[0].trim() : req.ip,
            user_agent: req.headers['user-agent'] || null,
            sesion_id: req.sessionID || null,
            datos_operacion: {
                documento: cuerpo.documento || null,
                origen_evento: cuerpo.origen || null,
                pagina: cuerpo.url || null
            }
        });

        // 204: la baliza puede enviarse con sendBeacon, que ignora el cuerpo
        return res.status(204).end();
    } catch (error) {
        logger.warn(`[Auditoria] No se pudo registrar la impresión: ${error.message}`);
        return res.status(204).end();
    }
};

/**
 * Purga manual del historial según la política de retención.
 * Reservada a superadministradores desde la vista de auditoría.
 */
exports.purgarAuditoria = async (req, res) => {
    try {
        const dias = parseInt(req.body.dias, 10) || 180;
        const diasCritico = parseInt(req.body.diasCritico, 10) || 730;
        const resultado = await AuditLogService.purgar(dias, diasCritico);

        const mensaje = `Purga completada: ${resultado.ordinarias} asiento(s) ordinario(s) ` +
                        `con más de ${resultado.diasOrdinarias} días y ${resultado.criticas} ` +
                        `crítico(s) con más de ${resultado.diasCriticas} días.`;
        if (req.flash) req.flash('success_msg', mensaje);
        return res.redirect('/admin/auditoria');
    } catch (error) {
        logger.error('Error al purgar auditoría:', error);
        if (req.flash) req.flash('error_msg', 'No se pudo purgar el registro de auditoría.');
        return res.redirect('/admin/auditoria');
    }
};
