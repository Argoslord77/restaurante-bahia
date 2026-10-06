// movil/www/js/reportes.js — Ventas por día, más vendidos y ticket (igual que web).
(function (root, factory) {
    const mod = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = mod;
    else root.CFReportes = mod;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const redondear = n => Math.round((Number(n) || 0) * 100) / 100;
    const hoyISO = () => {
        const f = new Date();
        const p = n => String(n).padStart(2, '0');
        return `${f.getFullYear()}-${p(f.getMonth() + 1)}-${p(f.getDate())}`;
    };
    const fechaValida = (v, defecto) =>
        /^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : defecto;

    function ajustesMod() {
        if (typeof module !== 'undefined' && module.exports) return require('./ajustes');
        return globalThis.CFAjustes;
    }

    function cobradasEn(ventas, d, h) {
        return ventas.filter(v => v.estado === 'cobrada' && v.dia >= d && v.dia <= h);
    }

    async function ventasPorDia(store, { desde = null, hasta = null } = {}) {
        const hoy = hoyISO();
        const d = fechaValida(desde, hoy);
        const h = fechaValida(hasta, d);
        const porDia = {};
        for (const v of cobradasEn(await store.todos('ventas'), d, h)) {
            const e = porDia[v.dia] || (porDia[v.dia] = { dia: v.dia, n: 0, subtotal: 0, descuento: 0, iva: 0, total: 0, utilidad: 0 });
            e.n += 1;
            e.subtotal += Number(v.subtotal) || 0;
            e.descuento += Number(v.descuento) || 0;
            e.iva += Number(v.iva_monto) || 0;
            e.total += Number(v.total) || 0;
            for (const l of (v.detalles || [])) {
                e.utilidad += ((Number(l.precio_unitario) || 0) - (Number(l.costo_unitario) || 0)) * (Number(l.cantidad) || 0);
            }
        }
        const dias = Object.values(porDia).sort((a, b) => String(a.dia).localeCompare(String(b.dia)))
            .map(e => ({ ...e, subtotal: redondear(e.subtotal), descuento: redondear(e.descuento),
                          iva: redondear(e.iva), total: redondear(e.total), utilidad: redondear(e.utilidad) }));
        const totales = dias.reduce((acc, f) => ({
            n: acc.n + f.n, subtotal: redondear(acc.subtotal + f.subtotal),
            descuento: redondear(acc.descuento + f.descuento), iva: redondear(acc.iva + f.iva),
            total: redondear(acc.total + f.total), utilidad: redondear(acc.utilidad + f.utilidad)
        }), { n: 0, subtotal: 0, descuento: 0, iva: 0, total: 0, utilidad: 0 });
        return { dias, totales, filtros: { desde: d, hasta: h } };
    }

    async function masVendidos(store, { desde = null, hasta = null, limite = 10 } = {}) {
        const hoy = hoyISO();
        const d = fechaValida(desde, hoy);
        const h = fechaValida(hasta, d);
        const n = Math.min(50, Math.max(1, parseInt(limite, 10) || 10));
        const mapa = {};
        for (const v of cobradasEn(await store.todos('ventas'), d, h)) {
            for (const l of (v.detalles || [])) {
                const k = l.producto_id + '|' + l.nombre;
                const e = mapa[k] || (mapa[k] = { producto_id: l.producto_id, nombre: l.nombre, cantidad: 0, importe: 0 });
                e.cantidad += Number(l.cantidad) || 0;
                e.importe += Number(l.subtotal) || 0;
            }
        }
        const filas = Object.values(mapa)
            .sort((a, b) => b.cantidad - a.cantidad).slice(0, n)
            .map(e => ({ ...e, importe: redondear(e.importe) }));
        return { filas, filtros: { desde: d, hasta: h } };
    }

    async function ticket(store, venta_id) {
        const venta = await store.obtener('ventas', Number(venta_id));
        if (!venta) return null;
        const Ajustes = ajustesMod();
        return {
            venta,
            detalles: venta.detalles || [],
            pagos: venta.pagos || [],
            negocio: await Ajustes.get(store, 'negocio_nombre', 'Mi Negocio'),
            pie: await Ajustes.get(store, 'ticket_pie', 'Gracias por su compra')
        };
    }

    return { ventasPorDia, masVendidos, ticket };
});
