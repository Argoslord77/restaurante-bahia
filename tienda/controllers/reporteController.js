const ReporteService = require('../services/reporteService');
const InventarioService = require('../services/inventarioService');

module.exports = {
    ventas: async (req, res) => {
        try {
            const r = await ReporteService.ventasPorDia({ desde: req.query.desde, hasta: req.query.hasta });
            res.render('reporte_ventas', {
                filas: r.filas || [],
                filtros: r.filtros,
                totalVentas: r.totales.n,
                totalMonto: r.totales.total,
                totalUtilidad: r.totales.utilidad
            });
        } catch (err) {
            req.flash('error_msg', err.message);
            res.redirect('/');
        }
    },

    masVendidos: async (req, res) => {
        try {
            const r = await ReporteService.masVendidos({ desde: req.query.desde, hasta: req.query.hasta, limite: 15 });
            res.render('reporte_mas_vendidos', {
                filas: (r.filas || []).map((f) => ({ nombre: f.nombre, piezas: Number(f.cantidad) || 0, monto: Number(f.importe) || 0 })),
                filtros: r.filtros
            });
        } catch (err) {
            req.flash('error_msg', err.message);
            res.redirect('/');
        }
    },

    inventario: async (req, res) => {
        try {
            const r = await InventarioService.valorizado();
            res.render('reporte_inventario', {
                filas: r.filas || [],
                totalCosto: r.totales.costo,
                totalVenta: r.totales.venta
            });
        } catch (err) {
            req.flash('error_msg', err.message);
            res.redirect('/');
        }
    }
};
