// services/borradorService.js
// T7: borrador del carrito compartido capitán → dependiente.
//
// Cuando el modo "solo capitanes" está activo, el capitán toma la orden y
// cada cambio de su carrito (ronda en captura, aún sin enviar) se guarda
// como borrador de ese pedido. El dependiente asignado a la mesa lo ve en
// tiempo real (solo lectura) y recibe el aviso en su tablero.
//
// El borrador se elimina solo: al enviar la ronda (apiSaveOrder), al cobrar
// la orden o al vaciar el carrito. Un pedido tiene UN solo borrador vigente.
'use strict';

const pool = require('../config/db');

function esVerdadero(valor) {
    return valor === true || valor === 1 || valor === '1' || valor === 'true';
}

// Limpia y valida los ítems que llegan del navegador (nunca confía en el
// cliente: topes de tamaño, cantidades e identificadores).
function normalizarItems(items) {
    if (!Array.isArray(items)) return [];
    return items.slice(0, 200).map((it) => ({
        id: Number(it && it.id) || 0,
        nombre: String((it && it.nombre) || '').slice(0, 120),
        precio: Number(it && it.precio) || 0,
        cantidad: Math.max(1, Math.min(99, parseInt(it && it.cantidad, 10) || 1)),
        notas: String((it && it.notas) || '').slice(0, 255),
        es_platillo_dia: esVerdadero(it && (it.es_platillo_dia ?? it.esDia)) ? 1 : 0
    })).filter((it) => it.id > 0 && it.precio >= 0);
}

// mysql2 devuelve la columna JSON parseada; MariaDB (LONGTEXT) como texto.
function parsearItems(valor) {
    try {
        const arr = typeof valor === 'string' ? JSON.parse(valor) : valor;
        return Array.isArray(arr) ? arr : [];
    } catch (_) {
        return [];
    }
}

const BorradorService = {

    // Guarda (o reemplaza) el borrador del pedido. Un carrito vacío elimina
    // el borrador. Lanza Error con mensaje apto para mostrar al usuario.
    async guardar({ idPedido, idMesa, items, usuarioId }) {
        const pedidoId = parseInt(idPedido, 10);
        if (!Number.isInteger(pedidoId) || pedidoId <= 0) {
            throw new Error('Pedido no válido.');
        }
        const mesaId = parseInt(idMesa, 10);
        if (!Number.isInteger(mesaId) || mesaId <= 0) {
            throw new Error('Mesa no válida.');
        }
        const limpios = normalizarItems(items);
        if (limpios.length === 0) {
            await this.eliminar(pedidoId);
            return { pedidoId, n: 0, vacio: true };
        }
        const contenido = JSON.stringify(limpios);
        try {
            await pool.query(`
                INSERT INTO borradores_carrito (id_pedido, id_mesa, items_json, actualizado_por)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE id_mesa = ?, items_json = ?,
                                        actualizado_por = ?, actualizado_en = CURRENT_TIMESTAMP
            `, [pedidoId, mesaId, contenido, usuarioId || null, mesaId, contenido, usuarioId || null]);
        } catch (err) {
            if (err && (err.code === 'ER_NO_SUCH_TABLE' || err.errno === 1146)) {
                throw new Error('La función de borrador aún no está instalada en la base de datos.');
            }
            throw err;
        }
        return { pedidoId, n: limpios.length, vacio: false };
    },

    // Borrador vigente del pedido (o null si no hay). Incluye los ítems
    // parseados, la marca de versión y el nombre de quien lo guardó.
    async obtener(idPedido) {
        const pedidoId = parseInt(idPedido, 10);
        if (!Number.isInteger(pedidoId) || pedidoId <= 0) return null;
        let filas;
        try {
            [filas] = await pool.query(`
                SELECT b.id_pedido, b.id_mesa, b.items_json, b.actualizado_en,
                       TRIM(CONCAT(COALESCE(u.nombre, ''), ' ', COALESCE(u.apellidos, ''))) AS autor
                FROM borradores_carrito b
                LEFT JOIN usuarios u ON b.actualizado_por = u.id
                WHERE b.id_pedido = ?
                LIMIT 1
            `, [pedidoId]);
        } catch (err) {
            if (err && (err.code === 'ER_NO_SUCH_TABLE' || err.errno === 1146)) return null;
            throw err;
        }
        if (!filas.length) return null;
        const fila = filas[0];
        return {
            id_pedido: fila.id_pedido,
            id_mesa: fila.id_mesa,
            items: parsearItems(fila.items_json),
            actualizado_en: fila.actualizado_en,
            autor: (fila.autor || '').trim() || null
        };
    },

    // Elimina el borrador del pedido (al enviar la ronda, cobrar o vaciar).
    // Nunca lanza: si la tabla no existe, no hay nada que borrar.
    async eliminar(idPedido) {
        try {
            await pool.query('DELETE FROM borradores_carrito WHERE id_pedido = ?', [idPedido]);
        } catch (_) { /* tabla aún no instalada: nada que borrar */ }
    },

    // Borradores vigentes sobre las mesas asignadas al dependiente en el
    // turno (para avisarle en su tablero). Nunca lanza: devuelve [].
    async listarParaDependiente(turnoId, dependienteId) {
        if (!pool || !turnoId || !dependienteId) return [];
        try {
            const [filas] = await pool.query(`
                SELECT b.id_pedido, b.id_mesa, m.numero AS mesa_numero,
                       b.items_json, b.actualizado_en,
                       TRIM(CONCAT(COALESCE(u.nombre, ''), ' ', COALESCE(u.apellidos, ''))) AS autor
                FROM borradores_carrito b
                INNER JOIN mesas m ON b.id_mesa = m.id
                INNER JOIN detalle_asignacion_mesa dam ON dam.mesa_id = m.id AND dam.dependiente_id = ?
                INNER JOIN asignaciones_diarias ad ON dam.asignacion_diaria_id = ad.id
                  AND ad.turno_id = ?
                  AND ad.id IN (
                      SELECT MAX(a2.id) FROM asignaciones_diarias a2
                      WHERE a2.turno_id = ?
                      GROUP BY a2.ubicacion
                  )
                ORDER BY b.actualizado_en DESC
                LIMIT 50
            `, [dependienteId, turnoId, turnoId]);
            return (filas || []).map((f) => ({
                id_pedido: f.id_pedido,
                id_mesa: f.id_mesa,
                mesa_numero: f.mesa_numero,
                n_items: parsearItems(f.items_json).length,
                version: f.actualizado_en,
                autor: (f.autor || '').trim() || null
            }));
        } catch (err) {
            console.error('Error al listar borradores del dependiente:', err.message);
            return [];
        }
    }
};

module.exports = BorradorService;
