// middlewares/auditoria.test.js
// Verifica el filtro de ruido del middleware global: sondeos de las vistas
// (polling) y refrescos automáticos marcados no deben generar asientos.
const { EventEmitter } = require('events');
const { auditoriaGlobal } = require('./auditoria');

jest.mock('../services/auditLogService', () => ({
    registrar: jest.fn().mockResolvedValue(123),
    actualizarRepeticiones: jest.fn().mockResolvedValue(true)
}));
jest.mock('../config/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
}));
const AuditLogService = require('../services/auditLogService');

function crearReq(metodo, url, extras = {}) {
    const [ruta, queryStr] = url.split('?');
    const query = {};
    if (queryStr) {
        queryStr.split('&').forEach(par => {
            const [k, v] = par.split('=');
            query[k] = decodeURIComponent(v || '');
        });
    }
    return {
        method: metodo,
        originalUrl: url,
        url,
        query,
        params: {},
        headers: { 'user-agent': 'jest' },
        session: { user: { id: 7, nombre: 'Admin', rol: 'administrador' } },
        sessionID: 'sess-1',
        ip: '127.0.0.1',
        ...extras
    };
}

function crearRes() {
    const res = new EventEmitter();
    res.statusCode = 200;
    return res;
}

async function procesar(middleware, metodo, url) {
    const req = crearReq(metodo, url);
    const res = crearRes();
    const next = jest.fn();
    middleware(req, res, next);
    res.emit('finish');
    await Promise.resolve(); // dejar que el asiento se encole
    return { req, res, next };
}

describe('Middleware de auditoría · sondeos y refrescos', () => {
    let middleware;

    beforeEach(() => {
        jest.clearAllMocks();
        middleware = auditoriaGlobal();
    });

    it('NO registra los sondeos GET de las vistas (polling)', async () => {
        await procesar(middleware, 'GET', '/pos/alertas-pendientes');
        await procesar(middleware, 'GET', '/api/pos/items-listos/15');
        await procesar(middleware, 'GET', '/api/monitor/comandas');
        await procesar(middleware, 'GET', '/admin/turno/estado-actual');

        expect(AuditLogService.registrar).not.toHaveBeenCalled();
    });

    it('NO registra los refrescos automáticos marcados (?autorefresco=1)', async () => {
        await procesar(middleware, 'GET', '/dependiente/dashboard?autorefresco=1');
        await procesar(middleware, 'GET', '/pos/15?vista=1&mesero=5&autorefresco=1');

        expect(AuditLogService.registrar).not.toHaveBeenCalled();
    });

    it('SÍ registra la navegación real del usuario (sin marca)', async () => {
        await procesar(middleware, 'GET', '/dependiente/dashboard');

        expect(AuditLogService.registrar).toHaveBeenCalledTimes(1);
        const asiento = AuditLogService.registrar.mock.calls[0][0];
        expect(asiento.ruta).toBe('/dependiente/dashboard');
        expect(asiento.usuario_id).toBe(7);
    });

    it('SÍ registra las escrituras sobre rutas de sondeo', async () => {
        // Descartar los pre-pedidos de una mesa es una acción del usuario
        await procesar(middleware, 'DELETE', '/pos/mesas/3/pre-pedidos');

        expect(AuditLogService.registrar).toHaveBeenCalledTimes(1);
    });
});
