const express = require('express');
const router = express.Router();
const passport = require('passport');
const crypto = require('crypto');

// Importar la conexión compartida de la base de datos de Restaurante Bahía
const db = require('../config/db');
const { authLimiter } = require('../middlewares/security');
const AuditLogService = require('../services/auditLogService');
const { generarToken, hashToken } = require('../config/tokens');
const { CATEGORIAS, SEVERIDADES } = require('../config/auditoriaCatalogo');

/**
 * Asiento de auditoría para los eventos de sesión.
 *
 * Se registran aquí y no en el middleware global porque estos eventos
 * necesitan información que el middleware no puede ver: el usuario intentado
 * cuando las credenciales fallan, y la identidad del usuario ANTES de que
 * req.logout() destruya la sesión.
 */
function auditarSesion(req, { accion, exitosa, severidad, usuario = null, datos = null }) {
    const ipReenviada = req.headers['x-forwarded-for'];
    return AuditLogService.registrar({
        usuario_id: usuario ? usuario.id : null,
        usuario_nombre: usuario
            ? [usuario.nombre, usuario.apellidos].filter(Boolean).join(' ').trim() || usuario.usuario
            : null,
        usuario_rol: usuario ? usuario.rol : null,
        metodo_http: req.method,
        ruta: req.originalUrl ? req.originalUrl.split('?')[0] : req.path,
        url: req.originalUrl,
        accion,
        entidad: 'Sesión',
        entidad_id: usuario ? String(usuario.id) : null,
        modulo: 'Autenticación',
        categoria: exitosa ? CATEGORIAS.AUTENTICACION : CATEGORIAS.SEGURIDAD,
        severidad,
        estado_http: exitosa ? 200 : 401,
        operacion_exitosa: exitosa,
        ip_origen: ipReenviada ? String(ipReenviada).split(',')[0].trim() : req.ip,
        user_agent: req.headers['user-agent'] || null,
        sesion_id: req.sessionID || null,
        datos_operacion: datos
    }).catch(() => { /* la auditoría nunca interrumpe el acceso */ });
}

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
            auditarSesion(req, {
                accion: 'Inicio de sesión fallido: credenciales incorrectas',
                exitosa: false,
                severidad: SEVERIDADES.CRITICO,
                datos: {
                    usuario_intentado: req.body && req.body.usuario ? String(req.body.usuario).slice(0, 100) : null,
                    motivo: info && info.message ? info.message : 'Credenciales incorrectas'
                }
            });
            req.flash('error_msg', info.message || 'Credenciales incorrectas');
            return res.redirect('/login');
        }
        
        try {
            // Chequear en tiempo real que el usuario esté activo en la base de datos
            const [rows] = await db.query('SELECT activo FROM usuarios WHERE id = ?', [user.id]);
            
            if (rows.length === 0 || rows[0].activo === 0 || rows[0].activo === false) {
                auditarSesion(req, {
                    accion: 'Inicio de sesión bloqueado: cuenta inactiva',
                    exitosa: false,
                    severidad: SEVERIDADES.CRITICO,
                    usuario: user,
                    datos: { motivo: 'La cuenta está desactivada en la base de datos' }
                });
                req.flash('error_msg', 'Tu cuenta no está activa. Contacta al administrador.');
                return res.redirect('/login'); // Redirige a login directamente ya que aún no inicia sesión
            }
        } catch (dbError) {
            console.error('Error al verificar el estado activo del usuario:', dbError);
            auditarSesion(req, {
                accion: 'Inicio de sesión fallido: error al verificar la cuenta',
                exitosa: false,
                severidad: SEVERIDADES.CRITICO,
                usuario: user,
                datos: { error: dbError.message }
            });
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

            auditarSesion(req, {
                accion: 'Inicio de sesión correcto',
                exitosa: true,
                severidad: SEVERIDADES.AVISO,
                usuario: user,
                datos: {
                    rol: user.rol,
                    recordarme: Boolean(req.body && req.body.remember)
                }
            });

            // ¿El usuario marcó la casilla "Recordarme"?
            if (req.body.remember) {
                // 1. Generar un token aleatorio seguro
                const token = generarToken();
                
                // 2. Definir tiempo de expiración (15 días en milisegundos)
                const quinceDias = 15 * 24 * 60 * 60 * 1000;
                const fechaExpiracion = new Date(Date.now() + quinceDias);

                try {
                    // 3. Guardar SOLO LA HUELLA del token vinculada al usuario.
                    //    El valor en claro únicamente existe en la cookie del
                    //    navegador: si la base de datos se filtrase, lo robado
                    //    no permitiría suplantar ninguna sesión.
                    await db.query(
                        'INSERT INTO usuarios_tokens (token, usuario_id, expira_en) VALUES (?, ?, ?)',
                        [hashToken(token), user.id, fechaExpiracion]
                    );

                    // 4. Enviar la cookie segura al navegador del usuario
                    res.cookie('remember_me', token, {
                        path: '/',
                        httpOnly: true, // Protege contra ataques XSS
                        signed: true,   // Firma la cookie para evitar manipulaciones
                        // La aplicación sirve solo por HTTPS: la cookie no debe
                        // viajar nunca por una conexión sin cifrar.
                        secure: true,
                        sameSite: 'lax',
                        maxAge: quinceDias
                    });

                    // Se aprovecha para retirar los tokens ya caducados
                    db.query('DELETE FROM usuarios_tokens WHERE expira_en <= NOW()').catch(() => {});

                } catch (dbError) {
                    console.error('Error al guardar el token de recuerdo:', dbError);
                    // No bloqueamos el login si falla la persistencia del token, solo continuamos
                }
            }

            // Un login exitoso no debe consumir el límite anti-fuerza bruta.
            // La opción skipSuccessfulRequests solo salta respuestas 2xx y el
            // login de formulario responde 302, así que el contador se resetea
            // aquí manualmente (los intentos fallidos siguen acumulándose).
            try {
                authLimiter.resetKey(req.ip);
            } catch (_) { /* el limiter nunca debe tumbar un login válido */ }

            return res.redirect('/admin/dashboard');
        });
    })(req, res, next);
});

// GET: Logout
router.get('/logout', async (req, res, next) => {
    const cookieToken = req.signedCookies.remember_me;
    // Se captura antes de req.logout(): después ya no existe
    const usuarioSaliente = req.user || (req.session && req.session.user) || null;

    if (cookieToken) {
        try {
            // 1. Invalidar el token. Se busca por su huella, que es lo que
            //    está guardado; la cookie trae el valor en claro.
            await db.query('DELETE FROM usuarios_tokens WHERE token = ?', [hashToken(cookieToken)]);
        } catch (err) {
            console.error('Error al eliminar token durante logout:', err);
        }
        // 2. Borrar la cookie del navegador del cliente
        res.clearCookie('remember_me', { path: '/' });
    }
    // 3. Destruir la sesión de Passport de manera normal
    req.logout((err) => {
        if (err) return next(err);
        auditarSesion(req, {
            accion: 'Cierre de sesión',
            exitosa: true,
            severidad: SEVERIDADES.INFO,
            usuario: usuarioSaliente,
            datos: { sesion_recordada_revocada: Boolean(cookieToken) }
        });
        console.log(req.flash('error_msg'));
        let flash_msg = (typeof req.flash('error_msg') !== 'undefined') ? req.flash('error_msg') : req.flash('success_msg');
        req.flash('success_msg', flash_msg.length > 0 ? flash_msg : 'Sesión cerrada correctamente.');
        res.redirect('/login');
    });
});

module.exports = router;