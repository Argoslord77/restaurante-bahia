#!/usr/bin/env node
/**
 * scripts/inspeccionar-sp-explosion.js
 *
 * Audita el procedimiento almacenado `sp_procesar_explosion_inventario_venta`,
 * que no está versionado en el repositorio.
 *
 * Responde tres preguntas:
 *   1. ¿Existe el SP en esta base de datos?
 *   2. ¿Qué almacén usa internamente? (busca almacenes fijos "quemados" y
 *      referencias a la categoría operativa)
 *   3. ¿Está puesta la red de seguridad `trg_bloquea_consumo_venta_en_logistico`?
 *
 * Uso:  node scripts/inspeccionar-sp-explosion.js
 */
require('dotenv').config();
const db = require('../config/db');

const SP = 'sp_procesar_explosion_inventario_venta';
const TRIGGER = 'trg_bloquea_consumo_venta_en_logistico';

const titulo = (t) => console.log(`\n\x1b[1m── ${t} ──\x1b[0m`);

(async () => {
    let hallazgos = 0;

    // ── 1. ¿Existe el procedimiento? ────────────────────────────────────────
    titulo('Procedimiento almacenado');
    const [procs] = await db.query(
        `SELECT ROUTINE_NAME, CREATED, LAST_ALTERED
           FROM information_schema.ROUTINES
          WHERE ROUTINE_SCHEMA = DATABASE()
            AND ROUTINE_TYPE = 'PROCEDURE'
            AND ROUTINE_NAME = ?`, [SP]);

    if (procs.length === 0) {
        console.log(`✔  El SP "${SP}" NO existe en esta base de datos.`);
        console.log('   No hay un segundo camino de descuento en SQL: el único');
        console.log('   descuento por venta es el de Node, ya validado.');
    } else {
        console.log(`⚠  El SP "${SP}" EXISTE (creado ${procs[0].CREATED}, modificado ${procs[0].LAST_ALTERED}).`);
        hallazgos++;

        const [[creado]] = await db.query(`SHOW CREATE PROCEDURE \`${SP}\``);
        const cuerpo = creado['Create Procedure'] || '';

        titulo('Definición completa');
        console.log(cuerpo);

        // ── 2. Análisis del cuerpo ──────────────────────────────────────────
        titulo('Análisis automático del cuerpo');

        const almacenesFijos = [...cuerpo.matchAll(/almacen_id\s*=\s*(\d+)/gi)].map(m => m[1]);
        if (almacenesFijos.length) {
            console.log(`⚠  Almacén(es) fijos "quemados" en el SP: ${[...new Set(almacenesFijos)].join(', ')}`);
            console.log('   Revisa si esos IDs son de categoría produccion:');
            const ids = [...new Set(almacenesFijos)];
            const [filas] = await db.query(
                `SELECT id, codigo, nombre, tipo, categoria FROM almacenes WHERE id IN (?)`, [ids]);
            console.table(filas);
            hallazgos++;
        } else {
            console.log('✔  No se detectaron IDs de almacén fijos en el cuerpo.');
        }

        if (/categoria/i.test(cuerpo)) {
            console.log("✔  El SP menciona 'categoria': parece tener en cuenta la categoría operativa.");
        } else {
            console.log("⚠  El SP NO menciona 'categoria': no distingue logístico de producción por sí mismo.");
            console.log('   Queda cubierto por el trigger de guardia (ver abajo).');
            hallazgos++;
        }

        const tipos = [...new Set([...cuerpo.matchAll(/'(CONSUMO_RECETA|VENTA|SALIDA[A-Z_]*)'/g)].map(m => m[1]))];
        console.log(`ℹ  Tipos de movimiento que registra: ${tipos.length ? tipos.join(', ') : 'no detectados'}`);
        if (tipos.length && !tipos.some(t => ['CONSUMO_RECETA', 'VENTA'].includes(t))) {
            console.log('⚠  Ninguno coincide con los tipos que vigila el trigger.');
            console.log('   Añade esos tipos a la condición del trigger en');
            console.log('   scripts/migracion_guardia_consumo_produccion.sql');
            hallazgos++;
        }
    }

    // ── 3. ¿Está el trigger de guardia? ─────────────────────────────────────
    titulo('Red de seguridad en base de datos');
    const [trg] = await db.query(
        `SELECT TRIGGER_NAME, ACTION_TIMING, EVENT_MANIPULATION, EVENT_OBJECT_TABLE
           FROM information_schema.TRIGGERS
          WHERE TRIGGER_SCHEMA = DATABASE() AND TRIGGER_NAME = ?`, [TRIGGER]);

    if (trg.length) {
        console.log(`✔  Trigger "${TRIGGER}" activo sobre ${trg[0].EVENT_OBJECT_TABLE} (${trg[0].ACTION_TIMING} ${trg[0].EVENT_MANIPULATION}).`);
    } else {
        console.log(`✖  Trigger "${TRIGGER}" NO instalado.`);
        console.log('   Ejecuta: mysql restaurante_db < scripts/migracion_guardia_consumo_produccion.sql');
        hallazgos++;
    }

    // ── 4. Daño histórico ───────────────────────────────────────────────────
    titulo('Consumos por venta históricos en almacenes logísticos');
    try {
        const [malos] = await db.query(
            `SELECT a.codigo, a.nombre, COUNT(*) AS movimientos, SUM(m.cantidad) AS unidades
               FROM movimientos_inventario m
               INNER JOIN almacenes a ON a.id = m.almacen_id
              WHERE m.tipo_movimiento IN ('CONSUMO_RECETA','VENTA')
                AND a.categoria = 'logistico'
              GROUP BY a.codigo, a.nombre`);
        if (malos.length === 0) {
            console.log('✔  Ninguno. El inventario logístico nunca fue descontado por venta.');
        } else {
            console.log('⚠  Se descontó por venta desde almacenes logísticos:');
            console.table(malos);
            console.log('   Considera un ajuste de inventario correctivo.');
            hallazgos++;
        }
    } catch (e) {
        console.log(`   (No se pudo comprobar: ${e.message})`);
    }

    console.log(`\n\x1b[1m${hallazgos === 0 ? '\x1b[32mSin hallazgos: el camino SQL no representa un riesgo.' : '\x1b[33m' + hallazgos + ' punto(s) a revisar (ver detalle arriba).'}\x1b[0m\n`);

    await db.end();
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
