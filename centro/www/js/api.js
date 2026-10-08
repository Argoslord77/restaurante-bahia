// centro/www/js/api.js — Cliente HTTP del Centro de Productos y Precios.
// Uso: const api = CFAPI.crear({ base: 'http://servidor:3101', key: '...' });
// Cada método lanza Error con .code: 'RED' | 'SERVIDOR' | 'NO_AUTORIZADO' | 'DATOS'.
(function (root, factory) {
    const mod = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = mod;
    else root.CFAPI = mod;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const MS = 12000;

    function crear(opts) {
        const base = String((opts && opts.base) || '').replace(/\/+$/, '');
        const key = (opts && opts.key) || null;
        const hazFetch = (opts && opts.fetchImpl) ||
            (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : null);
        if (!base) throw new Error('Falta la dirección del servidor.');
        if (!hazFetch) throw new Error('Sin fetch disponible.');

        function fallo(code, mensaje) {
            const e = new Error(mensaje);
            e.code = code;
            return e;
        }

        async function pedir(metodo, ruta, cuerpo) {
            const ctrl = new AbortController();
            const t = setTimeout(() => ctrl.abort(), MS);
            let r;
            try {
                r = await hazFetch(base + ruta, {
                    method: metodo,
                    signal: ctrl.signal,
                    headers: {
                        'Content-Type': 'application/json',
                        ...(key ? { 'X-API-Key': key } : {}),
                    },
                    ...(cuerpo !== undefined ? { body: JSON.stringify(cuerpo) } : {}),
                });
            } catch (e) {
                throw fallo('RED', 'No se pudo contactar el servidor. Revise la conexión.');
            } finally {
                clearTimeout(t);
            }
            let j = null;
            try { j = await r.json(); } catch (_) { /* cuerpo no-JSON */ }
            if (r.status === 403) throw fallo('NO_AUTORIZADO', (j && j.error) || 'API key no válida.');
            if (r.status === 404 && ruta.indexOf('/api/') === 0) {
                throw fallo('DATOS', (j && j.error) || 'No encontrado.');
            }
            if (!r.ok || !j || j.ok === false) {
                throw fallo('SERVIDOR', (j && j.error) || `El servidor respondió ${r.status}.`);
            }
            return j;
        }

        return {
            base,
            salud: () => pedir('GET', '/salud'),
            registrarNegocio: (nombre, contacto) =>
                pedir('POST', '/api/v1/negocios', { nombre, contacto }),
            negocios: () => pedir('GET', '/api/v1/negocios'),
            publicar: (negocioId, productos) =>
                pedir('PUT', `/api/v1/negocios/${negocioId}/productos`, { productos }),
            buscar: (q, opts) => {
                const p = new URLSearchParams({ q: q || '' });
                if (opts && opts.negocio) p.set('negocio', opts.negocio);
                if (opts && opts.limite) p.set('limite', String(opts.limite));
                return pedir('GET', '/api/v1/productos?' + p.toString());
            },
            precios: codigo => pedir('GET', '/api/v1/precios/' + encodeURIComponent(codigo)),
            snapshot: () => pedir('GET', '/api/v1/snapshot'),
        };
    }

    // Lee base/key de los ajustes y crea el cliente.
    async function desdeAjustes(store) {
        const Ajustes = (typeof module !== 'undefined' && module.exports)
            ? require('./ajustes') : globalThis.CFAjustes;
        const base = await Ajustes.get(store, 'centro_base', '');
        const key = await Ajustes.get(store, 'centro_key', '');
        return crear({ base, key: key || null });
    }

    return { crear, desdeAjustes };
});
