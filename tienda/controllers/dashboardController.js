const CajaService = require('../services/cajaService');
const VentaService = require('../services/ventaService');
const InventarioService = require('../services/inventarioService');
const AjusteService = require('../services/ajusteService');

module.exports = {
    home: async (req, res) => {
        try {
            const hoy = new Date().toISOString().slice(0, 10);
            const [turno, ventasHoy, bajo, negocio] = await Promise.all([
                CajaService.turnoAbierto(),
                VentaService.listar({ desde: hoy, hasta: hoy }),
                InventarioService.stockBajo(),
                AjusteService.get('negocio_nombre', 'Mi Negocio')
            ]);
            res.render('dashboard', {
                turno, ventasHoy: ventasHoy.totales, ultimas: ventasHoy.filas.slice(0, 8),
                stockBajo: bajo, negocio
            });
        } catch (err) {
            req.flash('error_msg', 'Error al cargar el panel: ' + err.message);
            res.render('dashboard', { turno: null, ventasHoy: { n: 0, total: 0 }, ultimas: [], stockBajo: [], negocio: 'Mi Negocio' });
        }
    }
};
