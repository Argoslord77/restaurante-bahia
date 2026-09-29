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
const { viewPOS, initOrderManual, abrirOObtenerPedidoMesa, initOrderQR, apiSaveOrder, obtenerAlertasPendientes, procesarCobroAvanzado, guardarBorrador, obtenerBorrador } = require('./posController');

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
            ['COUNT(*) AS n', [[{ n: 6 }], []]],
            ['FROM mesas WHERE', [[{ id: 3, numero: 'Nro 3', capacidad: 2, estado: 'libre' }], []]],
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
            ['COUNT(*) AS n', [[{ n: 6 }], []]],
            ['FROM mesas WHERE', [[{ id: 3, numero: 'Nro 3', capacidad: 2, estado: 'libre' }], []]],
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
            ['COUNT(*) AS n', [[{ n: 6 }], []]],
            ['FROM mesas WHERE', [[{ id: 3, numero: 'Nro 3', capacidad: 2, estado: 'libre' }], []]],
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
            ['COUNT(*) AS n', [[{ n: 6 }], []]],
            ['FROM mesas WHERE', [[{ id: 3, numero: 'Nro 3', capacidad: 2, estado: 'libre' }], []]],
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
            ['COUNT(*) AS n', [[{ n: 6 }], []]],
            ['FROM mesas WHERE', [[{ id: 3, numero: 'Nro 3', capacidad: 2, estado: 'libre' }], []]],
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
            ['FROM mesas WHERE', [[{ id: 3, numero: 'Nro 3', capacidad: 2, estado: 'libre' }], []]],
            ['FROM turnos_servicio', [[{ id: 7 }], []]],
            ['FROM platillos_menu', [[{ id: 1, nombre: 'Mojito', precio: 10, precio_alt: null, precio_usd: null, tipo_categoria: 'COCINA' }], []]],
            ['COUNT(*) AS n', [[{ n: 6 }], []]],
            ['FROM mesas WHERE', [[{ id: 3, numero: 'Nro 3', capacidad: 2, estado: 'libre' }], []]],
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

    it('initOrderManual se niega sin distribución del día (409 SIN_DISTRIBUCION)', async () => {
        simularPool([
            ['FROM turnos_servicio', [[{ id: 7 }], []]],
            ['COUNT(dp.id)', [[], []]],
            ['COUNT(*) AS n', [[{ n: 0 }], []]]
        ]);

        const { req, res } = crearReqResAPI({ body: { id_mesa: 3 }, user: CAPITAN });
        await initOrderManual(req, res);

        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: false, codigo: 'SIN_DISTRIBUCION'
        }));
        expect(pool.query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO pedidos'))).toBe(false);
    });

    it('initOrderManual se niega en mesa reservada e indica ir a Sentar', async () => {
        simularPool([
            ['FROM turnos_servicio', [[{ id: 7 }], []]],
            ['COUNT(dp.id)', [[], []]],
            ['COUNT(*) AS n', [[{ n: 6 }], []]],
            ['FROM mesas WHERE', [[{ id: 3, numero: 'Nro 3', capacidad: 2, estado: 'reservada' }], []]],
            ['FROM reservas', [[{ cliente_nombre: 'Ana', fecha_corta: '28/09 20:00', comensales: 2 }], []]]
        ]);

        const { req, res } = crearReqResAPI({ body: { id_mesa: 3 }, user: CAPITAN });
        await initOrderManual(req, res);

        expect(res.status).toHaveBeenCalledWith(409);
        const cuerpo = res.json.mock.calls[0][0];
        expect(cuerpo.codigo).toBe('MESA_RESERVADA');
        expect(cuerpo.message).toMatch(/RESERVADA/);
        expect(cuerpo.message).toMatch(/Sentar/);
        expect(pool.query.mock.calls.some(([sql]) => String(sql).includes('INSERT INTO pedidos'))).toBe(false);
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

describe('posController.obtenerAlertasPendientes · ítems listos (V5)', () => {
    let modoToma = 'todos';
    let monitores = true;

    beforeEach(() => {
        jest.clearAllMocks();
        modoToma = 'todos';
        monitores = true;
        SettingService.get.mockImplementation(async (clave, valorPorDefecto) => {
            if (clave === 'habilitar_monitores_elaboracion') return monitores;
            if (clave === 'pos_quien_toma_ordenes') return modoToma;
            return valorPorDefecto;
        });
    });

    const FILA_LISTO = {
        id_detalle: 11, id_pedido: 50, cantidad: 2, nombre: 'Mojito',
        id_mesa: 3, numero_mesa: '3', mesa_ubicacion: 'Terraza'
    };

    function simularAlertas({ listos = [FILA_LISTO] } = {}) {
        simularPool([
            ['FROM notificaciones_mesero', [[{ id: 1, tipo: 'LLAMADA_SERVICIO', mensaje: 'hola', nombre_mesa: '3' }], []]],
            ['FROM pre_pedidos', [[], []]],
            ["estado_item = 'listo'", [[...listos], []]],
            ['FROM reservas r', [[], []]],
            ['FROM borradores_carrito', [[], []]]
        ]);
    }

    function llamadaListos() {
        return pool.query.mock.calls.find(([sql]) => String(sql).includes("estado_item = 'listo'"));
    }

    it('el dependiente recibe los listos de SUS mesas asignadas', async () => {
        simularAlertas();
        const { req, res } = crearReqResAPI({ user: { id: 5, rol: 'dependiente' } });
        req.turnoServicioId = 7;
        await obtenerAlertasPendientes(req, res);

        const llamada = llamadaListos();
        expect(llamada).toBeDefined();
        expect(llamada[0]).toContain('dam.dependiente_id = ?');
        expect(llamada[1]).toEqual([7, 5, 7, 7]);
        const cuerpo = res.json.mock.calls[0][0];
        expect(cuerpo.alertas.itemsListos).toHaveLength(1);
        expect(cuerpo.alertas.itemsListos[0]).toMatchObject({ id_detalle: 11, nombre: 'Mojito' });
        expect(cuerpo.alertas.notificaciones).toHaveLength(1); // sin regresión
    });

    it('el capitán (Solo capitanes) recibe los listos de TODO el salón', async () => {
        modoToma = 'solo_capitanes';
        simularAlertas();
        const { req, res } = crearReqResAPI({ user: { id: 9, rol: 'capitan' } });
        req.turnoServicioId = 7;
        await obtenerAlertasPendientes(req, res);

        const llamada = llamadaListos();
        expect(llamada).toBeDefined();
        expect(llamada[0]).not.toContain('dam.dependiente_id');
        expect(llamada[1]).toEqual([7]);
        expect(res.json.mock.calls[0][0].alertas.itemsListos).toHaveLength(1);
    });

    it('el capitán (modo todos) no recibe listos del salón', async () => {
        simularPool([
            ['FROM notificaciones_mesero', [[], []]],
            ['FROM pre_pedidos', [[], []]],
            ['FROM reservas r', [[], []]],
            ['FROM borradores_carrito', [[], []]]
        ]);
        const { req, res } = crearReqResAPI({ user: { id: 9, rol: 'capitan' } });
        req.turnoServicioId = 7;
        await obtenerAlertasPendientes(req, res);

        expect(llamadaListos()).toBeUndefined();
        expect(res.json.mock.calls[0][0].alertas.itemsListos).toEqual([]);
    });

    it('sin monitores no hay listos aunque haya rol de servicio', async () => {
        monitores = false;
        simularPool([
            ['FROM notificaciones_mesero', [[], []]],
            ['FROM pre_pedidos', [[], []]],
            ['FROM reservas r', [[], []]],
            ['FROM borradores_carrito', [[], []]]
        ]);
        const { req, res } = crearReqResAPI({ user: { id: 5, rol: 'dependiente' } });
        req.turnoServicioId = 7;
        await obtenerAlertasPendientes(req, res);

        expect(llamadaListos()).toBeUndefined();
        expect(res.json.mock.calls[0][0].alertas.itemsListos).toEqual([]);
    });

    it('sin usuario autenticado no hay listos', async () => {
        simularPool([
            ['FROM notificaciones_mesero', [[], []]],
            ['FROM pre_pedidos', [[], []]],
            ['FROM reservas r', [[], []]],
            ['FROM borradores_carrito', [[], []]]
        ]);
        const { req, res } = crearReqResAPI({ user: null });
        req.turnoServicioId = 7;
        await obtenerAlertasPendientes(req, res);

        expect(llamadaListos()).toBeUndefined();
        expect(res.json.mock.calls[0][0].alertas.itemsListos).toEqual([]);
    });
});
describe('posController.obtenerAlertasPendientes · novedades de sala (T5)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        SettingService.get.mockImplementation(async (clave, valorPorDefecto) => {
            if (clave === 'habilitar_monitores_elaboracion') return false;
            if (clave === 'pos_quien_toma_ordenes') return 'todos';
            return valorPorDefecto;
        });
    });

    function simularSala({ pendientes = [], movidas = [] } = {}) {
        simularPool([
            ['FROM notificaciones_mesero', [[], []]],
            ['FROM pre_pedidos', [[], []]],
            ['FROM reservas r', (sql) => (String(sql).includes('actualizado_en')
                ? [[...movidas], []]
                : [[...pendientes], []])],
            ['FROM borradores_carrito', [[], []]]
        ]);
    }

    it('incluye pendientes y movidas recientes de la sala', async () => {
        simularSala({
            pendientes: [{ id: 3, id_mesa: 6, mesa_numero: 'Nro 6', cliente_nombre: 'Ana', comensales: 2, fecha_corta: '28/09 20:00' }],
            movidas: [{ id: 2, id_mesa: 5, mesa_numero: 'Nro 5', cliente_nombre: 'Luis', estado: 'sentada', pedido_id: 77 }]
        });
        const { req, res } = crearReqResAPI({ user: { id: 5, rol: 'dependiente' } });
        req.turnoServicioId = 7;
        await obtenerAlertasPendientes(req, res);

        const cuerpo = res.json.mock.calls[0][0];
        expect(cuerpo.alertas.sala.pendientes).toHaveLength(1);
        expect(cuerpo.alertas.sala.movidas).toHaveLength(1);
        expect(cuerpo.alertas.sala.movidas[0]).toMatchObject({ estado: 'sentada', pedido_id: 77 });
        expect(cuerpo.alertas.notificaciones).toEqual([]);
    });

    it('un fallo de sala no rompe el sondeo', async () => {
        simularPool([
            ['FROM notificaciones_mesero', [[{ id: 1, tipo: 'LLAMADA_SERVICIO', mensaje: 'hola', nombre_mesa: '3' }], []]],
            ['FROM pre_pedidos', [[], []]],
            ['FROM reservas r', () => { throw new Error('ER_NO_SUCH_TABLE'); }]
        ]);
        const { req, res } = crearReqResAPI({ user: { id: 5, rol: 'dependiente' } });
        req.turnoServicioId = 7;
        await obtenerAlertasPendientes(req, res);

        const cuerpo = res.json.mock.calls[0][0];
        expect(cuerpo.success).toBe(true);
        expect(cuerpo.alertas.sala).toEqual({ pendientes: [], movidas: [] });
        expect(cuerpo.alertas.notificaciones).toHaveLength(1);
    });
});

