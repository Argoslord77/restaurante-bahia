// controllers/reportesController.test.js
// Ventas del turno: qué turno se analiza según la URL. Por defecto, el que
// sigue abierto y, si no hay, el más reciente de la lista. Un turno pedido
// fuera de la lista (enlaces desde el historial) se acepta si existe.
jest.mock('../config/db', () => ({ query: jest.fn() }));
jest.mock('../models/reporteModel', () => ({ getReporteKardexPos: jest.fn() }));
jest.mock('../services/reportesService', () => ({ listarTurnos: jest.fn(), ventasDelTurno: jest.fn() }));

const db = require('../config/db');
const ReportesService = require('../services/reportesService');
const controller = require('./reportesController');

const TURNO_ACTIVO = { id: 10, estado: 'abierto', en_curso: true, abierto_por: 'Juan' };
const TURNO_9 = { id: 9, estado: 'cerrado', en_curso: false, abierto_por: 'Ana' };
const TURNO_8 = { id: 8, estado: 'cerrado', en_curso: false, abierto_por: 'Luis' };

function crearReqRes(query = {}) {
    const req = { query, user: { id: 1, rol: 'administrador' }, flash: jest.fn(() => []) };
    const res = { render: jest.fn(), redirect: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn(), setHeader: jest.fn() };
    return { req, res };
}

describe('reportesController.viewVentasTurno · selección del turno', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        ReportesService.listarTurnos.mockResolvedValue([TURNO_ACTIVO, TURNO_9, TURNO_8]);
        ReportesService.ventasDelTurno.mockResolvedValue({ turno: { id: 10 }, totales: {} });
    });

    it('sin parámetro usa el turno en curso', async () => {
        const { req, res } = crearReqRes({});

        await controller.viewVentasTurno(req, res);

        expect(ReportesService.ventasDelTurno).toHaveBeenCalledWith(10);
        expect(res.render).toHaveBeenCalledWith('reportes/ventas_turno', expect.objectContaining({ turnoSeleccionado: 10 }));
        expect(db.query).not.toHaveBeenCalled();
    });

    it('sin turno activo usa el más reciente de la lista', async () => {
        ReportesService.listarTurnos.mockResolvedValue([TURNO_9, TURNO_8]);
        const { req, res } = crearReqRes({});

        await controller.viewVentasTurno(req, res);

        expect(ReportesService.ventasDelTurno).toHaveBeenCalledWith(9);
        expect(res.render).toHaveBeenCalledWith('reportes/ventas_turno', expect.objectContaining({ turnoSeleccionado: 9 }));
    });

    it('respeta el turno pedido cuando está en la lista', async () => {
        const { req, res } = crearReqRes({ turno: '8' });

        await controller.viewVentasTurno(req, res);

        expect(ReportesService.ventasDelTurno).toHaveBeenCalledWith(8);
        expect(db.query).not.toHaveBeenCalled();
    });

    it('acepta un turno fuera de la lista si existe (enlace profundo)', async () => {
        db.query.mockResolvedValue([[{ id: 3 }], []]);
        const { req, res } = crearReqRes({ turno: '3' });

        await controller.viewVentasTurno(req, res);

        expect(ReportesService.ventasDelTurno).toHaveBeenCalledWith(3);
        expect(res.render).toHaveBeenCalledWith('reportes/ventas_turno', expect.objectContaining({ turnoSeleccionado: 3 }));
    });

    it('un turno inexistente cae al valor por defecto', async () => {
        db.query.mockResolvedValue([[], []]);
        const { req, res } = crearReqRes({ turno: '999' });

        await controller.viewVentasTurno(req, res);

        expect(ReportesService.ventasDelTurno).toHaveBeenCalledWith(10);
        expect(res.render).toHaveBeenCalledWith('reportes/ventas_turno', expect.objectContaining({ turnoSeleccionado: 10 }));
    });

    it('sin turnos registrados renderiza con reporte nulo', async () => {
        ReportesService.listarTurnos.mockResolvedValue([]);
        const { req, res } = crearReqRes({});

        await controller.viewVentasTurno(req, res);

        expect(ReportesService.ventasDelTurno).not.toHaveBeenCalled();
        expect(res.render).toHaveBeenCalledWith('reportes/ventas_turno', expect.objectContaining({ turnoSeleccionado: null, reporte: null }));
    });
});
