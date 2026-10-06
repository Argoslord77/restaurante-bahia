const UsuarioService = require('../services/usuarioService');
const AjusteService = require('../services/ajusteService');

module.exports = {
    verLogin: async (req, res) => {
        if (req.session.tiendaUser) return res.redirect('/');
        let negocio = 'CajaFácil';
        try { negocio = await AjusteService.get('negocio_nombre', negocio); } catch (_) { /* sin BD: igual pinta */ }
        res.render('login', { negocio });
    },

    login: async (req, res) => {
        try {
            const sesion = await UsuarioService.validarCredenciales(req.body.usuario, req.body.clave);
            req.session.tiendaUser = sesion;
            res.redirect('/');
        } catch (err) {
            req.flash('error_msg', err.message);
            res.redirect('/login');
        }
    },

    logout: (req, res) => {
        req.session.destroy(() => res.redirect('/login'));
    }
};
