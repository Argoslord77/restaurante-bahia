// movil/www/js/caja.js — Turnos de caja (Fase 2).
// Suma movimientos de efectivo del turno (retiros/entradas con motivo), que el
// arqueo toma en cuenta: esperado = fondo + efectivo − cambio + entradas − retiros.
(function (root, factory) {
    const mod = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = mod;
    else root.CFCaja = mod;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const COL = 'turnos';
    const COL_MOV = 'caja_movimientos';
    const TIPOS_MOV = ['retiro', 'entrada'];
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

    async function movimientos(store, turno_id) {
        const usuarios = await mapaUsuarios(store);
        return (await store.todos(COL_MOV))
            .filter(m => Number(m.turno_id) === Number(turno_id))
            .sort((a, b) => a.id - b.id)
            .map(m => ({ ...m, usuario_nombre: usuarios[m.usuario_id] || null }));
    }

    async function registrarMovimiento(store, { turno_id, usuario_id, tipo, monto, motivo = null }) {
        const tid = parseInt(turno_id, 10);
        if (!Number.isInteger(tid) || tid <= 0) throw new Error('Turno no válido.');
        if (!TIPOS_MOV.includes(tipo)) throw new Error('Tipo de movimiento no válido.');
        const cantidad = redondear(monto);
        if (!(cantidad > 0)) throw new Error('El monto debe ser mayor a 0.');
        const turno = await store.obtener(COL, tid);
        if (!turno) throw new Error('El turno no existe.');
        if (turno.estado !== 'abierto') throw new Error('El turno ya está cerrado.');
        if (tipo === 'retiro') {
            const r = await resumen(store, tid);
            if (cantidad - r.esperado_efectivo > 1e-9) {
                throw new Error(`El retiro supera el efectivo en caja ($${r.esperado_efectivo.toFixed(2)}).`);
            }
        }
        const f = await store.insertar(COL_MOV, {
            turno_id: tid, tipo, monto: cantidad, motivo: motivo || null,
            usuario_id: usuario_id || null, creado_en: new Date().toISOString(), dia: diaLocal()
        });
        return f.id;
    }

    // Esperado en efectivo = fondo + efectivo recibido − cambio − retiros + entradas.
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
        const movs = await movimientos(store, turno_id);
        const entradas = redondear(movs.filter(m => m.tipo === 'entrada').reduce((a, m) => a + (Number(m.monto) || 0), 0));
        const retiros = redondear(movs.filter(m => m.tipo === 'retiro').reduce((a, m) => a + (Number(m.monto) || 0), 0));
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
            entradas, retiros, movimientos: movs,
            esperado_efectivo: redondear(fondo + porMetodo.efectivo - cambioTotal + entradas - retiros)
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
        const movs = await store.todos(COL_MOV);
        const turnos = await store.todos(COL);
        return turnos.sort((a, b) => b.id - a.id).slice(0, n).map(t => {
            const vs = ventas.filter(v => Number(v.turno_id) === t.id && v.estado === 'cobrada');
            const ms = movs.filter(m => Number(m.turno_id) === t.id);
            return { ...t,
                abierto_por_nombre: usuarios[t.abierto_por] || null,
                cerrado_por_nombre: usuarios[t.cerrado_por] || null,
                ventas_n: vs.length,
                ventas_total: redondear(vs.reduce((a, v) => a + (Number(v.total) || 0), 0)),
                entradas: redondear(ms.filter(m => m.tipo === 'entrada').reduce((a, m) => a + (Number(m.monto) || 0), 0)),
                retiros: redondear(ms.filter(m => m.tipo === 'retiro').reduce((a, m) => a + (Number(m.monto) || 0), 0)) };
        });
    }

    return { abierto, abrir, resumen, cerrar, historial, movimientos, registrarMovimiento,
             diaLocal, TIPOS_MOV, COL, COL_MOV };
});
