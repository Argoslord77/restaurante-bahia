// config/server.js
// Arranque del servidor HTTP/HTTPS y apagado ordenado.
//
// Diferencias con el app.js monolítico:
//   * Los certificados se leen SOLO al arrancar en modo HTTPS. Antes el
//     `fs.readFileSync` corría al cargar el módulo: sin certs/key.pem la app no
//     se podía ni importar (rompía tests y cualquier `require('./app')`).
//   * La ruta de los certificados es configurable (SSL_KEY_PATH / SSL_CERT_PATH).
//   * SIGINT/SIGTERM cierran el listener y el pool de MySQL: con pm2 o systemd
//     el reinicio ya no deja conexiones colgadas.
'use strict';

const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');
const logger = require('./logger');

const CARPETA_CERTS = path.join(__dirname, '..', 'certs');

/** ¿Arranque en texto plano? (detrás de proxy, preview o pruebas) */
function enModoHttp() {
    return process.env.SERVER_HTTP === '1';
}

function puerto() {
    const bruto = Number(process.env.PORT);
    return Number.isFinite(bruto) && bruto > 0 ? bruto : 3000;
}

function host() {
    return process.env.HOST || '0.0.0.0';
}

/** Rutas de los certificados, con valores por defecto en ./certs. */
function rutasCertificados() {
    return {
        key: process.env.SSL_KEY_PATH || path.join(CARPETA_CERTS, 'key.pem'),
        cert: process.env.SSL_CERT_PATH || path.join(CARPETA_CERTS, 'cert.pem'),
    };
}

/**
 * Lee key/cert. Lanza un Error con instrucciones accionables si falta algo,
 * en lugar del ENOENT crudo de fs.
 */
function leerCertificados(rutas = rutasCertificados()) {
    const faltantes = ['key', 'cert'].filter((tipo) => !fs.existsSync(rutas[tipo]));

    if (faltantes.length > 0) {
        const lista = faltantes.map((tipo) => `${tipo}: ${rutas[tipo]}`).join('\n  ');
        throw new Error(
            'No se pudo arrancar en HTTPS, faltan certificados:\n  ' + lista + '\n' +
            'Soluciones:\n' +
            '  1) Generarlos con mkcert:  mkcert -key-file certs/key.pem -cert-file certs/cert.pem localhost\n' +
            '  2) Apuntar a otros existentes: SSL_KEY_PATH=/ruta/key.pem SSL_CERT_PATH=/ruta/cert.pem\n' +
            '  3) Arrancar en HTTP (pruebas/proxy): SERVER_HTTP=1 node app.js'
        );
    }

    return {
        key: fs.readFileSync(rutas.key),
        cert: fs.readFileSync(rutas.cert),
    };
}

/**
 * Crea el listener según el modo, lo pone a escuchar y devuelve una promesa
 * con el servidor. No registra señales: eso lo hace registrarApagadoGracioso.
 */
function iniciarServidor(app, opciones = {}) {
    const usarHttp = opciones.http === undefined ? enModoHttp() : opciones.http;
    const puertoEscucha = opciones.port || puerto();
    const hostEscucha = opciones.host || host();

    let servidor;
    try {
        servidor = usarHttp
            ? http.createServer(app)
            : https.createServer(opciones.ssl || leerCertificados(), app);
    } catch (error) {
        // Certificado corrupto o en formato no PEM: se devuelve como promesa
        // rechazada para que el arranque falle con un mensaje legible en lugar
        // de un stack de OpenSSL.
        return Promise.reject(new Error(
            `No se pudo crear el servidor HTTPS: ${error.message}\n` +
            'Revise que key.pem/cert.pem sean PEM válidos (mkcert -key-file certs/key.pem -cert-file certs/cert.pem localhost).'
        ));
    }

    return new Promise((resolve, reject) => {
        servidor.once('error', reject);
        servidor.listen(puertoEscucha, hostEscucha, () => {
            servidor.removeListener('error', reject);
            const esquema = usarHttp ? 'http' : 'https';
            logger.info(
                `Servidor ${esquema.toUpperCase()} corriendo en: ${esquema}://localhost:${puertoEscucha}` +
                (usarHttp ? ' (SERVER_HTTP=1)' : '')
            );
            resolve(servidor);
        });
    });
}

/**
 * Cierra el proceso sin dejar trabajo a medias: primero el listener (deja de
 * aceptar peticiones nuevas), luego el pool de MySQL.
 */
function registrarApagadoGracioso(servidor, opciones = {}) {
    const senales = opciones.senales || ['SIGINT', 'SIGTERM'];
    const salir = opciones.salir || ((codigo) => process.exit(codigo));
    let cerrando = false;

    const apagar = async (senal) => {
        if (cerrando) return;
        cerrando = true;
        logger.info(`[Servidor] ${senal} recibida, cerrando de forma ordenada...`);

        const temporizador = setTimeout(() => {
            logger.error('[Servidor] Cierre forzado por tiempo de espera agotado.');
            salir(1);
        }, opciones.timeoutMs || 10000);
        temporizador.unref?.();

        try {
            await new Promise((resolve) => servidor.close(resolve));
            // Se importa aquí para no crear el pool al cargar el módulo.
            const pool = require('./db');
            if (pool && typeof pool.end === 'function') await pool.end();
            logger.info('[Servidor] Cerrado correctamente.');
            clearTimeout(temporizador);
            salir(0);
        } catch (error) {
            logger.error(`[Servidor] Error durante el cierre: ${error.message}`);
            clearTimeout(temporizador);
            salir(1);
        }
    };

    for (const senal of senales) process.on(senal, () => apagar(senal));
    return apagar;
}

module.exports = {
    CARPETA_CERTS,
    enModoHttp,
    puerto,
    host,
    rutasCertificados,
    leerCertificados,
    iniciarServidor,
    registrarApagadoGracioso,
};
