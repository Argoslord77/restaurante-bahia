jest.mock('../config/db', () => ({ query: jest.fn(), getConnection: jest.fn() }));
jest.mock('./ajusteService', () => ({ get: jest.fn() }));
jest.mock('./ventaService', () => ({ obtenerDetalle: jest.fn() }));
const db = require('../config/db');
const AjusteService = require('./ajusteService');
const VentaService = require('./ventaService');
const ReporteService = require('./reporteService');
beforeEach(() => jest.clearAllMocks());

describe('reporteService', () => {
    it('ventasPorDia une días con utilidad y totales', async () => {
        db.query
            .mockResolvedValueOnce([[{ dia: '2026-09-28', n: 2, subtotal: 100, descuento: 0, iva: 16, total: 116 }], []])
            .mockResolvedValueOnce([[{ dia: '2026-09-28', utilidad: 40 }], []]);
        const r = await ReporteService.ventasPorDia({ desde: '2026-09-28', hasta: '2026-09-28' });
        expect(r.filas).toEqual([{ dia: '2026-09-28', n_ventas: 2, total: 116, utilidad: 40 }]);
        expect(r.totales).toMatchObject({ n: 2, total: 116, utilidad: 40 });
    });
    it('masVendidos respeta el límite', async () => {
        db.query.mockResolvedValueOnce([[{ producto_id: 1, nombre: 'X', cantidad: 5, importe: 50 }], []]);
        const r = await ReporteService.masVendidos({ limite: 5 });
        expect(r.filas).toHaveLength(1);
        expect(db.query.mock.calls[0][1][2]).toBe(5);
    });
    it('ticket combina detalle y negocio', async () => {
        VentaService.obtenerDetalle.mockResolvedValue({ venta: { id: 1 }, detalles: [], pagos: [] });
        AjusteService.get.mockResolvedValueOnce('Tienda').mockResolvedValueOnce('Gracias');
        const t = await ReporteService.ticket(1);
        expect(t).toMatchObject({ negocio: 'Tienda', pie: 'Gracias' });
    });
});
