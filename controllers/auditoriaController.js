// controllers/auditoriaController.js
const AuditLogService = require('../services/auditLogService');

exports.viewAuditoria = async (req, res) => {
    try {
        const filtros = {
            pagina: req.query.pagina || 1,
            porPagina: req.query.porPagina || 50,
            usuarioId: req.query.usuarioId || '',
            accion: req.query.accion || '',
            desde: req.query.desde || '',
            hasta: req.query.hasta || ''
        };
        const resultado = await AuditLogService.listar(filtros);
        return res.render('admin/auditoria', {
            pageTitle: 'Auditoría de Operaciones',
            view: 'auditoria',
            user: req.user || null,
            logs: resultado.rows,
            paginacion: resultado,
            filtros
        });
    } catch (error) {
        console.error('Error al cargar auditoría:', error);
        if (req.flash) req.flash('error_msg', 'No se pudo cargar el registro de auditoría.');
        return res.redirect('/admin/configuracion');
    }
};

exports.apiAuditoria = async (req, res) => {
    try {
        const resultado = await AuditLogService.listar({
            pagina: req.query.pagina || 1,
            porPagina: req.query.porPagina || 50,
            usuarioId: req.query.usuarioId || '',
            accion: req.query.accion || '',
            desde: req.query.desde || '',
            hasta: req.query.hasta || ''
        });
        return res.json({ success: true, ...resultado });
    } catch (error) {
        console.error('Error en API de auditoría:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
