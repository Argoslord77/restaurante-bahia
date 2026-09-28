// services/aperturaMesaService.js
//
// Puerta única para ABRIR un pedido en una mesa, usada por todos los
// caminos de apertura (dependiente/capitán en el móvil, POS, QR y la
// llegada de reservas). Dos reglas de negocio:
//
//   1. Sin distribución del día (turno) no se opera ninguna mesa.
//   2. Una mesa RESERVADA solo se abre desde el módulo Reservas
//      (botón Sentar = llegada); el móvil/POS la rechaza e indica
//      a dónde ir.
//
// Los errores llevan `codigo` para que cada controlador decida el
// formato de respuesta (JSON o flash+redirect), y `message` listo
// para mostrarse al usuario.
'use strict';

const db = require('../config/db');
const STATUS = require('../config/orderStatus');

const CODIGOS = {
    SIN_DISTRIBUCION: 'SIN_DISTRIBUCION',
    MESA_INEXISTENTE: 'MESA_INEXISTENTE',
    MESA_RESERVADA: 'MESA_RESERVADA',
    MESA_OCUPADA: 'MESA_OCUPADA',
    MESA_MANTENIMIENTO: 'MESA_MANTENIMIENTO',
    MESA_DESOCUPANDOSE: 'MESA_DESOCUPANDOSE'
};

function errorApertura(codigo, message) {
    const e = new Error(message);
    e.codigo = codigo;
    return e;
}

function etiquetaMesa(mesa) {
    return (mesa && (mesa.numero || mesa.nombre)) || `#${mesa && mesa.id ? mesa.id : '?'}`;
}

// ¿Se hizo la distribución del turno? Basta con que exista al menos un
// detalle mesa→dependiente vinculado al turno (cualquier ubicación).
async function hayDistribucion(turnoId, conexion = null) {
    if (!turnoId) return false;
    const c = conexion || db;
    const [filas] = await c.query(`
        SELECT COUNT(*) AS n
        FROM detalle_asignacion_mesa dam
        INNER JOIN asignaciones_diarias ad ON dam.asignacion_diaria_id = ad.id
        WHERE ad.turno_id = ?
    `, [turnoId]);
    return Number(filas && filas[0] ? filas[0].n : 0) > 0;
}

async function cargarMesa(idMesa, conexion = null) {
    const c = conexion || db;
    const [filas] = await c.query(
        'SELECT id, numero, capacidad, estado FROM mesas WHERE id = ? LIMIT 1',
        [idMesa]
    );
    return filas && filas.length ? filas[0] : null;
}

// Próxima reserva pendiente de la mesa (para explicar el bloqueo).
async function proximaReservaPendiente(idMesa, conexion = null) {
    const c = conexion || db;
    const [filas] = await c.query(`
        SELECT cliente_nombre, comensales,
               DATE_FORMAT(fecha_reserva, '%d/%m %H:%i') AS fecha_corta
        FROM reservas
        WHERE id_mesa = ? AND estado = ?
          AND fecha_reserva >= DATE_SUB(NOW(), INTERVAL 2 HOUR)
        ORDER BY fecha_reserva ASC
        LIMIT 1
    `, [idMesa, STATUS.RESERVA.PENDIENTE]);
    return filas && filas.length ? filas[0] : null;
}

// Lanza si la mesa no puede abrir pedido. Devuelve la mesa si pasa.
async function verificarMesaParaApertura(idMesa, conexion = null) {
    const mesa = await cargarMesa(idMesa, conexion);
    if (!mesa) {
        throw errorApertura(CODIGOS.MESA_INEXISTENTE, 'La mesa indicada no existe.');
    }
    const etiqueta = etiquetaMesa(mesa);
    if (mesa.estado === STATUS.MESA.LIBRE) return mesa;
    if (mesa.estado === STATUS.MESA.RESERVADA) {
        const r = await proximaReservaPendiente(idMesa, conexion);
        const detalle = r
            ? ` (${r.cliente_nombre}, ${r.fecha_corta}, ${r.comensales} pers.)`
            : '';
        throw errorApertura(
            CODIGOS.MESA_RESERVADA,
            `La mesa ${etiqueta} está RESERVADA${detalle}. ` +
            'Para abrir su cuenta registre la llegada desde el módulo Reservas (botón Sentar).'
        );
    }
    if (mesa.estado === STATUS.MESA.OCUPADA) {
        throw errorApertura(CODIGOS.MESA_OCUPADA, `La mesa ${etiqueta} está ocupada por otra cuenta.`);
    }
    if (mesa.estado === STATUS.MESA.MANTENIMIENTO) {
        throw errorApertura(CODIGOS.MESA_MANTENIMIENTO, `La mesa ${etiqueta} está en mantenimiento.`);
    }
    if (mesa.estado === STATUS.MESA.DESOCUPANDOSE) {
        throw errorApertura(CODIGOS.MESA_DESOCUPANDOSE, `La mesa ${etiqueta} se está desocupando. Intente en unos minutos.`);
    }
    throw errorApertura(
        CODIGOS.MESA_OCUPADA,
        `La mesa ${etiqueta} no está disponible (estado: ${mesa.estado}).`
    );
}

// Autorización completa: distribución del turno + estado de la mesa.
// Devuelve { mesa } o lanza errorApertura.
async function autorizarApertura(idMesa, turnoId, conexion = null) {
    if (!(await hayDistribucion(turnoId, conexion))) {
        throw errorApertura(
            CODIGOS.SIN_DISTRIBUCION,
            'Aún no se ha hecho la distribución del día. ' +
            'El capitán o administrador debe asignar las mesas antes de abrir pedidos.'
        );
    }
    const mesa = await verificarMesaParaApertura(idMesa, conexion);
    return { mesa };
}

module.exports = {
    CODIGOS,
    hayDistribucion,
    verificarMesaParaApertura,
    autorizarApertura
};
