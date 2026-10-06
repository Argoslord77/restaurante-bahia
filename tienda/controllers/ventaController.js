const VentaService = require('../services/ventaService');
const ReporteService = require('../services/reporteService');

module.exports = {
    lista: async (req, res) => {
        try {
            const r = await VentaService.listar({
                desde: req.query.desde, hasta: req.query.hasta,
                estado: req.query.estado || null
            });
            res.render('ventas', { ...r, estado: req.query.estado || '' });
        } catch (err) {
            req.flash('error_msg', err.message);
            res.redirect('/');
        }
    },

    ticket: async (req, res) => {
        try {
            const t = await ReporteService.ticket(req.params.id);
            if (!t) return res.status(404).send('Venta no encontrada.');
            res.render('ticket', { ...t });
        } catch (err) {
            res.status(500).send('Error al cargar el ticket.');
        }
    },

    cancelar: async (req, res) => {
        try {
            await VentaService.cancelar({
                venta_id: req.params.id,
                usuario_id: req.session.tiendaUser.id,
                motivo: req.body.motivo || null
            });
            req.flash('ok_msg', 'Venta cancelada y stock devuelto.');
        } catch (err) {
            req.flash('error_msg', err.message);
        }
        res.redirect('/ventas');
    }
};
