// services/licencia/reloj.js
// Tiempo de confianza: inmune a los cambios de hora del sistema operativo.
//
// El problema
// -----------
// Comprobar la caducidad contra `new Date()` es inútil: basta con retrasar el
// reloj del equipo para revivir una licencia vencida indefinidamente.
//
// La solución: un trinquete que solo avanza
// -----------------------------------------
// El tiempo de confianza es el MÁXIMO de cuatro fuentes independientes, y se
// persiste. Como es un máximo, nunca retrocede: atrasar el reloj no revierte
// nada, solo deja al sistema operativo por detrás del trinquete y delata la
// manipulación.
//
//   1. El reloj del sistema.
//   2. El trinquete guardado (el máximo histórico ya observado).
//   3. LOS PROPIOS DATOS DEL NEGOCIO: el último pedido, el último cierre de
//      turno, el último asiento de auditoría. Esto es lo que hace el mecanismo
//      difícil de burlar: para "recuperar" tiempo habría que borrar las ventas,
//      los cierres de caja y el registro de auditoría, es decir, destruir
//      justo la contabilidad que el negocio necesita conservar.
//   4. La hora de un servidor externo, cuando hay conexión (oportunista).
//
// Y además: días de uso consumidos
// --------------------------------
// Se cuentan los DÍAS NATURALES DISTINTOS en los que hubo actividad. Retrasar
// el reloj no regala días: repetir el mismo día no suma. Adelantarlo tampoco
// compensa: quema los días más deprisa.
'use strict';

const https = require('https');
const logger = require('../../config/logger');

// Margen por debajo del cual una diferencia se considera deriva normal del
// reloj (NTP, arranque, husos horarios) y no manipulación deliberada.
const TOLERANCIA_MS = 10 * 60 * 1000;   // 10 minutos

/**
 * Cota inferior del tiempo real obtenida de los datos del negocio.
 * Cada consulta se aísla: una tabla ausente no puede tumbar la comprobación.
 */
async function tiempoSegunDatos(db) {
    const consultas = [
        { fuente: 'pedidos',   sql: 'SELECT MAX(fecha_cierre) AS t FROM pedidos' },
        { fuente: 'pedidos',   sql: 'SELECT MAX(creado_en) AS t FROM pedidos' },
        { fuente: 'turnos',    sql: 'SELECT MAX(fecha_apertura) AS t FROM turnos_servicio' },
        { fuente: 'turnos',    sql: 'SELECT MAX(fecha_cierre) AS t FROM turnos_servicio' },
        { fuente: 'auditoria', sql: 'SELECT MAX(creado_en) AS t FROM auditoria_usuarios' },
        { fuente: 'inventario',sql: 'SELECT MAX(creado_en) AS t FROM movimientos_inventario' },
        { fuente: 'licencia',  sql: 'SELECT MAX(creado_en) AS t FROM licencia_eventos' }
    ];

    let maximo = 0;
    let origen = null;

    for (const c of consultas) {
        try {
            const [filas] = await db.query(c.sql);
            const valor = filas && filas[0] && filas[0].t ? new Date(filas[0].t).getTime() : 0;
            if (Number.isFinite(valor) && valor > maximo) { maximo = valor; origen = c.fuente; }
        } catch (_) { /* la tabla puede no existir todavía */ }
    }

    return { ms: maximo, origen };
}

/**
 * Hora de un servidor externo mediante la cabecera Date de una petición HTTPS.
 *
 * Es OPORTUNISTA: si no hay internet —el caso habitual en muchos locales— no
 * pasa nada, el trinquete sigue funcionando con las otras tres fuentes.
 * Solo se usa para ADELANTAR el trinquete, nunca para retrasarlo.
 */
function tiempoDeRed(hosts = ['www.cloudflare.com', 'www.google.com'], tiempoLimite = 3000) {
    return new Promise(resolve => {
        let pendientes = hosts.length;
        let resuelto = false;

        const terminar = valor => {
            if (resuelto) return;
            resuelto = true;
            resolve(valor);
        };

        for (const host of hosts) {
            const req = https.request({ host, method: 'HEAD', path: '/', timeout: tiempoLimite }, res => {
                const cabecera = res.headers && res.headers.date;
                res.resume();
                const ms = cabecera ? new Date(cabecera).getTime() : NaN;
                if (Number.isFinite(ms)) return terminar({ ms, host });
                if (--pendientes === 0) terminar(null);
            });
            req.on('error', () => { if (--pendientes === 0) terminar(null); });
            req.on('timeout', () => { req.destroy(); if (--pendientes === 0) terminar(null); });
            req.end();
        }

        setTimeout(() => terminar(null), tiempoLimite + 500);
    });
}

/**
 * Resuelve el tiempo de confianza combinando todas las fuentes.
 *
 * @param {object} db            Conexión a la base de datos
 * @param {number} trinqueteMs   Máximo histórico ya persistido
 * @param {object} opciones      { consultarRed: boolean }
 */
async function resolver(db, trinqueteMs = 0, opciones = {}) {
    const sistemaMs = Date.now();
    const datos = await tiempoSegunDatos(db);

    let red = null;
    if (opciones.consultarRed) {
        try { red = await tiempoDeRed(); } catch (_) { red = null; }
    }

    const candidatos = [
        { fuente: 'sistema', ms: sistemaMs },
        { fuente: 'trinquete', ms: Number(trinqueteMs) || 0 },
        { fuente: `datos:${datos.origen || 'ninguno'}`, ms: datos.ms },
        ...(red ? [{ fuente: `red:${red.host}`, ms: red.ms }] : [])
    ];

    const ganador = candidatos.reduce((a, b) => (b.ms > a.ms ? b : a));

    // ¿El reloj del sistema va por detrás de lo ya demostrado?
    const retrasoMs = Math.max(0, ganador.ms - sistemaMs);
    const manipulado = retrasoMs > TOLERANCIA_MS;

    return {
        ms: ganador.ms,
        fecha: new Date(ganador.ms),
        fuente: ganador.fuente,
        sistema_ms: sistemaMs,
        trinquete_previo_ms: Number(trinqueteMs) || 0,
        datos_ms: datos.ms,
        red_ms: red ? red.ms : null,
        retraso_ms: retrasoMs,
        reloj_manipulado: manipulado,
        // Cuánto se ha atrasado el reloj, en horas, para el informe al operador
        retraso_horas: Math.round((retrasoMs / 3600000) * 10) / 10,
        candidatos
    };
}

/** Clave de día natural (YYYY-MM-DD) a partir de un instante. */
function claveDia(ms) {
    return new Date(ms).toISOString().slice(0, 10);
}

module.exports = { resolver, tiempoSegunDatos, tiempoDeRed, claveDia, TOLERANCIA_MS };
