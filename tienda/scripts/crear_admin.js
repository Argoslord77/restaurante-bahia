// tienda/scripts/crear_admin.js — Crea (o reactiva) al administrador.
// Uso: npm run crear-admin -- <usuario> <clave> [nombre]
//      node scripts/crear_admin.js admin admin123 "Administrador"
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

async function main() {
    const [, , usuario, clave, ...resto] = process.argv;
    const nombre = resto.join(' ') || 'Administrador';
    if (!usuario || !clave) {
        console.error('Uso: npm run crear-admin -- <usuario> <clave> [nombre]');
        process.exit(1);
    }
    if (String(clave).length < 6) {
        console.error('La clave debe tener al menos 6 caracteres.');
        process.exit(1);
    }
    const hash = await bcrypt.hash(String(clave), 10);
    await pool.query(`
        INSERT INTO usuarios (nombre, usuario, password_hash, rol, activo)
        VALUES (?, ?, ?, 'administrador', 1)
        ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), password_hash = VALUES(password_hash),
                                rol = 'administrador', activo = 1
    `, [nombre, String(usuario).trim(), hash]);
    console.log(`Administrador "${String(usuario).trim()}" listo.`);
    await pool.end();
}

main().catch((err) => { console.error('Error:', err.message); process.exit(1); });
