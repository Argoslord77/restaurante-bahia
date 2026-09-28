// controllers/reportesController.test.js
// Ventas del turno: qué turno se analiza según la URL. Por defecto, el que
// sigue abierto y, si no hay, el más reciente de la lista. Un turno pedido
// fuera de la lista (enlaces desde el historial) se acepta si existe.
jest.mock('../config/db', () => ({ query: jest.fn() }));
jest.mock('../models/reporteModel', () => ({ getReporteKardexPos: jest.fn() }));
jest.mock('../services/reportesService', () => ({ listarTurnos: jest.fn(), ventasDelTurno: jest.fn(), propinasDelTurno: jest.fn(), propinasACSV: jest.fn() }));

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

describe('reportesController · propinas (C6)', () => {
    const REPORTE = {
        turno: { id: 9 }, totales: { cuentas: 1 },
        meseros: [], cuentas: [{ id: 11 }]
    };

    beforeEach(() => {
        jest.clearAllMocks();
        ReportesService.listarTurnos.mockResolvedValue([TURNO_ACTIVO, TURNO_9, TURNO_8]);
        ReportesService.propinasDelTurno.mockResolvedValue(REPORTE);
    });

    it('viewPropinas renderiza el turno pedido si existe', async () => {
        const { req, res } = crearReqRes({ turno: '9' });
        await controller.viewPropinas(req, res);
        expect(ReportesService.propinasDelTurno).toHaveBeenCalledWith(9);
        expect(res.render).toHaveBeenCalledWith('reportes/propinas', expect.objectContaining({ turnoSeleccionado: 9, reporte: REPORTE }));
    });

    it('viewPropinas sin turno usa el activo', async () => {
        const { req, res } = crearReqRes({});
        await controller.viewPropinas(req, res);
        expect(ReportesService.propinasDelTurno).toHaveBeenCalledWith(10);
    });

    it('exportarPropinas descarga el CSV con nombre por turno', async () => {
        ReportesService.propinasACSV.mockReturnValue('csv');
        const { req, res } = crearReqRes({ turno: '9' });
        await controller.exportarPropinas(req, res);
        expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
        expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', expect.stringMatching(/^attachment; filename="propinas_turno_9_.*\.csv"$/));
        expect(res.setHeader).toHaveBeenCalledWith('X-Reporte-Filas', '1');
        expect(res.send).toHaveBeenCalledWith('csv');
        expect(db.query).not.toHaveBeenCalled();
    });

    it('exportarPropinas sin turnos redirige a la vista', async () => {
        ReportesService.listarTurnos.mockResolvedValue([]);
        const { req, res } = crearReqRes({ turno: '9' });
        await controller.exportarPropinas(req, res);
        expect(res.redirect).toHaveBeenCalledWith('/admin/reportes/propinas');
    });
});
