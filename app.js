#!/usr/bin/env node
// app.js — Punto de entrada del servidor.
//
// Ya no construye nada: delega en config/app.js (ensamblado) y config/server.js
// (listener HTTP/HTTPS + apagado ordenado). Se mantiene como `main` para que
// `npm start`, `nodemon app.js` y pm2 sigan funcionando exactamente igual.
//
// Como además EXPORTA la app, los tests pueden hacer require('./app') y usarla
// con supertest sin abrir un puerto.
'use strict';

require('dotenv').config();

const logger = require('./config/logger');
const { createApp } = require('./config/app');
const { iniciarServidor, registrarApagadoGracioso } = require('./config/server');

const app = createApp();

if (require.main === module) {
    iniciarServidor(app)
        .then((servidor) => registrarApagadoGracioso(servidor))
        .catch((error) => {
            logger.error(`No se pudo iniciar el servidor: ${error.message}`);
            console.error(error.message);
            process.exit(1);
        });
}

module.exports = app;
