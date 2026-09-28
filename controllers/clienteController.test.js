// controllers/clienteController.test.js
// B2: anti-abuso del circuito público QR — validación de mesa/pedido,
// topes de pre-orden y cooldowns (429) por mesa/pedido.
jest.mock('../config/db', () => ({ query: jest.fn() }));
jest.mock('../services/turnoService', () => ({ obtenerTurnoActivo: jest.fn() }));
jest.mock('../services/precioService', () => ({
    obtenerContextoCobro: jest.fn(),
    validarPrecioConfigurado: jest.fn()
}));

const db = require('../config/db');
const turnoService = require('../services/turnoService');
const PrecioService = require('../services/precioService');
const ClienteController = require('./clienteController');

function reqRes(params = {}, body = {}) {
    const req = { params, body };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn(), send: jest.fn() };
    return { req, res };
}

beforeEach(() => {
    jest.clearAllMocks();
    ClienteController.__resetCooldowns();
    turnoService.obtenerTurnoActivo.mockResolvedValue({ id: 7 });
    PrecioService.obtenerContextoCobro.mockResolvedValue({ carta: 'CUP', es_zelle: false, moneda_codigo: 'CUP' });
    db.query.mockImplementation(async (sql) => {
        const texto = String(sql);
        if (texto.includes('FROM mesas')) return [[{ id: 5 }], []];
        if (texto.includes('FROM pedidos')) return [[{ id_mesa: 5, fecha_cierre: null }], []];
        return [[], []];
    });
});

describe('clienteController.callService · B2', () => {
    it('rechaza mesa no numérica sin tocar notificaciones', async () => {
        const { req, res } = reqRes({ id_mesa: 'x' });
        await ClienteController.callService(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(db.query).not.toHaveBeenCalled();
    });

    it('404 si la mesa no existe', async () => {
        db.query.mockImplementation(async (sql) =>
            String(sql).includes('FROM mesas') ? [[], []] : [[], []]);
        const { req, res } = reqRes({ id_mesa: '99' });
        await ClienteController.callService(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('la segunda llamada inmediata devuelve 429 con reintento', async () => {
        const primera = reqRes({ id_mesa: '5' });
        await ClienteController.callService(primera.req, primera.res);
        expect(primera.res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));

        const segunda = reqRes({ id_mesa: '5' });
        await ClienteController.callService(segunda.req, segunda.res);
        expect(segunda.res.status).toHaveBeenCalledWith(429);
        expect(segunda.res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: false, reintentar_en: expect.any(Number) }));
        // Solo un INSERT de notificación en total.
        const inserts = db.query.mock.calls.filter(([sql]) => String(sql).includes('INSERT INTO notificaciones'));
        expect(inserts).toHaveLength(1);
    });

    it('otra mesa no hereda el cooldown', async () => {
        await ClienteController.callService(...(() => { const r = reqRes({ id_mesa: '5' }); return [r.req, r.res]; })());
        db.query.mockImplementation(async (sql) => {
            const texto = String(sql);
            if (texto.includes('FROM mesas')) return [[{ id: 6 }], []];
            return [[], []];
        });
        const { req, res } = reqRes({ id_mesa: '6' });
        await ClienteController.callService(req, res);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
});

describe('clienteController.cerrarCuenta · B2', () => {
    it('410 si el pedido ya está cerrado', async () => {
        db.query.mockImplementation(async (sql) =>
            String(sql).includes('FROM pedidos') ? [[{ id_mesa: 5, fecha_cierre: '2026-09-27 20:00:00' }], []] : [[], []]);
        const { req, res } = reqRes({ id_pedido: '15' });
        await ClienteController.cerrarCuenta(req, res);
        expect(res.status).toHaveBeenCalledWith(410);
    });

    it('la segunda solicitud inmediata devuelve 429', async () => {
        const primera = reqRes({ id_pedido: '15' });
        await ClienteController.cerrarCuenta(primera.req, primera.res);
        expect(primera.res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        const segunda = reqRes({ id_pedido: '15' });
        await ClienteController.cerrarCuenta(segunda.req, segunda.res);
        expect(segunda.res.status).toHaveBeenCalledWith(429);
    });
});

describe('clienteController.agregarAPreorden · B2', () => {
    const item = { id_platillo: 3, cantidad: 2 };

    it('rechaza más de 50 ítems', async () => {
        const { req, res } = reqRes({ id_mesa: '5' }, { items: Array(51).fill(item) });
        await ClienteController.agregarAPreorden(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    it('rechaza cantidad mayor a 20 por ítem', async () => {
        const { req, res } = reqRes({ id_mesa: '5' }, { items: [{ ...item, cantidad: 21 }] });
        await ClienteController.agregarAPreorden(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('404 si la mesa no existe', async () => {
        db.query.mockImplementation(async (sql) =>
            String(sql).includes('FROM mesas') ? [[], []] : [[], []]);
        const { req, res } = reqRes({ id_mesa: '99' }, { items: [item] });
        await ClienteController.agregarAPreorden(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('segunda pre-orden inmediata devuelve 429', async () => {
        db.query.mockImplementation(async (sql) => {
            const texto = String(sql);
            if (texto.includes('FROM mesas')) return [[{ id: 5 }], []];
            if (texto.includes('FROM platillos_menu')) return [[{ id: 3, nombre: 'Pollo', precio: 100 }], []];
            return [[], []];
        });
        const primera = reqRes({ id_mesa: '5' }, { items: [item] });
        await ClienteController.agregarAPreorden(primera.req, primera.res);
        expect(primera.res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        const segunda = reqRes({ id_mesa: '5' }, { items: [item] });
        await ClienteController.agregarAPreorden(segunda.req, segunda.res);
        expect(segunda.res.status).toHaveBeenCalledWith(429);
    });
});
