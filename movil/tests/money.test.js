// Pruebas de la matemática de venta (paridad con la versión web).
const CFMoney = require('../www/js/money');

describe('Totales de venta', () => {
    it('descuento antes de IVA', () => {
        // subtotal 100, descuento 10, IVA 16 → base 90, IVA 14.40, total 104.40
        const t = CFMoney.totales([{ precio: 50, cantidad: 2 }], 10, 16);
        expect(t).toEqual({ sub: 100, desc: 10, iva: 14.4, total: 104.4 });
    });

    it('el descuento no puede pasar del subtotal', () => {
        const t = CFMoney.totales([{ precio: 20, cantidad: 1 }], 99, 16);
        expect(t.desc).toBe(20);
        expect(t.total).toBe(0);
    });

    it('varias líneas y redondeo a centavos', () => {
        const t = CFMoney.totales(
            [{ precio: 19.99, cantidad: 3 }, { precio: 5.5, cantidad: 2 }], 0, 16);
        expect(t.sub).toBe(70.97);
        expect(t.iva).toBe(11.36);
        expect(t.total).toBe(82.33);
    });

    it('cambio nunca negativo', () => {
        expect(CFMoney.cambio(100, 82.33)).toBe(17.67);
        expect(CFMoney.cambio(50, 82.33)).toBe(0);
    });
});
