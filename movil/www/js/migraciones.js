// movil/www/js/migraciones.js — Migraciones de esquema, versionadas e idempotentes.
// Se ejecutan al arrancar (antes de pedir el PIN). El ajuste 'mig_v' guarda la
// última migración aplicada: cada una corre una sola vez por equipo.
//  1: pieza (pza) → unidad (U) en productos, recetas, movimientos y ventas.
(function (root, factory) {
    const mod = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = mod;
    else root.CFMigraciones = mod;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const ACTUAL = 1;

    function mods() {
        if (typeof module !== 'undefined' && module.exports) return { Ajustes: require('./ajustes') };
        return { Ajustes: globalThis.CFAjustes };
    }

    async function mig1_pzaU(store) {
        let n = 0;
        for (const p of await store.todos('productos')) {
            let cambio = null;
            if (p.unidad === 'pza') cambio = { unidad: 'U' };
            if (Array.isArray(p.receta) && p.receta.some(l => l.unidad === 'pza')) {
                cambio = { ...(cambio || {}),
                    receta: p.receta.map(l => (l.unidad === 'pza' ? { ...l, unidad: 'U' } : l)) };
            }
            if (cambio) { await store.actualizar('productos', p.id, cambio); n++; }
        }
        for (const m of await store.todos('movimientos')) {
            const cambio = {};
            if (m.unidad === 'pza') cambio.unidad = 'U';
            if (m.unidad_origen === 'pza') cambio.unidad_origen = 'U';
            if (Object.keys(cambio).length) { await store.actualizar('movimientos', m.id, cambio); n++; }
        }
        for (const v of await store.todos('ventas')) {
            if (Array.isArray(v.detalles) && v.detalles.some(d => d.unidad === 'pza')) {
                await store.actualizar('ventas', v.id, {
                    detalles: v.detalles.map(d => (d.unidad === 'pza' ? { ...d, unidad: 'U' } : d)) });
                n++;
            }
        }
        return n;
    }

    async function migrar(store) {
        const { Ajustes } = mods();
        const actual = parseInt(await Ajustes.get(store, 'mig_v', '0'), 10) || 0;
        const aplicadas = [];
        if (actual < 1) { await mig1_pzaU(store); aplicadas.push(1); }
        if (aplicadas.length) await Ajustes.set(store, 'mig_v', String(ACTUAL));
        return { aplicadas };
    }

    return { migrar, ACTUAL };
});
