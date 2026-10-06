// tienda/services/reporteService.js — Reportes básicos: ventas por día
// (con utilidad), artículos más vendidos y ticket de venta.
const pool = require('../config/db');
const AjusteService = require('./ajusteService');
const VentaService = require('./ventaService');

function hoyISO() {
    return new Date().toISOString().slice(0, 10);
}

function fechaValida(v, defecto) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : defecto;
}

const ReporteService = {
    async ventasPorDia({ desde = null, hasta = null } = {}) {
        const hoy = hoyISO();
        const d = fechaValida(desde, hoy);
        const h = fechaValida(hasta, d);
        const [filas] = await pool.query(`
            SELECT DATE(v.creado_en) AS dia, COUNT(*) AS n,
                   COALESCE(SUM(v.subtotal), 0) AS subtotal,
                   COALESCE(SUM(v.descuento), 0) AS descuento,
                   COALESCE(SUM(v.iva_monto), 0) AS iva,
                   COALESCE(SUM(v.total), 0) AS total
            FROM ventas v
            WHERE v.estado = 'cobrada' AND DATE(v.creado_en) BETWEEN ? AND ?
            GROUP BY DATE(v.creado_en)
            ORDER BY dia ASC
        `, [d, h]);
        const [util] = await pool.query(`
            SELECT DATE(v.creado_en) AS dia,
                   COALESCE(SUM((d.precio_unitario - d.costo_unitario) * d.cantidad), 0) AS utilidad
            FROM venta_detalles d
            INNER JOIN ventas v ON d.venta_id = v.id
            WHERE v.estado = 'cobrada' AND DATE(v.creado_en) BETWEEN ? AND ?
            GROUP BY DATE(v.creado_en)
        `, [d, h]);
        const mapaUtil = new Map(util.map((u) => [String(u.dia), Number(u.utilidad) || 0]));
        const dias = filas.map((f) => ({ ...f, utilidad: mapaUtil.get(String(f.dia)) || 0 }));
        const totales = dias.reduce((acc, f) => ({
            n: acc.n + (Number(f.n) || 0),
            subtotal: acc.subtotal + (Number(f.subtotal) || 0),
            descuento: acc.descuento + (Number(f.descuento) || 0),
            iva: acc.iva + (Number(f.iva) || 0),
            total: acc.total + (Number(f.total) || 0),
            utilidad: acc.utilidad + (Number(f.utilidad) || 0)
        }), { n: 0, subtotal: 0, descuento: 0, iva: 0, total: 0, utilidad: 0 });
        return { dias, totales, filtros: { desde: d, hasta: h } };
    },

    async masVendidos({ desde = null, hasta = null, limite = 10 } = {}) {
        const hoy = hoyISO();
        const d = fechaValida(desde, hoy);
        const h = fechaValida(hasta, d);
        const [filas] = await pool.query(`
            SELECT d.producto_id, d.nombre,
                   SUM(d.cantidad) AS cantidad,
                   COALESCE(SUM(d.subtotal), 0) AS importe
            FROM venta_detalles d
            INNER JOIN ventas v ON d.venta_id = v.id
            WHERE v.estado = 'cobrada' AND DATE(v.creado_en) BETWEEN ? AND ?
            GROUP BY d.producto_id, d.nombre
            ORDER BY cantidad DESC
            LIMIT ?
        `, [d, h, Math.min(50, Math.max(1, parseInt(limite, 10) || 10))]);
        return { filas, filtros: { desde: d, hasta: h } };
    },

    // Todo lo que necesita el ticket: venta + negocio.
    async ticket(venta_id) {
        const detalle = await VentaService.obtenerDetalle(venta_id);
        if (!detalle) return null;
        const negocio = await AjusteService.get('negocio_nombre', 'Mi Negocio');
        const pie = await AjusteService.get('ticket_pie', 'Gracias por su compra');
        return { ...detalle, negocio, pie };
    }
};

module.exports = ReporteService;
