// services/licencia/huella.js
// Identificación del equipo donde corre la instalación.
//
// El problema con las huellas rígidas
// -----------------------------------
// Una huella exacta (un único hash de todo el hardware) es frágil: el día que
// se cambia una tarjeta de red, se amplía la memoria o se renombra el equipo,
// la licencia deja de validar y el restaurante se queda sin caja en plena
// noche. Es el fallo clásico de los sistemas de licencia caseros.
//
// Aquí la huella es un CONJUNTO PONDERADO de componentes. Al comparar se suma
// el peso de los que coinciden y se exige superar un umbral (70 % por defecto).
// Así:
//   · Cambiar la tarjeta de red o ampliar la RAM  -> sigue validando.
//   · Copiar el proyecto a otro equipo distinto    -> no llega al umbral.
//
// Ningún componente vale por sí solo más que el umbral, de modo que falsificar
// uno no basta: hay que reproducir varios a la vez.
'use strict';

const os = require('os');
const fs = require('fs');
const crypto = require('crypto');
const { execSync } = require('child_process');

const UMBRAL_POR_DEFECTO = 70;

/** Hash corto y estable de un valor. */
function h(valor) {
    if (valor === null || valor === undefined || valor === '') return null;
    return crypto.createHash('sha256').update(String(valor)).digest('hex').slice(0, 32);
}

/** Ejecuta un comando y devuelve su salida, o null si no está disponible. */
function comando(cmd) {
    try {
        return execSync(cmd, { encoding: 'utf8', timeout: 3000, stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    } catch (_) {
        return null;
    }
}

/** Identificador de instalación del sistema operativo (el más estable). */
function idMaquina() {
    // Linux
    for (const ruta of ['/etc/machine-id', '/var/lib/dbus/machine-id']) {
        try {
            const v = fs.readFileSync(ruta, 'utf8').trim();
            if (v) return v;
        } catch (_) { /* siguiente */ }
    }
    // Windows
    if (process.platform === 'win32') {
        const salida = comando('reg query "HKLM\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid');
        const m = salida && salida.match(/MachineGuid\s+REG_SZ\s+([\w-]+)/i);
        if (m) return m[1];
    }
    // macOS
    if (process.platform === 'darwin') {
        const salida = comando('ioreg -rd1 -c IOPlatformExpertDevice');
        const m = salida && salida.match(/IOPlatformUUID"\s*=\s*"([^"]+)"/);
        if (m) return m[1];
    }
    return null;
}

/** Número de serie del disco o UUID del sistema de archivos raíz. */
function idDisco() {
    if (process.platform === 'linux') {
        const uuid = comando("findmnt -no UUID /") || comando("blkid -s UUID -o value $(findmnt -no SOURCE /)");
        if (uuid) return uuid;
    }
    if (process.platform === 'win32') {
        const salida = comando('wmic diskdrive get serialnumber');
        if (salida) {
            const linea = salida.split('\n').map(s => s.trim()).filter(s => s && !/serialnumber/i.test(s))[0];
            if (linea) return linea;
        }
    }
    if (process.platform === 'darwin') {
        const salida = comando("diskutil info / | grep 'Volume UUID'");
        if (salida) return salida.split(':').pop().trim();
    }
    return null;
}

/** Direcciones MAC físicas, ordenadas para que el orden no altere la huella. */
function macsFisicas() {
    const interfaces = os.networkInterfaces();
    const macs = [...new Set(
        Object.values(interfaces).flat()
            .filter(i => i && !i.internal && i.mac && i.mac !== '00:00:00:00:00:00')
            .map(i => i.mac.toLowerCase())
    )].sort();
    return macs.length ? macs.join(',') : null;
}

/**
 * Componentes de la huella con su peso. La suma de todos los pesos es 100.
 * Ninguno alcanza por sí solo el umbral: hay que reproducir varios.
 */
function recolectar() {
    const cpus = os.cpus();
    return {
        maquina:  { valor: h(idMaquina()),                                   peso: 28 },
        disco:    { valor: h(idDisco()),                                     peso: 18 },
        red:      { valor: h(macsFisicas()),                                 peso: 16 },
        cpu:      { valor: h(cpus.length ? cpus[0].model : null),            peso: 12 },
        nucleos:  { valor: h(cpus.length || null),                           peso: 6 },
        so:       { valor: h(`${os.platform()}|${os.arch()}`),               peso: 8 },
        equipo:   { valor: h(os.hostname()),                                 peso: 7 },
        memoria:  { valor: h(Math.round(os.totalmem() / (1024 ** 3))),       peso: 5 }
    };
}

/** Huella actual del equipo, lista para guardar o comparar. */
function actual() {
    const componentes = recolectar();
    const resumen = {};
    for (const [nombre, dato] of Object.entries(componentes)) resumen[nombre] = dato.valor;
    return {
        componentes: resumen,
        pesos: Object.fromEntries(Object.entries(componentes).map(([k, v]) => [k, v.peso])),
        // Hash global: útil como identificador corto, nunca como criterio único
        resumen: crypto.createHash('sha256')
            .update(Object.entries(resumen).sort().map(([k, v]) => `${k}=${v}`).join('|'))
            .digest('hex')
    };
}

/**
 * Compara la huella guardada con la del equipo actual.
 *
 * @returns {{puntuacion:number, coincide:boolean, coincidentes:string[],
 *            divergentes:string[], ausentes:string[]}}
 */
function comparar(huellaGuardada, umbral = UMBRAL_POR_DEFECTO, huellaActual = null) {
    const actualH = huellaActual || actual();
    const guardados = (huellaGuardada && huellaGuardada.componentes) || {};
    const pesos = (huellaGuardada && huellaGuardada.pesos) || actualH.pesos;

    let puntuacion = 0;
    let pesoEvaluable = 0;
    const coincidentes = [], divergentes = [], ausentes = [];

    for (const [nombre, peso] of Object.entries(pesos)) {
        const esperado = guardados[nombre];
        const obtenido = actualH.componentes[nombre];

        // Un componente que no existía al activar (p. ej. sin permisos para leer
        // el serial del disco) no penaliza: se excluye del total evaluable.
        if (!esperado) { ausentes.push(nombre); continue; }

        pesoEvaluable += peso;
        if (esperado === obtenido) { puntuacion += peso; coincidentes.push(nombre); }
        else divergentes.push(nombre);
    }

    // Porcentaje sobre lo realmente evaluable, no sobre 100 teórico
    const porcentaje = pesoEvaluable > 0 ? Math.round((puntuacion / pesoEvaluable) * 100) : 0;

    return {
        puntuacion: porcentaje,
        umbral,
        coincide: porcentaje >= umbral,
        coincidentes,
        divergentes,
        ausentes,
        peso_evaluable: pesoEvaluable
    };
}

module.exports = { actual, comparar, recolectar, UMBRAL_POR_DEFECTO };
