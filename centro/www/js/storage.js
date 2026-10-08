// movil/www/js/storage.js — Backend de archivos con detección automática.
// En el teléfono usa Capacitor Filesystem (archivos JSON reales, texto plano).
// En el navegador (desarrollo/vista previa) usa localStorage o memoria.
// Interfaz: { nombre, read(path), write(path, texto), remove(path), list(prefijo), rename(de, a) }
(function (root, factory) {
    const mod = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = mod;
    else root.CFStorage = mod;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    function pluginFS() {
        try {
            const C = (typeof window !== 'undefined' && window.Capacitor) ||
                      (typeof globalThis !== 'undefined' && globalThis.Capacitor);
            return (C && C.Plugins && C.Plugins.Filesystem) || null;
        } catch (_) { return null; }
    }

    // Archivos reales dentro de los datos privados de la app (sin permisos extra).
    function backendCapacitor(FS) {
        const DIR = 'DATA';
        return {
            nombre: 'capacitor',
            async read(path) {
                try {
                    const r = await FS.readFile({ path, directory: DIR, encoding: 'utf8' });
                    return typeof r.data === 'string' ? r.data : null;
                } catch (_) { return null; }
            },
            async write(path, texto) {
                await FS.writeFile({ path, data: texto, directory: DIR, encoding: 'utf8', recursive: true });
            },
            async remove(path) {
                try { await FS.deleteFile({ path, directory: DIR }); } catch (_) { /* puede no existir */ }
            },
            async list(prefijo) {
                try {
                    const r = await FS.readdir({ path: '', directory: DIR });
                    return (r.files || []).map(f => (f && f.name) || f).filter(n => !prefijo || n.indexOf(prefijo) === 0);
                } catch (_) { return []; }
            },
            async rename(de, a) {
                await FS.rename({ from: de, to: a, directory: DIR, toDirectory: DIR });
            }
        };
    }

    // Solo desarrollo: imita archivos sobre localStorage (o memoria en Node/jest).
    function backendLocal() {
        let ls = null;
        try { ls = (typeof localStorage !== 'undefined') ? localStorage : null; } catch (_) { ls = null; }
        const mem = {};
        const K = p => 'cajafacil:file:' + p;
        return {
            nombre: ls ? 'navegador' : 'memoria',
            async read(path) {
                if (ls) return ls.getItem(K(path));
                return Object.prototype.hasOwnProperty.call(mem, path) ? mem[path] : null;
            },
            async write(path, texto) {
                if (ls) ls.setItem(K(path), texto);
                else mem[path] = texto;
            },
            async remove(path) {
                if (ls) ls.removeItem(K(path));
                else delete mem[path];
            },
            async list(prefijo) {
                const nombres = [];
                if (ls) {
                    for (let i = 0; i < ls.length; i++) {
                        const k = ls.key(i);
                        if (k && k.indexOf('cajafacil:file:') === 0) nombres.push(k.slice(15));
                    }
                } else {
                    for (const k of Object.keys(mem)) nombres.push(k);
                }
                return prefijo ? nombres.filter(n => n.indexOf(prefijo) === 0) : nombres;
            },
            async rename(de, a) {
                const v = await this.read(de);
                if (v === null) throw new Error('No existe: ' + de);
                await this.write(a, v);
                await this.remove(de);
            }
        };
    }

    function elegir() {
        const FS = pluginFS();
        return FS ? backendCapacitor(FS) : backendLocal();
    }

    return { elegir, backendCapacitor, backendLocal };
});
