// config/views.js
// Motor de plantillas, recursos estáticos y favicon.
// El favicon se resuelve de forma tolerante: si el archivo no existe la app
// arranca igual (antes un favicon ausente tiraba el proceso entero al cargar).
'use strict';

const fs = require('fs');
const path = require('path');
const express = require('express');
const favicon = require('serve-favicon');
const logger = require('./logger');

const RAIZ = path.join(__dirname, '..');
const CARPETA_VISTAS = path.join(RAIZ, 'views');
const CARPETA_PUBLICA = path.join(RAIZ, 'public');
const RUTA_FAVICON = path.join(CARPETA_PUBLICA, 'img', 'favicon.png');

/** Configura EJS como motor y la carpeta de vistas. */
function configurarVistas(app) {
    app.set('view engine', 'ejs');
    app.set('views', CARPETA_VISTAS);
    return app;
}

/** Archivos estáticos (CSS/JS/JS/img propios y de Bootstrap). */
function estaticos() {
    return express.static(CARPETA_PUBLICA);
}

/** Favicon real si existe; si no, un paso transparente. */
function faviconMiddleware(ruta = RUTA_FAVICON) {
    if (!fs.existsSync(ruta)) {
        logger.warn(`[Vistas] No existe ${ruta}; se sirve sin favicon.`);
        return function sinFavicon(req, res, next) { next(); };
    }
    return favicon(ruta);
}

module.exports = {
    RAIZ,
    CARPETA_VISTAS,
    CARPETA_PUBLICA,
    RUTA_FAVICON,
    configurarVistas,
    estaticos,
    faviconMiddleware,
};