describe('posController.procesarCobroAvanzado · excedente del cobro', () => {
    const PEDIDO = { id: 15, id_mesa: 3, turno_servicio_id: 7, carta: 'CUP', numero_mesa: '5' };
    let conexion;

    function pagoAbono(monto) {
        return { metodo_pago: 'efectivo', moneda_id: 1, monto_moneda_origen: monto, referencia_transaccion: '' };
    }

    function cobroReqRes(body) {
        const req = { params: { id_pedido: '15' }, body, user: { id: 2, rol: 'cajero' } };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        return { req, res };
    }

    function paramsDe(sqlFragmento) {
        const llamada = conexion.query.mock.calls.find(([sql]) => String(sql).includes(sqlFragmento));
        return llamada ? llamada[1] : null;
    }

    beforeEach(() => {
        jest.clearAllMocks();
        SettingService.get.mockResolvedValue(0); // factura_impuesto
        PrecioService.obtenerContextoCobro.mockResolvedValue({
            carta: 'CUP', es_zelle: false, moneda_codigo: 'CUP', moneda_id: 1, factor_cambio: 1
        });
        conexion = {
            query: jest.fn(async (sql) => {
                // A1: el candado FOR UPDATE re-lee el estado dentro de la tx.
                if (String(sql).includes('FOR UPDATE')) return [[{ estado_pago: 'pendiente' }], []];
                return [[], []];
            }),
            beginTransaction: jest.fn(),
            commit: jest.fn(),
            rollback: jest.fn(),
            release: jest.fn()
        };
        pool.getConnection.mockResolvedValue(conexion);
        pool.query.mockImplementation(async (sql) => {
            const texto = String(sql);
            if (texto.includes('numero_mesa')) return [[{ ...PEDIDO }], []];
            if (texto.includes('SUM(cantidad * precio_unitario)')) return [[{ subtotal: 100 }], []];
            if (texto.includes('FROM monedas m')) return [[{ id: 1, codigo: 'CUP', simbolo: '$', factor_cambio: 1 }], []];
            if (texto.includes('UPDATE mesas')) return [[], []];
            return [[{ total: 0 }], []]; // pendientes de entrega
        });
    });

    it('sobrepago sin propina explícita: el excedente queda como propina', async () => {
        const { req, res } = cobroReqRes({ pagos: [pagoAbono(120)], descuento: 0, recargo: 0, propina: 0 });

        await procesarCobroAvanzado(req, res);

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, excedente: 20, propina: 20 }));
        expect(paramsDe('UPDATE pedidos')[4]).toBe(20); // propina guardada
        expect(paramsDe('INSERT INTO pagos_pedido').slice(4, 6)).toEqual([120, 120]); // abono íntegro
    });

    it('pago exacto con propina explícita no genera excedente', async () => {
        const { req, res } = cobroReqRes({ pagos: [pagoAbono(110)], descuento: 0, recargo: 0, propina: 10 });

        await procesarCobroAvanzado(req, res);

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, excedente: 0, propina: 10 }));
        expect(paramsDe('UPDATE pedidos')[4]).toBe(10);
    });

    it('propina explícita más excedente se acumulan', async () => {
        const { req, res } = cobroReqRes({ pagos: [pagoAbono(125)], descuento: 0, recargo: 0, propina: 10 });

        await procesarCobroAvanzado(req, res);

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, excedente: 15, propina: 25 }));
        expect(paramsDe('UPDATE pedidos')[4]).toBe(25);
    });

    it('pago insuficiente se rechaza y no toca el pedido', async () => {
        const { req, res } = cobroReqRes({ pagos: [pagoAbono(90)], descuento: 0, recargo: 0, propina: 0 });

        await procesarCobroAvanzado(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
        expect(paramsDe('UPDATE pedidos')).toBeNull();
    });

    it('factura a crédito conserva la propina explícita sin excedente', async () => {
        const { req, res } = cobroReqRes({ es_factura_credito: true, descuento: 0, recargo: 0, propina: 5 });

        await procesarCobroAvanzado(req, res);

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, excedente: 0, propina: 5 }));
        const params = paramsDe('UPDATE pedidos');
        expect(params[0]).toBe('facturado');
        expect(params[4]).toBe(5);
    });

    it('en carta ZELLE el excedente se convierte a moneda local', async () => {
        PrecioService.obtenerContextoCobro.mockResolvedValue({
            carta: 'ZELLE', es_zelle: true, moneda_codigo: 'ZELLE', moneda_id: 2, factor_cambio: 2
        });
        const { req, res } = cobroReqRes({ pagos: [{ metodo_pago: 'transferencia', moneda_id: 2, monto_moneda_origen: 110, referencia_transaccion: '' }], descuento: 0, recargo: 0, propina: 0 });

        await procesarCobroAvanzado(req, res);

        // Diferencia 10 en origen x tasa 2 = 20 locales de propina.
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, excedente: 20, propina: 20 }));
    });
});

