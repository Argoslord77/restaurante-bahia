// movil/www/js/csv.js — Exportación de reportes a CSV para Excel.
// Formato regional México/Latam: separador ';' y decimales con coma,
// más BOM para que Excel detecte el UTF-8 (acentos).
(function (root, factory) {
    const mod = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = mod;
    else root.CFCsv = mod;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const BOM = '﻿';
    const SEP = ';';

    const num = n => (Number(n) || 0).toFixed(2).replace('.', ',');

    function escapar(v) {
        const s = String(v === null || v === undefined ? '' : v);
        return /[";\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }

    function tabla(encabezados, filas) {
        const lineas = [encabezados.map(escapar).join(SEP)];
        for (const f of filas) lineas.push(f.map(escapar).join(SEP));
        return BOM + lineas.join('\r\n') + '\r\n';
    }

    function ventasPorDia(rep) {
        return tabla(['Dia', 'Ventas', 'Subtotal', 'Descuento', 'IVA', 'Total', 'Utilidad'],
            rep.dias.map(d => [d.dia, d.n, num(d.subtotal), num(d.descuento), num(d.iva), num(d.total), num(d.utilidad)])
                .concat([[ 'TOTAL', rep.totales.n, num(rep.totales.subtotal), num(rep.totales.descuento),
                            num(rep.totales.iva), num(rep.totales.total), num(rep.totales.utilidad) ]]));
    }

    function masVendidos(rep) {
        return tabla(['#', 'Producto', 'Cantidad', 'Monto'],
            rep.filas.map((f, i) => [i + 1, f.nombre, f.cantidad, num(f.importe)]));
    }

    function valorizado(rep) {
        return tabla(['SKU', 'Producto', 'Categoria', 'Stock', 'Costo', 'Venta', 'Valor costo', 'Valor venta'],
            rep.filas.map(f => [f.sku || '', f.nombre, f.categoria_nombre || '', f.stock,
                                num(f.precio_costo), num(f.precio_venta), num(f.valor_costo), num(f.valor_venta)])
                .concat([[ '', 'TOTAL', '', rep.totales.unidades, '', '', num(rep.totales.costo), num(rep.totales.venta) ]]));
    }

    function ventas(lista) {
        return tabla(['#', 'Fecha', 'Usuario', 'Subtotal', 'Descuento', 'IVA', 'Total', 'Estado'],
            lista.filas.map(v => {
                let fecha = v.creado_en;
                try { fecha = new Date(v.creado_en).toLocaleString('es'); } catch (_) { /* cruda */ }
                return [v.id, fecha, v.usuario_nombre || '', num(v.subtotal), num(v.descuento),
                        num(v.iva_monto), num(v.total), v.estado];
            }));
    }

    function nombre(base) {
        const f = new Date(), p = n => String(n).padStart(2, '0');
        return `cajafacil-${base}-${f.getFullYear()}${p(f.getMonth() + 1)}${p(f.getDate())}.csv`;
    }

    return { tabla, ventasPorDia, masVendidos, valorizado, ventas, nombre, BOM, SEP };
});
