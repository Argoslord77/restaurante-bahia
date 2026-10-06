const ProductoService = require('../services/productoService');
const VentaService = require('../services/ventaService');
const CajaService = require('../services/cajaService');
const AjusteService = require('../services/ajusteService');

module.exports = {
    vista: async (req, res) => {
        try {
            const turno = await CajaService.turnoAbierto();
            if (!turno) {
                req.flash('error_msg', 'Abra el turno de caja antes de vender.');
                return res.redirect('/caja');
            }
            const iva = await AjusteService.ivaPct();
            res.render('pos', { turno, iva });
        } catch (err) {
            req.flash('error_msg', err.message);
            res.redirect('/');
        }
    },

    apiBuscar: async (req, res) => {
        try {
            const items = await ProductoService.buscarParaVenta(req.query.q || '');
            res.json({ success: true, items });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    },

    apiVender: async (req, res) => {
        try {
            const turno = await CajaService.turnoAbierto();
            if (!turno) return res.status(400).json({ success: false, message: 'No hay turno de caja abierto.' });
            const r = await VentaService.crear({
                usuario_id: req.session.tiendaUser.id,
                turno_id: turno.id,
                cliente_nombre: req.body.cliente_nombre || null,
                items: req.body.items,
                pagos: req.body.pagos,
                descuento: req.body.descuento || 0
            });
            res.json({ success: true, ...r });
        } catch (err) {
            res.status(400).json({ success: false, message: err.message });
        }
    }
};