describe('posController.procesarCobroAvanzado · candado anti doble-cobro (A1)', () => {
    const PEDIDO = { id: 15, id_mesa: 3, turno_servicio_id: 7, carta: 'CUP', numero_mesa: '5' };
    let conexion;

    function cobroReqRes(body) {
        const req = { params: { id_pedido: '15' }, body, user: { id: 2, rol: 'cajero' } };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        return { req, res };
    }

    const bodyOk = () => ({
        pagos: [{ metodo_pago: 'efectivo', moneda_id: 1, monto_moneda_origen: 100, referencia_transaccion: '' }],
        descuento: 0, recargo: 0, propina: 0
    });

    function preparar(estadoBloqueo) {
        jest.clearAllMocks();
        SettingService.get.mockResolvedValue(0);
        PrecioService.obtenerContextoCobro.mockResolvedValue({
            carta: 'CUP', es_zelle: false, moneda_codigo: 'CUP', moneda_id: 1, factor_cambio: 1
        });
        conexion = {
            query: jest.fn(async (sql) => {
                if (String(sql).includes('FOR UPDATE')) return [[{ estado_pago: estadoBloqueo }], []];
                return [[], []];
            }),
            beginTransaction: jest.fn(),
            commit: jest.fn(),
            rollback: jest.fn(),
            release: jest.fn()
        };
        pool.getConnection.mockResolvedValue(conexion);
        pool.query.mockImplementation(async (sql) => {
            const texto = String(sql);
            if (texto.includes('numero_mesa')) return [[{ ...PEDIDO }], []];
            if (texto.includes('SUM(cantidad * precio_unitario)')) return [[{ subtotal: 100 }], []];
            if (texto.includes('FROM monedas m')) return [[{ id: 1, codigo: 'CUP', simbolo: '$', factor_cambio: 1 }], []];
            return [[{ total: 0 }], []]; // pendientes de entrega
        });
    }

    it('bloquea la fila del pedido (FOR UPDATE) antes de cobrar', async () => {
        preparar('pendiente');
        const { req, res } = cobroReqRes(bodyOk());
        await procesarCobroAvanzado(req, res);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        const llamadas = conexion.query.mock.calls;
        const sel = llamadas.find(([sql]) => String(sql).includes('FOR UPDATE'));
        expect(sel).toBeTruthy();
        const idxUpdate = llamadas.findIndex(([sql]) => String(sql).includes('UPDATE pedidos'));
        expect(llamadas.indexOf(sel)).toBeLessThan(idxUpdate);
    });

    it('segundo cobro (ya pagado) → 409 sin duplicar pagos', async () => {
        preparar('pagado');
        const { req, res } = cobroReqRes(bodyOk());
        await procesarCobroAvanzado(req, res);
        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, ya_cobrado: true }));
        expect(conexion.rollback).toHaveBeenCalled();
        expect(conexion.commit).not.toHaveBeenCalled();
        const inserts = conexion.query.mock.calls.filter(([sql]) => String(sql).includes('INSERT INTO pagos_pedido'));
        expect(inserts).toHaveLength(0);
    });

    it('pendiente_pago/facturado/cortesia también se rechazan con 409', async () => {
        for (const est of ['pendiente_pago', 'facturado', 'cortesia']) {
            preparar(est);
            const { req, res } = cobroReqRes(bodyOk());
            await procesarCobroAvanzado(req, res);
            expect(res.status).toHaveBeenCalledWith(409);
        }
    });

    it('A6: la mesa se libera dentro de la transacción', async () => {
        preparar('pendiente');
        const { req, res } = cobroReqRes(bodyOk());
        await procesarCobroAvanzado(req, res);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        const mesaTx = conexion.query.mock.calls.find(([sql]) => String(sql).includes("UPDATE mesas SET estado = 'libre'"));
        expect(mesaTx).toBeTruthy();
        expect(conexion.commit).toHaveBeenCalled();
        const mesaPool = pool.query.mock.calls.find(([sql]) => String(sql).includes('UPDATE mesas'));
        expect(mesaPool).toBeFalsy();
    });
});

