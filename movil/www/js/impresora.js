// movil/www/js/impresora.js — Impresión térmica vía plugin ThermalPrinter
// (@devlas/capacitor-thermal-printer): Bluetooth SPP, USB OTG y TCP/WiFi.
// La app codifica el ticket (CFEscpos) y el plugin solo transporta bytes.
// Destino: { transporte: 'bluetooth'|'usb'|'tcp', direccion, nombre }
//   bluetooth → direccion = MAC 'AA:BB:CC:DD:EE:FF'
//   usb       → direccion = 'vendorId:productId'
//   tcp       → direccion = 'host:puerto'
(function (root, factory) {
    const mod = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = mod;
    else root.CFImpresora = mod;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    let pluginForzado; // solo pruebas

    function plugin() {
        if (pluginForzado !== undefined) return pluginForzado;
        try {
            const C = (typeof window !== 'undefined' && window.Capacitor) ||
                      (typeof globalThis !== 'undefined' && globalThis.Capacitor);
            return (C && C.Plugins && C.Plugins.ThermalPrinter) || null;
        } catch (_) { return null; }
    }

    let nativoForzado; // solo pruebas: mock del MODULO nativo (no del plugin crudo)
    function nativoMod() {
        if (nativoForzado !== undefined) return nativoForzado;
        const { PrinterNativo } = mods();
        return (PrinterNativo && PrinterNativo.disponible()) ? PrinterNativo : null;
    }
    // Seleccion de via - REGLA DE ELITE: fallback por AUSENCIA, jamas por error.
    // Si el nativo existe, sus errores se reportan, no se reintentan en el otro
    // driver: reintentar a ciegas puede imprimir el ticket DOS veces.
    // El gancho _usarPlugin (forzado, incluso null) siempre gana: simula ausencia.
    function resolver() {
        if (pluginForzado !== undefined) {
            const P = plugin();
            if (!P) throw new Error('Impresión no disponible en este equipo.');
            return { via: 'viejo', api: P };
        }
        const N = nativoMod();
        if (N) return { via: 'nativo', api: N };
        const P = plugin();
        if (!P) throw new Error('Impresión no disponible en este equipo.');
        return { via: 'viejo', api: P };
    }
    function mods() {
        if (typeof module !== 'undefined' && module.exports) {
            return { Reportes: require('./reportes'), Escpos: require('./escpos'), Ajustes: require('./ajustes'), PrinterNativo: require('./printer-nativo') };
        }
        return { Reportes: globalThis.CFReportes, Escpos: globalThis.CFEscpos, Ajustes: globalThis.CFAjustes, PrinterNativo: globalThis.CFPrinterNativo };
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

    const ERRORES = {
        unavailable: 'El equipo no tiene ese medio (sin Bluetooth ni USB).',
        not_found: 'Impresora no encontrada: revise que esté encendida y emparejada.',
        permission_denied: 'Permiso denegado: autorice el Bluetooth/USB para CajaFácil (si no vuelve a preguntar, abra Ajustes → Aplicaciones → CajaFácil → Permisos).',
        connect_failed: 'No se pudo conectar con la impresora.',
        write_failed: 'La impresión se interrumpió a la mitad.',
        invalid_transport: 'Destino de impresión no válido.',
        invalid_data: 'Datos de impresión no válidos.',
        timeout: 'La impresora no respondió a tiempo.'
    };

    function traducirError(e) {
        const codigo = e && (e.code || e.codigo);
        if (codigo && ERRORES[codigo]) return ERRORES[codigo];
        return (e && e.message) || 'No se pudo imprimir.';
    }

    function destinoAObjetivo(dest) {
        if (!dest || !dest.transporte || !dest.direccion) throw new Error('Destino de impresión incompleto.');
        if (dest.transporte === 'bluetooth') return { transport: 'bluetooth', address: dest.direccion };
        if (dest.transporte === 'usb') {
            const m = String(dest.direccion).split(':');
            if (m.length !== 2 || !Number(m[0]) || !Number(m[1])) throw new Error('USB no válido (vendorId:productId).');
            return { transport: 'usb', vendorId: Number(m[0]), productId: Number(m[1]) };
        }
        if (dest.transporte === 'tcp') {
            const i = String(dest.direccion).lastIndexOf(':');
            const host = i > 0 ? dest.direccion.slice(0, i) : dest.direccion;
            const port = i > 0 ? Number(dest.direccion.slice(i + 1)) : 9100;
            if (!host) throw new Error('IP no válida.');
            return { transport: 'tcp', host, port };
        }
        throw new Error('Transporte no válido.');
    }

    async function listar(transporte) {
        const { via, api } = resolver();
        if (via === 'nativo') return api.listar(transporte);
        const r = await api.list({ transport: transporte });
        return (r.devices || []).map(d => {
            if (transporte === 'bluetooth') {
                return { transporte, direccion: d.address, nombre: d.name || d.address };
            }
            return { transporte, direccion: `${d.vendorId}:${d.productId}`,
                     nombre: d.name || `USB ${d.vendorId}:${d.productId}` };
        });
    }

    async function pedirPermiso(dest) {
        const { via, api } = resolver();
        if (via === 'nativo') return api.pedirPermiso(dest);
        const r = await api.requestPermission(destinoAObjetivo(dest));
        if (r && r.granted === false) throw new Error('Permiso denegado.');
        return true;
    }

    // Vía nativa: expone {bytes, ms} del plugin (B.5 #9 se mide con esto).
    // Vía vieja: el plugin no reporta métricas → true como antes.
    async function imprimir(dest, bytes) {
        const { via, api } = resolver();
        try {
            if (via === 'nativo') return await api.imprimir(dest, bytes);
            await api.print({ ...destinoAObjetivo(dest), data: bytesABase64(bytes) });
        } catch (e) {
            throw new Error(traducirError(e));
        }
        return true;
    }

    async function leerDefecto(store) {
        const { Ajustes } = mods();
        const transporte = await Ajustes.get(store, 'impresora_transporte', '');
        const direccion = await Ajustes.get(store, 'impresora_dir', '');
        const nombre = await Ajustes.get(store, 'impresora_nombre', '');
        if (!transporte || !direccion) return null;
        return { transporte, direccion, nombre: nombre || direccion };
    }

    async function guardarDefecto(store, dest) {
        const { Ajustes } = mods();
        await Ajustes.set(store, 'impresora_transporte', dest.transporte);
        await Ajustes.set(store, 'impresora_dir', dest.direccion);
        await Ajustes.set(store, 'impresora_nombre', dest.nombre || dest.direccion);
    }

    async function quitarDefecto(store) {
        const { Ajustes } = mods();
        await Ajustes.set(store, 'impresora_transporte', '');
        await Ajustes.set(store, 'impresora_dir', '');
        await Ajustes.set(store, 'impresora_nombre', '');
    }

    async function imprimirTicket(store, ventaId) {
        const { Reportes, Escpos } = mods();
        const dest = await leerDefecto(store);
        if (!dest) {
            const e = new Error('Sin impresora configurada.');
            e.code = 'SIN_IMPRESORA';
            throw e;
        }
        const t = await Reportes.ticket(store, ventaId);
        if (!t) throw new Error('La venta no existe.');
        await imprimir(dest, Escpos.ticketBytes(t));
        return true;
    }

    async function prueba(store) {
        const { Escpos } = mods();
        const dest = await leerDefecto(store);
        if (!dest) throw new Error('Sin impresora configurada.');
        const E = Escpos;
        const bytes = E.concat(
            E.init(), E.codepage(), E.align('c'), E.negrita(true),
            E.texto('CajaFacil'), E.negrita(false),
            E.texto('Prueba de impresion'), E.texto('Español: áéíóú ñ ¡! ¿?'),
            E.separador('-'), E.texto(E.fila2col('TOTAL', '$123.45')),
            E.linea(3), E.cortar());
        return await imprimir(dest, bytes);
    }

    function disponible() {
        if (pluginForzado !== undefined) return !!plugin();
        return !!nativoMod() || !!plugin();
    }

    return { disponible, listar, pedirPermiso, imprimir,
             leerDefecto, guardarDefecto, quitarDefecto, imprimirTicket, prueba,
             bytesABase64, traducirError, destinoAObjetivo,
             _usarPlugin: p => { pluginForzado = p; },
             _limpiarPlugin: () => { pluginForzado = undefined; },
             _usarNativo: m => { nativoForzado = m; },
             _limpiarNativo: () => { nativoForzado = undefined; } };
});
