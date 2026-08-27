#!/usr/bin/env node
/**
 * scripts/sanear-impuestos.js
 * -----------------------------------------------------------------------------
 * Saneo de pedidos cobrados ANTES de la corrección del impuesto (Bug 1).
 *
 * Contexto: el POS viejo cobraba subtotal + 10% (hardcodeado en el frontend),
 * pero el backend guardaba pedidos.total = subtotal (sin impuesto) y
 * pedidos.impuesto = 0. El Cierre del Día suma pedidos.total, por lo que
 * reportaba menos de lo realmente cobrado.
 *
 * Este script recalcula impuesto/total de los pedidos YA COBRADOS para que
 * coincidan con lo que la caja recibió. NO toca pedidos en curso
 * (estado_pago='pendiente') ni cortesías.
 *
 * Uso:
 *   node scripts/sanear-impuestos.js                    -> previsualiza (no cambia nada)
 *   node scripts/sanear-impuestos.js --tasa=10          -> previsualiza con tasa histórica 10%
 *   node scripts/sanear-impuestos.js --aplicar --tasa=10 -> aplica los cambios (pide confirmación)
 *   node scripts/sanear-impuestos.js --aplicar --tasa=10 --force  -> aplica sin pedir confirmación
 *
 * Tasa: por defecto lee `configuraciones.factura_impuesto` (la misma fuente de
 * verdad del sistema). Si esa tasa es 0 y no se pasa --tasa, el script NO
 * aplica nada, porque el POS anterior cobraba 10% hardcodeado y usar 0
 * dejaría los registros igual de inconsistentes.
 *
 * ⚠️  Haz respaldo antes de aplicar:
 *     mysqldump restaurante_db > respaldo_antes_saneo.sql
 */
'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });
const mysql = require('mysql2/promise');
const readline = require('readline');

const ESTADOS_COBRADOS = ['pagado', 'facturado', 'pendiente_pago'];

// ---------------------------------------------------------------- CLI args ---
const args = process.argv.slice(2);
const APLICAR = args.includes('--aplicar');
const FORCE = args.includes('--force') || args.includes('--si');
const argTasa = args.find((a) => a.startsWith('--tasa='));
const tasaCLI = argTasa ? parseFloat(argTasa.split('=')[1]) : null;

const money = (n) => `$${Number(n).toFixed(2)}`;

async function preguntarSi(mensaje) {
    if (FORCE) return true;
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const respuesta = await new Promise((resolve) => {
        rl.question(`${mensaje} (si/no): `, (r) => resolve(r.trim().toLowerCase()));
    });
    rl.close();
    return respuesta === 'si' || respuesta === 'sí' || respuesta === 's' || respuesta === 'y';
}

