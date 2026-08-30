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
    aplicarPrecios: jest.fn(() => [])
}));

const pool = require('../config/db');
const SettingService = require('../services/settingService');
const PrecioService = require('../services/precioService');
const { viewPOS } = require('./posController');

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
