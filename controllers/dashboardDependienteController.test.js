// dashboardDependienteController.test.js
const db = require('../config/db');
const turnoService = require('../services/turnoService');
const controller = require('./dashboardDependienteController');

jest.mock('../config/db');
jest.mock('../services/turnoService');

function crearReqRes({ query = {}, user = null } = {}) {
    const req = {
        query,
        user,
        flash: jest.fn(() => null),
        get: undefined,
        hostname: 'localhost'
    };
    const res = {
        render: jest.fn(),
        redirect: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn()
    };
    return { req, res };
}

describe('DashboardDependienteController — POS mesero (visualización)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('viewSelectorMesero', () => {
        it('debe renderizar el selector con el personal de servicio del turno activo', async () => {
            turnoService.obtenerTurnoActivo.mockResolvedValue({ id: 7 });
            const meseros = [
                { id: 5, nombre_completo: 'Juan Perez', rol: 'dependiente', mesas_asignadas: 4, ordenes_abiertas: 2, consumo_abierto: 85.5 },
                { id: 8, nombre_completo: 'Ana Gomez', rol: 'capitan', mesas_asignadas: 6, ordenes_abiertas: 0, consumo_abierto: 0 }
            ];
            db.query.mockResolvedValue([[...meseros], []]);

            const { req, res } = crearReqRes({ user: { id: 1, rol: 'administrador', nombre: 'Admin' } });
            await controller.viewSelectorMesero(req, res);

            expect(res.render).toHaveBeenCalledWith('admin/pos_mesero', expect.objectContaining({
                view: 'pos_mesero',
                meseros,
                turnoActivo: { id: 7 }
            }));

            // La consulta debe contar solo dependientes/capitanes activos
            const sql = db.query.mock.calls[0][0];
            expect(sql).toContain("u.rol IN ('dependiente', 'capitan')");
            expect(sql).toContain('u.activo = 1');
        });

        it('debe responder 500 ante un error de base de datos', async () => {
            turnoService.obtenerTurnoActivo.mockRejectedValue(new Error('DB down'));
            const { req, res } = crearReqRes({ user: { id: 1, rol: 'administrador' } });

            await controller.viewSelectorMesero(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('viewDashboardMesero', () => {
        it('debe redirigir al selector si no se indica mesero', async () => {
            const { req, res } = crearReqRes({ query: {}, user: { id: 1, rol: 'administrador' } });
            await controller.viewDashboardMesero(req, res);

            expect(res.redirect).toHaveBeenCalledWith('/admin/pos-mesero');
            expect(req.flash).toHaveBeenCalledWith('error_msg', expect.stringContaining('Selecciona un mesero'));
        });

        it('debe redirigir si el mesero no existe o no es personal de servicio', async () => {
            db.query.mockResolvedValue([[{ id: 3, rol: 'cajero', activo: 1 }], []]);
            const { req, res } = crearReqRes({ query: { mesero: '3' }, user: { id: 1, rol: 'administrador' } });

            await controller.viewDashboardMesero(req, res);
            expect(res.redirect).toHaveBeenCalledWith('/admin/pos-mesero');
        });

        it('debe renderizar el salón del mesero en modo visualización', async () => {
            turnoService.obtenerTurnoActivo.mockResolvedValue({ id: 7 });
            const mesero = { id: 5, nombre: 'Juan', apellidos: 'Perez', rol: 'dependiente', activo: 1 };
            const mesa = { id: 1, nombre: '1', id_pedido_activo: 10, ubicacion: 'Terraza' };
            // 1a llamada: datos del mesero; 2a: mesas; 3a: stats
            db.query.mockImplementation(async () => {
                const callNum = db.query.mock.calls.length;
                if (callNum === 1) return [[mesero], []];
                if (callNum === 2) return [[mesa], []];
                return [[{ total_mesas: 1, mesas_ocupadas: 1, pedidos_pendientes: 0, en_preparacion: 0, ventas_del_turno: 0 }], []];
            });

            const { req, res } = crearReqRes({ query: { mesero: '5' }, user: { id: 1, rol: 'administrador', nombre: 'Admin' } });
            await controller.viewDashboardMesero(req, res);

            expect(res.render).toHaveBeenCalledWith('dependiente/dashboard', expect.objectContaining({
                modoVisualizacion: true,
                meseroVisualizado: { id: 5, nombre: 'Juan Perez', rol: 'dependiente' }
            }));

            // La consulta de mesas debe filtrar por el mesero supervisado
            const sqlMesas = db.query.mock.calls[1][0];
            expect(sqlMesas).toContain('dam.dependiente_id = ?');
        });
    });

    describe('renderDashboardSalon (compartido)', () => {
        it('modo normal: sin flags de visualización', async () => {
            turnoService.obtenerTurnoActivo.mockResolvedValue({ id: 7 });
            db.query.mockResolvedValue([[], []]);

            const { req, res } = crearReqRes({ user: { id: 9, rol: 'dependiente', nombre: 'Juan' } });
            await controller.viewDependienteDashboard(req, res);

            expect(res.render).toHaveBeenCalledWith('dependiente/dashboard', expect.objectContaining({
                modoVisualizacion: false,
                meseroVisualizado: null
            }));
        });

        it('redirige a logout el dependiente sin turno abierto', async () => {
            turnoService.obtenerTurnoActivo.mockResolvedValue(null);
            const { req, res } = crearReqRes({ user: { id: 9, rol: 'dependiente' } });

            await controller.viewDependienteDashboard(req, res);
            expect(res.redirect).toHaveBeenCalledWith('/logout');
        });
    });
});
