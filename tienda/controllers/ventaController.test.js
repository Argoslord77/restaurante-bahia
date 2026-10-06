// Contrato controlador→vista del historial de ventas.
jest.mock('../services/ventaService', () => ({ listar: jest.fn(), cancelar: jest.fn() }));
jest.mock('../services/reporteService', () => ({ ticket: jest.fn() }));
const VentaService = require('../services/ventaService');
const C = require('./ventaController');

beforeEach(() => jest.clearAllMocks());

describe('ventaController', () => {
    it('lista mapea filas del servicio a `ventas` de la vista', async () => {
        VentaService.listar.mockResolvedValue({
            filas: [{ id: 1, total: 116 }],
            totales: { n: 1, total: 116 },
            filtros: { desde: 'a', hasta: 'b' }
        });
        const r = { render: jest.fn(), redirect: jest.fn() };
        await C.lista({ query: { estado: 'cobrada' }, flash: jest.fn() }, r);
        expect(r.render).toHaveBeenCalledWith('ventas', {
            ventas: [{ id: 1, total: 116 }],
            filtros: { desde: 'a', hasta: 'b' },
            estado: 'cobrada'
        });
    });
});
