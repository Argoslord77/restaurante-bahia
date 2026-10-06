// movil/www/js/caja.js — Turnos de caja (mismas reglas que la web).
(function (root, factory) {
    const mod = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = mod;
    else root.CFCaja = mod;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const COL = 'turnos';
    const redondear = n => Math.round((Number(n) || 0) * 100) / 100;

    function diaLocal(d) {
        const f = d || new Date();
        const p = n => String(n).padStart(2, '0');
        return `${f.getFullYear()}-${p(f.getMonth() + 1)}-${p(f.getDate())}`;
    }

    async function mapaUsuarios(store) {
        const m = {};
        for (const u of await store.todos('usuarios')) m[u.id] = u.nombre;
        return m;
    }

    async function abierto(store) {
        const turnos = await store.todos(COL);
        const ab = turnos.filter(t => t.estado === 'abierto').sort((a, b) => b.id - a.id);
        if (!ab.length) return null;
        const t = ab[0];
        const usuarios = await mapaUsuarios(store);
        return { ...t, abierto_por_nombre: usuarios[t.abierto_por] || null };
    }

    async function abrir(store, { usuario_id, fondo = 0 }) {
        if (await abierto(store)) throw new Error('Ya hay un turno de caja abierto.');
        const f = await store.insertar(COL, {
            abierto_por: usuario_id || null,
            abierto_en: new Date().toISOString(), dia: diaLocal(),
            fondo_inicial: Math.max(0, Number(fondo) || 0),
            cerrado_por: null, cerrado_en: null, conteo_efectivo: null,
            diferencia: null, nota: null, estado: 'abierto'
        });
        return f.id;
    }

    // Esperado en efectivo = fondo + efectivo recibido − cambio entregado.
    async function resumen(store, turno_id) {
        const turno = await store.obtener(COL, Number(turno_id));
        if (!turno) throw new Error('El turno no existe.');
        const usuarios = await mapaUsuarios(store);
        const ventas = (await store.todos('ventas'))
            .filter(v => Number(v.turno_id) === Number(turno_id) && v.estado === 'cobrada');
        const porMetodo = { efectivo: 0, tarjeta: 0, transferencia: 0 };
        let cambioTotal = 0;
        for (const v of ventas) {
            cambioTotal += Number(v.cambio) || 0;
            for (const p of (v.pagos || [])) {
                porMetodo[p.metodo] = (porMetodo[p.metodo] || 0) + (Number(p.monto) || 0);
            }
        }
        const fondo = Number(turno.fondo_inicial) || 0;
        return {
            turno: { ...turno,
                abierto_por_nombre: usuarios[turno.abierto_por] || null,
                cerrado_por_nombre: usuarios[turno.cerrado_por] || null },
            ventas_n: ventas.length,
            ventas_total: redondear(ventas.reduce((a, v) => a + (Number(v.total) || 0), 0)),
            porMetodo: {
                efectivo: redondear(porMetodo.efectivo),
                tarjeta: redondear(porMetodo.tarjeta),
                transferencia: redondear(porMetodo.transferencia)
            },
            fondo: redondear(fondo),
            esperado_efectivo: redondear(fondo + porMetodo.efectivo - cambioTotal)
        };
    }

    async function cerrar(store, { turno_id, usuario_id, conteo_efectivo, nota = null }) {
        const conteo = Number(conteo_efectivo);
        if (!Number.isFinite(conteo) || conteo < 0) throw new Error('Conteo no válido.');
        const turno = await store.obtener(COL, Number(turno_id));
        if (!turno) throw new Error('El turno no existe.');
        if (turno.estado !== 'abierto') throw new Error('El turno ya está cerrado.');
        const r = await resumen(store, turno_id);
        const diferencia = redondear(conteo - r.esperado_efectivo);
        await store.actualizar(COL, Number(turno_id), {
            estado: 'cerrado', cerrado_por: usuario_id || null,
            cerrado_en: new Date().toISOString(),
            conteo_efectivo: redondear(conteo), diferencia, nota: nota || null
        });
        return { ...r, conteo: redondear(conteo), diferencia };
    }

    async function historial(store, limite) {
        const n = Math.min(100, Math.max(1, parseInt(limite, 10) || 30));
        const usuarios = await mapaUsuarios(store);
        const ventas = await store.todos('ventas');
        const turnos = await store.todos(COL);
        return turnos.sort((a, b) => b.id - a.id).slice(0, n).map(t => {
            const vs = ventas.filter(v => Number(v.turno_id) === t.id && v.estado === 'cobrada');
            return { ...t,
                abierto_por_nombre: usuarios[t.abierto_por] || null,
                cerrado_por_nombre: usuarios[t.cerrado_por] || null,
                ventas_n: vs.length,
                ventas_total: redondear(vs.reduce((a, v) => a + (Number(v.total) || 0), 0)) };
        });
    }

    return { abierto, abrir, resumen, cerrar, historial, diaLocal, COL };
});
