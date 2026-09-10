// controllers/posController.test.js
// Verifica la redirección automática cuando la orden supervisada (POS
// mesero, modo visualización) ya fue cobrada por el mesero: el
// administrador debe volver al salón del mesero con el resumen de la
// cuenta pagada.
jest.mock('../config/db', () => ({ query: jest.fn(), getConnection: jest.fn() }));
jest.mock('../services/inventarioService', () => ({ descontarInventarioPorPedido: jest.fn() }));
jest.mock('../services/settingService', () => ({ get: jest.fn() }));
jest.mock('../services/precioService', () => ({
    obtenerContextoCobro: jest.fn(),
    aplicarPrecios: jest.fn(() => []),
    validarPrecioConfigurado: jest.fn((platillo) => platillo.precio)
}));

const pool = require('../config/db');
const SettingService = require('../services/settingService');
const PrecioService = require('../services/precioService');
const { viewPOS, initOrderManual, abrirOObtenerPedidoMesa, initOrderQR, apiSaveOrder } = require('./posController');

function crearReqRes({ url = '/pos/15', query = {}, params = {} } = {}) {
    const req = { url, query, params, user: { id: 1, rol: 'administrador', nombre: 'Admin' } };
    const res = {
        render: jest.fn(),
        redirect: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn()
    };
    return { req, res };
}

const PEDIDO_CERRADO = {
    id: 15, id_mesa: 3, turno_servicio_id: 7, mesa_numero: '5',
    mesero_nombre: 'Juan Perez', id_usuario_mesero: 5,
    fecha_cierre: new Date('2026-08-29T14:32:00'), estado_pago: 'pagado'
};

const PEDIDO_ABIERTO = { ...PEDIDO_CERRADO, fecha_cierre: null, estado_pago: 'pendiente' };

describe('posController.viewPOS · supervisión con cuenta cerrada', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        SettingService.get.mockResolvedValue(0);          // factura_impuesto / monitores
        PrecioService.obtenerContextoCobro.mockResolvedValue({ carta: 'CUP', es_zelle: false, moneda_codigo: 'CUP' });
    });

    it('redirige al salón del mesero con el resumen de la cuenta pagada', async () => {
        pool.query.mockResolvedValue([[PEDIDO_CERRADO], []]);

        const { req, res } = crearReqRes({ query: { vista: '1', mesero: '5' }, params: { id_pedido: '15' } });
        await viewPOS(req, res);

        expect(res.redirect).toHaveBeenCalledTimes(1);
        expect(res.redirect).toHaveBeenCalledWith('/admin/pos-mesero/ver?mesero=5&cuenta-pagada=15&autorefresco=1');
        expect(res.render).not.toHaveBeenCalled();
    });

    it('usa el mesero de la orden si la URL no trae el parámetro', async () => {
        pool.query.mockResolvedValue([[PEDIDO_CERRADO], []]);

        const { req, res } = crearReqRes({ query: { vista: '1' }, params: { id_pedido: '15' } });
        await viewPOS(req, res);

        expect(res.redirect).toHaveBeenCalledWith('/admin/pos-mesero/ver?mesero=5&cuenta-pagada=15&autorefresco=1');
    });

    it('NO redirige si la orden sigue abierta (se renderiza la supervisión)', async () => {
        pool.query.mockImplementation(async () => {
            const n = pool.query.mock.calls.length;
            if (n === 1) return [[PEDIDO_ABIERTO], []];  // pedido
            if (n === 2) return [[], []];                 // detalles
            return [[], []];                              // catálogo
        });

        const { req, res } = crearReqRes({ query: { vista: '1', mesero: '5' }, params: { id_pedido: '15' } });
        await viewPOS(req, res);

        expect(res.redirect).not.toHaveBeenCalled();
        expect(res.render).toHaveBeenCalledWith('pos', expect.objectContaining({ soloVisualizacion: true }));
    });

    it('NO redirige en el POS operativo del mesero (aunque esté cerrada)', async () => {
        pool.query.mockImplementation(async () => {
            const n = pool.query.mock.calls.length;
            if (n === 1) return [[PEDIDO_CERRADO], []];
            return [[], []];
        });

        const { req, res } = crearReqRes({ params: { id_pedido: '15' } });
        await viewPOS(req, res);

        expect(res.redirect).not.toHaveBeenCalled();
        expect(res.render).toHaveBeenCalledWith('pos', expect.objectContaining({ soloVisualizacion: false }));
    });
});

