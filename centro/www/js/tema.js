// movil/www/js/tema.js — Alternancia Ónix (oscuro) / Blanco (claro empresarial).
// Las dos <link> viven en index.html; solo una está habilitada a la vez.
// El ajuste persiste en el almacén ('tema'); un espejo en localStorage permite
// aplicar el tema ANTES del primer pintado (este script va en <head> y se
// auto-ejecuta al cargar: cero flashazo para quien usa Blanco).
(function (root, factory) {
    const mod = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = mod;
    else { root.CFTema = mod; mod.prePintar(); }
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const TEMAS = {
        onix: { css: 'css-onix', color: '#0b0f19' },
        blanco: { css: 'css-blanco', color: '#f1f4f9' }
    };
    const CLAVE = 'tema';
    const ESPEJO = 'cf-tema';

    function mods() {
        if (typeof module !== 'undefined' && module.exports) return { Ajustes: require('./ajustes') };
        return { Ajustes: globalThis.CFAjustes };
    }
    function doc() {
        try { return (typeof document !== 'undefined') ? document : null; }
        catch (_) { return null; }
    }
    function memoria() {
        try { return (typeof localStorage !== 'undefined') ? localStorage : null; }
        catch (_) { return null; }
    }
    function normalizar(nombre) {
        return (nombre === 'blanco' || nombre === 'onix') ? nombre : 'onix';
    }

    // Aplica el tema al DOM. Nunca lanza (un tema roto no puede tumbar la app).
    function aplicar(d, nombre) {
        const t = normalizar(nombre);
        try {
            const root = d || doc();
            if (!root) return t;
            for (const k of Object.keys(TEMAS)) {
                const link = root.getElementById ? root.getElementById(TEMAS[k].css) : null;
                if (link) link.disabled = (k !== t);
            }
            const meta = root.querySelector ? root.querySelector('meta[name="theme-color"]') : null;
            if (meta && meta.setAttribute) meta.setAttribute('content', TEMAS[t].color);
        } catch (_) { /* tema best-effort */ }
        return t;
    }

    function espejar(nombre, mem) {
        try {
            const m = mem || memoria();
            if (m && m.setItem) m.setItem(ESPEJO, normalizar(nombre));
        } catch (_) { /* espejo best-effort */ }
    }
    function espejo(mem) {
        try {
            const m = mem || memoria();
            return normalizar(m && m.getItem ? m.getItem(ESPEJO) : null);
        } catch (_) { return 'onix'; }
    }

    async function leer(store) {
        const { Ajustes } = mods();
        return normalizar(await Ajustes.get(store, CLAVE, 'onix'));
    }
    async function guardar(store, nombre) {
        const t = normalizar(nombre);
        const { Ajustes } = mods();
        await Ajustes.set(store, CLAVE, t);
        espejar(t);
        return t;
    }
    // Arranque: el almacén manda, el espejo se re-sincroniza, el DOM se aplica.
    async function sincronizar(store, d) {
        const t = await leer(store);
        espejar(t);
        return aplicar(d, t);
    }
    // nombre explícito (botones) o flip si se omite. Retorna el tema aplicado.
    async function alternar(store, d, nombre) {
        const actual = await leer(store);
        const t = (nombre === undefined) ? (actual === 'onix' ? 'blanco' : 'onix') : normalizar(nombre);
        await guardar(store, t);
        return aplicar(d, t);
    }
    // Pre-pintado síncrono desde el espejo (antes de que exista el almacén).
    function prePintar(d, mem) {
        return aplicar(d || doc(), espejo(mem));
    }

    return { TEMAS: Object.keys(TEMAS), ESPEJO, normalizar, aplicar, leer, guardar,
             alternar, sincronizar, espejar, espejo, prePintar };
});
