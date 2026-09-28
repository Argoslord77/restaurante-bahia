// services/cuentaService.js
// V12 (C3): trasladar, unir y dividir cuentas abiertas. Todo movimiento
// viaja en transacción con la cuenta bloqueada (FOR UPDATE): mover ítems
// entre cuentas es sensible al fraude y no admite carreras con el cobro.
// Los totales se recalculan con la misma fórmula del POS:
//   subtotal = total = SUM(cantidad × precio) de ítems no cancelados.
const db = require('../config/db');
const PedidoModel = require('../models/pedidoModel');
const AuditLogService = require('./auditLogService');
const STATUS = require('../config/orderStatus');

async function recalcularTotales(pedidoId, conexion) {
    const [totales] = await conexion.query(`
        SELECT COALESCE(SUM(cantidad * precio_unitario), 0) AS subtotal
        FROM detalles_pedido
        WHERE id_pedido = ? AND estado_item != ?
    `, [pedidoId, STATUS.ITEM.CANCELADO]);
    const subtotal = Number(totales[0].subtotal || 0);
    await conexion.query('UPDATE pedidos SET subtotal = ?, total = ? WHERE id = ?',
        [subtotal.toFixed(2), subtotal.toFixed(2), pedidoId]);
    return subtotal;
}

// Solo operan cuentas abiertas sin cobrar. El cobro (A1) solo acepta
// estado_pago 'pendiente', así que esta es la misma frontera.
async function cargarCuentaOperable(conexion, pedidoId, rol) {
    const id = Number(pedidoId);
    if (!Number.isInteger(id) || id <= 0) throw new Error('Cuenta no válida.');
    const [filas] = await conexion.query(`
        SELECT p.*, m.numero AS mesa_numero
        FROM pedidos p
        INNER JOIN mesas m ON p.id_mesa = m.id
        WHERE p.id = ? FOR UPDATE
    `, [id]);
    if (!filas.length) throw new Error(`La cuenta ${rol} no existe.`);
    const cuenta = filas[0];
    if (cuenta.fecha_cierre) throw new Error(`La cuenta #${id} ya está cerrada.`);
    if (cuenta.estado_pago !== STATUS.PAGO.PENDIENTE) {
        throw new Error(`La cuenta #${id} ya no está pendiente (estado: ${cuenta.estado_pago}).`);
    }
    return cuenta;
}

async function contarLineasActivas(conexion, pedidoId) {
    const [filas] = await conexion.query(
        `SELECT COUNT(*) AS n FROM detalles_pedido WHERE id_pedido = ? AND estado_item != ?`,
        [pedidoId, STATUS.ITEM.CANCELADO]);
    return Number(filas[0].n);
}

// La mesa vuelve a libre solo si no le quedan cuentas abiertas y sigue
// marcada como ocupada (nunca pisa reservada/mantenimiento).
async function liberarMesaSiVacia(conexion, mesaId, excluirPedidoId = null) {
    const [filas] = await conexion.query(`
        SELECT COUNT(*) AS n FROM pedidos WHERE id_mesa = ? AND fecha_cierre IS NULL
        ${excluirPedidoId ? 'AND id != ?' : ''}
    `, excluirPedidoId ? [mesaId, excluirPedidoId] : [mesaId]);
    if (Number(filas[0].n) > 0) return false;
    const [r] = await conexion.query(
        'UPDATE mesas SET estado = ? WHERE id = ? AND estado = ?',
        [STATUS.MESA.LIBRE, mesaId, STATUS.MESA.OCUPADA]);
    return r.affectedRows > 0;
}

// Cierra una cuenta vaciada por fusión: totales en cero, rastro de hacia
// dónde se fue y estado 'fusionada' (no cobrable, suma 0 en reportes).
async function cerrarPorFusion(conexion, cuenta, destinoId) {
    await conexion.query(`
        UPDATE pedidos
        SET subtotal = 0, total = 0,
            estado_pedido = ?, estado_pago = ?, fecha_cierre = NOW(),
            cliente_nombre = CONCAT(LEFT(COALESCE(cliente_nombre, ''), 60), ' → #', ?)
        WHERE id = ?
    `, [STATUS.PEDIDO.CANCELADO, STATUS.PAGO.FUSIONADA, destinoId, cuenta.id]);
}

