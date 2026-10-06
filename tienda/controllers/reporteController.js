const ReporteService = require('../services/reporteService');
const InventarioService = require('../services/inventarioService');

module.exports = {
    ventas: async (req, res) => {
        try {
            const r = await ReporteService.ventasPorDia({ desde: req.query.desde, hasta: req.query.hasta });
            res.render('reporte_ventas', r);
        } catch (err) {
            req.flash('error_msg', err.message);
            res.redirect('/');
        }
    },

    masVendidos: async (req, res) => {
        try {
            const r = await ReporteService.masVendidos({ desde: req.query.desde, hasta: req.query.hasta, limite: 15 });
            res.render('reporte_mas_vendidos', r);
        } catch (err) {
            req.flash('error_msg', err.message);
            res.redirect('/');
        }
    },

    inventario: async (req, res) => {
        try {
            const r = await InventarioService.valorizado();
            res.render('reporte_inventario', r);
        } catch (err) {
            req.flash('error_msg', err.message);
            res.redirect('/');
        }
    }
};