async function main() {
    console.log('='.repeat(72));
    console.log('  SANEO DE IMPUESTOS EN PEDIDOS COBRADOS — Restaurante Bahía');
    console.log('='.repeat(72));

    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'restaurante_db',
        waitForConnections: true,
        connectionLimit: 4
    });

    try {
        // ------------------------------------------------ 1. Tasa a usar ---
        const [confRows] = await pool.query(
            "SELECT valor FROM configuraciones WHERE clave = 'factura_impuesto' LIMIT 1"
        );
        const tasaConfig = confRows.length ? parseFloat(confRows[0].valor) || 0 : null;
        let tasa = tasaCLI !== null ? tasaCLI : tasaConfig;

        console.log(`\n[Config] factura_impuesto (configuraciones) = ${tasaConfig === null ? '(no definida)' : tasaConfig + '%'}`);
        if (tasaCLI !== null) console.log(`[CLI]    --tasa=${tasaCLI} (forzada por línea de comandos)`);

        if (tasa === null || Number.isNaN(tasa) || tasa < 0) {
            console.error('\n✖ No se pudo determinar una tasa válida. Usa --tasa=10 (la que cobraba el POS anterior).');
            process.exitCode = 1;
            return;
        }
        if (tasa === 0 && tasaCLI === null) {
            console.log('\n⚠  La tasa configurada es 0. El POS ANTERIOR cobraba 10% hardcodeado:');
            console.log('   - Si esos pedidos se cobraron con el 10% incluido en la caja, ejecuta con --tasa=10');
            console.log('   - Si realmente no se cobraba impuesto, no hace falta saneo alguno.');
            if (APLICAR) {
                console.error('\n✖ Modo --aplicar bloqueado con tasa 0 (sería un no-op riesgoso). Pasa --tasa explícitamente.');
                process.exitCode = 1;
                return;
            }
        }

        // --------------------------------- 2. Previsualización (dry-run) ---
        // Se calcula con ROUND de MySQL para no arrastrar diferencias de redondeo.
        const [candidatos] = await pool.query(
            `SELECT p.id, p.estado_pago, p.subtotal, p.descuento,
                    p.impuesto AS impuesto_actual, p.total AS total_actual,
                    ROUND(p.subtotal * ? / 100, 2) AS impuesto_nuevo,
                    ROUND(p.subtotal + ROUND(p.subtotal * ? / 100, 2) - p.descuento, 2) AS total_nuevo
             FROM pedidos p
             WHERE p.estado_pago IN (?)`,
            [tasa, tasa, ESTADOS_COBRADOS]
        );

        const aCorregir = candidatos.filter(
            (r) =>
                Number(r.impuesto_actual) !== Number(r.impuesto_nuevo) ||
                Number(r.total_actual) !== Number(r.total_nuevo)
        );

        console.log(`\n[Datos]  Pedidos cobrados (pagado/facturado/pendiente_pago): ${candidatos.length}`);
        console.log(`[Datos]  Ya correctos (no se tocan):                         ${candidatos.length - aCorregir.length}`);
        console.log(`[Datos]  A corregir con tasa ${tasa}%:                        ${aCorregir.length}`);

        if (aCorregir.length) {
            console.log('\n─'.repeat(72));
            console.table(
                aCorregir.map((r) => ({
                    pedido: r.id,
                    estado: r.estado_pago,
                    subtotal: money(r.subtotal),
                    descuento: money(r.descuento),
                    'impuesto (actual→nuevo)': `${money(r.impuesto_actual)} → ${money(r.impuesto_nuevo)}`,
                    'total (actual→nuevo)': `${money(r.total_actual)} → ${money(r.total_nuevo)}`
                }))
            );
            const delta = aCorregir.reduce((acc, r) => acc + (Number(r.total_nuevo) - Number(r.total_actual)), 0);
            console.log(`Dif. impacto total en la suma de pedidos.total: ${money(delta)}`);
        }

        // --------------------------- 3. Diagnóstico de "pedidos a medias" ---
        const [enCurso] = await pool.query(
            `SELECT p.id, p.id_mesa, p.estado_pago, p.total, p.creado_en
             FROM pedidos p
             WHERE p.estado_pago NOT IN (?)
             ORDER BY p.id`,
            [ESTADOS_COBRADOS.concat(['cortesia'])]
        );
        if (enCurso.length) {
            console.log(`\n[Info]  Pedidos EN CURSO (no se tocan): ${enCurso.length}`);
            console.table(enCurso.map((r) => ({ pedido: r.id, mesa: r.id_mesa, estado: r.estado_pago, total: money(r.total), creado: r.creado_en })));
        }

        const [sinPago] = await pool.query(
            `SELECT p.id, p.estado_pago, p.total
             FROM pedidos p
             WHERE p.estado_pago IN (?) AND p.total > 0
               AND NOT EXISTS (SELECT 1 FROM pagos_pedido pp WHERE pp.pedido_id = p.id)`,
            [ESTADOS_COBRADOS]
        );
        if (sinPago.length) {
            console.log(`\n[Aviso] Pedidos cobrados SIN registro en pagos_pedido (revisar): ${sinPago.length}`);
            console.table(sinPago.map((r) => ({ pedido: r.id, estado: r.estado_pago, total: money(r.total) })));
        }

        if (!APLICAR) {
            console.log('\n✔ Previsualización terminada. Sin cambios (modo dry-run).');
            console.log('  Para aplicar: node scripts/sanear-impuestos.js --aplicar --tasa=10');
            return;
        }
        if (!aCorregir.length) {
            console.log('\n✔ No hay nada que corregir. La base ya está consistente. ✔');
            return;
        }

        // -------------------------------------------------- 4. Aplicar ---
        console.log('\n⚠  RECUERDA: haz respaldo antes de continuar.');
        console.log('   mysqldump restaurante_db > respaldo_antes_saneo.sql');
        const ok = await preguntarSi(`\n¿Aplicar la corrección a ${aCorregir.length} pedido(s) con tasa ${tasa}%?`);
        if (!ok) {
            console.log('— Cancelado por el usuario. No se cambió nada.');
            return;
        }

        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();
            for (const r of aCorregir) {
                await conn.execute(
                    `UPDATE pedidos SET impuesto = ?, total = ? WHERE id = ?`,
                    [r.impuesto_nuevo, r.total_nuevo, r.id]
                );
            }
            await conn.commit();
            console.log(`\n✔ COMMIT: ${aCorregir.length} pedido(s) actualizados.`);
        } catch (e) {
            await conn.rollback();
            console.error('\n✖ ERROR, se hizo ROLLBACK. No se cambió nada:', e.message);
            process.exitCode = 1;
        } finally {
            conn.release();
        }

        // -------------------------------------------- 5. Verificación ---
        const [verif] = await pool.query(
            `SELECT p.id, p.subtotal, p.descuento, p.impuesto, p.total,
                    COALESCE((SELECT SUM(pp.monto_equivalente_local)
                              FROM pagos_pedido pp WHERE pp.pedido_id = p.id), 0) AS pagado_registrado
             FROM pedidos p
             WHERE p.estado_pago IN (?)`,
            [ESTADOS_COBRADOS]
        );
        console.log('\n[Verificación] pedidos cobrados tras el saneo:');
        console.table(
            verif.map((r) => ({
                pedido: r.id,
                subtotal: money(r.subtotal),
                desc: money(r.descuento),
                impuesto: money(r.impuesto),
                total: money(r.total),
                pagos: money(r.pagado_registrado),
                nota:
                    Number(r.pagado_registrado) === 0
                        ? 'sin pagos registrados'
                        : Number(r.pagado_registrado) >= Number(r.total)
                          ? 'OK (pago ≥ total; sobrante = cambio/vuelto)'
                          : '⚠ pago < total, revisar'
            }))
        );
    } finally {
        await pool.end();
    }
}

main().catch((e) => {
    console.error('\n✖ Error inesperado:', e);
    process.exitCode = 1;
});
