#!/usr/bin/env node
/**
 * scripts/licencia-solicitar.js  —  HERRAMIENTA DEL CLIENTE
 *
 * Genera la solicitud de licencia de ESTE equipo: recoge la huella del
 * hardware y el identificador de instalación, y muestra un código corto que se
 * puede dictar por teléfono si no hay forma de enviar el archivo.
 *
 * No necesita conexión a internet.
 *
 * Uso:
 *   node scripts/licencia-solicitar.js
 *   node scripts/licencia-solicitar.js --cliente "Restaurante Bahía" --salida solicitud.json
 */
'use strict';
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Huella = require('../services/licencia/huella');
const Firma = require('../services/licencia/firma');
const Licencia = require('../services/licencia/licenciaService');
const db = require('../config/db');

const args = process.argv.slice(2);
const opt = (n, d = null) => { const i = args.indexOf('--' + n); return i >= 0 && args[i + 1] ? args[i + 1] : d; };

(async () => {
    // Reutiliza el identificador de instalación si ya existe; si no, lo crea.
    let instalacion = null;
    try {
        const [filas] = await db.query('SELECT instalacion_uuid FROM licencia_estado WHERE id = 1 LIMIT 1');
        if (filas[0] && filas[0].instalacion_uuid) instalacion = filas[0].instalacion_uuid;
    } catch (_) { /* la tabla puede no existir aún */ }

    if (!instalacion) {
        try {
            instalacion = JSON.parse(fs.readFileSync(Licencia.RUTA_ESTADO, 'utf8')).instalacion_uuid;
        } catch (_) { /* tampoco hay archivo */ }
    }
    if (!instalacion) instalacion = crypto.randomUUID();

    const huella = Huella.actual();
    huella.umbral = parseInt(opt('umbral', String(Huella.UMBRAL_POR_DEFECTO)), 10);

    const solicitud = {
        version: 1,
        cliente: opt('cliente', ''),
        instalacion,
        huella,
        generada_en: new Date().toISOString(),
        equipo: { plataforma: process.platform, arquitectura: process.arch, node: process.version }
    };

    const salida = opt('salida', 'solicitud-licencia.json');
    fs.writeFileSync(salida, JSON.stringify(solicitud, null, 2));

    const codigo = Licencia.codigoDeInstalacion(instalacion, huella.resumen);
    const detectados = Object.entries(huella.componentes).filter(([, v]) => v).map(([k]) => k);

    console.log('\n══════════════════════════════════════════════════════════');
    console.log('  SOLICITUD DE LICENCIA · Restaurante Bahía');
    console.log('══════════════════════════════════════════════════════════\n');
    console.log('  CÓDIGO DE INSTALACIÓN (dictable por teléfono):\n');
    console.log('      ' + codigo + '\n');
    console.log('  Archivo generado:', path.resolve(salida));
    console.log('  Instalación:     ', instalacion);
    console.log('  Componentes detectados:', detectados.join(', '));
    console.log('  Umbral de tolerancia:  ', huella.umbral + '%');
    console.log('\n  Envía el archivo (o dicta el código) al proveedor.');
    console.log('  Recibirás un archivo licencia.lic que debes copiar en:');
    console.log('      ' + Licencia.RUTA_LICENCIA + '\n');

    await db.end().catch(() => {});
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
