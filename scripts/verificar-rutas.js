#!/usr/bin/env node
// scripts/verificar-rutas.js
// Utilidad de despliegue: imprime el registro central de rutas y valida que
// ningún router esté duplicado o ausente. Pensada para correr ANTES de reiniciar
// el servicio (npm run check:rutas).
'use strict';

require('dotenv').config();

const { REGISTRO_RUTAS, RUTA_RAIZ, validarRegistro } = require('../config/routes');

const problemas = validarRegistro();

console.log('Registro de rutas — Restaurante Bahía');
console.log('='.repeat(78));
for (const entrada of REGISTRO_RUTAS) {
    console.log(`${entrada.prefijo.padEnd(8)} ${entrada.modulo.padEnd(24)} ${entrada.descripcion}`);
}
console.log('-'.repeat(78));
console.log(`${RUTA_RAIZ.ruta.padEnd(8)} -> ${RUTA_RAIZ.destino} (redirección inicial)`);
console.log(`Total de routers montados: ${REGISTRO_RUTAS.length}`);

if (problemas.length > 0) {
    console.error('\nPROBLEMAS DETECTADOS:');
    for (const problema of problemas) console.error(` - ${problema}`);
    process.exit(1);
}

console.log('\nOK: sin routers duplicados ni ausentes.');