// ---------------------------------------------------------------------------
// T6: cobro restringido a capitanes en modo 'solo_capitanes'.
// ---------------------------------------------------------------------------
describe('posController.viewPOS · bandera puedeCobrarOrden (T6)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        pool.query.mockImplementation(async () => {
            const n = pool.query.mock.calls.length;
            if (n === 1) return [[PEDIDO_ABIERTO], []];
            if (n === 2) return [[], []];
            return [[], []];
        });
        PrecioService.obtenerContextoCobro.mockResolvedValue({ carta: 'CUP', es_zelle: false, moneda_codigo: 'CUP' });
    });

    function modo(m) {
        SettingService.get.mockImplementation(async (clave, def) =>
            clave === 'pos_quien_toma_ordenes' ? m : def);
    }

    it('dependiente en modo solo_capitanes: no puede cobrar ni tomar', async () => {
        modo('solo_capitanes');
        const { req, res } = crearReqRes({ params: { id_pedido: '15' } });
        req.user = { id: 5, rol: 'dependiente' };
        await viewPOS(req, res);
        expect(res.render).toHaveBeenCalledWith('pos', expect.objectContaining({
            puedeCobrarOrden: false, puedeTomarOrdenes: false
        }));
    });

    it('dependiente en modo todos: sí puede cobrar', async () => {
        modo('todos');
        const { req, res } = crearReqRes({ params: { id_pedido: '15' } });
        req.user = { id: 5, rol: 'dependiente' };
        await viewPOS(req, res);
        expect(res.render).toHaveBeenCalledWith('pos', expect.objectContaining({ puedeCobrarOrden: true }));
    });

    it('cajero en modo solo_capitanes: conserva el cobro', async () => {
        modo('solo_capitanes');
        const { req, res } = crearReqRes({ params: { id_pedido: '15' } });
        req.user = { id: 2, rol: 'cajero' };
        await viewPOS(req, res);
        expect(res.render).toHaveBeenCalledWith('pos', expect.objectContaining({ puedeCobrarOrden: true }));
    });
});

