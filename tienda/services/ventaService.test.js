jest.mock('../config/db', () => ({ query: jest.fn(), getConnection: jest.fn() }));
jest.mock('./ajusteService', () => ({ ivaPct: jest.fn() }));
const db = require('../config/db');
const AjusteService = require('./ajusteService');
const VentaService = require('./ventaService');
beforeEach(() => jest.clearAllMocks());

function conexion(respuestas) {
    return {
        query: jest.fn(async (sql) => {
            const texto = String(sql);
            for (const [clave, valor] of respuestas) {
                if (texto.includes(clave)) return typeof valor === 'function' ? valor(sql) : valor;
            }
            return [[], []];
        }),
        beginTransaction: jest.fn(), commit: jest.fn(), rollback: jest.fn(), release: jest.fn()
    };
}

const PRODS = [[
    { id: 1, nombre: 'Arroz', precio_venta: 25, precio_costo: 18, stock: 10, activo: 1 },
    { id: 2, nombre: 'Cloro', precio_venta: 20, precio_costo: 12, stock: 5, activo: 1 }
], []];

describe('ventaService.crear', () => {
    function preparar() {
        AjusteService.ivaPct.mockResolvedValue(16);
        const conn = conexion([
            ['FROM turnos_caja', [[{ id: 3, estado: 'abierto' }], []]],
            ['FROM productos WHERE id IN', PRODS],
            ['INSERT INTO ventas', [{ insertId: 50 }]]
        ]);
        db.getConnection.mockResolvedValue(conn);
        return conn;
    }

    it('cobra con IVA, descuenta stock y deja movimientos', async () => {
        const conn = preparar();
        const r = await VentaService.crear({
            usuario_id: 1, turno_id: 3,
            items: [{ producto_id: 1, cantidad: 2 }, { producto_id: 2, cantidad: 1 }],
            pagos: [{ metodo: 'efectivo', monto: 100 }]
        });
        // subtotal 70, iva 11.20, total 81.20, cambio 18.80
        expect(r).toMatchObject({ venta_id: 50, subtotal: 70, iva_monto: 11.2, total: 81.2, cambio: 18.8 });
        const upd = conn.query.mock.calls.filter(([sql]) => String(sql).includes('UPDATE productos'));
        expect(upd.map(([, p]) => p)).toEqual([[8, 1], [4, 2]]);
        const movs = conn.query.mock.calls.filter(([sql]) => String(sql).includes('INSERT INTO movimientos'));
        expect(movs).toHaveLength(2);
        expect(movs[0][1][1]).toBe(-2);
        expect(conn.commit).toHaveBeenCalled();
    });

    it('aplica descuento antes del IVA', async () => {
        const conn = preparar();
        const r = await VentaService.crear({
            usuario_id: 1, turno_id: 3,
            items: [{ producto_id: 1, cantidad: 2 }],
            pagos: [{ metodo: 'tarjeta', monto: 50 }],
            descuento: 10
        });
        // base 40, iva 6.40, total 46.40
        expect(r).toMatchObject({ descuento: 10, iva_monto: 6.4, total: 46.4, cambio: 3.6 });
    });

    it('bloquea sin stock, sin turno o pago corto (rollback)', async () => {
        let conn = preparar();
        await expect(VentaService.crear({
            usuario_id: 1, turno_id: 3,
            items: [{ producto_id: 2, cantidad: 99 }],
            pagos: [{ metodo: 'efectivo', monto: 9999 }]
        })).rejects.toThrow('Stock insuficiente');
        expect(conn.rollback).toHaveBeenCalled();

        conn = preparar();
        await expect(VentaService.crear({
            usuario_id: 1, turno_id: 3,
            items: [{ producto_id: 1, cantidad: 1 }],
            pagos: [{ metodo: 'efectivo', monto: 1 }]
        })).rejects.toThrow('no cubre');
        expect(conn.commit).not.toHaveBeenCalled();
    });
});

describe('ventaService.cancelar', () => {
    it('devuelve el stock dentro del turno abierto', async () => {
        const conn = conexion([
            ['FROM ventas WHERE', [[{ id: 50, estado: 'cobrada', turno_id: 3 }], []]],
            ['FROM turnos_caja', [[{ id: 3, estado: 'abierto' }], []]],
            ['FROM venta_detalles', [[{ producto_id: 1, cantidad: 2 }], []]],
            ['FROM productos WHERE id IN', [[{ id: 1, stock: 8 }], []]]
        ]);
        db.getConnection.mockResolvedValue(conn);
        const r = await VentaService.cancelar({ venta_id: 50, usuario_id: 1, motivo: 'Error' });
        expect(r).toEqual({ venta_id: 50 });
        const upd = conn.query.mock.calls.find(([sql]) => String(sql).includes('UPDATE productos'));
        expect(upd[1]).toEqual([10, 1]);
        expect(conn.commit).toHaveBeenCalled();
    });

    it('niega fuera del turno abierto', async () => {
        const conn = conexion([
            ['FROM ventas WHERE', [[{ id: 50, estado: 'cobrada', turno_id: 3 }], []]],
            ['FROM turnos_caja', [[{ id: 3, estado: 'cerrado' }], []]]
        ]);
        db.getConnection.mockResolvedValue(conn);
        await expect(VentaService.cancelar({ venta_id: 50, usuario_id: 1 })).rejects.toThrow('turno abierto');
    });
});
