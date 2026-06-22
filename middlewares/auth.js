const db = require('../config/db');

module.exports = {
    // 1. Tu guardián existente de autenticación por sesión
    ensureAuthenticated: function(req, res, next) {
        if (req.isAuthenticated()) {
            return next();
        }
        req.flash('error_msg', 'Por favor, inicia sesión para acceder a esta sección.');
        res.redirect('/login');
    },

    // 2. NUEVO: Guardián de autorización basado en Roles
    checkRole: function(rolesPermitidos) {
        return (req, res, next) => {
            // Verificamos si hay un usuario autenticado y si su rol está en la lista permitida
            if (req.user && rolesPermitidos.includes(req.user.rol)) {
                return next(); // El usuario tiene el rol correcto, continúa a la ruta
            }
            
            // Si no tiene los permisos necesarios, lanzamos un error y lo devolvemos
            req.flash('error_msg', 'No tienes permisos autorizados para acceder a esta sección.');
            res.redirect('/login'); // Para evitar redirecciones infinitas
        };
    },

    // 3. Comprueba la funcionalidad de la funcion recordar usuario durante el login
    checkRememberMe: async function(req, res, next) {
        // Si el usuario ya está autenticado en la sesión actual, continuamos normalmente
        if (req.isAuthenticated()) {
            return next();
        }

        // Comprobamos si existe la cookie firmada 'remember_me'
        const cookieToken = req.signedCookies.remember_me;

        if (cookieToken) {
            try {
                // Buscar el token en la base de datos y verificar que no haya expirado
                // Reemplaza 'db.query' por el formato exacto que uses (promesas, pool, etc.)
                const [rows] = await db.query(
                    `SELECT usuario_id FROM usuarios_tokens 
                     WHERE token = ? AND expira_en > NOW() 
                     LIMIT 1`, 
                    [cookieToken]
                );

                if (rows && rows.length > 0) {
                    const usuarioId = rows[0].usuario_id;

                    // Buscar los datos completos del usuario para loguearlo en Passport
                    const [userRows] = await db.query(
                        'SELECT * FROM usuarios WHERE id = ? LIMIT 1', 
                        [usuarioId]
                    );

                    if (userRows && userRows.length > 0) {
                        const user = userRows[0];

                        // Iniciar la sesión de Passport de manera automática
                        req.logIn(user, (err) => {
                            if (err) return next(err);
                            return next();
                        });
                        return; // Evita que ejecute el next() del final de la función antes de tiempo
                    }
                }
            } catch (error) {
                console.error('Error en la validación automática del token:', error);
                // Si hay un error de DB, limpiamos la cookie dañada y continuamos al login normal
                res.clearCookie('remember_me');
            }
        }

        next();
    }
};