describe('posController.procesarCobroAvanzado · candado de cobro (T6)', () => {
    beforeEach(() => jest.clearAllMocks());

    function modo(m) {
        SettingService.get.mockImplementation(async (clave, def) =>
            clave === 'pos_quien_toma_ordenes' ? m : def);
    }

    it('403 para el dependiente en modo solo_capitanes (sin tocar la BD)', async () => {
        modo('solo_capitanes');
        const { req, res } = crearReqResAPI({
            params: { id_pedido: '15' }, body: { pagos: [] }, user: { id: 5, rol: 'dependiente' }
        });
        await procesarCobroAvanzado(req, res);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: false, codigo: 'COBRO_SOLO_CAPITANES'
        }));
        expect(pool.getConnection).not.toHaveBeenCalled();
        expect(pool.query).not.toHaveBeenCalled();
    });

    it('el capitán supera el candado en modo solo_capitanes', async () => {
        modo('solo_capitanes');
        const { req, res } = crearReqResAPI({
            params: { id_pedido: '15' }, body: { pagos: [] }, user: { id: 9, rol: 'capitan' }
        });
        await procesarCobroAvanzado(req, res);
        expect(res.status).not.toHaveBeenCalledWith(403);
        expect(pool.query).toHaveBeenCalled(); // superó el candado: tocó la BD
    });

    it('el dependiente cobra normal en modo todos', async () => {
        modo('todos');
        const { req, res } = crearReqResAPI({
            params: { id_pedido: '15' }, body: { pagos: [] }, user: { id: 5, rol: 'dependiente' }
        });
        await procesarCobroAvanzado(req, res);
        expect(res.status).not.toHaveBeenCalledWith(403);
        expect(pool.query).toHaveBeenCalled(); // superó el candado: tocó la BD
    });
});

