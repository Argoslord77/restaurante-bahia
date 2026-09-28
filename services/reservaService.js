// services/reservaService.js
// V12 (C2): reservas de mesa — apartar, sentar a la llegada, cancelar y
// marcar no-show. Una reserva pendiente bloquea su mesa (estado reservada)
// y al sentar abre el pedido del turno activo.
const db = require('../config/db');
const PedidoModel = require('../models/pedidoModel');
const TurnoService = require('./turnoService');
const STATUS = require('../config/orderStatus');

// Ventana anti-traslape: dos reservas de la misma mesa con menos de 2 h
// de diferencia se consideran en conflicto.
const VENTANA_TRASLAPE_MIN = 120;
// Tolerancia para registrar una reserva que ya empezó (el cliente avisó
// tarde o el recepcionista la anota al momento).
const TOLERANCIA_PASADO_MIN = 30;

function normalizarFecha(valor) {
    const f = valor instanceof Date ? valor : new Date(valor);
    return Number.isNaN(f.getTime()) ? null : f;
}

function formatearFechaMySQL(f) {
    const p = (n) => String(n).padStart(2, '0');
    return `${f.getFullYear()}-${p(f.getMonth() + 1)}-${p(f.getDate())} ${p(f.getHours())}:${p(f.getMinutes())}:00`;
}

async function cargarMesa(conexion, mesaId) {
    const [filas] = await conexion.query(
        'SELECT id, numero, capacidad, estado FROM mesas WHERE id = ? LIMIT 1', [mesaId]);
    return filas.length ? filas[0] : null;
}

async function buscarTraslape(conexion, mesaId, fechaMySQL, excluirId = null) {
    const [filas] = await conexion.query(`
        SELECT id, fecha_reserva, cliente_nombre
        FROM reservas
        WHERE id_mesa = ? AND estado = ?
          AND ABS(TIMESTAMPDIFF(MINUTE, fecha_reserva, ?)) < ?
          ${excluirId ? 'AND id != ?' : ''}
        ORDER BY fecha_reserva LIMIT 1
    `, excluirId
        ? [mesaId, STATUS.RESERVA.PENDIENTE, fechaMySQL, VENTANA_TRASLAPE_MIN, excluirId]
        : [mesaId, STATUS.RESERVA.PENDIENTE, fechaMySQL, VENTANA_TRASLAPE_MIN]);
    return filas.length ? filas[0] : null;
}

// Libera la mesa solo si quedó sin pendientes ni cuentas abiertas y nadie
// la marcó en otro estado (ocupada, mantenimiento, etc.).
async function liberarMesaSiQuedaLibre(conexion, mesaId) {
    const [pend] = await conexion.query(
        'SELECT COUNT(*) AS n FROM reservas WHERE id_mesa = ? AND estado = ?',
        [mesaId, STATUS.RESERVA.PENDIENTE]);
    if (Number(pend[0].n) > 0) return false;
    const [cuentas] = await conexion.query(
        'SELECT COUNT(*) AS n FROM pedidos WHERE id_mesa = ? AND fecha_cierre IS NULL', [mesaId]);
    if (Number(cuentas[0].n) > 0) return false;
    const [r] = await conexion.query(
        `UPDATE mesas SET estado = ? WHERE id = ? AND estado = ?`,
        [STATUS.MESA.LIBRE, mesaId, STATUS.MESA.RESERVADA]);
    return r.affectedRows > 0;
}

