// tienda/middlewares/auth.js — Sesión propia de la tienda (independiente
// del restaurante). Roles: administrador > cajero > vendedor.
function ensureAuthenticated(req, res, next) {
    if (req.session && req.session.tiendaUser) return next();
    if ((req.headers.accept || '').includes('application/json') || req.xhr) {
        return res.status(401).json({ success: false, message: 'Sesión no válida.' });
    }
    return res.redirect('/login');
}

function checkRole(rolesPermitidos) {
    const lista = Array.isArray(rolesPermitidos) ? rolesPermitidos : [rolesPermitidos];
    return (req, res, next) => {
        const u = req.session && req.session.tiendaUser;
        if (!u) {
            if ((req.headers.accept || '').includes('application/json') || req.xhr) {
                return res.status(401).json({ success: false, message: 'Sesión no válida.' });
            }
            return res.redirect('/login');
        }
        if (!lista.includes(u.rol)) {
            if ((req.headers.accept || '').includes('application/json') || req.xhr) {
                return res.status(403).json({ success: false, message: 'Sin permiso para esta acción.' });
            }
            req.flash('error_msg', 'Sin permiso para esta sección.');
            return res.redirect('/');
        }
        return next();
    };
}

module.exports = { ensureAuthenticated, checkRole };