// ---------------------------------------------------------------------------
// Titularidad del salón: quien opera una mesa asignada a otro dependiente
// (p. ej. un capitán) NO suplanta al titular en el pedido; el pedido queda
// a nombre del asignado y el operador se anota para la auditoría.
// ---------------------------------------------------------------------------
function crearReqResAPI({ body = {}, params = {}, query = {}, user = null } = {}) {
    const req = { body, params, query, user, flash: jest.fn() };
    const res = {
        render: jest.fn(),
        redirect: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        send: jest.fn()
    };
    return { req, res };
}

// Enruta cada SQL al resultado que le corresponde según un fragmento único.
function simularPool(handlers) {
    pool.query.mockImplementation(async (sql) => {
        const texto = String(sql);
        for (const [fragmento, valor] of handlers) {
            if (texto.includes(fragmento)) {
                return typeof valor === 'function' ? valor(sql) : valor;
            }
        }
        throw new Error(`SQL sin mock en la prueba: ${texto.slice(0, 120)}`);
    });
}

function llamadaInsertPedidos() {
    const llamada = pool.query.mock.calls.find(([sql]) =>
        String(sql).includes('INSERT INTO pedidos'));
    expect(llamada).toBeDefined();
    return llamada;
}

const CAPITAN = { id: 9, rol: 'capitan', nombre: 'Capitán' };
const ASIGNADO_JUAN = { id: 5, usuario: 'juan', nombre: 'Juan', apellidos: 'Perez' };

