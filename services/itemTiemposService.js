// services/itemTiemposService.js
//
// Sello de tiempo del ciclo de vida de cada ítem de una orden.
//
// Cada cambio de estado de `detalles_pedido` deja huella de CUÁNDO ocurrió y
// QUIÉN lo provocó, que es lo que permite a la vista de Pedidos/Ventas mostrar
// el tiempo de entrega plato por plato (h:m:s), el cocinero responsable y la
// duración real del servicio:
//
//   alta del ítem        → creado_en      (DEFAULT de la columna)
//   sale a producción    → enviado_en + area_preparacion (cocina | bar)
//   producción lo termina→ listo_en       + id_usuario_preparacion
//   se entrega al cliente→ entregado_en   + id_usuario_entrega
//   se anula             → cancelado_en
//
// TOLERANCIA AL DESPLIEGUE: si la base todavía no tiene las columnas nuevas
// (migración pendiente), el primer intento falla con ER_BAD_FIELD_ERROR, el
// servicio lo detecta, avisa una sola vez y vuelve al UPDATE simple de estado.
// El POS nunca se cae por falta de la migración: solo pierde el detalle de
// tiempos hasta que se aplique scripts/migracion_tiempos_detalles_pedido.sql.
'use strict';

const logger = require('../config/logger');

const ESTADOS = {
    EN_ESPERA: 'en_espera',
    EN_COCINA: 'en_cocina',
    EN_BAR: 'en_bar',
    EN_PREPARACION: 'en_preparacion',
    LISTO: 'listo',
    ENTREGADO: 'entregado',
    CANCELADO: 'cancelado'
};

// Estado final: ya no admite más transiciones de tiempo.
const ESTADOS_FINALES = [ESTADOS.ENTREGADO, ESTADOS.CANCELADO];

let soportaTiempos = true;
let avisoPendiente = true;

/** ¿La base de datos ya tiene las columnas de tiempos? */
function tiemposDisponibles() {
    return soportaTiempos;
}

/** Fuerza el modo simple (útil en pruebas). */
function marcarSinTiempos() {
    soportaTiempos = false;
}

/** Fuerza el modo completo (útil en pruebas). */
function marcarConTiempos() {
    soportaTiempos = true;
    avisoPendiente = true;
}

function esFaltaDeColumna(err) {
    if (!err) return false;
    const original = err.original || err;
    return original.code === 'ER_BAD_FIELD_ERROR' ||
        Number(original.errno) === 1054 ||
        /Unknown column/i.test(String(err.message || ''));
}

function avisarUnaVez() {
    if (!avisoPendiente) return;
    avisoPendiente = false;
    const mensaje = 'detalles_pedido no tiene las columnas de tiempos: se registra solo el estado. ' +
        'Ejecute scripts/migracion_tiempos_detalles_pedido.sql para habilitar los tiempos de entrega.';
    if (logger && typeof logger.warn === 'function') logger.warn(mensaje);
    else console.warn(mensaje);
}

/** Área de producción que corresponde a un estado del ítem. */
function areaDe(estado) {
    const e = String(estado || '').toLowerCase();
    if (e === ESTADOS.EN_BAR) return 'bar';
    if (e === ESTADOS.EN_COCINA || e === ESTADOS.EN_PREPARACION) return 'cocina';
    return null;
}

/**
 * Fragmentos SET adicionales (con sus parámetros) que sellan una transición.
 * COALESCE protege el primer sello: una re-marca no sobrescribe la hora real.
 */
function camposTransicion(nuevoEstado, { usuarioId = null } = {}) {
    const estado = String(nuevoEstado || '').toLowerCase();
    const sets = [];
    const params = [];
    const usuario = Number(usuarioId) > 0 ? Number(usuarioId) : null;

    switch (estado) {
        case ESTADOS.EN_COCINA:
        case ESTADOS.EN_BAR:
        case ESTADOS.EN_PREPARACION:
            sets.push('enviado_en = COALESCE(enviado_en, NOW())');
            if (areaDe(estado)) {
                sets.push('area_preparacion = COALESCE(area_preparacion, ?)');
                params.push(areaDe(estado));
            }
            break;

        case ESTADOS.LISTO:
            sets.push('enviado_en = COALESCE(enviado_en, NOW())');
            sets.push('listo_en = COALESCE(listo_en, NOW())');
            if (usuario) {
                sets.push('id_usuario_preparacion = COALESCE(id_usuario_preparacion, ?)');
                params.push(usuario);
            }
            break;

        case ESTADOS.ENTREGADO:
            sets.push('entregado_en = COALESCE(entregado_en, NOW())');
            sets.push('listo_en = COALESCE(listo_en, entregado_en)');
            sets.push('enviado_en = COALESCE(enviado_en, listo_en)');
            if (usuario) {
                sets.push('id_usuario_entrega = COALESCE(id_usuario_entrega, ?)');
                params.push(usuario);
            }
            break;

        case ESTADOS.CANCELADO:
            sets.push('cancelado_en = COALESCE(cancelado_en, NOW())');
            break;

        default:
            break;
    }

    return { sets, params };
}

/**
 * Ejecuta el UPDATE con tiempos y, si la base no los tiene, el UPDATE simple.
 * @returns {number} filas afectadas
 */
