// middlewares/compress.js
// Compresión gzip de respuestas dinámicas (HTML/JSON) sin dependencias.
//
// Solo actúa cuando el cliente anuncia `Accept-Encoding: gzip` y el cuerpo
// supera 1 KB. Intercepta res.send (al que res.json y res.render delegan),
// así que los archivos estáticos y las descargas (res.sendFile) no se
// tocan. Ante cualquier duda, cae al envío normal sin comprimir.
'use strict';

const zlib = require('zlib');

const UMBRAL_BYTES = 1024;
const TIPOS_COMPRIMIBLES = [/^text\//, /json/, /javascript/, /svg/, /xml/];

function esComprimible(tipo, cuerpo) {
    if (tipo && TIPOS_COMPRIMIBLES.some(rx => rx.test(tipo))) return true;
    // res.send decide el Content-Type por el tipo del cuerpo cuando nadie
    // lo fijó: string → html, objeto → json. Replicamos esa semántica.
    if (!tipo && (typeof cuerpo === 'string' || (typeof cuerpo === 'object' && cuerpo !== null && !Buffer.isBuffer(cuerpo)))) {
        return true;
    }
    return false;
}

function compresionGzip(req, res, next) {
    const acepta = String(req.headers['accept-encoding'] || '');
    if (!/\bgzip\b/.test(acepta)) return next();
    if (res.__gzipInstalado) return next();
    res.__gzipInstalado = true;

    const envioOriginal = res.send.bind(res);
    res.send = function enviarConGzip(cuerpo) {
        try {
            if (cuerpo == null || typeof cuerpo === 'number') return envioOriginal(cuerpo);
            if (res.getHeader('Content-Encoding')) return envioOriginal(cuerpo);
            const tipo = String(res.getHeader('Content-Type') || '');
            if (!esComprimible(tipo, cuerpo)) return envioOriginal(cuerpo);
            const plano = Buffer.isBuffer(cuerpo)
                ? cuerpo
                : Buffer.from(typeof cuerpo === 'object' ? JSON.stringify(cuerpo) : String(cuerpo));
            if (plano.length < UMBRAL_BYTES) return envioOriginal(cuerpo);
            // Fijar el tipo ANTES de convertir a Buffer: res.send etiquetaría
            // un Buffer como application/octet-stream.
            if (!tipo) {
                res.setHeader('Content-Type', typeof cuerpo === 'object' && !Buffer.isBuffer(cuerpo)
                    ? 'application/json; charset=utf-8'
                    : 'text/html; charset=utf-8');
            }
            const gz = zlib.gzipSync(plano);
            res.setHeader('Content-Encoding', 'gzip');
            res.setHeader('Vary', 'Accept-Encoding');
            res.removeHeader('Content-Length');
            return envioOriginal(gz);
        } catch (_) {
            return envioOriginal(cuerpo);
        }
    };
    return next();
}

module.exports = compresionGzip;
