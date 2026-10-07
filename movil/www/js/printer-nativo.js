// movil/www/js/printer-nativo.js — Cliente JS del plugin NATIVO CajaFacilPrinter.
// M1 del dojo (Parte B): el Kotlin solo transporta bytes; el formato ESC/POS
// sigue viviendo en escpos.js. Misma taxonomía de errores que impresora.js.
//
// Destino CF: { transporte: 'bluetooth'|'usb'|'tcp', direccion, nombre }
//   bluetooth → { transport:'bluetooth', address: MAC }
//   usb       → { transport:'usb', vendorId, productId }
//   tcp       → { transport:'wifi', host, port }   (¡tcp se traduce a wifi!)
// El plugin rechaza con message=código; aquí se normaliza a Error .code.
(function (root, factory) {
    const mod = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = mod;
    else root.CFPrinterNativo = mod;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    let pluginForzado; // solo pruebas
    const TRANSPORTES = { bluetooth: 'bluetooth', usb: 'usb', tcp: 'wifi' };
    const TIMEOUT_MS = 15000;
    const MAX_TRABAJO_BYTES = 262144; // espejo de CajaFacilPrinter.MAX_JOB_BYTES (B.5 #6)

    const ERRORES = {
        unavailable: 'El equipo no tiene ese medio (sin Bluetooth ni USB).',
        not_found: 'Impresora no encontrada: revise que esté encendida y emparejada.',
        permission_denied: 'Permiso denegado: autorice el Bluetooth/USB para CajaFácil (si no vuelve a preguntar, abra Ajustes → Aplicaciones → CajaFácil → Permisos).',
        connect_failed: 'No se pudo conectar con la impresora.',
        write_failed: 'La impresión se interrumpió a la mitad.',
        timeout: 'La impresora no respondió a tiempo.',
        invalid_transport: 'Destino de impresión no válido.',
        invalid_data: 'Datos de impresión no válidos.'
    };

    function plugin() {
        if (pluginForzado !== undefined) return pluginForzado;
        try {
            const C = (typeof window !== 'undefined' && window.Capacitor) ||
                      (typeof globalThis !== 'undefined' && globalThis.Capacitor);
            return (C && C.Plugins && C.Plugins.CajaFacilPrinter) || null;
        } catch (_) { return null; }
    }

    function bytesABase64(bytes) {
        let bin = '';
        const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
        for (let i = 0; i < b.length; i += 8192) {
            bin += String.fromCharCode.apply(null, b.subarray(i, i + 8192));
        }
        if (typeof btoa !== 'undefined') return btoa(bin);
        return Buffer.from(bin, 'binary').toString('base64');
    }

    // El bridge entrega el código en message (call.retorno(código)).
    // Se normaliza a Error con .code para que impresora.js traduzca igual.
    function normalizarError(e) {
        const code = e && (e.code || e.message);
        if (code && ERRORES[code]) {
            const err = new Error(ERRORES[code]);
            err.code = code;
            return err;
        }
        return e instanceof Error ? e : new Error((e && e.message) || 'No se pudo imprimir.');
    }

    function destinoAObjetivo(dest) {
        if (!dest || !dest.transporte || !dest.direccion) throw new Error('Destino de impresión incompleto.');
        const t = TRANSPORTES[dest.transporte];
        if (!t) throw new Error('Transporte no válido.');
        if (t === 'bluetooth') return { transport: t, address: dest.direccion };
        if (t === 'usb') {
            const m = String(dest.direccion).split(':');
            if (m.length !== 2 || !Number(m[0]) || !Number(m[1])) throw new Error('USB no válido (vendorId:productId).');
            return { transport: t, vendorId: Number(m[0]), productId: Number(m[1]) };
        }
        const i = String(dest.direccion).lastIndexOf(':');
        const host = i > 0 ? dest.direccion.slice(0, i) : dest.direccion;
        const port = i > 0 ? Number(dest.direccion.slice(i + 1)) : 9100;
        if (!host) throw new Error('IP no válida.');
        return { transport: t, host, port };
    }

    async function listar(transporte) {
        const P = plugin();
        if (!P) throw new Error('Impresión no disponible en este equipo.');
        const t = TRANSPORTES[transporte];
        if (!t) throw new Error('Transporte no válido.');
        let r;
        try {
            r = await P.list({ transport: t });
        } catch (e) { throw normalizarError(e); }
        // wifi → [] en M1 (sin descubrimiento; la app guarda las últimas usadas)
        return (r.devices || []).map(d => {
            if (t === 'bluetooth') {
                return { transporte, direccion: d.address, nombre: d.name || d.address };
            }
            return { transporte, direccion: `${d.vendorId}:${d.productId}`,
                     nombre: d.name || `USB ${d.vendorId}:${d.productId}` };
        });
    }

    async function pedirPermiso(dest) {
        const P = plugin();
        if (!P) throw new Error('Impresión no disponible en este equipo.');
        const t = TRANSPORTES[dest && dest.transporte];
        if (!t) throw new Error('Transporte no válido.');
        if (t === 'bluetooth') {
            let r;
            try {
                r = await P.solicitarPermiso({ transport: 'bluetooth' });
            } catch (e) { throw normalizarError(e); }
            if (!r || r.granted === false) {
                const e = new Error(ERRORES.permission_denied);
                e.code = 'permission_denied';
                throw e;
            }
        }
        return true; // usb pregunta al imprimir; wifi no pide nada
    }

    async function imprimir(dest, bytes, timeoutMs) {
        const P = plugin();
        if (!P) throw new Error('Impresión no disponible en este equipo.');
        const obj = destinoAObjetivo(dest);
        const buf = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
        // B.5 #6: rechazo client-side, sin cruzar el bridge (1 MB en base64 ≈ 1.4 MB de ida).
        if (buf.length === 0 || buf.length > MAX_TRABAJO_BYTES) {
            const e = new Error(ERRORES.invalid_data);
            e.code = 'invalid_data';
            throw e;
        }
        try {
            const r = await P.print({ ...obj, data: bytesABase64(buf), timeoutMs: timeoutMs || TIMEOUT_MS });
            return { bytes: r.bytes, ms: r.ms };
        } catch (e) { throw normalizarError(e); }
    }

    async function estado() {
        const P = plugin();
        if (!P) throw new Error('Impresión no disponible en este equipo.');
        try {
            return await P.status();
        } catch (e) { throw normalizarError(e); }
    }

    return { disponible: () => !!plugin(), listar, pedirPermiso, imprimir, estado,
             destinoAObjetivo, bytesABase64,
             _usarPlugin: p => { pluginForzado = p; },
             _limpiarPlugin: () => { pluginForzado = undefined; } };
});
