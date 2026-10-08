// movil/www/js/backup.js — Respaldos en un solo JSON portátil.
// El tendero se lo manda por WhatsApp/correo y lo restaura donde sea.
// El paquete lleva suma de verificación: un respaldo alterado se rechaza.
(function (root, factory) {
    const mod = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = mod;
    else root.CFBackup = mod;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const APP = 'cajafacil-movil';
    const V = 1;
    const COLECCIONES = ['usuarios', 'categorias', 'productos', 'turnos', 'ventas',
                         'movimientos', 'caja_movimientos', 'ajustes', 'licencia_eventos', 'fusiones'];
    const AUTOS = 7; // respaldos automáticos rotativos

    const selloPaquete = (store, datos) =>
        store._sha256hex(APP + '|respaldo|' + JSON.stringify(datos));

    async function generar(store) {
        const archivos = await store.exportarCrudo(COLECCIONES);
        const datos = { archivos, meta: store.meta() };
        return {
            app: APP, v: V,
            exportado_en: new Date().toISOString(),
            instalacion: store.instalacion(),
            datos,
            suma: await selloPaquete(store, datos)
        };
    }

    async function validar(store, paquete) {
        if (!paquete || paquete.app !== APP || paquete.v !== V) {
            throw new Error('No es un respaldo de CajaFácil móvil.');
        }
        const suma = await selloPaquete(store, paquete.datos);
        if (suma !== paquete.suma) throw new Error('El respaldo fue alterado: se rechaza.');
        if (!paquete.datos || !paquete.datos.archivos || !paquete.datos.archivos._meta) {
            throw new Error('El respaldo está incompleto.');
        }
        return true;
    }

    async function restaurar(store, paquete) {
        await validar(store, paquete);
        await store.restaurarCrudo({ ...paquete.datos.archivos });
        return true;
    }

    function nombreArchivo(fecha) {
        const f = fecha || new Date();
        const p = n => String(n).padStart(2, '0');
        return `cajafacil-respaldo-${f.getFullYear()}${p(f.getMonth() + 1)}${p(f.getDate())}` +
               `-${p(f.getHours())}${p(f.getMinutes())}.json`;
    }

    // Comparte el texto: plugin Share en el teléfono, descarga en el navegador.
    async function compartir(texto, nombre) {
        try {
            const C = (typeof window !== 'undefined' && window.Capacitor) ||
                      (typeof globalThis !== 'undefined' && globalThis.Capacitor);
            const Share = C && C.Plugins && C.Plugins.Share;
            const FS = C && C.Plugins && C.Plugins.Filesystem;
            if (Share && FS) {
                await FS.writeFile({ path: nombre, data: texto, directory: 'CACHE', encoding: 'utf8' });
                const uri = await FS.getUri({ path: nombre, directory: 'CACHE' });
                await Share.share({ title: 'Respaldo CajaFácil', url: uri.uri, dialogTitle: 'Enviar respaldo' });
                return 'share';
            }
        } catch (_) { /* cae al plan B */ }
        const blob = new Blob([texto], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = nombre;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
        return 'descarga';
    }

    // Comparte texto plano (WhatsApp, correo…): Share en el teléfono,
    // descarga .txt en el navegador.
    async function compartirTexto(texto, nombre, titulo) {
        try {
            const C = (typeof window !== 'undefined' && window.Capacitor) ||
                      (typeof globalThis !== 'undefined' && globalThis.Capacitor);
            const Share = C && C.Plugins && C.Plugins.Share;
            if (Share) {
                await Share.share({ title: titulo || 'CajaFácil', text: texto,
                                    dialogTitle: titulo || 'Compartir' });
                return 'share';
            }
        } catch (_) { /* cae al plan B */ }
        const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = nombre || 'cajafacil.txt';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
        return 'descarga';
    }

    return { generar, validar, restaurar, compartir, compartirTexto, nombreArchivo, COLECCIONES, AUTOS, APP };
});
