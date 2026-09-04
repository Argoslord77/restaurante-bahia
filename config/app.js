// config/app.js
// Composición de la aplicación Express.
//
// Este archivo sustituye al antiguo app.js monolítico (200+ líneas mezclando
// helmet, sesiones, Passport, auditoría, licencia, 23 montajes de rutas y el
// arranque HTTPS). Aquí solo se ENSAMBLA; cada pieza vive en su módulo y tiene
// sus propios tests:
//
//   config/security.js  -> helmet/CSP y rate limit
//   config/session.js   -> cookies, sesión, Passport, flash, contexto EJS
//   config/views.js     -> EJS, estáticos, favicon
//   config/routes.js    -> registro central de routers
//   config/server.js    -> listener HTTP/HTTPS y apagado ordenado
//
// El ORDEN de los middlewares es contractual y se respeta tal cual estaba:
// estáticos -> seguridad -> parsers -> cookies -> sesión -> Passport -> flash
// -> contexto de vistas -> recordarme -> auditoría -> licencia -> favicon
// -> rutas -> 404 (opcional) -> errores.
'use strict';

const express = require('express');

const { seguridadHttp, limitadorPeticiones } = require('./security');
const {
    configurarPassport,
    cookies,
    sesion,
    passportMiddleware,
    mensajesFlash,
    contextoVistas,
} = require('./session');
const { configurarVistas, estaticos, faviconMiddleware } = require('./views');
const { montarRutas, validarRegistro } = require('./routes');
const { checkRememberMe } = require('../middlewares/auth');
const { auditoriaGlobal } = require('../middlewares/auditoria');
const { exigirLicencia } = require('../middlewares/licencia');
const { errorHandler, notFoundHandler } = require('../middlewares/errorHandler');

/** Sondeo de vida. No toca BD ni licencia: sirve para pm2, systemd y monitoreo. */
function sondaDeVida() {
    return function vida(req, res) {
        res.status(200).json({
            status: 'ok',
            servicio: 'restaurante-bahia',
            entorno: process.env.NODE_ENV || 'development',
            hora: new Date().toISOString(),
            uptime_seg: Math.round(process.uptime()),
        });
    };
}

/**
 * Construye y devuelve la aplicación Express sin ponerla a escuchar.
 * Al no escuchar, es directamente usable desde supertest en los tests.
 *
 * @param {object} opciones
 * @param {boolean} [opciones.montarRutas=true]  montar el registro de routers
 * @param {boolean} [opciones.notFound]          forzar el manejador 404
 * @param {Array}   [opciones.registro]          registro de rutas alternativo
 */
function createApp(opciones = {}) {
    const app = express();

    // Detrás de nginx/otro proxy: sin esto helmet y express-session ven la IP y
    // el esquema del proxy, no los del cliente.
    if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);

    configurarPassport();
    configurarVistas(app);

    app.use(estaticos());

    // ── Seguridad ──
    app.use(seguridadHttp());
    app.use(limitadorPeticiones());

    // ── Parsers ──
    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());

    // ── Identidad ──
    app.use(cookies());
    app.use(sesion());
    for (const middleware of passportMiddleware()) app.use(middleware);
    app.use(mensajesFlash());

    // ── Contexto de vistas y recordarme ──
    app.use(contextoVistas());
    app.use(checkRememberMe);

    // ── Sondeo de vida (antes de auditoría/licencia: nunca toca la BD) ──
    app.get('/api/health', sondaDeVida());

    // ── Auditoría global y licencia ──
    app.use(auditoriaGlobal());
    app.use(exigirLicencia());

    // ── Favicon y rutas ──
    app.use(faviconMiddleware());

    if (opciones.montarRutas !== false) {
        const problemas = validarRegistro(opciones.registro);
        if (problemas.length > 0) {
            throw new Error(`Registro de rutas inválido:\n - ${problemas.join('\n - ')}`);
        }
        montarRutas(app, opciones.registro);
    }

    // ── 404 explícito (opt-in: cambia la respuesta por defecto de Express) ──
    const activar404 = opciones.notFound === undefined
        ? process.env.ENABLE_NOT_FOUND === '1'
        : opciones.notFound;
    if (activar404) app.use(notFoundHandler);

    // ── Manejo centralizado de errores: siempre al final ──
    app.use(errorHandler);

    return app;
}

module.exports = { createApp, sondaDeVida };