// ---------------------------------------------------------------------------
// T7: borrador del carrito compartido capitán → dependiente.
// ---------------------------------------------------------------------------
describe('posController.borrador · guardar y leer (T7)', () => {
    beforeEach(() => jest.clearAllMocks());

    function modo(m) {
        SettingService.get.mockImplementation(async (clave, def) =>
            clave === 'pos_quien_toma_ordenes' ? m : def);
    }

    it('403 al guardar si no puede tomar órdenes (dependiente en solo_capitanes)', async () => {
        modo('solo_capitanes');
        const { req, res } = crearReqResAPI({
            body: { id_pedido: 50, id_mesa: 3, items: [{ id: 1, cantidad: 1 }] },
            user: { id: 5, rol: 'dependiente' }
        });
        await guardarBorrador(req, res);
        expect(res.status).toHaveBeenCalledWith(403);
        expect(pool.query).not.toHaveBeenCalled();
    });

    it('el capitán guarda su borrador (upsert)', async () => {
        modo('solo_capitanes');
        pool.query.mockResolvedValue([{ affectedRows: 1 }]);
        const { req, res } = crearReqResAPI({
            body: { id_pedido: 50, id_mesa: 3, items: [{ id: 1, nombre: 'Mojito', precio: 10, cantidad: 2 }] },
            user: { id: 9, rol: 'capitan' }
        });
        await guardarBorrador(req, res);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, pedidoId: 50, n: 1 }));
        expect(String(pool.query.mock.calls[0][0])).toContain('ON DUPLICATE KEY UPDATE');
    });

    it('leer devuelve el borrador vigente o null', async () => {
        pool.query.mockResolvedValue([[{ id_pedido: 50, id_mesa: 3, actualizado_en: '2026-09-28 12:00:00',
            items_json: JSON.stringify([{ id: 1, cantidad: 2 }]), autor: 'Carlos' }], []]);
        const { req, res } = crearReqResAPI({ params: { id_pedido: '50' }, user: { id: 5, rol: 'dependiente' } });
        await obtenerBorrador(req, res);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: true, borrador: expect.objectContaining({ id_pedido: 50 })
        }));
        pool.query.mockResolvedValue([[], []]);
        const v = crearReqResAPI({ params: { id_pedido: '51' }, user: { id: 5, rol: 'dependiente' } });
        await obtenerBorrador(v.req, v.res);
        expect(v.res.json).toHaveBeenCalledWith({ success: true, borrador: null });
    });
});

