// config/tokens.js
// Generación y verificación de los tokens persistentes de "Recuérdame".
//
// El token que viaja en la cookie del navegador NUNCA se guarda tal cual en la
// base de datos: se almacena su huella SHA-256. Así, si la base se filtra, los
// valores robados no sirven para suplantar sesiones, porque de la huella no se
// puede reconstruir el token original.
//
// Es el mismo criterio que se aplica a las contraseñas, salvo que aquí no hace
// falta un algoritmo lento con sal (bcrypt): el token ya es un valor aleatorio
// de 512 bits, no es adivinable por fuerza bruta ni por diccionario, así que
// un hash rápido es suficiente y evita penalizar cada petición.
'use strict';

const crypto = require('crypto');

// 64 bytes = 512 bits de entropía, en hexadecimal (128 caracteres)
const BYTES_TOKEN = 64;
// SHA-256 en hexadecimal ocupa siempre 64 caracteres
const LONGITUD_HUELLA = 64;

/** Genera un token aleatorio nuevo para enviar al navegador. */
function generarToken() {
    return crypto.randomBytes(BYTES_TOKEN).toString('hex');
}

/** Huella que se guarda en la base de datos. */
function hashToken(token) {
    if (!token) return null;
    return crypto.createHash('sha256').update(String(token)).digest('hex');
}

/**
 * Distingue una huella de un token en claro por su longitud.
 *
 * Sirve para que la migración sea idempotente y para detectar instalaciones
 * que todavía tengan tokens sin migrar.
 */
function esHuella(valor) {
    return typeof valor === 'string' && valor.length === LONGITUD_HUELLA;
}

module.exports = { generarToken, hashToken, esHuella, BYTES_TOKEN, LONGITUD_HUELLA };
