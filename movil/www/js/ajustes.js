// movil/www/js/ajustes.js — Ajustes clave/valor (igual que la versión web).
(function (root, factory) {
    const mod = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = mod;
    else root.CFAjustes = mod;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const COL = 'ajustes';
    const DEFECTOS = {
        negocio_nombre: 'Mi Negocio',
        iva_pct: '16.00',
        ticket_pie: 'Gracias por su compra'
    };

    async function asegurar(store) {
        const actual = await todos(store);
        for (const k of Object.keys(DEFECTOS)) {
            if (!(k in actual)) await store.insertar(COL, { clave: k, valor: DEFECTOS[k] });
        }
    }

    async function get(store, clave, defecto) {
        const filas = await store.todos(COL);
        const f = filas.find(r => r.clave === clave);
        return f ? f.valor : (defecto !== undefined ? defecto : '');
    }

    async function set(store, clave, valor) {
        const filas = await store.todos(COL);
        const f = filas.find(r => r.clave === clave);
        if (f) await store.actualizar(COL, f.id, { valor: String(valor === null || valor === undefined ? '' : valor) });
        else await store.insertar(COL, { clave, valor: String(valor === null || valor === undefined ? '' : valor) });
    }

    async function ivaPct(store) {
        const v = Number(await get(store, 'iva_pct', '16'));
        return Number.isFinite(v) && v >= 0 ? v : 0;
    }

    async function todos(store) {
        const mapa = {};
        for (const f of await store.todos(COL)) mapa[f.clave] = f.valor;
        return mapa;
    }

    return { get, set, ivaPct, todos, asegurar, DEFECTOS, COL };
});
