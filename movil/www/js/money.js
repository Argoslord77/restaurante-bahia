// movil/www/js/money.js — Matemática de la venta, idéntica a la versión web:
// descuento antes de IVA, descuento limitado al subtotal, redondeo a centavos.
(function (root, factory) {
    const mod = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = mod;
    else root.CFMoney = mod;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const redondear = n => Math.round((Number(n) || 0) * 100) / 100;

    // items: [{ precio, cantidad }] · descuento: monto · ivaPct: número
    function totales(items, descuento, ivaPct) {
        const sub = redondear((items || []).reduce(
            (a, l) => a + Number(l.precio || 0) * Number(l.cantidad || 0), 0));
        const desc = Math.min(Math.max(redondear(descuento), 0), sub);
        const base = redondear(sub - desc);
        const iva = redondear(base * (Number(ivaPct) || 0) / 100);
        return { sub, desc, iva, total: redondear(base + iva) };
    }

    function cambio(pagado, total) { return redondear(Math.max(0, pagado - total)); }

    return { totales, cambio, redondear };
});
