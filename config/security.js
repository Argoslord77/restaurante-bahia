// config/security.js
// Cabeceras de seguridad y límite de peticiones.
//
// Antes vivía todo dentro de app.js. Se separa aquí para que:
//   1. La política CSP tenga UN único lugar de definición (es la causa raíz de
//      varios bugs de impresión: si se pierde `script-src-attr 'unsafe-inline'`
//      dejan de funcionar todos los onclick inline de las vistas).
//   2. Los límites de peticiones sean ajustables por entorno sin tocar código.
'use strict';

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

/**
 * Política de seguridad de contenido.
 * `scriptSrcAttr: ["'unsafe-inline'"]` es OBLIGATORIO: helmet trae por defecto
 * `script-src-attr 'none'`, lo que bloquea window.print() y los onclick de las
 * tablas y botones de impresión de los reportes.
 */
const POLITICA_CSP = {
    directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
        scriptSrcAttr: ["'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", "https://cdn.jsdelivr.net"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
    },
};

/** Configuración HSTS: solo tiene sentido detrás de HTTPS. */
const POLITICA_HSTS = {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
};

function entero(nombre, porDefecto) {
    const bruto = process.env[nombre];
    if (bruto === undefined || bruto === null || bruto === '') return porDefecto;
    const numero = Number(bruto);
    return Number.isFinite(numero) && numero > 0 ? numero : porDefecto;
}

/** Middleware de cabeceras de seguridad (helmet + CSP + HSTS). */
function seguridadHttp(opciones = {}) {
    return helmet({
        contentSecurityPolicy: opciones.contentSecurityPolicy || POLITICA_CSP,
        hsts: opciones.hsts === false ? false : (opciones.hsts || POLITICA_HSTS),
    });
}

/**
 * Limitador de peticiones por IP.
 * Ventana y tope ajustables con RATE_LIMIT_WINDOW_MS y RATE_LIMIT_MAX.
 */
function limitadorPeticiones(opciones = {}) {
    return rateLimit({
        windowMs: opciones.windowMs || entero('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
        max: opciones.max || entero('RATE_LIMIT_MAX', 2000),
        message: {
            success: false,
            message: 'Demasiadas solicitudes desde esta IP, por favor intenta más tarde.',
        },
        standardHeaders: true,
        legacyHeaders: false,
    });
}

module.exports = {
    POLITICA_CSP,
    POLITICA_HSTS,
    seguridadHttp,
    limitadorPeticiones,
};
