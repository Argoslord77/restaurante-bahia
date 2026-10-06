const AjusteService = require('../services/ajusteService');

module.exports = {
    ver: async (req, res) => {
        try {
            res.render('ajustes', { ajustes: await AjusteService.todos() });
        } catch (err) {
            req.flash('error_msg', err.message);
            res.redirect('/');
        }
    },

    guardar: async (req, res) => {
        try {
            const iva = Number(req.body.iva_pct);
            if (!Number.isFinite(iva) || iva < 0 || iva > 100) throw new Error('IVA no válido (0-100).');
            await AjusteService.set('negocio_nombre', req.body.negocio_nombre || 'Mi Negocio');
            await AjusteService.set('iva_pct', iva.toFixed(2));
            await AjusteService.set('ticket_pie', req.body.ticket_pie || '');
            req.flash('ok_msg', 'Ajustes guardados.');
        } catch (err) {
            req.flash('error_msg', err.message);
        }
        res.redirect('/ajustes');
    }
};