async function ejecutar(pool, { sqlTiempos, paramsTiempos, sqlSimple, paramsSimple }) {
    const correr = async (sql, params) => {
        // sqlSimple === null → sin la migración no hay nada que registrar.
        if (!sql) return 0;
        const [res] = await pool.query(sql, params);
        return res && typeof res.affectedRows === 'number' ? res.affectedRows : 0;
    };

    if (!soportaTiempos) return correr(sqlSimple, paramsSimple);

    try {
        const [res] = await pool.query(sqlTiempos, paramsTiempos);
        return res && typeof res.affectedRows === 'number' ? res.affectedRows : 0;
    } catch (err) {
        if (!esFaltaDeColumna(err)) throw err;
        soportaTiempos = false;
        avisarUnaVez();
        return correr(sqlSimple, paramsSimple);
    }
}

/**
 * Cambia el estado de UN ítem sellando la transición.
 */
async function sellarItem(pool, idDetalle, nuevoEstado, opciones = {}) {
    const { sets, params } = camposTransicion(nuevoEstado, opciones);
    const sqlSimple = 'UPDATE detalles_pedido SET estado_item = ? WHERE id = ?';
    const paramsSimple = [nuevoEstado, idDetalle];
    const sqlTiempos = sets.length
        ? `UPDATE detalles_pedido SET estado_item = ?, ${sets.join(', ')} WHERE id = ?`
        : sqlSimple;
    const paramsTiempos = sets.length ? [nuevoEstado, ...params, idDetalle] : paramsSimple;

    return ejecutar(pool, { sqlTiempos, paramsTiempos, sqlSimple, paramsSimple });
}

/**
 * Cambia el estado de TODOS los ítems pendientes de un pedido (p.ej.
 * "entregar todo" o el cierre de la cuenta) sellando la transición.
 */
async function sellarItemsDePedido(pool, idPedido, nuevoEstado, opciones = {}) {
    const { sets, params } = camposTransicion(nuevoEstado, opciones);
    const excluidos = nuevoEstado === ESTADOS.CANCELADO
        ? `('${ESTADOS.CANCELADO}')`
        : `('${ESTADOS_FINALES.join("', '")}')`;

    const sqlSimple = `UPDATE detalles_pedido SET estado_item = ?
        WHERE id_pedido = ? AND estado_item NOT IN ${excluidos}`;
    const paramsSimple = [nuevoEstado, idPedido];
    const sqlTiempos = sets.length
        ? `UPDATE detalles_pedido SET estado_item = ?, ${sets.join(', ')}
           WHERE id_pedido = ? AND estado_item NOT IN ${excluidos}`
        : sqlSimple;
    const paramsTiempos = sets.length ? [nuevoEstado, ...params, idPedido] : paramsSimple;

    return ejecutar(pool, { sqlTiempos, paramsTiempos, sqlSimple, paramsSimple });
}

/**
 * Sella la anulación de un conjunto de ítems concretos.
 */
async function sellarCancelacion(pool, idsDetalle, opciones = {}) {
    const ids = (Array.isArray(idsDetalle) ? idsDetalle : [idsDetalle])
        .map(id => Number(id)).filter(id => Number.isFinite(id) && id > 0);
    if (!ids.length) return 0;

    const marcas = ids.map(() => '?').join(', ');
    const extra = opciones.sets && opciones.sets.length ? `, ${opciones.sets.join(', ')}` : '';
    const extraParams = opciones.params || [];

    const sqlSimple = `UPDATE detalles_pedido
        SET estado_item = '${ESTADOS.CANCELADO}', afecta_inventario = ${opciones.afectaInventario === 1 ? 1 : 0}${extra}
        WHERE id IN (${marcas})`;
    const sqlTiempos = `UPDATE detalles_pedido
        SET estado_item = '${ESTADOS.CANCELADO}', afecta_inventario = ${opciones.afectaInventario === 1 ? 1 : 0},
            cancelado_en = COALESCE(cancelado_en, NOW())${extra}
        WHERE id IN (${marcas})`;

    return ejecutar(pool, {
        sqlTiempos,
        paramsTiempos: [...extraParams, ...ids],
        sqlSimple,
        paramsSimple: [...extraParams, ...ids]
    });
}

/**
 * Sella el envío a producción de ítems recién insertados que ya nacen en
 * cocina/bar (monitores activos) o que esperan (servicio directo).
 */
async function sellarEnvio(pool, idsDetalle, estado) {
    const ids = (Array.isArray(idsDetalle) ? idsDetalle : [idsDetalle])
        .map(id => Number(id)).filter(id => Number.isFinite(id) && id > 0);
    if (!ids.length) return 0;

    const area = areaDe(estado);
    if (!area) return 0; // en_espera: todavía no sale a producción

    const marcas = ids.map(() => '?').join(', ');
    const sqlTiempos = `UPDATE detalles_pedido
        SET enviado_en = COALESCE(enviado_en, NOW()), area_preparacion = ?
        WHERE id IN (${marcas})`;

    // Sin la migración no hay columna que sellar: el envío simplemente no se
    // registra (el estado del ítem ya viene correcto desde el INSERT).
    return ejecutar(pool, {
        sqlTiempos,
        paramsTiempos: [area, ...ids],
        sqlSimple: null,
        paramsSimple: []
    });
}

module.exports = {
    ESTADOS,
    ESTADOS_FINALES,
    tiemposDisponibles,
    marcarSinTiempos,
    marcarConTiempos,
    areaDe,
    camposTransicion,
    sellarItem,
    sellarItemsDePedido,
    sellarCancelacion,
    sellarEnvio
};
