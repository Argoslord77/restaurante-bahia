// controllers/turnoController.test.js
// C4: endpoints de retiros — alta, listado y anulación.
// C7: renderTurnos entrega retiros + cuentas abiertas a la vista.
jest.mock('../services/turnoService', () => ({
    obtenerTurnoActivo: jest.fn(),
    obtenerDatosParaVista: jest.fn(),
    registrarRetiro: jest.fn(),
    listarRetiros: jest.fn(),
    anularRetiro: jest.fn(),
    totalRetirosVigentes: jest.fn(),
    contarPedidosAbiertos: jest.fn()
}));

const TurnoService = require('../services/turnoService');
const controller = require('./turnoController');

function reqRes({ body = {}, query = {}, params = {} } = {}) {
    const req = { body, query, params, user: { id: 1, rol: 'administrador' }, flash: jest.fn() };
    const res = {
        status: jest.fn().mockReturnThis(), json: jest.fn(),
        render: jest.fn(), redirect: jest.fn()
    };
    return { req, res };
}

beforeEach(() => jest.clearAllMocks());

describe('turnoController · retiros (C4)', () => {
    it('registrar sin turno abierto → 400', async () => {
        TurnoService.obtenerTurnoActivo.mockResolvedValue(null);
        const { req, res } = reqRes({ body: { monto: 10, motivo: 'x' } });
        await controller.registrarRetiro(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(TurnoService.registrarRetiro).not.toHaveBeenCalled();
    });

    it('registrar ok → 201 con el acta', async () => {
        TurnoService.obtenerTurnoActivo.mockResolvedValue({ id: 7 });
        TurnoService.registrarRetiro.mockResolvedValue({ id: 3, turnoId: 7, monto: 10, motivo: 'x' });
        const { req, res } = reqRes({ body: { monto: 10, motivo: 'x' } });
        await controller.registrarRetiro(req, res);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(TurnoService.registrarRetiro).toHaveBeenCalledWith({ turnoId: 7, monto: 10, motivo: 'x', usuarioId: 1 });
    });

    it('error del servicio → 400 con mensaje', async () => {
        TurnoService.obtenerTurnoActivo.mockResolvedValue({ id: 7 });
        TurnoService.registrarRetiro.mockRejectedValue(new Error('El motivo del retiro es obligatorio.'));
        const { req, res } = reqRes({ body: { monto: 10, motivo: '' } });
        await controller.registrarRetiro(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    it('listar usa el turno activo por defecto y suma vigentes', async () => {
        TurnoService.obtenerTurnoActivo.mockResolvedValue({ id: 7 });
        TurnoService.listarRetiros.mockResolvedValue([{ id: 1 }]);
        TurnoService.totalRetirosVigentes.mockResolvedValue(25);
        const { req, res } = reqRes();
        await controller.listarRetiros(req, res);
        expect(TurnoService.listarRetiros).toHaveBeenCalledWith(7);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, turnoId: 7, total: 25 }));
    });

    it('anular con id inválido → 400; ok delega al servicio', async () => {
        const malo = reqRes({ params: { id: 'x' } });
        await controller.anularRetiro(malo.req, malo.res);
        expect(malo.res.status).toHaveBeenCalledWith(400);
        TurnoService.anularRetiro.mockResolvedValue({ id: 2, monto: 5 });
        const bueno = reqRes({ params: { id: '2' } });
        await controller.anularRetiro(bueno.req, bueno.res);
        expect(TurnoService.anularRetiro).toHaveBeenCalledWith(2, 1);
        expect(bueno.res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
});

describe('turnoController.renderTurnos (C4+C7)', () => {
    it('entrega retiros y abiertas; tolera fallo pre-migración', async () => {
        TurnoService.obtenerDatosParaVista.mockResolvedValue({ turnoActivo: { id: 7 }, historial: [], monedas: [] });
        TurnoService.listarRetiros.mockRejectedValue(new Error("Table 'retiros_efectivo' doesn't exist"));
        TurnoService.contarPedidosAbiertos.mockResolvedValue({ cuentas: 2, total: 100 });
        const { req, res } = reqRes();
        await controller.renderTurnos(req, res);
        expect(res.render).toHaveBeenCalledWith('caja/turnos', expect.objectContaining({
            retiros: [],
            abiertas: { cuentas: 2, total: 100 }
        }));
    });
});
