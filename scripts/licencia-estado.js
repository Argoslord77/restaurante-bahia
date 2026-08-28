#!/usr/bin/env node
/**
 * scripts/licencia-estado.js  —  Diagnóstico de la licencia
 *
 * Muestra el estado completo: validez, tiempo de confianza, huella del equipo,
 * días consumidos y cualquier manipulación detectada.
 *
 * Uso:
 *   node scripts/licencia-estado.js
 *   node scripts/licencia-estado.js --red     (además sincroniza la hora online)
 */
'use strict';
require('dotenv').config();
const Licencia = require('../services/licencia/licenciaService');
const db = require('../config/db');

const COLOR = { ACTIVA: '\x1b[32m', GRACIA: '\x1b[33m', BLOQUEADA: '\x1b[31m', SIN_LICENCIA: '\x1b[31m' };

(async () => {
    const r = await Licencia.evaluar({ forzar: true, consultarRed: process.argv.includes('--red') });

    console.log('\n══════════════════════════════════════════════════════════');
    console.log('  ESTADO DE LA LICENCIA');
    console.log('══════════════════════════════════════════════════════════\n');
    console.log(`  Estado          ${COLOR[r.estado] || ''}${r.estado}\x1b[0m`);
    console.log(`  Operativa       ${r.operativa ? 'sí' : 'NO'}`);

    if (r.licencia) {
        console.log(`\n  Licencia        ${r.licencia.id}`);
        console.log(`  Cliente         ${r.licencia.cliente}`);
        console.log(`  Plan            ${r.licencia.plan}`);
        console.log(`  Caduca          ${r.licencia.expira_en ? new Date(r.licencia.expira_en).toLocaleString('es-ES') : 'nunca'}`);
        if (r.licencia.dias_uso) console.log(`  Días contratados ${r.licencia.dias_uso}`);
        console.log(`  Funciones       ${(r.licencia.funciones || []).join(', ') || '—'}`);
    } else {
        console.log('\n  Sin licencia instalada.');
    }

    console.log(`\n  Instalación     ${r.instalacion.uuid}`);
    console.log(`  Código          ${r.instalacion.codigo}`);

    console.log(`\n  Tiempo confiable ${new Date(r.tiempo.confiable).toLocaleString('es-ES')}  (fuente: ${r.tiempo.fuente})`);
    console.log(`  Reloj del equipo ${new Date(r.tiempo.sistema).toLocaleString('es-ES')}`);
    if (r.tiempo.reloj_manipulado) {
        console.log(`  \x1b[31m⚠ El reloj va ${r.tiempo.retraso_horas} h por detrás del tiempo ya demostrado\x1b[0m`);
    }

    console.log(`\n  Días de uso     ${r.uso.dias_consumidos}${r.uso.dias_contratados ? ' de ' + r.uso.dias_contratados : ''}`);
    console.log(`  Arranques       ${r.uso.secuencia}`);

    if (r.gracia) {
        console.log(`\n  \x1b[33mPERIODO DE GRACIA\x1b[0m  quedan ${r.gracia.dias_restantes} de ${r.gracia.dias_totales} días`);
    }

    if (r.problemas.length) {
        console.log('\n  \x1b[31mPROBLEMAS\x1b[0m');
        r.problemas.forEach(p => console.log(`   ✖ [${p.codigo}] ${p.mensaje}`));
    }
    if (r.avisos.length) {
        console.log('\n  \x1b[33mAVISOS\x1b[0m');
        r.avisos.forEach(p => console.log(`   ⚠ [${p.codigo}] ${p.mensaje}`));
    }
    if (!r.problemas.length && !r.avisos.length) console.log('\n  Sin incidencias.');

    console.log('');
    await db.end().catch(() => {});
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