describe('posController · titularidad del salón (capitán sobre mesa ajena)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        SettingService.get.mockImplementation(async (clave, valorPorDefecto) => valorPorDefecto);
        PrecioService.obtenerContextoCobro.mockResolvedValue({ carta: 'CUP', es_zelle: false, moneda_codigo: 'CUP' });
    });

    it('initOrderManual atribuye la orden al dependiente asignado, no al capitán', async () => {
        simularPool([
            ['FROM turnos_servicio', [[{ id: 7 }], []]],
            ['COUNT(dp.id)', [[], []]],
            ['detalle_asignacion_mesa', [[ASIGNADO_JUAN], []]],
            ['INSERT INTO pedidos', [{ insertId: 99 }]],
            ['UPDATE mesas', [[], []]]
        ]);

        const { req, res } = crearReqResAPI({ body: { id_mesa: 3 }, user: CAPITAN });
        await initOrderManual(req, res);

        const [, params] = llamadaInsertPedidos();
        expect(params).toEqual([3, 5, 7]); // mesa 3 · titular Juan (5) · turno 7
        expect(req.auditoriaExtra).toEqual({
            mesero_titular_id: 5,
            mesero_titular_nombre: 'Juan Perez',
            operado_por_id: 9
        });
        expect(res.json).toHaveBeenCalledWith({ success: true, pedidoId: 99 });
    });

    it('initOrderManual usa al operador cuando la mesa no tiene asignado', async () => {
        simularPool([
            ['FROM turnos_servicio', [[{ id: 7 }], []]],
            ['COUNT(dp.id)', [[], []]],
            ['detalle_asignacion_mesa', [[], []]],
            ['INSERT INTO pedidos', [{ insertId: 99 }]],
            ['UPDATE mesas', [[], []]]
        ]);

        const { req, res } = crearReqResAPI({ body: { id_mesa: 3 }, user: CAPITAN });
        await initOrderManual(req, res);

        const [, params] = llamadaInsertPedidos();
        expect(params).toEqual([3, 9, 7]);
        expect(req.auditoriaExtra).toBeUndefined();
        expect(res.json).toHaveBeenCalledWith({ success: true, pedidoId: 99 });
    });

    it('no anota auditoría extra cuando el operador ya es el titular', async () => {
        simularPool([
            ['FROM turnos_servicio', [[{ id: 7 }], []]],
            ['COUNT(dp.id)', [[], []]],
            ['detalle_asignacion_mesa', [[{ id: 9, usuario: 'cap', nombre: 'El', apellidos: 'Capitán' }], []]],
            ['INSERT INTO pedidos', [{ insertId: 99 }]],
            ['UPDATE mesas', [[], []]]
        ]);

        const { req, res } = crearReqResAPI({ body: { id_mesa: 3 }, user: CAPITAN });
        await initOrderManual(req, res);

        const [, params] = llamadaInsertPedidos();
        expect(params).toEqual([3, 9, 7]);
        expect(req.auditoriaExtra).toBeUndefined();
        expect(res.json).toHaveBeenCalledWith({ success: true, pedidoId: 99 });
    });

    it('abrirOObtenerPedidoMesa atribuye al asignado', async () => {
        simularPool([
            ['COUNT(dp.id)', [[], []]],
            ['FROM turnos_servicio', [[{ id: 7 }], []]],
            ['detalle_asignacion_mesa', [[ASIGNADO_JUAN], []]],
            ['INSERT INTO pedidos', [{ insertId: 99 }]],
            ['UPDATE mesas', [[], []]]
        ]);

        const { req, res } = crearReqResAPI({ params: { idMesa: '4' }, query: {}, user: CAPITAN });
        await abrirOObtenerPedidoMesa(req, res);

        const [, params] = llamadaInsertPedidos();
        expect(params).toEqual(['4', 5, 7]);
        expect(req.auditoriaExtra.mesero_titular_id).toBe(5);
        expect(res.redirect).toHaveBeenCalledWith('/pos/99');
    });

    it('initOrderQR atribuye al asignado', async () => {
        simularPool([
            ['FROM auto_creacion_orden', [[{ id_mesa: 6 }], []]],
            ['FROM turnos_servicio', [[{ id: 7 }], []]],
            ['FROM pedidos', [[], []]],
            ['detalle_asignacion_mesa', [[ASIGNADO_JUAN], []]],
            ['INSERT INTO pedidos', [{ insertId: 99 }]],
            ['UPDATE mesas', [[], []]],
            ['DELETE FROM auto_creacion_orden', [[], []]]
        ]);

        const { req, res } = crearReqResAPI({ params: { hash: 'h1' }, user: CAPITAN });
        await initOrderQR(req, res);

        const [, params] = llamadaInsertPedidos();
        expect(params).toEqual([6, 5, 7]);
        expect(req.auditoriaExtra.mesero_titular_id).toBe(5);
        expect(res.json).toHaveBeenCalledWith({ success: true, pedidoId: 99 });
    });

    it('apiSaveOrder atribuye la orden nueva al asignado', async () => {
        simularPool([
            ['FROM mesas WHERE', [[{ id: 3 }], []]],
            ['FROM turnos_servicio', [[{ id: 7 }], []]],
            ['FROM platillos_menu', [[{ id: 1, nombre: 'Mojito', precio: 10, precio_alt: null, precio_usd: null, tipo_categoria: 'COCINA' }], []]],
            ['detalle_asignacion_mesa', [[ASIGNADO_JUAN], []]],
            ['INSERT INTO pedidos', [{ insertId: 50 }]],
            ['UPDATE mesas', [[], []]],
            ['INSERT INTO detalles_pedido', [{ insertId: 101 }]],
            ['COALESCE(SUM(cantidad * precio_unitario), 0)', [[{ subtotal: 20 }], []]],
            ['UPDATE pedidos SET subtotal', [[], []]]
        ]);

        const { req, res } = crearReqResAPI({
            body: { id_mesa: 3, items: [{ id: 1, cantidad: 2, es_platillo_dia: false }] },
            user: CAPITAN
        });
        await apiSaveOrder(req, res);

        const [, params] = llamadaInsertPedidos();
        expect(params).toEqual([3, 5, 7]);
        expect(req.auditoriaExtra.mesero_titular_id).toBe(5);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, id_pedido: 50 }));
    });

    it('viewPOS indica cuando el operador no es el titular de la orden', async () => {
        pool.query.mockImplementation(async () => {
            const n = pool.query.mock.calls.length;
            if (n === 1) return [[PEDIDO_ABIERTO], []];
            return [[], []];
        });

        const { req, res } = crearReqRes({ params: { id_pedido: '15' } }); // admin id 1 ≠ titular 5
        await viewPOS(req, res);

        expect(res.render).toHaveBeenCalledWith('pos', expect.objectContaining({
            meseroDeLaOrden: 'Juan Perez',
            operadorEsTitular: false
        }));
    });

    it('viewPOS indica true cuando el operador sí es el titular', async () => {
        pool.query.mockImplementation(async () => {
            const n = pool.query.mock.calls.length;
            if (n === 1) return [[PEDIDO_ABIERTO], []];
            return [[], []];
        });

        const req = { url: '/pos/15', query: {}, params: { id_pedido: '15' }, user: { id: 5, rol: 'dependiente', nombre: 'Juan' } };
        const res = { render: jest.fn(), redirect: jest.fn(), status: jest.fn().mockReturnThis(), send: jest.fn() };
        await viewPOS(req, res);

        expect(res.render).toHaveBeenCalledWith('pos', expect.objectContaining({ operadorEsTitular: true }));
    });
});
