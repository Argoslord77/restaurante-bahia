// movil/www/js/escpos.js — Constructor de comandos ESC/POS para impresoras
// térmicas (texto, tablas, corte). Puro: recibe datos, devuelve bytes.
// Sin dependencias; probado con jest.
(function (root, factory) {
    const mod = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = mod;
    else root.CFEscpos = mod;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const ANCHO = 32; // columnas de una térmica de 58/80mm en fuente A

    function concat(...partes) {
        const total = partes.reduce((a, p) => a + p.length, 0);
        const salida = new Uint8Array(total);
        let off = 0;
        for (const p of partes) { salida.set(p, off); off += p.length; }
        return salida;
    }

    // Latin-1 directo (U+0000–U+00FF ➜ mismo byte); resto se degrada.
    // La impresora se pone en página WPC1252 (ESC t 16), que cubre el español.
    const DEGRADAR = { '€': 'E', '“': '"', '”': '"', '‘': "'", '’': "'", '–': '-', '—': '-', '…': '...' };
    function latin1(texto) {
        const s = String(texto === null || texto === undefined ? '' : texto);
        const bytes = [];
        for (const ch of s) {
            const cp = ch.codePointAt(0);
            if (cp < 128) bytes.push(cp);
            else if (cp <= 255) bytes.push(cp);
            else if (DEGRADAR[ch]) for (const c of DEGRADAR[ch]) bytes.push(c.charCodeAt(0));
            else if (ch === '\n') bytes.push(10);
            else bytes.push(63); // '?'
        }
        return new Uint8Array(bytes);
    }

    const init = () => new Uint8Array([0x1B, 0x40]);
    const codepage = () => new Uint8Array([0x1B, 0x74, 16]);
    const align = (cual) => new Uint8Array([0x1B, 0x61, cual === 'c' ? 1 : cual === 'r' ? 2 : 0]);
    const negrita = (on) => new Uint8Array([0x1B, 0x45, on ? 1 : 0]);
    const modo = (dobleAncho, dobleAlto) =>
        new Uint8Array([0x1B, 0x21, (dobleAncho ? 0x20 : 0) | (dobleAlto ? 0x10 : 0)]);
    const linea = (n) => new Uint8Array(new Array(Math.max(1, n || 1)).fill(10));
    const cortar = () => new Uint8Array([0x1D, 0x56, 65, 48]); // avanza y corta
    const cajon = () => new Uint8Array([0x1B, 0x70, 0, 25, 250]); // pulso cajón

    function texto(s, salto) {
        return salto === false ? latin1(s) : concat(latin1(s), linea(1));
    }

    function separador(car, ancho) {
        return texto((car || '-').repeat(ancho || ANCHO));
    }

    function dividir(s, ancho) {
        const palabras = String(s).split(/\s+/).filter(Boolean);
        const lineas = [];
        let actual = '';
        for (const w of palabras) {
            if ((actual + ' ' + w).trim().length > ancho) {
                if (actual) lineas.push(actual);
                actual = w.length > ancho ? w.slice(0, ancho) : w;
                if (w.length > ancho) { lineas.push(actual); actual = ''; }
            } else actual = (actual + ' ' + w).trim();
        }
        if (actual) lineas.push(actual);
        return lineas.length ? lineas : [''];
    }

    // Izquierda + derecha en una línea de `ancho` columnas.
    function fila2col(izq, der, ancho) {
        const a = ancho || ANCHO;
        const d = String(der);
        let i = String(izq);
        if (i.length + d.length + 1 > a) i = i.slice(0, Math.max(0, a - d.length - 4)) + '...';
        return i + ' '.repeat(a - i.length - d.length) + d;
    }

    const fmt = n => '$' + (Number(n) || 0).toFixed(2);

    // Ticket completo listo para imprimir.
    function ticketBytes({ negocio, venta, detalles, pagos, pie, ancho }) {
        const a = ancho || ANCHO;
        const v = venta;
        const partes = [init(), codepage(), align('c'), negrita(true)];
        dividir(negocio, a).forEach(l => partes.push(texto(l)));
        partes.push(negrita(false));
        partes.push(texto(`Ticket #${v.id}`));
        try { partes.push(texto(new Date(v.creado_en).toLocaleString('es'))); } catch (_) { /* sin fecha */ }
        if (v.usuario_nombre) partes.push(texto(v.usuario_nombre));
        partes.push(align('l'), separador('-', a));
        for (const d of (detalles || [])) {
            const cant = `${d.cantidad} x ${d.nombre}`;
            if (cant.length + fmt(d.subtotal).length + 1 <= a) {
                partes.push(texto(fila2col(cant, fmt(d.subtotal), a)));
            } else {
                dividir(cant, a).forEach(l => partes.push(texto(l)));
                partes.push(align('r'), texto(fmt(d.subtotal)), align('l'));
            }
        }
        partes.push(separador('-', a));
        partes.push(texto(fila2col('Subtotal', fmt(v.subtotal), a)));
        if (Number(v.descuento) > 0) partes.push(texto(fila2col('Descuento', '-' + fmt(v.descuento), a)));
        partes.push(texto(fila2col('IVA', fmt(v.iva_monto), a)));
        partes.push(negrita(true), modo(true, true));
        partes.push(align('c'), texto(`TOTAL ${fmt(v.total)}`), align('l'));
        partes.push(modo(false, false), negrita(false), separador('-', a));
        for (const p of (pagos || [])) partes.push(texto(fila2col(String(p.metodo), fmt(p.monto), a)));
        if (Number(v.cambio) > 0) partes.push(negrita(true), texto(fila2col('Cambio', fmt(v.cambio), a)), negrita(false));
        if (v.estado === 'cancelada') partes.push(align('c'), negrita(true), texto('*** CANCELADA ***'), negrita(false), align('l'));
        partes.push(separador('-', a), align('c'));
        if (pie) dividir(pie, a).forEach(l => partes.push(texto(l)));
        partes.push(linea(3), cortar());
        return concat(...partes);
    }

    return { ANCHO, concat, latin1, init, codepage, align, negrita, modo,
             linea, cortar, cajon, texto, separador, dividir, fila2col, ticketBytes };
});
