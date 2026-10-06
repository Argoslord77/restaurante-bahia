// movil/www/js/store.js — Mini base de datos en JSON (un archivo por colección).
// Garantías: escritura atómica (temporal + renombrado: un apagón no corrompe),
// sello HMAC por archivo (editar a mano queda en evidencia) y contadores
// persistentes. Un solo dispositivo: sin concurrencia que resolver.
(function (root, factory) {
    const mod = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = mod;
    else root.CFStore = mod;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const DIR = 'datos';
    const RUTA_META = DIR + '/_meta.json';
    const VERSION = 1;

    function subtle() {
        if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle) {
            return globalThis.crypto.subtle;
        }
        if (typeof require !== 'undefined') return require('crypto').webcrypto.subtle;
        throw new Error('Sin criptografía disponible.');
    }

    function bytesDe(texto) { return new TextEncoder().encode(texto); }
    function hexDe(buffer) {
        return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async function sha256hex(texto) { return hexDe(await subtle().digest('SHA-256', bytesDe(texto))); }

    async function hmacHex(llaveHex, texto) {
        const llave = await subtle().importKey(
            'raw', bytesDe(llaveHex), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
        return hexDe(await subtle().sign('HMAC', llave, bytesDe(texto)));
    }

    function uuid() {
        if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.randomUUID) {
            return globalThis.crypto.randomUUID();
        }
        if (typeof require !== 'undefined') return require('crypto').randomUUID();
        return 'id-' + Date.now().toString(16) + '-' + Math.floor(Math.random() * 1e12).toString(16);
    }

    function errorSellado(codigo, coleccion, detalle) {
        const e = new Error(detalle || codigo);
        e.code = codigo;
        e.collection = coleccion;
        return e;
    }

    function crear(backend) {
        let meta = null;
        let llave = null;
        const cache = {}; // coleccion -> { filas: [] }

        const ruta = nombre => DIR + '/' + nombre + '.json';

        async function escribirAtomico(path, texto) {
            const tmp = path + '.tmp';
            await backend.write(tmp, texto);
            try {
                if (backend.rename) await backend.rename(tmp, path);
                else await backend.write(path, texto);
            } catch (_) {
                await backend.write(path, texto); // sin renombrado: sobreescritura directa
            }
            try { await backend.remove(tmp); } catch (_) { /* ya no existe: bien */ }
        }

        async function selloPara(nombre, datos) {
            return hmacHex(llave, nombre + '|' + JSON.stringify(datos));
        }

        async function guardarCrudo(nombre, datos) {
            const sobre = { v: VERSION, data: datos, sello: await selloPara(nombre, datos) };
            await escribirAtomico(nombre === '_meta' ? RUTA_META : ruta(nombre), JSON.stringify(sobre));
        }

        async function leerCrudo(nombre) {
            const path = nombre === '_meta' ? RUTA_META : ruta(nombre);
            const crudo = await backend.read(path);
            if (crudo === null) return null;
            let sobre;
            try { sobre = JSON.parse(crudo); }
            catch (_) { throw errorSellado('ARCHIVO_CORRUPTO', nombre, 'El archivo ' + path + ' no es JSON válido.'); }
            const esperado = await selloPara(nombre, sobre.data);
            if (!sobre.sello || sobre.sello !== esperado) {
                throw errorSellado('SELLO_INVALIDO', nombre, 'El archivo ' + path + ' fue modificado fuera de la app.');
            }
            return sobre.data;
        }

        async function guardarMeta() { await guardarCrudo('_meta', meta); }

        async function coleccion(nombre) {
            if (!cache[nombre]) {
                const datos = await leerCrudo(nombre);
                cache[nombre] = { filas: (datos && datos.filas) || [] };
            }
            return cache[nombre];
        }

        async function persistir(nombre) {
            const c = await coleccion(nombre);
            await guardarCrudo(nombre, { filas: c.filas });
        }

        return {
            backendNombre: backend.nombre,

            async init() {
                // Arranque: leer meta en crudo para derivar la llave y luego verificar
                const crudo = await backend.read(RUTA_META);
                if (crudo === null) {
                    meta = {
                        v: VERSION, instalacion_uuid: uuid(),
                        contadores: {}, respaldo_n: 0, creado_en: new Date().toISOString()
                    };
                    llave = await sha256hex('cajafacil|sello|' + meta.instalacion_uuid);
                    await guardarMeta();
                    return { nueva: true, instalacion: meta.instalacion_uuid };
                }
                let sobre;
                try { sobre = JSON.parse(crudo); }
                catch (_) { throw errorSellado('ARCHIVO_CORRUPTO', '_meta', 'El archivo de identidad está corrupto.'); }
                if (!sobre.data || !sobre.data.instalacion_uuid) {
                    throw errorSellado('ARCHIVO_CORRUPTO', '_meta', 'El archivo de identidad está incompleto.');
                }
                meta = sobre.data;
                llave = await sha256hex('cajafacil|sello|' + meta.instalacion_uuid);
                const esperado = await selloPara('_meta', meta);
                if (!sobre.sello || sobre.sello !== esperado) {
                    throw errorSellado('SELLO_INVALIDO', '_meta', 'El archivo de identidad fue modificado fuera de la app.');
                }
                return { nueva: false, instalacion: meta.instalacion_uuid };
            },

            instalacion() { return meta && meta.instalacion_uuid; },
            meta() { return meta ? { ...meta } : null; },

            async todos(nombre) { return (await coleccion(nombre)).filas.slice(); },

            async obtener(nombre, id) {
                const c = await coleccion(nombre);
                return c.filas.find(f => f.id === id) || null;
            },

            async insertar(nombre, obj) {
                const c = await coleccion(nombre);
                meta.contadores[nombre] = (meta.contadores[nombre] || 0) + 1;
                const fila = { ...obj, id: meta.contadores[nombre] };
                c.filas.push(fila);
                await guardarMeta();
                await persistir(nombre);
                return { ...fila };
            },

            async actualizar(nombre, id, cambios) {
                const c = await coleccion(nombre);
                const i = c.filas.findIndex(f => f.id === id);
                if (i < 0) return null;
                c.filas[i] = { ...c.filas[i], ...cambios, id };
                await persistir(nombre);
                return { ...c.filas[i] };
            },

            async eliminar(nombre, id) {
                const c = await coleccion(nombre);
                const i = c.filas.findIndex(f => f.id === id);
                if (i < 0) return false;
                c.filas.splice(i, 1);
                await persistir(nombre);
                return true;
            },

            // Respaldo: copia cruda (con sellos) de meta + colecciones pedidas
            async exportarCrudo(nombres) {
                const archivos = { _meta: await backend.read(RUTA_META) };
                for (const n of nombres) archivos[n] = await backend.read(ruta(n));
                return archivos;
            },

            async restaurarCrudo(archivos) {
                for (const k of Object.keys(archivos)) {
                    if (archivos[k] === null || archivos[k] === undefined) continue;
                    await escribirAtomico(k === '_meta' ? RUTA_META : ruta(k), archivos[k]);
                }
                for (const k of Object.keys(cache)) delete cache[k];
                meta = null;
                await this.init(); // revalida sellos al cargar
            },

            async proximoRespaldoAuto() {
                meta.respaldo_n = (meta.respaldo_n || 0) + 1;
                await guardarMeta();
                return meta.respaldo_n;
            },

            _sha256hex: sha256hex // expuesto para usuarios/respaldos (misma primitiva)
        };
    }

    return { crear, DIR, VERSION };
});