describe('posController.obtenerAlertasPendientes · borradores (T7)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        SettingService.get.mockImplementation(async (clave, valorPorDefecto) => {
            if (clave === 'habilitar_monitores_elaboracion') return false;
            if (clave === 'pos_quien_toma_ordenes') return 'solo_capitanes';
            return valorPorDefecto;
        });
    });

    it('el dependiente recibe los borradores de SUS mesas asignadas', async () => {
        simularPool([
            ['FROM notificaciones_mesero', [[], []]],
            ['FROM pre_pedidos', [[], []]],
            ['FROM reservas r', [[], []]],
            ['FROM borradores_carrito', [[{ id_pedido: 50, id_mesa: 3, mesa_numero: 'Nro 3',
                items_json: JSON.stringify([{ id: 1 }]), actualizado_en: '2026-09-28 12:00:00', autor: 'Carlos' }], []]]
        ]);
        const { req, res } = crearReqResAPI({ user: { id: 5, rol: 'dependiente' } });
        req.turnoServicioId = 7;
        await obtenerAlertasPendientes(req, res);

        const llamada = pool.query.mock.calls.find(([sql]) => String(sql).includes('FROM borradores_carrito'));
        expect(llamada).toBeDefined();
        expect(llamada[0]).toContain('dam.dependiente_id = ?');
        expect(llamada[1]).toEqual([5, 7, 7]);
        const cuerpo = res.json.mock.calls[0][0];
        expect(cuerpo.alertas.borradores).toEqual([{
            id_pedido: 50, id_mesa: 3, mesa_numero: 'Nro 3', n_items: 1,
            version: '2026-09-28 12:00:00', autor: 'Carlos'
        }]);
    });

    it('el capitán no recibe borradores (él es quien los escribe)', async () => {
        simularPool([
            ['FROM notificaciones_mesero', [[], []]],
            ['FROM pre_pedidos', [[], []]],
            ['FROM reservas r', [[], []]],
            ['FROM borradores_carrito', [[], []]]
        ]);
        const { req, res } = crearReqResAPI({ user: { id: 9, rol: 'capitan' } });
        req.turnoServicioId = 7;
        await obtenerAlertasPendientes(req, res);

        const llamada = pool.query.mock.calls.find(([sql]) => String(sql).includes('FROM borradores_carrito'));
        expect(llamada).toBeUndefined();
        expect(res.json.mock.calls[0][0].alertas.borradores).toEqual([]);
    });
});
