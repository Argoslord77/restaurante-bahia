// Contrato controlador→vista: lo que cada reporte pasa a su .ejs.
// (Caza la familia "X is not defined" + columnas silenciosas.)
jest.mock('../services/reporteService', () => ({ ventasPorDia: jest.fn(), masVendidos: jest.fn() }));
jest.mock('../services/inventarioService', () => ({ valorizado: jest.fn() }));
const ReporteService = require('../services/reporteService');
const InventarioService = require('../services/inventarioService');
const C = require('./reporteController');

const req = (query = {}) => ({ query, flash: jest.fn() });
const res = () => ({ render: jest.fn(), redirect: jest.fn() });
beforeEach(() => jest.clearAllMocks());

describe('reporteController', () => {
    it('ventas mapea filas/totales a las variables de la vista', async () => {
        ReporteService.ventasPorDia.mockResolvedValue({
            filas: [{ dia: '2026-10-06', n_ventas: 2, total: 116, utilidad: 40 }],
            totales: { n: 2, total: 116, utilidad: 40 },
            filtros: { desde: 'a', hasta: 'b' }
        });
        const r = res();
        await C.ventas(req(), r);
        expect(r.render).toHaveBeenCalledWith('reporte_ventas', {
            filas: [{ dia: '2026-10-06', n_ventas: 2, total: 116, utilidad: 40 }],
            filtros: { desde: 'a', hasta: 'b' },
            totalVentas: 2, totalMonto: 116, totalUtilidad: 40
        });
    });

    it('masVendidos mapea cantidad/importe a piezas/monto', async () => {
        ReporteService.masVendidos.mockResolvedValue({
            filas: [{ nombre: 'X', cantidad: 5, importe: 50 }],
            filtros: { desde: 'a', hasta: 'b' }
        });
        const r = res();
        await C.masVendidos(req(), r);
        expect(r.render).toHaveBeenCalledWith('reporte_mas_vendidos', {
            filas: [{ nombre: 'X', piezas: 5, monto: 50 }],
            filtros: { desde: 'a', hasta: 'b' }
        });
    });

    it('inventario mapea totales a totalCosto/totalVenta', async () => {
        InventarioService.valorizado.mockResolvedValue({
            filas: [{ nombre: 'A' }], totales: { costo: 3, venta: 6, unidades: 1 }
        });
        const r = res();
        await C.inventario(req(), r);
        expect(r.render).toHaveBeenCalledWith('reporte_inventario', {
            filas: [{ nombre: 'A' }], totalCosto: 3, totalVenta: 6
        });
    });
});
