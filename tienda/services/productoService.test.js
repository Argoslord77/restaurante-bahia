jest.mock('../config/db', () => ({ query: jest.fn(), getConnection: jest.fn() }));
const db = require('../config/db');
const ProductoService = require('./productoService');
beforeEach(() => jest.clearAllMocks());

function conexion() {
    return { query: jest.fn(), beginTransaction: jest.fn(), commit: jest.fn(), rollback: jest.fn(), release: jest.fn() };
}

describe('productoService', () => {
    it('crear valida nombre y precios', async () => {
        await expect(ProductoService.crear({ nombre: '  ' })).rejects.toThrow('nombre');
        await expect(ProductoService.crear({ nombre: 'X', precio_venta: -1 })).rejects.toThrow('negativos');
        expect(db.getConnection).not.toHaveBeenCalled();
    });
    it('crear inserta y registra el stock inicial', async () => {
        const conn = conexion();
        conn.query.mockResolvedValueOnce([{ insertId: 5 }]).mockResolvedValueOnce([[], []]);
        db.getConnection.mockResolvedValue(conn);
        const id = await ProductoService.crear({ nombre: 'Arroz', precio_venta: 25, stock_inicial: 10 }, 1);
        expect(id).toBe(5);
        expect(conn.query.mock.calls[0][0]).toContain('INSERT INTO productos');
        expect(conn.query.mock.calls[1][0]).toContain('INSERT INTO movimientos');
        expect(conn.commit).toHaveBeenCalled();
    });
    it('crear sin stock inicial omite el movimiento', async () => {
        const conn = conexion();
        conn.query.mockResolvedValueOnce([{ insertId: 6 }]);
        db.getConnection.mockResolvedValue(conn);
        await ProductoService.crear({ nombre: 'Y', precio_venta: 10 });
        expect(conn.query).toHaveBeenCalledTimes(1);
    });
    it('buscarParaVenta exige texto y solo trae vendibles', async () => {
        await expect(ProductoService.buscarParaVenta('')).resolves.toEqual([]);
        db.query.mockResolvedValueOnce([[{ id: 1 }], []]);
        await ProductoService.buscarParaVenta('arr');
        expect(String(db.query.mock.calls[0][0])).toContain('p.stock > 0');
    });
});
