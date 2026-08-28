#!/usr/bin/env node
/**
 * scripts/purgar-auditoria.js
 *
 * Aplica la política de retención del registro de auditoría.
 *
 * La auditoría en profundidad genera muchas filas: conviene programar esta
 * purga (por ejemplo, semanalmente en cron) para que la tabla no crezca sin
 * límite. Los asientos CRÍTICOS —cobros, cierres, borrados, cambios de
 * permisos y accesos denegados— se conservan durante más tiempo.
 *
 * Uso:
 *   node scripts/purgar-auditoria.js [diasOrdinarios] [diasCriticos]
 *   node scripts/purgar-auditoria.js                # 180 / 730 por defecto
 *   node scripts/purgar-auditoria.js 90 1095
 *   node scripts/purgar-auditoria.js --simular      # no borra, solo informa
 *
 * Ejemplo de cron (domingos a las 4:00):
 *   0 4 * * 0 cd /ruta/al/proyecto && node scripts/purgar-auditoria.js >> logs/purga-auditoria.log 2>&1
 */
require('dotenv').config();
const db = require('../config/db');
const AuditLogService = require('../services/auditLogService');

const args = process.argv.slice(2);
const simular = args.includes('--simular') || args.includes('--dry-run');
const numeros = args.filter(a => /^\d+$/.test(a));
const dias = parseInt(numeros[0], 10) || 180;
const diasCritico = parseInt(numeros[1], 10) || 730;

(async () => {
    console.log('── Purga del registro de auditoría ──');
    console.log(`   Actividad ordinaria: se conservan ${dias} días`);
    console.log(`   Asientos críticos:   se conservan ${diasCritico} días`);
    if (simular) console.log('   MODO SIMULACIÓN: no se borrará nada\n');
    else console.log('');

    const [[antes]] = await db.query('SELECT COUNT(*) AS total FROM auditoria_usuarios');
    console.log(`Asientos actuales: ${Number(antes.total).toLocaleString('es-ES')}`);

    const [[candidatos]] = await db.query(`
        SELECT
            SUM(CASE WHEN creado_en < DATE_SUB(NOW(), INTERVAL ? DAY)
                      AND (severidad IS NULL OR severidad <> 'CRITICO') THEN 1 ELSE 0 END) AS ordinarias,
            SUM(CASE WHEN creado_en < DATE_SUB(NOW(), INTERVAL ? DAY)
                      AND severidad = 'CRITICO' THEN 1 ELSE 0 END) AS criticas
        FROM auditoria_usuarios
    `, [dias, diasCritico]);

    console.log(`A eliminar · ordinarias: ${Number(candidatos.ordinarias || 0).toLocaleString('es-ES')}`);
    console.log(`A eliminar · críticas:   ${Number(candidatos.criticas || 0).toLocaleString('es-ES')}`);

    if (simular) {
        console.log('\nSimulación terminada: no se ha modificado nada.');
        await db.end();
        return;
    }

    const resultado = await AuditLogService.purgar(dias, diasCritico);
    const [[despues]] = await db.query('SELECT COUNT(*) AS total FROM auditoria_usuarios');

    console.log(`\nEliminados · ordinarias: ${resultado.ordinarias.toLocaleString('es-ES')}`);
    console.log(`Eliminados · críticas:   ${resultado.criticas.toLocaleString('es-ES')}`);
    console.log(`Asientos restantes:      ${Number(despues.total).toLocaleString('es-ES')}`);
    console.log('\nSugerencia: si se ha liberado mucho espacio, ejecuta');
    console.log('  OPTIMIZE TABLE auditoria_usuarios;');

    await db.end();
})().catch(error => {
    console.error('Error durante la purga:', error.message);
    process.exit(1);
});
