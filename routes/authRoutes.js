const express = require('express');
const router = express.Router();
const passport = require('passport');
const crypto = require('crypto');

// Importar la conexión compartida de la base de datos de Restaurante Bahía
const db = require('../config/db');
const { authLimiter } = require('../middlewares/security');

// GET: Renderizar Login
router.get('/login', (req, res) => {
    //Redireccionar al usuario segun su rol en el Sistema
    if (req.isAuthenticated() && typeof req.session.user !== 'undefined'){
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
            case "bartender":
                return res.redirect('/monitor/bar');
                break;
            case "jefe-cocina":
                return res.redirect('/monitor/cocina');
                break;
            case "cocinero":
                return res.redirect('/monitor/cocina');
                break;
            case "luncher":
                return res.redirect('/monitor/cocina');
                break;
            case "porcionador":
                return res.redirect('/monitor/cocina');
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
router.post('/login', authLimiter, (req, res, next) => {
    passport.authenticate('local', async (err, user, info) => { // Agregamos async aquí para manejar la consulta
        if (err) return next(err);
        if (!user) {
            req.flash('error_msg', info.message || 'Credenciales incorrectas');
            return res.redirect('/login');
        }
        
        try {
            // Chequear en tiempo real que el usuario esté activo en la base de datos
            const [rows] = await db.query('SELECT activo FROM usuarios WHERE id = ?', [user.id]);
            
            if (rows.length === 0 || rows[0].activo === 0 || rows[0].activo === false) {
                req.flash('error_msg', 'Tu cuenta no está activa. Contacta al administrador.');
                return res.redirect('/login'); // Redirige a login directamente ya que aún no inicia sesión
            }
        } catch (dbError) {
            console.error('Error al verificar el estado activo del usuario:', dbError);
            req.flash('error_msg', 'Ocurrió un error al verificar tu cuenta. Inténtalo de nuevo.');
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
        console.log(req.flash('error_msg'));
        let flash_msg = (typeof req.flash('error_msg') !== 'undefined') ? req.flash('error_msg') : req.flash('success_msg');
        req.flash('success_msg', flash_msg.length > 0 ? flash_msg : 'Sesión cerrada correctamente.');
        res.redirect('/login');
    });
});

module.exports = router;