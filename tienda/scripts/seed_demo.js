// tienda/scripts/seed_demo.js — Datos de prueba (categorías y productos).
// Uso: npm run demo   (solo para probar; no tocar producción)
require('dotenv').config();
const pool = require('../config/db');

const DEMO = [
    { cat: 'Abarrotes', sku: 'AB-001', nombre: 'Arroz 1 kg', costo: 18, venta: 25, stock: 50, min: 10 },
    { cat: 'Abarrotes', sku: 'AB-002', nombre: 'Frijol 1 kg', costo: 22, venta: 30, stock: 40, min: 10 },
    { cat: 'Abarrotes', sku: 'AB-003', nombre: 'Aceite 1 L', costo: 35, venta: 48, stock: 30, min: 6 },
    { cat: 'Limpieza', sku: 'LI-001', nombre: 'Detergente 1 kg', costo: 28, venta: 40, stock: 25, min: 5 },
    { cat: 'Limpieza', sku: 'LI-002', nombre: 'Cloro 1 L', costo: 12, venta: 20, stock: 8, min: 10 },
    { cat: 'Bebidas', sku: 'BE-001', nombre: 'Refresco 600 ml', costo: 10, venta: 18, stock: 100, min: 24 }
];

async function main() {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        for (const p of DEMO) {
            await conn.query('INSERT IGNORE INTO categorias (nombre) VALUES (?)', [p.cat]);
            const [[cat]] = await conn.query('SELECT id FROM categorias WHERE nombre = ?', [p.cat]);
            const [existe] = await conn.query('SELECT id FROM productos WHERE sku = ?', [p.sku]);
            if (existe.length) continue;
            const [r] = await conn.query(`
                INSERT INTO productos (sku, nombre, categoria_id, precio_costo, precio_venta, stock, stock_minimo)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [p.sku, p.nombre, cat.id, p.costo, p.venta, p.stock, p.min]);
            await conn.query(`
                INSERT INTO movimientos (producto_id, tipo, cantidad, stock_antes, stock_despues, motivo)
                VALUES (?, 'entrada', ?, 0, ?, ?)
            `, [r.insertId, p.stock, p.stock, 'Carga inicial (demo)']);
        }
        await conn.commit();
        console.log('Datos demo listos.');
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
        await pool.end();
    }
}

main().catch((err) => { console.error('Error:', err.message); process.exit(1); });
