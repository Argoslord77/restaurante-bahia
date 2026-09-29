// services/pedidoService.test.js
// Portadas de arena/01a07166: listado Ventas/Pedidos por rango + reporte.
// El controlador local las usa; sin ellas el apartado pedidos/ventas falla.
jest.mock('../config/db', () => ({ query: jest.fn(), getConnection: jest.fn() }));
jest.mock('./recetaService', () => ({}));
jest.mock('../config/logger', () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }));
jest.mock('./orderEngineService', () => ({ canEditOrder: () => true }));
jest.mock('./aperturaMesaService', () => ({ autorizarApertura: jest.fn() }));
jest.mock('../models/pedidoModel', () => ({ create: jest.fn(), actualizarEstadoMesa: jest.fn() }));

const db = require('../config/db');
const PedidoModel = require('../models/pedidoModel');
const AperturaMesaService = require('./aperturaMesaService');
const pedidoService = require('./pedidoService');

beforeEach(() => jest.clearAllMocks());

describe('pedidoService.obtenerPedidosPorRango', () => {
    const PEDIDOS = [
        { id: 1, total: 100, propina: 10, excedente_cobro: 5, estado_pedido: 'abierto', estado_pago: 'pagado' },
        { id: 2, total: 50, propina: 0, excedente_cobro: 0, estado_pedido: 'abierto', estado_pago: 'pendiente' },
        { id: 3, total: 20, propina: 0, excedente_cobro: 0, estado_pedido: 'cancelado', estado_pago: 'pendiente' }
    ];

    function simularRango(pedidos = PEDIDOS) {
        db.query
            .mockResolvedValueOnce([[...pedidos], []]) // pedidos
            .mockResolvedValueOnce([[{ id_pedido: 1, cantidad: 2 }], []]) // ítems
            .mockResolvedValueOnce([[{ pedido_id: 1, monto: 100 }], []]) // pagos
            .mockResolvedValueOnce([[{ id: 7, estado: 'abierto' }], []]); // turnos
    }

    it('devuelve pedidos, desgloses, kpis y turnos del rango', async () => {
        simularRango();
        const r = await pedidoService.obtenerPedidosPorRango('2026-09-28', '2026-09-28');

        expect(r.pedidos).toHaveLength(3);
        expect(r.itemsPorPedido).toEqual({ 1: [{ id_pedido: 1, cantidad: 2 }] });
        expect(r.pagosPorPedido).toEqual({ 1: [{ pedido_id: 1, monto: 100 }] });
        expect(r.turnos).toEqual([{ id: 7, estado: 'abierto' }]);
        expect(r.kpis).toMatchObject({
            total: 3, cobrados: 1, en_curso: 1, cancelados: 1,
            ventas: 100, propinas: 10, excedentes: 5, en_curso_importe: 50,
            ticket_promedio: 100
        });
        const [sql, params] = db.query.mock.calls[0];
        expect(String(sql)).toContain('BETWEEN ? AND ?');
        expect(params).toEqual(['2026-09-28', '2026-09-28']);
    });

    it('sin pedidos no consulta ítems ni pagos', async () => {
        db.query
            .mockResolvedValueOnce([[], []])
            .mockResolvedValueOnce([[], []]);
        const r = await pedidoService.obtenerPedidosPorRango('2026-09-28', '2026-09-28');

        expect(r).toMatchObject({ pedidos: [], itemsPorPedido: {}, pagosPorPedido: {}, turnos: [] });
        expect(db.query).toHaveBeenCalledTimes(2);
    });
});

describe('pedidoService.obtenerReportePedido', () => {
    function simularReporte() {
        db.query
            .mockResolvedValueOnce([[{ n: 0 }], []]) // sin tabla ubicacion_mesa
            .mockResolvedValueOnce([[{ id: 1, mesa_numero: 'Nro 3', id_mesa: 3, turno_servicio_id: 7,
                estado_pago: 'pagado', creado_en: '2026-09-28 12:00:00' }], []]) // pedido
            .mockResolvedValueOnce([[
                { id: 10, cantidad: 2, precio_unitario: 50, estado_item: 'entregado', entrega_seg: 300, creado_en: '2026-09-28 12:05:00', entregado_en: '2026-09-28 12:10:00' },
                { id: 11, cantidad: 1, precio_unitario: 20, estado_item: 'cancelado', entrega_seg: null, creado_en: '2026-09-28 12:05:00', entregado_en: null }
            ], []]) // ítems
            .mockResolvedValueOnce([[{ id: 5, metodo_pago: 'efectivo', moneda_codigo: 'CUP',
                creado_en: '2026-09-28 13:00:00' }], []]); // pagos
    }

    it('devuelve pedido, ítems, pagos, kpis y línea de tiempo', async () => {
        simularReporte();
        const r = await pedidoService.obtenerReportePedido(1);

        expect(r.pedido).toMatchObject({ id: 1 });
        expect(r.items).toHaveLength(2);
        expect(r.pagos).toHaveLength(1);
        expect(r.kpis).toMatchObject({
            items_total: 2, entregados: 1, cancelados: 1, en_proceso: 0,
            importe_cancelado: 20, entrega_media_seg: 300, entrega_max_seg: 300
        });
        expect(r.eventos.length).toBeGreaterThanOrEqual(3);
        expect(r.eventos[0]).toMatchObject({ titulo: 'Apertura del servicio' });
    });

    it('devuelve null si el pedido no existe', async () => {
        db.query
            .mockResolvedValueOnce([[{ n: 0 }], []])
            .mockResolvedValueOnce([[], []]);
        await expect(pedidoService.obtenerReportePedido(999)).resolves.toBeNull();
    });
});

describe('pedidoService.crearNuevoPedido · comensales', () => {
    function conexionLibre() {
        return {
            query: jest.fn(async () => [[{ estado: 'libre' }], []]),
            beginTransaction: jest.fn(),
            commit: jest.fn(),
            rollback: jest.fn(),
            release: jest.fn()
        };
    }

    it('pasa los comensales al modelo (conserva la puerta V14)', async () => {
        const conn = conexionLibre();
        db.getConnection.mockResolvedValue(conn);
        PedidoModel.create.mockResolvedValue(99);

        const id = await pedidoService.crearNuevoPedido(3, 5, 7, 4);

        expect(id).toBe(99);
        expect(AperturaMesaService.autorizarApertura).toHaveBeenCalledWith(3, 7);
        expect(PedidoModel.create).toHaveBeenCalledWith(3, 5, 7, conn, 4);
        expect(conn.commit).toHaveBeenCalled();
    });

    it('sin comensales envía null (el modelo aplica 1 por defecto)', async () => {
        const conn = conexionLibre();
        db.getConnection.mockResolvedValue(conn);
        PedidoModel.create.mockResolvedValue(100);

        await pedidoService.crearNuevoPedido(3, 5, 7);

        expect(PedidoModel.create).toHaveBeenCalledWith(3, 5, 7, conn, null);
    });
});