const reservaService = {

    crear: async ({ mesaId, nombre, telefono = null, comensales = 2, fechaReserva, notas = null, usuarioId }) => {
        const mesaIdNum = Number(mesaId);
        if (!Number.isInteger(mesaIdNum) || mesaIdNum <= 0) throw new Error('Mesa no válida.');
        const nombreLimpio = String(nombre || '').trim();
        if (!nombreLimpio) throw new Error('El nombre del cliente es obligatorio.');
        if (nombreLimpio.length > 100) throw new Error('El nombre no puede pasar de 100 caracteres.');
        const comensalesNum = Number(comensales);
        if (!Number.isInteger(comensalesNum) || comensalesNum < 1) throw new Error('Los comensales deben ser al menos 1.');
        const fecha = normalizarFecha(fechaReserva);
        if (!fecha) throw new Error('Fecha de reserva no válida.');
        if (fecha.getTime() < Date.now() - TOLERANCIA_PASADO_MIN * 60000) {
            throw new Error('La fecha de reserva ya pasó.');
        }

        const mesa = await cargarMesa(db, mesaIdNum);
        if (!mesa) throw new Error('La mesa no existe.');
        if (mesa.estado === STATUS.MESA.OCUPADA) throw new Error(`La mesa ${mesa.numero} está ocupada.`);
        if (mesa.estado === STATUS.MESA.MANTENIMIENTO) throw new Error(`La mesa ${mesa.numero} está en mantenimiento.`);
        if (mesa.estado === STATUS.MESA.DESOCUPANDOSE) throw new Error(`La mesa ${mesa.numero} se está desocupando.`);

        const fechaMySQL = formatearFechaMySQL(fecha);
        const conflicto = await buscarTraslape(db, mesaIdNum, fechaMySQL);
        if (conflicto) {
            throw new Error(`La mesa ${mesa.numero} ya tiene una reserva cercana (${conflicto.cliente_nombre}).`);
        }

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            // Revalidar dentro de la transacción: dos recepcionistas no
            // pueden apartar la misma mesa a la misma hora.
            const mesaTx = await cargarMesa(connection, mesaIdNum);
            if (!mesaTx) throw new Error('La mesa no existe.');
            if ([STATUS.MESA.OCUPADA, STATUS.MESA.MANTENIMIENTO, STATUS.MESA.DESOCUPANDOSE].includes(mesaTx.estado)) {
                throw new Error(`La mesa ${mesaTx.numero} ya no está disponible.`);
            }
            const conflictoTx = await buscarTraslape(connection, mesaIdNum, fechaMySQL);
            if (conflictoTx) throw new Error(`La mesa ${mesaTx.numero} ya tiene una reserva cercana.`);
            const [r] = await connection.query(`
                INSERT INTO reservas (id_mesa, cliente_nombre, cliente_telefono, comensales, fecha_reserva, notas, creado_por)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [mesaIdNum, nombreLimpio, telefono ? String(telefono).trim().slice(0, 30) : null,
                comensalesNum, fechaMySQL, notas ? String(notas).trim().slice(0, 255) : null, usuarioId || null]);
            if (mesaTx.estado === STATUS.MESA.LIBRE) {
                await connection.query('UPDATE mesas SET estado = ? WHERE id = ?',
                    [STATUS.MESA.RESERVADA, mesaIdNum]);
            }
            await connection.commit();
            return {
                id: r.insertId, mesaId: mesaIdNum, mesaNumero: mesaTx.numero,
                nombre: nombreLimpio, comensales: comensalesNum, fechaReserva: fechaMySQL
            };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    listar: async (filtro = 'proximas') => {
        let condicion = '';
        if (filtro === 'proximas') {
            condicion = `WHERE r.estado = '${STATUS.RESERVA.PENDIENTE}'
                         AND r.fecha_reserva >= DATE_SUB(NOW(), INTERVAL 2 HOUR)`;
        } else if (filtro === 'historial') {
            condicion = `WHERE r.estado != '${STATUS.RESERVA.PENDIENTE}'
                         OR r.fecha_reserva < DATE_SUB(NOW(), INTERVAL 2 HOUR)`;
        }
        const [filas] = await db.query(`
            SELECT r.*, m.numero AS mesa_numero, m.capacidad AS mesa_capacidad,
                   TRIM(CONCAT(COALESCE(u.nombre, ''), ' ', COALESCE(u.apellidos, ''))) AS creado_por_nombre
            FROM reservas r
            INNER JOIN mesas m ON r.id_mesa = m.id
            LEFT JOIN usuarios u ON r.creado_por = u.id
            ${condicion}
            ORDER BY r.fecha_reserva ASC
            LIMIT 200
        `);
        return filas.map((f) => ({
            id: f.id,
            mesaId: f.id_mesa,
            mesaNumero: f.mesa_numero,
            mesaCapacidad: f.mesa_capacidad,
            nombre: f.cliente_nombre,
            telefono: f.cliente_telefono,
            comensales: Number(f.comensales),
            fechaReserva: f.fecha_reserva,
            estado: f.estado,
            notas: f.notas,
            creadoPor: (f.creado_por_nombre || '').trim() || '—',
            vencida: f.estado === STATUS.RESERVA.PENDIENTE
                && normalizarFecha(f.fecha_reserva) !== null
                && normalizarFecha(f.fecha_reserva).getTime() < Date.now()
        }));
    },

    // La llegada abre el pedido: el cliente se sienta y empieza a consumir.
    llegada: async (reservaId, usuarioId) => {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            const [filas] = await connection.query(
                'SELECT * FROM reservas WHERE id = ? FOR UPDATE', [reservaId]);
            if (!filas.length) throw new Error('La reserva no existe.');
            const reserva = filas[0];
            if (reserva.estado !== STATUS.RESERVA.PENDIENTE) {
                throw new Error(`La reserva ya está ${reserva.estado}.`);
            }
            const turno = await TurnoService.obtenerTurnoActivo();
            if (!turno) throw new Error('No hay un turno abierto: abra el turno antes de sentar.');
            const mesa = await cargarMesa(connection, reserva.id_mesa);
            if (!mesa) throw new Error('La mesa de la reserva ya no existe.');
            if (mesa.estado === STATUS.MESA.OCUPADA) {
                throw new Error(`La mesa ${mesa.numero} está ocupada por otra cuenta.`);
            }
            if (mesa.estado === STATUS.MESA.MANTENIMIENTO) {
                throw new Error(`La mesa ${mesa.numero} está en mantenimiento.`);
            }
            const pedidoId = await PedidoModel.create(reserva.id_mesa, usuarioId, turno.id, connection);
            await connection.query('UPDATE pedidos SET comensales = ? WHERE id = ?',
                [Math.max(1, Number(reserva.comensales) || 1), pedidoId]);
            await connection.query('UPDATE mesas SET estado = ? WHERE id = ?',
                [STATUS.MESA.OCUPADA, reserva.id_mesa]);
            await connection.query('UPDATE reservas SET estado = ? WHERE id = ?',
                [STATUS.RESERVA.SENTADA, reservaId]);
            await connection.commit();
            return { reservaId: Number(reservaId), pedidoId, mesaId: reserva.id_mesa, mesaNumero: mesa.numero };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    // Cierra la reserva (cancelada o no-show) y libera la mesa si quedó libre.
    cerrar: async (reservaId, estadoFinal) => {
        if (![STATUS.RESERVA.CANCELADA, STATUS.RESERVA.NO_SHOW].includes(estadoFinal)) {
            throw new Error('Estado final no válido.');
        }
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            const [filas] = await connection.query(
                'SELECT * FROM reservas WHERE id = ? FOR UPDATE', [reservaId]);
            if (!filas.length) throw new Error('La reserva no existe.');
            const reserva = filas[0];
            if (reserva.estado !== STATUS.RESERVA.PENDIENTE) {
                throw new Error(`La reserva ya está ${reserva.estado}.`);
            }
            await connection.query('UPDATE reservas SET estado = ? WHERE id = ?',
                [estadoFinal, reservaId]);
            const mesaLiberada = await liberarMesaSiQuedaLibre(connection, reserva.id_mesa);
            await connection.commit();
            return { reservaId: Number(reservaId), estado: estadoFinal, mesaLiberada };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    mesasReservables: async () => {
        const [filas] = await db.query(`
            SELECT m.id, m.numero, m.capacidad, m.estado,
                   (SELECT COUNT(*) FROM reservas r
                    WHERE r.id_mesa = m.id AND r.estado = ?) AS pendientes
            FROM mesas m
            WHERE m.estado IN (?, ?)
            ORDER BY m.numero ASC
        `, [STATUS.RESERVA.PENDIENTE, STATUS.MESA.LIBRE, STATUS.MESA.RESERVADA]);
        return filas;
    }
};

module.exports = reservaService;
