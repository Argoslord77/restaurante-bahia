// controllers/reservaController.test.js
// V12 (C2): endpoints de reservas — vista, alta, llegada y cierres.
jest.mock('../services/reservaService', () => ({
    crear: jest.fn(),
    listar: jest.fn(),
    llegada: jest.fn(),
    cerrar: jest.fn(),
    mesasReservables: jest.fn()
}));

const ReservaService = require('../services/reservaService');
const controller = require('./reservaController');

function reqRes({ body = {}, params = {}, user = { id: 1, rol: 'capitan' } } = {}) {
    const req = { body, params, user };
    const res = {
        status: jest.fn().mockReturnThis(), json: jest.fn(),
        render: jest.fn(), send: jest.fn()
    };
    return { req, res };
}

beforeEach(() => jest.clearAllMocks());

describe('reservaController.renderReservas (C2)', () => {
    it('entrega próximas, historial (tope 50) y mesas', async () => {
        ReservaService.listar.mockImplementation(async (f) =>
            (f === 'proximas' ? [{ id: 1 }] : Array.from({ length: 60 }, (_, i) => ({ id: i }))));
        ReservaService.mesasReservables.mockResolvedValue([{ id: 5 }]);
        const { req, res } = reqRes();
        await controller.renderReservas(req, res);
        expect(res.render).toHaveBeenCalledWith('admin/reservas', expect.objectContaining({
            view: 'reservas', proximas: [{ id: 1 }], mesas: [{ id: 5 }]
        }));
        expect(res.render.mock.calls[0][1].historial).toHaveLength(50);
    });
});

describe('reservaController · operaciones (C2)', () => {
    it('crear → 201 con la reserva; error → 400', async () => {
        ReservaService.crear.mockResolvedValue({ id: 9, nombre: 'Ana' });
        const bueno = reqRes({ body: { mesaId: 5, nombre: 'Ana', fechaReserva: 'x' } });
        await controller.crear(bueno.req, bueno.res);
        expect(bueno.res.status).toHaveBeenCalledWith(201);
        expect(ReservaService.crear).toHaveBeenCalledWith(expect.objectContaining({
            mesaId: 5, nombre: 'Ana', usuarioId: 1
        }));
        ReservaService.crear.mockRejectedValue(new Error('La mesa no existe.'));
        const malo = reqRes({ body: {} });
        await controller.crear(malo.req, malo.res);
        expect(malo.res.status).toHaveBeenCalledWith(400);
        expect(malo.res.json).toHaveBeenCalledWith({ success: false, message: 'La mesa no existe.' });
    });

    it('llegada exige sesión y abre la cuenta', async () => {
        const sinSesion = reqRes({ params: { id: '1' }, user: {} });
        await controller.llegada(sinSesion.req, sinSesion.res);
        expect(sinSesion.res.status).toHaveBeenCalledWith(401);
        ReservaService.llegada.mockResolvedValue({ reservaId: 1, pedidoId: 77 });
        const ok = reqRes({ params: { id: '1' } });
        await controller.llegada(ok.req, ok.res);
        expect(ReservaService.llegada).toHaveBeenCalledWith('1', 1);
        expect(ok.res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, pedidoId: 77 }));
    });

    it('cancelar y no-show cierran con el estado debido', async () => {
        ReservaService.cerrar.mockResolvedValue({ reservaId: 1, estado: 'cancelada' });
        const c = reqRes({ params: { id: '1' } });
        await controller.cancelar(c.req, c.res);
        expect(ReservaService.cerrar).toHaveBeenCalledWith('1', 'cancelada');
        ReservaService.cerrar.mockResolvedValue({ reservaId: 1, estado: 'no_show' });
        const n = reqRes({ params: { id: '1' } });
        await controller.noShow(n.req, n.res);
        expect(ReservaService.cerrar).toHaveBeenCalledWith('1', 'no_show');
    });
});
