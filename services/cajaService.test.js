// services/cajaService.test.js
// El esperado de caja es fondo + abonos en efectivo TAL CUAL: las propinas
// en efectivo ya vienen dentro de los abonos (el cobro exige abonos >=
// orden + propina) y las de tarjeta/transferencia/ZELLE nunca entran a la
// gaveta. Sumarlas otra vez las contaría doble (o inflaría el esperado).
jest.mock('../config/db', () => ({ query: jest.fn() }));

const CajaService = require('./cajaService');

function pagoEfectivo(totalLocal) {
    return {
        metodo_pago: 'efectivo', codigo_moneda: 'CUP', nombre_moneda: 'Peso',
        simbolo: '$', total_origen: totalLocal, total_local: totalLocal,
        total_transacciones: 1, es_zelle: 0, es_efectivo_caja: 1
    };
}

describe('cajaService · calcularResumenFinanciero (esperado sin doble conteo)', () => {
    it('la propina en efectivo NO se suma dos veces al esperado', () => {
        // Orden $100 + propina $10, cobrados con $110 en efectivo.
        const pedidos = [{ total: 100, subtotal: 100, propina: 10, estado_pago: 'pagado' }];
        const desglose = [pagoEfectivo(110)];

        const r = CajaService.calcularResumenFinanciero(pedidos, desglose, 50);

        expect(r.total_cobrado_caja).toBe(110);
        expect(r.total_propinas).toBe(10); // informativa, no se re-suma
        expect(r.total_efectivo_total_caja).toBe(110);
        expect(r.total_en_caja_esperado).toBe(160); // 50 + 110, no 170
    });

    it('la propina con tarjeta no infla la gaveta física', () => {
        const pedidos = [{ total: 100, subtotal: 100, propina: 10, estado_pago: 'pagado' }];
        const desglose = [{
            metodo_pago: 'tarjeta', codigo_moneda: 'CUP', nombre_moneda: 'Peso',
            simbolo: '$', total_origen: 110, total_local: 110,
            total_transacciones: 1, es_zelle: 0, es_efectivo_caja: 0
        }];

        const r = CajaService.calcularResumenFinanciero(pedidos, desglose, 50);

        expect(r.total_tarjetas).toBe(110);
        expect(r.total_propinas).toBe(10);
        expect(r.total_en_caja_esperado).toBe(50); // nada entró en efectivo
    });

    it('ZELLE queda fuera del efectivo aunque traiga propina', () => {
        const pedidos = [{ total: 100, subtotal: 100, propina: 10, estado_pago: 'pagado' }];
        const desglose = [{
            metodo_pago: 'transferencia', codigo_moneda: 'ZELLE',
            nombre_moneda: 'Zelle (transferencia extranjera)', simbolo: '$',
            total_origen: 110, total_local: 110,
            total_transacciones: 1, es_zelle: 1, es_efectivo_caja: 0
        }];

        const r = CajaService.calcularResumenFinanciero(pedidos, desglose, 50);

        expect(r.total_zelle).toBe(110);
        expect(r.total_cobrado_caja).toBe(0);
        expect(r.total_en_caja_esperado).toBe(50);
    });

    it('conserva las cubetas facturado / pendiente / cortesía', () => {
        const pedidos = [
            { total: 200, subtotal: 200, propina: 0, estado_pago: 'facturado' },
            { total: 60, subtotal: 60, propina: 0, estado_pago: 'pendiente_pago' },
            { total: 0, subtotal: 40, propina: 0, estado_pago: 'cortesia' }
        ];

        const r = CajaService.calcularResumenFinanciero(pedidos, [], 0);

        expect(r).toMatchObject({
            total_cxc_facturas: 200,
            total_pendiente_pago: 60,
            total_cortesias: 40,
            total_pedidos: 3
        });
    });
});

describe('cajaService · retiros de efectivo (C4)', () => {
    it('los retiros vigentes restan del esperado', () => {
        const r = CajaService.calcularResumenFinanciero([], [], 100, 30);
        expect(r.total_retiros).toBe(30);
        expect(r.total_en_caja_esperado).toBe(70);
    });

    it('sin retiros el esperado no cambia (compatibilidad)', () => {
        const r = CajaService.calcularResumenFinanciero([], [], 100);
        expect(r.total_retiros).toBe(0);
        expect(r.total_en_caja_esperado).toBe(100);
    });

    it('los retiros negativos se ignoran', () => {
        const r = CajaService.calcularResumenFinanciero([], [], 100, -5);
        expect(r.total_en_caja_esperado).toBe(100);
    });
});
