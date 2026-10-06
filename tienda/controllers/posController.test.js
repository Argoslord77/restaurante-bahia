// Contrato API ↔ pos.js: formas exactas que el JS cliente consume.
// (d.items en buscar, body.venta_id en cobrar — romper esto = POS muerto.)
jest.mock('../services/productoService', () => ({ buscarParaVenta: jest.fn() }));
jest.mock('../services/ventaService', () => ({ crear: jest.fn() }));
jest.mock('../services/cajaService', () => ({ turnoAbierto: jest.fn() }));
jest.mock('../services/ajusteService', () => ({ ivaPct: jest.fn() }));
const ProductoService = require('../services/productoService');
const VentaService = require('../services/ventaService');
const CajaService = require('../services/cajaService');
const C = require('./posController');

const res = () => ({ json: jest.fn(), status: jest.fn().mockReturnThis() });
beforeEach(() => jest.clearAllMocks());

describe('posController API', () => {
    it('apiBuscar devuelve { success, items }', async () => {
        ProductoService.buscarParaVenta.mockResolvedValue(
            [{ id: 1, nombre: 'Lata', precio_venta: 350, stock: 240 }]);
        const r = res();
        await C.apiBuscar({ query: { q: 'lata' } }, r);
        expect(r.json).toHaveBeenCalledWith({ success: true, items: [
            { id: 1, nombre: 'Lata', precio_venta: 350, stock: 240 }] });
    });

    it('apiVender devuelve { success, venta_id, ... }', async () => {
        CajaService.turnoAbierto.mockResolvedValue({ id: 7 });
        VentaService.crear.mockResolvedValue({ venta_id: 9, total: 116, cambio: 0 });
        const r = res();
        await C.apiVender({
            session: { tiendaUser: { id: 1 } },
            body: { items: [{ producto_id: 1, cantidad: 1 }], pagos: [{ metodo: 'efectivo', monto: 116 }], descuento: 0 }
        }, r);
        expect(r.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: true, venta_id: 9 }));
    });

    it('apiVender sin turno responde 400 con message', async () => {
        CajaService.turnoAbierto.mockResolvedValue(null);
        const r = res();
        await C.apiVender({ session: { tiendaUser: { id: 1 } }, body: {} }, r);
        expect(r.status).toHaveBeenCalledWith(400);
        expect(r.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: false }));
    });
});
