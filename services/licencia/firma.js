// services/licencia/firma.js
// Firma y verificación de licencias con Ed25519.
//
// Por qué asimétrico y no un HMAC
// -------------------------------
// Con un HMAC, la misma clave que verifica es la que firma: estaría dentro del
// código instalado en casa del cliente y cualquiera podría emitirse licencias.
// Con Ed25519 la instalación solo lleva la CLAVE PÚBLICA. Falsificar una
// licencia exige la clave privada, que nunca sale del equipo del proveedor.
//
// La firma cubre una serialización CANÓNICA del contenido (claves ordenadas
// recursivamente), de modo que no se pueda alterar el significado reordenando
// campos o cambiando el espaciado.
'use strict';

const crypto = require('crypto');

/** Serialización determinista: mismo contenido ⇒ mismos bytes, siempre. */
function canonico(valor) {
    if (valor === null || typeof valor !== 'object') return JSON.stringify(valor);
    if (Array.isArray(valor)) return '[' + valor.map(canonico).join(',') + ']';
    const claves = Object.keys(valor).sort();
    return '{' + claves.map(k => JSON.stringify(k) + ':' + canonico(valor[k])).join(',') + '}';
}

/** Genera un par de claves nuevo. Solo lo usa el proveedor, una única vez. */
function generarParDeClaves() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
    return {
        publica: publicKey.export({ type: 'spki', format: 'pem' }),
        privada: privateKey.export({ type: 'pkcs8', format: 'pem' })
    };
}

/** Firma el contenido de una licencia. Devuelve la firma en base64. */
function firmar(datos, clavePrivadaPem) {
    const clave = crypto.createPrivateKey(clavePrivadaPem);
    return crypto.sign(null, Buffer.from(canonico(datos), 'utf8'), clave).toString('base64');
}

/**
 * Verifica una firma. Nunca lanza: una licencia corrupta o manipulada
 * simplemente no es válida.
 */
function verificar(datos, firmaBase64, clavePublicaPem) {
    try {
        const clave = crypto.createPublicKey(clavePublicaPem);
        return crypto.verify(
            null,
            Buffer.from(canonico(datos), 'utf8'),
            clave,
            Buffer.from(firmaBase64, 'base64')
        );
    } catch (_) {
        return false;
    }
}

/** Huella corta y legible de un texto, para códigos dictables por teléfono. */
function codigoCorto(texto, longitud = 20) {
    // Base32 sin caracteres ambiguos (ni 0/O ni 1/I/L)
    const ALFABETO = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
    const bytes = crypto.createHash('sha256').update(String(texto)).digest();
    let salida = '';
    for (let i = 0; i < longitud; i++) salida += ALFABETO[bytes[i] % ALFABETO.length];
    return salida.match(/.{1,5}/g).join('-');
}

/** HMAC para sellar filas de estado en la base de datos. */
function sello(datos, clave) {
    return crypto.createHmac('sha256', String(clave))
        .update(canonico(datos))
        .digest('hex');
}

module.exports = { canonico, generarParDeClaves, firmar, verificar, codigoCorto, sello };
