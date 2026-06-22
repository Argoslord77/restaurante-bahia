const express = require('express');
const router = express.Router();
const passport = require('passport');
const crypto = require('crypto');

// Importar la conexión compartida de la base de datos de Restaurante Bahía
const db = require('../config/db');

// GET: Renderizar Login
router.get('/login', (req, res) => {
    //Redireccionar al usuario segun su rol en el Sistema
    if (req.isAuthenticated()){
        switch(req.session.user.rol){
            case "superadministrador":
                return res.redirect('/admin/dashboard');
            break;
            case "administrador":
                return res.redirect('/admin/dashboard');
            break;
            case "dependiente":
                return res.redirect('/dependiente/dashboard');
                break;
            default:
                return res.redirect('/logout');
                break; 
        };
    } else {
        res.render('auth/login');
    }; 
});

// POST: Procesar Login
router.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) return next(err);
        if (!user) {
            req.flash('error_msg', info.message || 'Credenciales incorrectas');
            return res.redirect('/login');
        }

        // Iniciar sesión manualmente mediante Passport
        req.logIn(user, async (err) => {
            if (err) return next(err);

            req.session.user = {
                id: user.id,
                nombre: user.nombre,
                apellidos: user.apellidos,
                email: user.email || null,
                usuario: user.usuario,
                rol: user.rol,
                foto: user.foto || null
            };

            // ¿El usuario marcó la casilla "Recordarme"?
            if (req.body.remember) {
                // 1. Generar un token aleatorio seguro
                const token = crypto.randomBytes(64).toString('hex');
                
                // 2. Definir tiempo de expiración (15 días en milisegundos)
                const quinceDias = 15 * 24 * 60 * 60 * 1000;
                const fechaExpiracion = new Date(Date.now() + quinceDias);

                try {
                    // 3. Guardar el token en la base de datos vinculándolo al usuario
                    // Ajusta esta consulta a la sintaxis exacta de tu librería de DB (mysql2, pool, etc.)
                    await db.query(
                        'INSERT INTO usuarios_tokens (token, usuario_id, expira_en) VALUES (?, ?, ?)',
                        [token, user.id, fechaExpiracion]
                    );

                    // 4. Enviar la cookie segura al navegador del usuario
                    res.cookie('remember_me', token, {
                        path: '/',
                        httpOnly: true, // Protege contra ataques XSS
                        signed: true,   // Firma la cookie para evitar manipulaciones
                        maxAge: quinceDias
                    });

                } catch (dbError) {
                    console.error('Error al guardar el token de recuerdo:', dbError);
                    // No bloqueamos el login si falla la persistencia del token, solo continuamos
                }
            }

            return res.redirect('/admin/dashboard');
        });
    })(req, res, next);
});

// GET: Logout
router.get('/logout', async (req, res, next) => {
    const cookieToken = req.signedCookies.remember_me;

    if (cookieToken) {
        try {
            // 1. Eliminar el token de la base de datos para que quede invalidado
            await db.query('DELETE FROM usuarios_tokens WHERE token = ?', [cookieToken]);
        } catch (err) {
            console.error('Error al eliminar token durante logout:', err);
        }
        // 2. Borrar la cookie del navegador del cliente
        res.clearCookie('remember_me', { path: '/' });
    }
    // 3. Destruir la sesión de Passport de manera normal
    req.logout((err) => {
        if (err) return next(err);
        req.flash('success_msg', 'Sesión cerrada correctamente.');
        res.redirect('/login');
    });
});

module.exports = router;