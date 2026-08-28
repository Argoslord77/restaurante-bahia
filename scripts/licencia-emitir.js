#!/usr/bin/env node
/**
 * scripts/licencia-emitir.js  —  HERRAMIENTA DEL PROVEEDOR
 *
 * Genera el par de claves y emite licencias firmadas.
 * ⚠️  La clave PRIVADA no debe copiarse nunca al equipo del cliente.
 *
 * Uso:
 *   node scripts/licencia-emitir.js claves                     Crea el par de claves
 *   node scripts/licencia-emitir.js emitir --solicitud sol.json --dias 365 \
 *        --cliente "Restaurante Bahía" --plan PROFESIONAL --salida licencia.lic
 *
 * La solicitud (sol.json) la genera el cliente con licencia-solicitar.js.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const Firma = require('../services/licencia/firma');

const args = process.argv.slice(2);
const orden = args[0];
const opt = (nombre, def = null) => {
    const i = args.indexOf('--' + nombre);
    return i >= 0 && args[i + 1] ? args[i + 1] : def;
};

if (orden === 'claves') {
    const destino = opt('destino', path.join(__dirname, '..', 'licencia-privada'));
    fs.mkdirSync(destino, { recursive: true });
    const par = Firma.generarParDeClaves();
    fs.writeFileSync(path.join(destino, 'licencia.key'), par.privada, { mode: 0o600 });
    fs.writeFileSync(path.join(destino, 'licencia.pub'), par.publica);
    console.log('Par de claves generado en:', destino);
    console.log('  licencia.key  → GUÁRDALA EN LUGAR SEGURO. Nunca al cliente.');
    console.log('  licencia.pub  → cópiala a config/licencia.pub de cada instalación.');
    process.exit(0);
}

if (orden === 'emitir') {
    const rutaSolicitud = opt('solicitud');
    const rutaClave = opt('clave', path.join(__dirname, '..', 'licencia-privada', 'licencia.key'));
    if (!rutaSolicitud) { console.error('Falta --solicitud <archivo.json>'); process.exit(1); }

    const solicitud = JSON.parse(fs.readFileSync(rutaSolicitud, 'utf8'));
    const privada = fs.readFileSync(rutaClave, 'utf8');

    const dias = parseInt(opt('dias', '365'), 10);
    const ahora = new Date();
    const expira = opt('perpetua') !== null && args.includes('--perpetua')
        ? null : new Date(ahora.getTime() + dias * 86400000);

    const datos = {
        version: 1,
        id: 'LIC-' + Firma.codigoCorto(`${solicitud.instalacion}|${ahora.toISOString()}`, 10).replace(/-/g, ''),
        cliente: opt('cliente', solicitud.cliente || 'Cliente'),
        plan: opt('plan', 'ESTANDAR'),
        emitida_en: ahora.toISOString(),
        expira_en: expira ? expira.toISOString() : null,
        dias_uso: opt('dias-uso') ? parseInt(opt('dias-uso'), 10) : null,
        instalacion: solicitud.instalacion,
        huella: solicitud.huella,
        funciones: (opt('funciones', 'pos,inventario,recetas,costeo,auditoria') || '').split(',').filter(Boolean),
        gracia_dias: parseInt(opt('gracia', '7'), 10),
        notas: opt('notas', null)
    };

    const licencia = { datos, firma: Firma.firmar(datos, privada) };
    const salida = opt('salida', 'licencia.lic');
    fs.writeFileSync(salida, JSON.stringify(licencia, null, 2));

    console.log('Licencia emitida:', salida);
    console.log('  ID          ', datos.id);
    console.log('  Cliente     ', datos.cliente);
    console.log('  Plan        ', datos.plan);
    console.log('  Caduca      ', datos.expira_en || 'nunca (perpetua)');
    console.log('  Días de uso ', datos.dias_uso || 'sin límite');
    console.log('  Instalación ', datos.instalacion);
    console.log('\nEnvía el archivo al cliente para que lo copie en licencia/licencia.lic');
    process.exit(0);
}

console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0].split('/**')[1]);
process.exit(1);
