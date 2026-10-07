// movil/www/js/reportes.js — Ventas por día, más vendidos, ticket (igual que web)
// + datos de panel (por hora, por método, ticket promedio) y textos para
// compartir el cierre/ticket/día por WhatsApp (Fase 2).
(function (root, factory) {
    const mod = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = mod;
    else root.CFReportes = mod;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const redondear = n => Math.round((Number(n) || 0) * 100) / 100;
    const dinero = n => '$' + (Number(n) || 0).toFixed(2);
    const hoyISO = () => {
        const f = new Date();
        const p = n => String(n).padStart(2, '0');
        return `${f.getFullYear()}-${p(f.getMonth() + 1)}-${p(f.getDate())}`;
    };
    const fechaValida = (v, defecto) =>
        /^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : defecto;
    const fechaCorta = iso => { try { return new Date(iso).toLocaleString('es'); } catch (_) { return iso || ''; } };

    function ajustesMod() {
        if (typeof module !== 'undefined' && module.exports) return require('./ajustes');
        return globalThis.CFAjustes;
    }
    function cajaMod() {
        if (typeof module !== 'undefined' && module.exports) return require('./caja');
        return globalThis.CFCaja;
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
            .map(e => ({ ...e, cantidad: Math.round(e.cantidad * 1000) / 1000, importe: redondear(e.importe) }));
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

    // Histograma de 24 horas (hora local) con ceros incluidos.
    async function ventasPorHora(store, { desde = null, hasta = null } = {}) {
        const hoy = hoyISO();
        const d = fechaValida(desde, hoy);
        const h = fechaValida(hasta, d);
        const horas = Array.from({ length: 24 }, (_, hora) => ({ hora, n: 0, total: 0 }));
        for (const v of cobradasEn(await store.todos('ventas'), d, h)) {
            let hh = 0;
            try { hh = new Date(v.creado_en).getHours(); } catch (_) { hh = 0; }
            if (!Number.isInteger(hh) || hh < 0 || hh > 23) hh = 0;
            horas[hh].n += 1;
            horas[hh].total = redondear(horas[hh].total + (Number(v.total) || 0));
        }
        return { horas, filtros: { desde: d, hasta: h } };
    }

    async function porMetodo(store, { desde = null, hasta = null } = {}) {
        const hoy = hoyISO();
        const d = fechaValida(desde, hoy);
        const h = fechaValida(hasta, d);
        const tot = { efectivo: 0, tarjeta: 0, transferencia: 0 };
        for (const v of cobradasEn(await store.todos('ventas'), d, h)) {
            for (const p of (v.pagos || [])) {
                if (p.metodo in tot) tot[p.metodo] += Number(p.monto) || 0;
            }
        }
        return { efectivo: redondear(tot.efectivo), tarjeta: redondear(tot.tarjeta),
                 transferencia: redondear(tot.transferencia), filtros: { desde: d, hasta: h } };
    }

    async function resumenPeriodo(store, { desde = null, hasta = null } = {}) {
        const rep = await ventasPorDia(store, { desde, hasta });
        const met = await porMetodo(store, { desde, hasta });
        return { ...rep.totales,
            ticket_promedio: rep.totales.n ? redondear(rep.totales.total / rep.totales.n) : 0,
            porMetodo: { efectivo: met.efectivo, tarjeta: met.tarjeta, transferencia: met.transferencia },
            filtros: rep.filtros };
    }

    async function textoCierre(store, turno_id) {
        const Caja = cajaMod();
        const Ajustes = ajustesMod();
        const r = await Caja.resumen(store, turno_id);
        const negocio = await Ajustes.get(store, 'negocio_nombre', 'Mi Negocio');
        const t = r.turno;
        const lineas = [
            `*${negocio}*`,
            `Turno #${t.id} · ${t.dia || ''}`,
            `Abrió: ${t.abierto_por_nombre || '—'}`,
            '——————————',
            `Fondo: ${dinero(r.fondo)}`,
            `Ventas: ${r.ventas_n} (${dinero(r.ventas_total)})`,
            `Efectivo: ${dinero(r.porMetodo.efectivo)} · Tarjeta: ${dinero(r.porMetodo.tarjeta)} · Transf: ${dinero(r.porMetodo.transferencia)}`,
            `Entradas: ${dinero(r.entradas)} · Retiros: ${dinero(r.retiros)}`,
            `Esperado en caja: ${dinero(r.esperado_efectivo)}`
        ];
        if (t.estado === 'cerrado') {
            lineas.push(`Contado: ${dinero(t.conteo_efectivo)} · Diferencia: ${dinero(t.diferencia)}`);
            lineas.push(`Cerró: ${t.cerrado_por_nombre || '—'}`);
        } else {
            lineas.push('Turno aún abierto (corte parcial).');
        }
        return lineas.join('\n');
    }

    async function textoTicket(store, venta_id) {
        const t = await ticket(store, venta_id);
        if (!t) throw new Error('La venta no existe.');
        const v = t.venta;
        const lineas = [
            `*${t.negocio}*`,
            `Ticket #${v.id} · ${fechaCorta(v.creado_en)}`,
            '——————————'
        ];
        for (const d of t.detalles) {
            lineas.push(`${d.cantidad} × ${d.nombre} — ${dinero(d.subtotal)}`);
        }
        lineas.push('——————————');
        lineas.push(`Subtotal: ${dinero(v.subtotal)}`);
        if (Number(v.descuento) > 0) lineas.push(`Descuento: −${dinero(v.descuento)}`);
        lineas.push(`IVA: ${dinero(v.iva_monto)}`);
        lineas.push(`*TOTAL: ${dinero(v.total)}*`);
        for (const p of t.pagos) lineas.push(`${p.metodo}: ${dinero(p.monto)}`);
        if (Number(v.cambio) > 0) lineas.push(`Cambio: ${dinero(v.cambio)}`);
        if (v.estado === 'cancelada') lineas.push('*** VENTA CANCELADA ***');
        if (t.pie) lineas.push(t.pie);
        return lineas.join('\n');
    }

    async function textoDia(store, { desde = null, hasta = null } = {}) {
        const Ajustes = ajustesMod();
        const negocio = await Ajustes.get(store, 'negocio_nombre', 'Mi Negocio');
        const r = await resumenPeriodo(store, { desde, hasta });
        const top = await masVendidos(store, { desde, hasta, limite: 3 });
        const rango = r.filtros.desde === r.filtros.hasta ? r.filtros.desde : `${r.filtros.desde} → ${r.filtros.hasta}`;
        const lineas = [
            `*${negocio}* · ${rango}`,
            `Ventas: ${r.n} · Total: ${dinero(r.total)}`,
            `Ticket prom: ${dinero(r.ticket_promedio)} · Utilidad: ${dinero(r.utilidad)}`,
            `Efectivo: ${dinero(r.porMetodo.efectivo)} · Tarjeta: ${dinero(r.porMetodo.tarjeta)} · Transf: ${dinero(r.porMetodo.transferencia)}`
        ];
        if (top.filas.length) {
            lineas.push('Top: ' + top.filas.map((f, i) => `${i + 1}) ${f.nombre} (${f.cantidad})`).join(' · '));
        }
        return lineas.join('\n');
    }

    return { ventasPorDia, masVendidos, ticket, ventasPorHora, porMetodo, resumenPeriodo,
             textoCierre, textoTicket, textoDia };
});
