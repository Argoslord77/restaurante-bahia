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

        it('incluye el resumen de la cuenta pagada indicada en la URL', async () => {
            turnoService.obtenerTurnoActivo.mockResolvedValue({ id: 7 });
            const mesero = { id: 5, nombre: 'Juan', apellidos: 'Perez', rol: 'dependiente', activo: 1 };
            const pedidoCerrado = {
                id: 15, total: 25.5, propina: 1.5, descuento: 0, impuesto: 2.3,
                estado_pago: 'pagado', fecha_cierre: new Date('2026-08-29T14:32:00'),
                mesa_numero: '5', mesero_nombre: 'Juan Perez '
            };
            // Orden de llamadas: 1 mesero · 2 pedido · 3 items · 4 pagos · 5 mesas · 6 stats
            db.query.mockImplementation(async (sql) => {
                const n = db.query.mock.calls.length;
                if (n === 1) return [[mesero], []];
                if (n === 2) return [[pedidoCerrado], []];
                if (n === 3) return [[{ nombre: 'Mojito', cantidad: 2 }, { nombre: 'Croquetas', cantidad: 1 }], []];
                if (n === 4) return [[{ metodo_pago: 'efectivo', monto_equivalente_local: 27, moneda_codigo: 'CUP', moneda_simbolo: '$' }], []];
                if (n === 5) return [[{ id: 1, nombre: '5', id_pedido_activo: null }], []];
                return [[{ total_mesas: 1, mesas_ocupadas: 0, pedidos_pendientes: 0, en_preparacion: 0, ventas_del_turno: 0 }], []];
            });

            const { req, res } = crearReqRes({
                query: { mesero: '5', 'cuenta-pagada': '15' },
                user: { id: 1, rol: 'administrador', nombre: 'Admin' }
            });
            await controller.viewDashboardMesero(req, res);

            expect(res.render).toHaveBeenCalledTimes(1);
            const datos = res.render.mock.calls[0][1];
            expect(datos.cuentasPagadas).toHaveLength(1);
            expect(datos.cuentasPagadas[0]).toMatchObject({
                id: 15, mesa: '5', mesero: 'Juan Perez', total: 25.5, totalItems: 3, estadoPago: 'pagado'
            });
            expect(datos.cuentasPagadas[0].pagos[0].metodo).toBe('efectivo');
            expect(datos.cuentasPagadas[0].horaCierre).toBe('14:32');

            // Solo se resumen cuentas realmente cerradas
            const sqlPedido = db.query.mock.calls[1][0];
            expect(sqlPedido).toContain('fecha_cierre IS NOT NULL');
        });

        it('varias cuentas pagadas se pasan todas (notificación escalonada)', async () => {
            turnoService.obtenerTurnoActivo.mockResolvedValue({ id: 7 });
            const mesero = { id: 5, nombre: 'Juan', apellidos: 'Perez', rol: 'dependiente', activo: 1 };
            db.query.mockImplementation(async () => {
                const n = db.query.mock.calls.length;
                if (n === 1) return [[mesero], []];
                if (n === 2 || n === 5) return [[{ id: n === 2 ? 15 : 16, total: 10, propina: 0, descuento: 0, impuesto: 0, estado_pago: 'pagado', fecha_cierre: new Date(), mesa_numero: '4', mesero_nombre: 'Juan Perez' }], []];
                if (n === 3 || n === 6) return [[]];
                if (n === 4 || n === 7) return [[]];
                if (n === 8) return [[]];
                return [[{ total_mesas: 0, mesas_ocupadas: 0, pedidos_pendientes: 0, en_preparacion: 0, ventas_del_turno: 0 }], []];
            });

            const { req, res } = crearReqRes({
                query: { mesero: '5', 'cuenta-pagada': '15,16' },
                user: { id: 1, rol: 'administrador' }
            });
            await controller.viewDashboardMesero(req, res);

            const datos = res.render.mock.calls[0][1];
            expect(datos.cuentasPagadas).toHaveLength(2);
            expect(datos.cuentasPagadas.map(c => c.id)).toEqual([15, 16]);
        });

        it('ignora ids inválidos y cuentas que no existen', async () => {
            turnoService.obtenerTurnoActivo.mockResolvedValue({ id: 7 });
            const mesero = { id: 5, nombre: 'Juan', apellidos: 'Perez', rol: 'dependiente', activo: 1 };
            // 1 mesero · 2 pedido (vacío: cuenta inexistente) · 3 mesas · 4 stats
            db.query.mockImplementation(async () => {
                const n = db.query.mock.calls.length;
                if (n === 1) return [[mesero], []];
                if (n === 2) return [[]];
                if (n === 3) return [[]];
                return [[{ total_mesas: 0, mesas_ocupadas: 0, pedidos_pendientes: 0, en_preparacion: 0, ventas_del_turno: 0 }], []];
            });

            const { req, res } = crearReqRes({
                query: { mesero: '5', 'cuenta-pagada': 'abc, , 99x' },
                user: { id: 1, rol: 'administrador' }
            });
            await controller.viewDashboardMesero(req, res);

            const datos = res.render.mock.calls[0][1];
            expect(datos.cuentasPagadas).toEqual([]);
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
