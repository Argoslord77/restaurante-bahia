const CajaService = require('../services/cajaService');

module.exports = {
    estado: async (req, res) => {
        try {
            const turno = await CajaService.turnoAbierto();
            const resumen = turno ? await CajaService.resumenTurno(turno.id) : null;
            const historial = await CajaService.historial(20);
            res.render('caja', { turno, resumen, historial });
        } catch (err) {
            req.flash('error_msg', err.message);
            res.redirect('/');
        }
    },

    abrir: async (req, res) => {
        try {
            await CajaService.abrir({ usuario_id: req.session.tiendaUser.id, fondo: req.body.fondo || 0 });
            req.flash('ok_msg', 'Turno de caja abierto. Ya puede vender.');
            res.redirect('/pos');
        } catch (err) {
            req.flash('error_msg', err.message);
            res.redirect('/caja');
        }
    },

    cerrar: async (req, res) => {
        try {
            const r = await CajaService.cerrar({
                turno_id: req.body.turno_id,
                usuario_id: req.session.tiendaUser.id,
                conteo_efectivo: req.body.conteo_efectivo,
                nota: req.body.nota || null
            });
            req.flash('ok_msg', `Turno cerrado. Diferencia: $${Number(r.diferencia).toFixed(2)}`);
        } catch (err) {
            req.flash('error_msg', err.message);
        }
        res.redirect('/caja');
    }
};
