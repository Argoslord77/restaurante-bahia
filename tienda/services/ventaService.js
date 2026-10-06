// tienda/services/ventaService.js — Ventas con descuento de stock
// transaccional: valida turno abierto, bloquea productos (FOR UPDATE),
// cobra, descuenta y deja movimientos. Todo o nada.
const pool = require('../config/db');
const AjusteService = require('./ajusteService');

const METODOS = ['efectivo', 'tarjeta', 'transferencia'];

function redondear(n) {
    return Math.round((Number(n) || 0) * 100) / 100;
}

function hoyISO() {
    return new Date().toISOString().slice(0, 10);
}

function fechaValida(v, defecto) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : defecto;
}

const VentaService = {
    METODOS,

    async crear({ usuario_id, turno_id, cliente_nombre = null, items, pagos, descuento = 0 }) {
        if (!usuario_id) throw new Error('Sesión no válida.');
        if (!turno_id) throw new Error('No hay turno de caja abierto.');
        if (!Array.isArray(items) || !items.length) throw new Error('La venta no tiene artículos.');
        if (!Array.isArray(pagos) || !pagos.length) throw new Error('Registre al menos un pago.');

        // Agrupar por producto (por si el POS repite líneas)
        const agrupado = new Map();
        for (const it of items) {
            const pid = parseInt(it && it.producto_id, 10);
            const cant = parseInt(it && it.cantidad, 10);
            if (!Number.isInteger(pid) || pid <= 0) throw new Error('Artículo no válido.');
            if (!Number.isInteger(cant) || cant <= 0) throw new Error('Cantidad no válida.');
            agrupado.set(pid, (agrupado.get(pid) || 0) + cant);
        }
        for (const p of pagos) {
            if (!METODOS.includes(p && p.metodo)) throw new Error('Método de pago no válido.');
            if (!(Number(p.monto) > 0)) throw new Error('Monto de pago no válido.');
        }

        const ivaPct = await AjusteService.ivaPct();
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();
            const [turnos] = await conn.query(
                'SELECT id, estado FROM turnos_caja WHERE id = ? LIMIT 1', [turno_id]);
            if (!turnos.length || turnos[0].estado !== 'abierto') {
                throw new Error('El turno de caja no está abierto.');
            }
            const ids = [...agrupado.keys()];
            const [prods] = await conn.query(`
                SELECT id, nombre, precio_venta, precio_costo, stock, activo
                FROM productos WHERE id IN (?) FOR UPDATE
            `, [ids]);
            const mapa = new Map(prods.map((p) => [p.id, p]));
            const lineas = [];
            for (const [pid, cant] of agrupado) {
                const p = mapa.get(pid);
                if (!p) throw new Error('Un artículo ya no existe.');
                if (!p.activo) throw new Error(`"${p.nombre}" ya no está a la venta.`);
                if ((Number(p.stock) || 0) < cant) {
                    throw new Error(`Stock insuficiente de "${p.nombre}" (hay ${p.stock}).`);
                }
                const precio = Number(p.precio_venta) || 0;
                lineas.push({
                    producto_id: pid, nombre: p.nombre, precio,
                    costo: Number(p.precio_costo) || 0, cantidad: cant,
                    subtotal: redondear(precio * cant)
                });
            }

            const subtotal = redondear(lineas.reduce((a, l) => a + l.subtotal, 0));
            const desc = Math.min(redondear(descuento), subtotal);
            const base = redondear(subtotal - desc);
            const iva = redondear(base * ivaPct / 100);
            const total = redondear(base + iva);
            const pagado = redondear(pagos.reduce((a, p) => a + Number(p.monto), 0));
            if (pagado + 1e-9 < total) throw new Error('El pago no cubre el total.');
            const cambio = redondear(pagado - total);

            const [v] = await conn.query(`
                INSERT INTO ventas (turno_id, usuario_id, cliente_nombre, subtotal, descuento, iva_pct, iva_monto, total, cambio)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [turno_id, usuario_id, cliente_nombre || null, subtotal, desc, ivaPct, iva, total, cambio]);
            const ventaId = v.insertId;

            for (const l of lineas) {
                await conn.query(`
                    INSERT INTO venta_detalles (venta_id, producto_id, nombre, precio_unitario, costo_unitario, cantidad, subtotal)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [ventaId, l.producto_id, l.nombre, l.precio, l.costo, l.cantidad, l.subtotal]);
            }
            for (const p of pagos) {
                await conn.query('INSERT INTO pagos_venta (venta_id, metodo, monto) VALUES (?, ?, ?)',
                    [ventaId, p.metodo, redondear(p.monto)]);
            }
            for (const l of lineas) {
                const p = mapa.get(l.producto_id);
                const antes = Number(p.stock) || 0;
                const despues = antes - l.cantidad;
                await conn.query('UPDATE productos SET stock = ? WHERE id = ?', [despues, l.producto_id]);
                await conn.query(`
                    INSERT INTO movimientos (producto_id, tipo, cantidad, stock_antes, stock_despues, motivo, referencia_id, usuario_id)
                    VALUES (?, 'venta', ?, ?, ?, ?, ?, ?)
                `, [l.producto_id, -l.cantidad, antes, despues, `Venta #${ventaId}`, ventaId, usuario_id]);
            }
            await conn.commit();
            return { venta_id: ventaId, subtotal, descuento: desc, iva_pct: ivaPct, iva_monto: iva, total, cambio };
        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }
    },

    // Cancela una venta cobrada DENTRO del turno abierto (devuelve stock).
    async cancelar({ venta_id, usuario_id, motivo = null }) {
        const vid = parseInt(venta_id, 10);
        if (!Number.isInteger(vid) || vid <= 0) throw new Error('Venta no válida.');
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();
            const [ventas] = await conn.query('SELECT * FROM ventas WHERE id = ? FOR UPDATE', [vid]);
            if (!ventas.length) throw new Error('La venta no existe.');
            const venta = ventas[0];
            if (venta.estado !== 'cobrada') throw new Error('Solo se cancelan ventas cobradas.');
            const [turnos] = await conn.query(
                'SELECT id, estado FROM turnos_caja WHERE id = ? LIMIT 1', [venta.turno_id]);
            if (!turnos.length || turnos[0].estado !== 'abierto') {
                throw new Error('Solo se cancela dentro del turno abierto.');
            }
            const [dets] = await conn.query(
                'SELECT producto_id, cantidad FROM venta_detalles WHERE venta_id = ?', [vid]);
            await conn.query('UPDATE ventas SET estado = ?, motivo_cancelacion = ? WHERE id = ?',
                ['cancelada', motivo || null, vid]);
            if (dets.length) {
                const ids = [...new Set(dets.map((d) => d.producto_id).filter(Boolean))];
                const [prods] = ids.length
                    ? await conn.query('SELECT id, stock FROM productos WHERE id IN (?) FOR UPDATE', [ids])
                    : [[]];
                const stock = new Map((prods || []).map((p) => [p.id, Number(p.stock) || 0]));
                for (const d of dets) {
                    if (!d.producto_id) continue;
                    const antes = stock.get(d.producto_id) || 0;
                    const despues = antes + d.cantidad;
                    await conn.query('UPDATE productos SET stock = ? WHERE id = ?', [despues, d.producto_id]);
                    stock.set(d.producto_id, despues);
                    await conn.query(`
                        INSERT INTO movimientos (producto_id, tipo, cantidad, stock_antes, stock_despues, motivo, referencia_id, usuario_id)
                        VALUES (?, 'devolucion', ?, ?, ?, ?, ?, ?)
                    `, [d.producto_id, d.cantidad, antes, despues, `Cancela venta #${vid}`, vid, usuario_id]);
                }
            }
            await conn.commit();
            return { venta_id: vid };
        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }
    },

    async listar({ desde = null, hasta = null, turno_id = null, estado = null } = {}) {
        const hoy = hoyISO();
        const d = fechaValida(desde, hoy);
        const h = fechaValida(hasta, d);
        const conds = ['DATE(v.creado_en) BETWEEN ? AND ?'];
        const params = [d, h];
        if (turno_id) { conds.push('v.turno_id = ?'); params.push(turno_id); }
        if (estado === 'cobrada' || estado === 'cancelada') { conds.push('v.estado = ?'); params.push(estado); }
        const [filas] = await pool.query(`
            SELECT v.*, u.nombre AS usuario_nombre,
                   (SELECT COUNT(*) FROM venta_detalles d WHERE d.venta_id = v.id) AS lineas
            FROM ventas v
            LEFT JOIN usuarios u ON v.usuario_id = u.id
            WHERE ${conds.join(' AND ')}
            ORDER BY v.id DESC
            LIMIT 500
        `, params);
        const totales = filas.filter((f) => f.estado === 'cobrada').reduce((acc, f) => ({
            n: acc.n + 1, total: redondear(acc.total + Number(f.total || 0))
        }), { n: 0, total: 0 });
        return { filas, totales, filtros: { desde: d, hasta: h } };
    },

    async obtenerDetalle(id) {
        const [ventas] = await pool.query(`
            SELECT v.*, u.nombre AS usuario_nombre
            FROM ventas v
            LEFT JOIN usuarios u ON v.usuario_id = u.id
            WHERE v.id = ? LIMIT 1
        `, [id]);
        if (!ventas.length) return null;
        const [detalles] = await pool.query(
            'SELECT * FROM venta_detalles WHERE venta_id = ? ORDER BY id ASC', [id]);
        const [pagos] = await pool.query(
            'SELECT * FROM pagos_venta WHERE venta_id = ? ORDER BY id ASC', [id]);
        return { venta: ventas[0], detalles, pagos };
    }
};

module.exports = VentaService;
