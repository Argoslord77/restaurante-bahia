jest.mock('../config/db', () => ({ query: jest.fn(), getConnection: jest.fn() }));
const db = require('../config/db');
const InventarioService = require('./inventarioService');
beforeEach(() => jest.clearAllMocks());

function conexion(stock = 10) {
    const conn = { query: jest.fn(), beginTransaction: jest.fn(), commit: jest.fn(), rollback: jest.fn(), release: jest.fn() };
    conn.query.mockImplementation(async (sql) => {
        if (String(sql).includes('FOR UPDATE')) return [[{ id: 1, stock, activo: 1 }], []];
        return [[], []];
    });
    return conn;
}

describe('inventarioService', () => {
    it('valida producto, cantidad y tipo sin tocar la BD', async () => {
        await expect(InventarioService.registrar({ producto_id: 0, tipo: 'entrada', cantidad: 1 })).rejects.toThrow('Producto');
        await expect(InventarioService.registrar({ producto_id: 1, tipo: 'entrada', cantidad: 0 })).rejects.toThrow('cantidad');
        await expect(InventarioService.registrar({ producto_id: 1, tipo: 'otro', cantidad: 1 })).rejects.toThrow('Tipo');
        expect(db.getConnection).not.toHaveBeenCalled();
    });
    it('la entrada suma con candado de fila', async () => {
        const conn = conexion(10);
        db.getConnection.mockResolvedValue(conn);
        const r = await InventarioService.entrada(1, 5, 'Compra', 2);
        expect(r).toEqual({ producto_id: 1, antes: 10, despues: 15 });
        const upd = conn.query.mock.calls.find(([sql]) => String(sql).includes('UPDATE productos'));
        expect(upd[1]).toEqual([15, 1]);
        expect(conn.commit).toHaveBeenCalled();
    });
    it('la salida resta y bloquea si falta stock', async () => {
        const conn = conexion(2);
        db.getConnection.mockResolvedValue(conn);
        await expect(InventarioService.salida(1, 5, 'Merma')).rejects.toThrow('insuficiente');
        expect(conn.rollback).toHaveBeenCalled();
        expect(conn.commit).not.toHaveBeenCalled();
    });
    it('valorizado totaliza costo, venta y unidades', async () => {
        db.query.mockResolvedValueOnce([[
            { stock: 2, valor_costo: 20, valor_venta: 30 },
            { stock: 1, valor_costo: 5, valor_venta: 9 }
        ], []]);
        const v = await InventarioService.valorizado();
        expect(v.totales).toEqual({ costo: 25, venta: 39, unidades: 3 });
    });
});
