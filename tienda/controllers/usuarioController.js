const UsuarioService = require('../services/usuarioService');

module.exports = {
    lista: async (req, res) => {
        try {
            res.render('usuarios', { usuarios: await UsuarioService.listar(), roles: UsuarioService.ROLES });
        } catch (err) {
            req.flash('error_msg', err.message);
            res.redirect('/');
        }
    },

    crear: async (req, res) => {
        try {
            await UsuarioService.crear({
                nombre: req.body.nombre, usuario: req.body.usuario,
                clave: req.body.clave, rol: req.body.rol
            });
            req.flash('ok_msg', 'Usuario creado.');
        } catch (err) {
            req.flash('error_msg', err.message);
        }
        res.redirect('/usuarios');
    },

    clave: async (req, res) => {
        try {
            if (req.body.clave !== req.body.clave2) throw new Error('Las claves no coinciden.');
            await UsuarioService.cambiarClave(req.params.id, req.body.clave);
            req.flash('ok_msg', 'Clave actualizada.');
        } catch (err) {
            req.flash('error_msg', err.message);
        }
        res.redirect('/usuarios');
    },

    rol: async (req, res) => {
        try {
            if (Number(req.params.id) === req.session.tiendaUser.id && req.body.rol !== 'administrador') {
                throw new Error('No puede quitarse el rol de administrador a sí mismo.');
            }
            await UsuarioService.cambiarRol(req.params.id, req.body.rol);
            req.flash('ok_msg', 'Rol actualizado.');
        } catch (err) {
            req.flash('error_msg', err.message);
        }
        res.redirect('/usuarios');
    },

    toggle: async (req, res) => {
        try {
            if (Number(req.params.id) === req.session.tiendaUser.id) {
                throw new Error('No puede desactivarse a sí mismo.');
            }
            const u = await UsuarioService.obtener(req.params.id);
            if (!u) throw new Error('El usuario no existe.');
            await UsuarioService.cambiarActivo(req.params.id, !u.activo);
            req.flash('ok_msg', u.activo ? 'Usuario desactivado.' : 'Usuario activado.');
        } catch (err) {
            req.flash('error_msg', err.message);
        }
        res.redirect('/usuarios');
    }
};
