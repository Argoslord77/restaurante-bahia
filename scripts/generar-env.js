#!/usr/bin/env node
// scripts/generar-env.js
// Crea un .env listo para una instalación nueva a partir de .env.example, con
// secretos aleatorios reales (SESSION_SECRET, COOKIE_SECRET) y una contraseña de
// base de datos generada. Nunca sobrescribe un .env existente salvo --force.
//
//   node scripts/generar-env.js            # genera .env
//   node scripts/generar-env.js --force    # lo regenera
//   node scripts/generar-env.js --imprimir # solo muestra por pantalla
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const ORIGEN = path.join(RAIZ, '.env.example');
const DESTINO = path.join(RAIZ, '.env');

const aleatorio = (bytes = 48) => crypto.randomBytes(bytes).toString('base64url');
const contrasena = (largo = 24) => {
    const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    return Array.from(crypto.randomBytes(largo))
        .map((b) => alfabeto[b % alfabeto.length])
        .join('');
};

function main() {
    const argumentos = process.argv.slice(2);
    const forzar = argumentos.includes('--force');
    const imprimir = argumentos.includes('--imprimir');

    if (!fs.existsSync(ORIGEN)) {
        console.error(`No existe ${ORIGEN}. Imposible generar el .env.`);
        process.exit(1);
    }
    if (fs.existsSync(DESTINO) && !forzar && !imprimir) {
        console.error('Ya existe un .env. Usa --force para regenerarlo (se perderá el actual).');
        process.exit(1);
    }

    let contenido = fs.readFileSync(ORIGEN, 'utf8');
    contenido = contenido
        .replace(/^SESSION_SECRET=.*$/m, `SESSION_SECRET=${aleatorio()}`)
        .replace(/^COOKIE_SECRET=.*$/m, `COOKIE_SECRET=${aleatorio()}`)
        .replace(/^DB_PASS=.*$/m, `DB_PASS=${contrasena()}`);

    if (imprimir) {
        process.stdout.write(contenido);
        return;
    }

    fs.writeFileSync(DESTINO, contenido, { mode: 0o600 });
    console.log(`.env generado en ${DESTINO} (permisos 600).`);
    console.log('Pasos siguientes:');
    console.log('  1) Anota DB_PASS y crea el usuario MySQL con esa contraseña.');
    console.log('  2) Genera certificados locales: mkcert -key-file certs/key.pem -cert-file certs/cert.pem localhost');
    console.log('  3) Arranca: npm start   (o npm run start:http para pruebas en HTTP).');
}

main();
