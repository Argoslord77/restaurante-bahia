// controllers/cierreDiaController.test.js
// liquidarCuenta: el excedente de la liquidación (lo pagado de más sobre
// orden + propina ya registrada) queda como propina, igual que en el cobro
// del POS. Sin esto entraba a caja sin verse en ningún reporte.
jest.mock('../config/db', () => ({ query: jest.fn(), getConnection: jest.fn() }));
jest.mock('../services/turnoService', () => ({ obtenerTurnoActivo: jest.fn() }));

const db = require('../config/db');
const turnoService = require('../services/turnoService');
const CierreDiaController = require('./cierreDiaController');

const PEDIDO = { id: 21, total: 100, subtotal: 100, propina: 10, estado_pago: 'facturado' };

function conexionCon(pedido) {
    return {
        query: jest.fn(async (sql) => {
            if (String(sql).includes('SELECT * FROM pedidos')) return [[{ ...pedido }], []];
            return [[], []];
        }),
        beginTransaction: jest.fn(),
        commit: jest.fn(),
        rollback: jest.fn(),
        release: jest.fn()
    };
}

function crearReqRes(body = {}) {
    const req = { params: { id_pedido: '21' }, body, user: { id: 1, rol: 'cajero' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    return { req, res };
}

function updatePedidos(conexion) {
    const llamada = conexion.query.mock.calls.find(([sql]) => String(sql).includes('UPDATE pedidos'));
    return llamada ? llamada[1] : null;
}

describe('cierreDiaController.liquidarCuenta · excedente', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        turnoService.obtenerTurnoActivo.mockResolvedValue({ id: 9 });
    });

    it('liquidación exacta conserva la propina y reporta excedente 0', async () => {
        const conexion = conexionCon(PEDIDO);
        db.getConnection.mockResolvedValue(conexion);
        const { req, res } = crearReqRes({ metodo_pago: 'efectivo', moneda_id: 1 });

        await CierreDiaController.liquidarCuenta(req, res);

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, excedente: 0 }));
        expect(updatePedidos(conexion)[2]).toBe(10); // propina intacta
        expect(conexion.commit).toHaveBeenCalled();
    });

    it('lo pagado de más sobre orden + propina se suma a la propina', async () => {
        const conexion = conexionCon(PEDIDO);
        db.getConnection.mockResolvedValue(conexion);
        const { req, res } = crearReqRes({ metodo_pago: 'efectivo', moneda_id: 1, monto_origen: 130, factor_cambio: 1 });

        await CierreDiaController.liquidarCuenta(req, res);

        // Esperado 100 + 10 = 110; abonado 130 → excedente 20 → propina 30.
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, excedente: 20 }));
        expect(updatePedidos(conexion)[2]).toBe(30);
        const mensaje = res.json.mock.calls[0][0].message;
        expect(mensaje).toContain('Excedente de $20.00 registrado como propina');
    });

    it('rechaza la comanda ya pagada', async () => {
        const conexion = conexionCon({ ...PEDIDO, estado_pago: 'pagado' });
        db.getConnection.mockResolvedValue(conexion);
        const { req, res } = crearReqRes({});

        await CierreDiaController.liquidarCuenta(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(conexion.rollback).toHaveBeenCalled();
    });

    it('exige turno abierto', async () => {
        turnoService.obtenerTurnoActivo.mockResolvedValue(null);
        const conexion = conexionCon(PEDIDO);
        db.getConnection.mockResolvedValue(conexion);
        const { req, res } = crearReqRes({});

        await CierreDiaController.liquidarCuenta(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(conexion.rollback).toHaveBeenCalled();
    });
});
