// controllers/cuentaController.test.js
// V12 (C3): endpoints de cuentas — vista, detalle y movimientos.
jest.mock('../services/cuentaService', () => ({
    listarAbiertas: jest.fn(),
    detalleCuenta: jest.fn(),
    trasladar: jest.fn(),
    unir: jest.fn(),
    dividir: jest.fn(),
    mesasLibres: jest.fn()
}));

const CuentaService = require('../services/cuentaService');
const controller = require('./cuentaController');

function reqRes({ body = {}, params = {} } = {}) {
    const req = { body, params, user: { id: 1, rol: 'cajero' }, ip: '127.0.0.1' };
    const res = {
        status: jest.fn().mockReturnThis(), json: jest.fn(),
        render: jest.fn(), send: jest.fn()
    };
    return { req, res };
}

beforeEach(() => jest.clearAllMocks());

describe('cuentaController.renderCuentas / detalle (C3)', () => {
    it('entrega cuentas y mesas libres a la vista', async () => {
        CuentaService.listarAbiertas.mockResolvedValue([{ id: 10 }]);
        CuentaService.mesasLibres.mockResolvedValue([{ id: 6 }]);
        const { req, res } = reqRes();
        await controller.renderCuentas(req, res);
        expect(res.render).toHaveBeenCalledWith('caja/cuentas', expect.objectContaining({
            view: 'cuentas', cuentas: [{ id: 10 }], mesasLibres: [{ id: 6 }]
        }));
    });

    it('detalle 404 si no existe; 200 con la cuenta', async () => {
        CuentaService.detalleCuenta.mockResolvedValue(null);
        const falta = reqRes({ params: { id: '99' } });
        await controller.detalle(falta.req, falta.res);
        expect(falta.res.status).toHaveBeenCalledWith(404);
        CuentaService.detalleCuenta.mockResolvedValue({ id: 10, lineas: [] });
        const ok = reqRes({ params: { id: '10' } });
        await controller.detalle(ok.req, ok.res);
        expect(ok.res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
});

describe('cuentaController · movimientos (C3)', () => {
    it('trasladar delega con actor y maneja el error', async () => {
        CuentaService.trasladar.mockResolvedValue({ pedidoId: 10 });
        const ok = reqRes({ params: { id: '10' }, body: { mesaDestinoId: 6 } });
        await controller.trasladar(ok.req, ok.res);
        expect(CuentaService.trasladar).toHaveBeenCalledWith('10', 6,
            expect.objectContaining({ id: 1, rol: 'cajero', ip: '127.0.0.1' }));
        CuentaService.trasladar.mockRejectedValue(new Error('No está libre.'));
        const mal = reqRes({ params: { id: '10' }, body: {} });
        await controller.trasladar(mal.req, mal.res);
        expect(mal.res.status).toHaveBeenCalledWith(400);
    });

    it('unir y dividir delegan al servicio', async () => {
        CuentaService.unir.mockResolvedValue({ destinoId: 11 });
        const u = reqRes({ params: { id: '10' }, body: { destinoId: 11 } });
        await controller.unir(u.req, u.res);
        expect(CuentaService.unir).toHaveBeenCalledWith('10', 11, expect.objectContaining({ id: 1 }));
        CuentaService.dividir.mockResolvedValue({ destinoId: 20 });
        const d = reqRes({ params: { id: '10' }, body: { detalleIds: [1], destinoId: null } });
        await controller.dividir(d.req, d.res);
        expect(CuentaService.dividir).toHaveBeenCalledWith('10', [1], null, expect.objectContaining({ id: 1 }));
    });
});
