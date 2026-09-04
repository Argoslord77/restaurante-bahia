#!/usr/bin/env node
// scripts/smoke-bootstrap.js
// Prueba de humo del arranque SIN base de datos: construye la app, la pone a
// escuchar en un puerto efímero por HTTP, consulta /api/health y la raíz.
// Útil tras un despliegue para confirmar que el ensamblado de middlewares y el
// registro de rutas cargan bien (npm run smoke). Sale 0 si todo responde.
'use strict';

require('dotenv').config();
process.env.SERVER_HTTP = '1';
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'smoke-secret-local';

const http = require('http');
const { createApp } = require('../config/app');
const { validarRegistro } = require('../config/routes');

function pedir(puerto, ruta) {
    return new Promise((resolve, reject) => {
        const peticion = http.get({ host: '127.0.0.1', port: puerto, path: ruta }, (respuesta) => {
            let cuerpo = '';
            respuesta.on('data', (trozo) => { cuerpo += trozo; });
            respuesta.on('end', () => resolve({ estado: respuesta.statusCode, cuerpo, headers: respuesta.headers }));
        });
        peticion.on('error', reject);
        peticion.setTimeout(8000, () => peticion.destroy(new Error('Tiempo agotado')));
    });
}

async function main() {
    const problemas = validarRegistro();
    if (problemas.length) {
        console.error('Registro de rutas inválido:\n - ' + problemas.join('\n - '));
        process.exit(1);
    }
    console.log(`OK  registro de rutas (${problemas.length} problemas)`);

    const app = createApp();
    const servidor = http.createServer(app);
    await new Promise((resolve) => servidor.listen(0, '127.0.0.1', resolve));
    const puerto = servidor.address().port;

    try {
        const salud = await pedir(puerto, '/api/health');
        if (salud.estado !== 200 || !/"status":"ok"/.test(salud.cuerpo)) {
            throw new Error(`/api/health respondió ${salud.estado}: ${salud.cuerpo.slice(0, 120)}`);
        }
        console.log('OK  GET /api/health -> 200');

        const raiz = await pedir(puerto, '/');
        if (![301, 302].includes(raiz.estado) || raiz.headers.location !== '/admin/dashboard') {
            throw new Error(`GET / respondió ${raiz.estado} location=${raiz.headers.location}`);
        }
        console.log('OK  GET / -> 302 /admin/dashboard');

        console.log('\nSmoke de arranque correcto: la app ensambla y responde sin BD.');
    } finally {
        await new Promise((resolve) => servidor.close(resolve));
    }
    process.exit(0);
}

main().catch((error) => {
    console.error('FALLO en el smoke de arranque:', error.message);
    process.exit(1);
});
