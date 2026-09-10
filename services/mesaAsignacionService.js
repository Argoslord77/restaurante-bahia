// services/mesaAsignacionService.js
//
// Titularidad de las mesas del salón: qué dependiente tiene asignada cada
// mesa en el turno de servicio activo. Es la pieza que permite que otros
// roles del circuito de servicio (el capitán con "Solo capitanes" en
// Opciones generales) operen cualquier mesa sin suplantar al dependiente
// asignado en los registros de negocio: el pedido conserva el
// id_usuario_mesero del titular y la auditoría conserva al operador real.
//
// La asignación persiste durante TODO el turno activo (aunque cruce la
// medianoche): ante varias filas por ubicación se toma la vigente (máxima).
'use strict';

const pool = require('../config/db');

function nombrePresentable(fila) {
    if (!fila) return '';
    const completo = `${fila.nombre || ''} ${fila.apellidos || ''}`.trim();
    return completo || fila.usuario || `Usuario #${fila.id}`;
}

function mapearAsignado(fila) {
    if (!fila || fila.id === null || fila.id === undefined) return null;
    return {
        id: fila.id,
        usuario: fila.usuario || null,
        nombre: nombrePresentable(fila)
    };
}

// Dependiente asignado vigente a una mesa en el turno indicado (o null si
// la mesa no tiene asignación en ese turno). Nunca lanza.
async function obtenerDependienteAsignado(idMesa, turnoId) {
    if (!pool || idMesa === null || idMesa === undefined || !turnoId) return null;
    try {
        const [filas] = await pool.query(`
            SELECT u.id, u.usuario, u.nombre, u.apellidos
            FROM detalle_asignacion_mesa dam
            INNER JOIN asignaciones_diarias ad ON dam.asignacion_diaria_id = ad.id
            INNER JOIN usuarios u ON dam.dependiente_id = u.id
            WHERE dam.mesa_id = ? AND ad.turno_id = ?
              AND ad.id IN (
                  SELECT MAX(a2.id) FROM asignaciones_diarias a2
                  WHERE a2.turno_id = ?
                  GROUP BY a2.ubicacion
              )
            ORDER BY ad.id DESC
            LIMIT 1
        `, [idMesa, turnoId, turnoId]);
        if (!filas || filas.length === 0) return null;
        return mapearAsignado(filas[0]);
    } catch (error) {
        console.error('Error al obtener dependiente asignado a la mesa:', error);
        return null;
    }
}

// Mapa mesa_id -> dependiente asignado vigente en el turno (para etiquetar
// el tablero del salón). Nunca lanza: ante cualquier fallo devuelve {}.
async function obtenerMapaAsignados(turnoId) {
    if (!pool || !turnoId) return {};
    try {
        const [filas] = await pool.query(`
            SELECT dam.mesa_id, u.id, u.usuario, u.nombre, u.apellidos
            FROM detalle_asignacion_mesa dam
            INNER JOIN asignaciones_diarias ad ON dam.asignacion_diaria_id = ad.id
            INNER JOIN usuarios u ON dam.dependiente_id = u.id
            WHERE ad.turno_id = ?
              AND ad.id IN (
                  SELECT MAX(a2.id) FROM asignaciones_diarias a2
                  WHERE a2.turno_id = ?
                  GROUP BY a2.ubicacion
              )
        `, [turnoId, turnoId]);
        const mapa = {};
        for (const fila of (filas || [])) {
            if (fila && fila.mesa_id !== null && fila.mesa_id !== undefined) {
                mapa[fila.mesa_id] = mapearAsignado(fila);
            }
        }
        return mapa;
    } catch (error) {
        console.error('Error al obtener mapa de mesas asignadas:', error);
        return {};
    }
}

// Titular que debe figurar en una orden nueva sobre la mesa: el dependiente
// asignado vigente si existe; si no, quien abre la orden. Nunca lanza.
async function resolverMeseroTitular(idMesa, turnoId, abridorId) {
    try {
        const asignado = await obtenerDependienteAsignado(idMesa, turnoId);
        if (asignado && asignado.id !== null && asignado.id !== undefined) {
            return { id: asignado.id, nombre: asignado.nombre, esAsignado: true };
        }
    } catch (error) {
        console.error('Error al resolver mesero titular de la mesa:', error);
    }
    return { id: abridorId, nombre: null, esAsignado: false };
}

// Ítems en estado 'listo' (para entregar) del turno indicado.
// - dependienteId: solo mesas asignadas a ese dependiente (tablero propio).
// - dependienteId null: todas las mesas (capitán en modo Solo capitanes).
// Nunca lanza: ante cualquier fallo devuelve [].
async function obtenerItemsListos({ turnoId, dependienteId = null } = {}) {
    if (!pool || !turnoId) return [];
    try {
        const joinsAsignacion = dependienteId
            ? `INNER JOIN detalle_asignacion_mesa dam ON dam.mesa_id = m.id AND dam.dependiente_id = ?
               INNER JOIN asignaciones_diarias ad ON dam.asignacion_diaria_id = ad.id
                 AND ad.turno_id = ?
                 AND ad.id IN (
                     SELECT MAX(a2.id) FROM asignaciones_diarias a2
                     WHERE a2.turno_id = ?
                     GROUP BY a2.ubicacion
                 )`
            : '';
        const params = dependienteId ? [turnoId, dependienteId, turnoId, turnoId] : [turnoId];
        const [filas] = await pool.query(`
            SELECT dp.id AS id_detalle, dp.id_pedido, dp.cantidad,
                   COALESCE(pd.nombre, pm.nombre, 'Platillo') AS nombre,
                   p.id_mesa, m.numero AS numero_mesa,
                   COALESCE(um.nombre, m.ubicacion) AS mesa_ubicacion
            FROM detalles_pedido dp
            INNER JOIN pedidos p ON dp.id_pedido = p.id
              AND p.turno_servicio_id = ?
              AND p.estado_pago = 'pendiente'
              AND p.estado_pedido != 'cancelado'
            INNER JOIN mesas m ON p.id_mesa = m.id
            ${joinsAsignacion}
            LEFT JOIN ubicacion_mesa um ON m.ubicacion_id = um.id
            LEFT JOIN platillos_menu pm ON (dp.id_platillo = pm.id AND (dp.es_platillo_dia = 0 OR dp.es_platillo_dia IS NULL))
            LEFT JOIN platillos_dia pd ON (dp.id_platillo = pd.id AND dp.es_platillo_dia = 1)
            WHERE dp.estado_item = 'listo'
            ORDER BY dp.id ASC
            LIMIT 100
        `, params);
        return filas || [];
    } catch (error) {
        console.error('Error al obtener ítems listos para entregar:', error);
        return [];
    }
}

module.exports = {
    obtenerDependienteAsignado,
    obtenerMapaAsignados,
    resolverMeseroTitular,
    obtenerItemsListos
};
