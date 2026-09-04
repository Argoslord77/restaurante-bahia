// config/session.js
// Identidad de la petición: cookies firmadas, sesión, Passport, mensajes flash
// y el contexto mínimo que necesitan todas las vistas EJS.
//
// Corrección importante respecto al app.js monolítico: la cookie de sesión se
// marcaba SIEMPRE como `secure: true`. En modo HTTP (SERVER_HTTP=1, usado para
// pruebas detrás de un proxy o en preview) el navegador descartaba la cookie y
// era imposible iniciar sesión. Ahora el flag sigue la forma real de arranque.
'use strict';

const session = require('express-session');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const flash = require('connect-flash');

/** Registra la estrategia local en Passport. Idempotente. */
function configurarPassport() {
    require('./passport')(passport);
    return passport;
}

/** Cookies firmadas con COOKIE_SECRET. */
function cookies() {
    return cookieParser(process.env.COOKIE_SECRET);
}

function entero(nombre, porDefecto) {
    const bruto = process.env[nombre];
    if (bruto === undefined || bruto === null || bruto === '') return porDefecto;
    const numero = Number(bruto);
    return Number.isFinite(numero) && numero > 0 ? numero : porDefecto;
}

/** ¿El proceso sirve tráfico en texto plano? */
function enModoHttp() {
    return process.env.SERVER_HTTP === '1';
}

/**
 * Opciones de express-session como objeto plano (puro y testeable).
 * Falla rápido y con mensaje claro si falta SESSION_SECRET.
 */
function opcionesSesion(opciones = {}) {
    const secret = process.env.SESSION_SECRET;
    if (!secret) {
        throw new Error(
            'Falta SESSION_SECRET en .env: sin él no se puede firmar la sesión. ' +
            'Copia .env.example y genera un valor aleatorio largo.'
        );
    }

    return {
        secret,
        resave: false,
        saveUninitialized: false,
        name: opciones.name || 'bahia.sid',
        cookie: {
            // En HTTP la cookie no puede ser `secure` o el navegador la tira.
            secure: opciones.secure === undefined ? !enModoHttp() : opciones.secure,
            maxAge: entero('SESSION_MAX_AGE_MS', 3600000),
            httpOnly: true,
            sameSite: 'lax',
        },
    };
}

/** Middleware de sesión. */
function sesion(opciones = {}) {
    return session(opcionesSesion(opciones));
}

/** Inicialización de Passport sobre la sesión. */
function passportMiddleware() {
    return [passport.initialize(), passport.session()];
}

/** Mensajes flash de una sola lectura. */
function mensajesFlash() {
    return flash();
}

/**
 * Contexto global para EJS: mensajes flash y usuario autenticado.
 * Debe montarse ANTES de las rutas y DESPUÉS de la sesión.
 */
function contextoVistas() {
    return function contexto(req, res, next) {
        res.locals.success_msg = req.flash('success_msg');
        res.locals.error_msg = req.flash('error_msg');
        res.locals.user = req.session.user || null;
        next();
    };
}

module.exports = {
    configurarPassport,
    cookies,
    opcionesSesion,
    sesion,
    passportMiddleware,
    mensajesFlash,
    contextoVistas,
    enModoHttp,
};
