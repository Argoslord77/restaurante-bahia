// services/seguimientoItemService.js
// ────────────────────────────────────────────────────────────────────────────
// Traza de tiempos por ítem de la orden (`detalles_pedido`).
//
// El estado de un ítem cambia en varios puntos del sistema (POS, monitores de
// cocina/bar, cobro de la cuenta). Este servicio centraliza el registro de las
// marcas de tiempo y del usuario de producción que saca el producto, para que
// el reporte de Pedidos / Ventas pueda informar tiempo de entrega, tiempo de
// producción y cocinero responsable.
//
// Diseño:
//  · Es un REGISTRO SECUNDARIO: nunca interrumpe la operación del mesero ni
//    del cocinero. Cualquier fallo se registra en el log y la transacción
//    sigue adelante.
//  · Degrada con elegancia: si la base de datos todavía no aplicó
//    migrations/20260904120000_add_tiempos_item_pedido.js, las columnas no
//    existen y el servicio simplemente no hace nada (config/schema.js cachea
//    la verificación, así que el coste es una consulta única por arranque).
//  · Idempotente en el sentido útil: `enviado_en` se escribe con COALESCE para
//    conservar el primer envío; `listo_en` / `entregado_en` se refrescan porque
//    un ítem puede volver a la cola y salir de nuevo.
// ────────────────────────────────────────────────────────────────────────────
'use strict';

const db = require('../config/db');
const Schema = require('../config/schema');
const logger = require('../config/logger');

const COLUMNAS = ['enviado_en', 'listo_en', 'entregado_en', 'usuario_produccion_id'];

// Estados que implican que el ítem entró a producción
const EN_PRODUCCION = new Set(['en_cocina', 'en_bar', 'en_preparacion']);

/** ¿La BD ya tiene la trazabilidad de tiempos? */
async function disponible() {
    if (!db) return false;
    try {
        for (const columna of COLUMNAS) {
            if (!await Schema.hasColumn('detalles_pedido', columna)) return false;
        }
        return true;
    } catch (error) {
        logger.warn(`[seguimiento-item] No se pudo verificar el esquema: ${error.message}`);
        return false;
    }
}

/** SET (fragmento) + valores correspondientes al estado destino. */
function construccion(estado, usuarioId) {
    const sets = [];
    const valores = [];

    if (EN_PRODUCCION.has(estado)) {
        sets.push('enviado_en = COALESCE(enviado_en, NOW())');
    } else if (estado === 'listo') {
        sets.push('enviado_en = COALESCE(enviado_en, NOW())');
        sets.push('listo_en = NOW()');
        if (usuarioId) {
            sets.push('usuario_produccion_id = ?');
            valores.push(usuarioId);
        }
    } else if (estado === 'entregado') {
        sets.push('entregado_en = NOW()');
    } else {
        return null;
    }

    return { sets, valores };
}

/**
 * Registra la transición de estado de uno o varios ítems.
 *
 * @param {object} opciones
 * @param {number[]} [opciones.detalleIds] Ítems afectados (detalles_pedido.id).
 * @param {number}   [opciones.pedidoId]   Alternativa: todos los ítems del pedido.
 * @param {string}    opciones.estado      Estado al que pasaron los ítems.
 * @param {number}   [opciones.usuarioId]   Usuario que ejecuta la acción (cocinero/bar).
 * @param {object}   [opciones.conn]        Conexión de la transacción activa.
 * @param {string}   [opciones.exclusivo]   Condición adicional (ej. "estado_item = 'listo'").
 * @returns {Promise<{ok: boolean, afectado: number}>}
 */
async function registrarTransicion({ detalleIds, pedidoId, estado, usuarioId, conn, exclusivo } = {}) {
    const ids = Array.isArray(detalleIds) ? detalleIds.filter(Boolean) : [];
    if (!estado) return { ok: false, afectado: 0 };
    if (!ids.length && !pedidoId) return { ok: false, afectado: 0 };

    // Primero lo que importa: el estado del ítem ya cambió en el llamador.
    // Todo lo de aquí abajo es trazabilidad opcional.
    try {
        if (!await disponible()) return { ok: false, afectado: 0 };

        const construccionEstado = construccion(estado, usuarioId);
        if (!construccionEstado) return { ok: false, afectado: 0 };

        const ejecutor = conn || db;
        const [res] = await ejecutor.query(
            `UPDATE detalles_pedido
                SET ${construccionEstado.sets.join(', ')}
              WHERE ${ids.length ? 'id IN (?)' : 'id_pedido = ?'}
                ${exclusivo ? `AND ${exclusivo}` : ''}`,
            [...construccionEstado.valores, ids.length ? ids : pedidoId]
        );
        return { ok: true, afectado: Number(res?.affectedRows || 0) };
    } catch (error) {
        logger.warn(`[seguimiento-item] No se pudo trazar el estado "${estado}": ${error.message}`);
        return { ok: false, afectado: 0 };
    }
}

/**
 * Marca el envío a producción en ítems recién creados (la ronda se guarda ya
 * en 'en_cocina' / 'en_bar' cuando los monitores están habilitados).
 */
async function registrarEnvio({ detalleIds, conn } = {}) {
    const ids = (Array.isArray(detalleIds) ? detalleIds : []).filter(Boolean);
    if (!ids.length) return { ok: false, afectado: 0 };
    return registrarTransicion({
        detalleIds: ids,
        estado: 'en_cocina',
        conn,
        exclusivo: "estado_item IN ('en_cocina', 'en_bar', 'en_preparacion')"
    });
}

module.exports = { registrarTransicion, registrarEnvio, disponible };
