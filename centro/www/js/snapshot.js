// centro/www/js/snapshot.js — Copia local (JSON) del centro, para consultar offline.
// Se guarda con el mismo store de la app (colección 'centro_snapshot', un solo doc).
// La búsqueda local replica la del servidor: substring en código/nombre,
// comparación exacta de código ordenada por precio.
(function (root, factory) {
    const mod = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = mod;
    else root.CFSnapshot = mod;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const COL = 'centro_snapshot';

    function validar(snap) {
        if (!snap || typeof snap !== 'object') throw new Error('Snapshot vacío.');
        if (!Array.isArray(snap.negocios) || !Array.isArray(snap.productos)) {
            throw new Error('Snapshot incompleto.');
        }
    }

    async function guardar(store, snap) {
        validar(snap);
        const doc = {
            version: Number(snap.version) || 0,
            exportado_en: snap.exportado_en || null,
            guardado_en: new Date().toISOString(),
            negocios: snap.negocios,
            productos: snap.productos,
        };
        const prev = await store.todos(COL);
        if (prev.length) await store.actualizar(COL, prev[0].id, doc);
        else await store.insertar(COL, doc);
        return { version: doc.version, negocios: doc.negocios.length, productos: doc.productos.length };
    }

    async function leer(store) {
        const filas = await store.todos(COL);
        return filas.length ? filas[0] : null;
    }

    async function estado(store) {
        const s = await leer(store);
        if (!s) return null;
        return {
            version: s.version, exportado_en: s.exportado_en, guardado_en: s.guardado_en,
            negocios: s.negocios.length, productos: s.productos.length,
        };
    }

    function norm(s) { return String(s == null ? '' : s).trim().toLowerCase(); }

    async function buscar(store, q, opts) {
        const s = await leer(store);
        if (!s) return [];
        const texto = norm(q);
        const neg = opts && opts.negocio;
        let lista = s.productos;
        if (neg) lista = lista.filter(p => p.negocio_id === neg);
        if (texto) {
            lista = lista.filter(p => norm(p.codigo).includes(texto) || norm(p.nombre).includes(texto));
        }
        const limite = Math.min(Math.max((opts && opts.limite) || 50, 1), 200);
        return lista.slice(0, limite);
    }

    async function precios(store, codigo) {
        const s = await leer(store);
        if (!s) return [];
        const c = norm(codigo);
        if (!c) return [];
        return s.productos
            .filter(p => norm(p.codigo) === c)
            .sort((a, b) => a.precio - b.precio);
    }

    async function negocios(store) {
        const s = await leer(store);
        return s ? s.negocios : [];
    }

    return { guardar, leer, estado, buscar, precios, negocios };
});