// La auditoría nunca rompe la operación: si falla, queda en el log.
async function auditar(accion, actor, datos) {
    try {
        await AuditLogService.registrar({
            usuario_id: actor && actor.id,
            usuario_nombre: actor && [actor.nombre, actor.apellidos].filter(Boolean).join(' '),
            usuario_rol: actor && actor.rol,
            metodo_http: 'POST',
            ruta: '/admin/cuentas',
            accion,
            entidad: 'pedidos',
            entidad_id: datos.cuenta,
            modulo: 'caja',
            categoria: 'operacion',
            estado_http: 200,
            operacion_exitosa: true,
            ip_origen: actor && actor.ip,
            datos
        });
    } catch (error) {
        console.warn(`[cuentas] Auditoría fallida (${accion}):`, error.message);
    }
}

const cuentaService = {

    listarAbiertas: async () => {
        const [filas] = await db.query(`
            SELECT p.*, m.numero AS mesa_numero,
                   TRIM(CONCAT(COALESCE(u.nombre, ''), ' ', COALESCE(u.apellidos, ''))) AS mesero,
                   (SELECT COUNT(*) FROM detalles_pedido dp
                    WHERE dp.id_pedido = p.id AND dp.estado_item != ?) AS lineas
            FROM pedidos p
            INNER JOIN mesas m ON p.id_mesa = m.id
            LEFT JOIN usuarios u ON p.id_usuario_mesero = u.id
            WHERE p.fecha_cierre IS NULL
            ORDER BY p.creado_en ASC
        `, [STATUS.ITEM.CANCELADO]);
        return filas.map((f) => ({
            id: f.id,
            mesaId: f.id_mesa,
            mesaNumero: f.mesa_numero,
            turnoId: f.turno_servicio_id,
            mesero: (f.mesero || '').trim() || '—',
            estadoPago: f.estado_pago,
            subtotal: Number(f.subtotal),
            total: Number(f.total),
            propina: Number(f.propina),
            comensales: Number(f.comensales),
            lineas: Number(f.lineas),
            precuenta: Number(f.impresiones_precuenta || 0) > 0,
            creadoEn: f.creado_en,
            operable: !f.fecha_cierre && f.estado_pago === STATUS.PAGO.PENDIENTE
        }));
    },

    detalleCuenta: async (pedidoId) => {
        const [cuentas] = await db.query(`
            SELECT p.*, m.numero AS mesa_numero,
                   TRIM(CONCAT(COALESCE(u.nombre, ''), ' ', COALESCE(u.apellidos, ''))) AS mesero
            FROM pedidos p
            INNER JOIN mesas m ON p.id_mesa = m.id
            LEFT JOIN usuarios u ON p.id_usuario_mesero = u.id
            WHERE p.id = ? LIMIT 1
        `, [pedidoId]);
        if (!cuentas.length) return null;
        const c = cuentas[0];
        const [lineas] = await db.query(`
            SELECT dp.id, dp.cantidad, dp.precio_unitario, dp.estado_item, dp.notas_especiales,
                   COALESCE(pd.nombre, pm.nombre, 'Platillo') AS nombre
            FROM detalles_pedido dp
            LEFT JOIN platillos_menu pm ON (dp.id_platillo = pm.id AND (dp.es_platillo_dia = 0 OR dp.es_platillo_dia IS NULL))
            LEFT JOIN platillos_dia pd ON (dp.id_platillo = pd.id AND dp.es_platillo_dia = 1)
            WHERE dp.id_pedido = ? AND dp.estado_item != ?
            ORDER BY dp.id ASC
        `, [pedidoId, STATUS.ITEM.CANCELADO]);
        return {
            id: c.id,
            mesaId: c.id_mesa,
            mesaNumero: c.mesa_numero,
            mesero: (c.mesero || '').trim() || '—',
            total: Number(c.total),
            propina: Number(c.propina),
            turnoId: c.turno_servicio_id,
            operable: !c.fecha_cierre && c.estado_pago === STATUS.PAGO.PENDIENTE,
            lineas: lineas.map((l) => ({
                id: l.id,
                nombre: l.nombre,
                cantidad: Number(l.cantidad),
                precio: Number(l.precio_unitario),
                importe: Number(l.cantidad) * Number(l.precio_unitario),
                estado: l.estado_item,
                notas: l.notas_especiales
            }))
        };
    },

    // Mueve la cuenta completa a otra mesa libre.
    trasladar: async (pedidoId, mesaDestinoId, actor = {}) => {
        const destinoId = Number(mesaDestinoId);
        if (!Number.isInteger(destinoId) || destinoId <= 0) throw new Error('Mesa destino no válida.');
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            const cuenta = await cargarCuentaOperable(connection, pedidoId, 'a trasladar');
            if (Number(cuenta.id_mesa) === destinoId) throw new Error('La cuenta ya está en esa mesa.');
            const [mesas] = await connection.query(
                'SELECT id, numero, estado FROM mesas WHERE id = ? LIMIT 1', [destinoId]);
            if (!mesas.length) throw new Error('La mesa destino no existe.');
            if (mesas[0].estado !== STATUS.MESA.LIBRE) {
                throw new Error(`La mesa ${mesas[0].numero} no está libre (estado: ${mesas[0].estado}).`);
            }
            await connection.query('UPDATE pedidos SET id_mesa = ? WHERE id = ?', [destinoId, cuenta.id]);
            await connection.query('UPDATE mesas SET estado = ? WHERE id = ?',
                [STATUS.MESA.OCUPADA, destinoId]);
            const origenLiberada = await liberarMesaSiVacia(connection, cuenta.id_mesa, cuenta.id);
            await connection.commit();
            const avisoPrecuenta = Number(cuenta.impresiones_precuenta || 0) > 0
                ? 'La cuenta tenía precuenta impresa: reimprímala en la mesa nueva.' : null;
            await auditar('TRASLADAR_CUENTA', actor, {
                cuenta: cuenta.id, mesaOrigen: cuenta.mesa_numero,
                mesaDestino: mesas[0].numero, origenLiberada
            });
            return {
                pedidoId: cuenta.id, mesaOrigen: cuenta.mesa_numero,
                mesaDestino: mesas[0].numero, origenLiberada, aviso: avisoPrecuenta
            };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    // Absorbe la cuenta origen en la destino (misma mesa o distinta).
    unir: async (origenId, destinoId, actor = {}) => {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            const origen = await cargarCuentaOperable(connection, origenId, 'origen');
            const destino = await cargarCuentaOperable(connection, destinoId, 'destino');
            if (Number(origen.id) === Number(destino.id)) throw new Error('Son la misma cuenta.');
            if (Number(origen.turno_servicio_id) !== Number(destino.turno_servicio_id)) {
                throw new Error('Solo se pueden unir cuentas del mismo turno.');
            }
            if (Number(origen.propina) > 0 || Number(origen.descuento) > 0) {
                throw new Error('Quite primero la propina/descuento de la cuenta origen.');
            }
            const [mov] = await connection.query(
                `UPDATE detalles_pedido SET id_pedido = ?
                 WHERE id_pedido = ? AND estado_item != ?`,
                [destino.id, origen.id, STATUS.ITEM.CANCELADO]);
            if (mov.affectedRows === 0) throw new Error('La cuenta origen no tiene ítems para unir.');
            const totalDestino = await recalcularTotales(destino.id, connection);
            await cerrarPorFusion(connection, origen, destino.id);
            const mesaOrigenLiberada = await liberarMesaSiVacia(connection, origen.id_mesa, origen.id);
            await connection.commit();
            const avisos = [];
            if (Number(origen.impresiones_precuenta || 0) > 0) avisos.push('La cuenta origen tenía precuenta impresa.');
            if (Number(destino.impresiones_precuenta || 0) > 0) avisos.push('La cuenta destino tenía precuenta impresa: reimprímala.');
            await auditar('UNIR_CUENTAS', actor, {
                cuenta: destino.id, origen: origen.id,
                lineasMovidas: mov.affectedRows, totalDestino, mesaOrigenLiberada
            });
            return {
                origenId: origen.id, destinoId: destino.id,
                lineasMovidas: mov.affectedRows, totalDestino, mesaOrigenLiberada, avisos
            };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    // Mueve ítems sueltos a una cuenta nueva (misma mesa) o a otra abierta.
    dividir: async (origenId, detalleIds, destinoPedidoId, actor = {}) => {
        const ids = [...new Set((Array.isArray(detalleIds) ? detalleIds : []).map(Number))]
            .filter((n) => Number.isInteger(n) && n > 0);
        if (!ids.length) throw new Error('Seleccione al menos un ítem para mover.');
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            const origen = await cargarCuentaOperable(connection, origenId, 'origen');
            const [lineas] = await connection.query(
                `SELECT id FROM detalles_pedido
                 WHERE id_pedido = ? AND estado_item != ? AND id IN (?)`,
                [origen.id, STATUS.ITEM.CANCELADO, ids]);
            if (lineas.length !== ids.length) {
                throw new Error('Algunos ítems ya no están disponibles en la cuenta.');
            }
            let destinoId = destinoPedidoId ? Number(destinoPedidoId) : null;
            let pedidoNuevo = false;
            let destino = null;
            if (destinoId) {
                destino = await cargarCuentaOperable(connection, destinoId, 'destino');
                if (Number(destino.id) === Number(origen.id)) throw new Error('Son la misma cuenta.');
                if (Number(origen.turno_servicio_id) !== Number(destino.turno_servicio_id)) {
                    throw new Error('Solo se puede dividir hacia cuentas del mismo turno.');
                }
            } else {
                destinoId = await PedidoModel.create(
                    origen.id_mesa, origen.id_usuario_mesero, origen.turno_servicio_id, connection);
                pedidoNuevo = true;
            }
            await connection.query(
                'UPDATE detalles_pedido SET id_pedido = ? WHERE id IN (?)', [destinoId, ids]);
            const totalDestino = await recalcularTotales(destinoId, connection);
            const totalOrigen = await recalcularTotales(origen.id, connection);
            let origenCerrado = false;
            if ((await contarLineasActivas(connection, origen.id)) === 0) {
                await cerrarPorFusion(connection, origen, destinoId);
                await liberarMesaSiVacia(connection, origen.id_mesa, origen.id);
                origenCerrado = true;
            }
            await connection.commit();
            const avisos = [];
            if (Number(origen.impresiones_precuenta || 0) > 0) avisos.push('La cuenta origen tenía precuenta impresa: reimprímala.');
            if (destino && Number(destino.impresiones_precuenta || 0) > 0) avisos.push('La cuenta destino tenía precuenta impresa: reimprímala.');
            await auditar('DIVIDIR_CUENTA', actor, {
                cuenta: origen.id, destino: destinoId, pedidoNuevo,
                lineasMovidas: ids.length, totalOrigen, totalDestino, origenCerrado
            });
            return {
                origenId: origen.id, destinoId, pedidoNuevo,
                lineasMovidas: ids.length, totalOrigen, totalDestino, origenCerrado, avisos
            };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    mesasLibres: async () => {
        const [filas] = await db.query(
            'SELECT id, numero, capacidad FROM mesas WHERE estado = ? ORDER BY numero ASC',
            [STATUS.MESA.LIBRE]);
        return filas;
    }
};

module.exports = cuentaService;
