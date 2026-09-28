// services/compraService.test.js
// V13 (C1): historial de compras — filtros seguros y resumen por proveedor.
jest.mock('../config/db', () => ({ query: jest.fn() }));

const db = require('../config/db');
const CompraService = require('./compraService');

function filaLote(sobre = {}) {
    return {
        lote_id: 1, numero_lote: 'LOT-2026-001', fecha_ingreso: '2026-09-01',
        producto_id: 10, cantidad_inicial: 5, costo_unitario: 100,
        proveedor_id: 3, producto_nombre: 'Arroz', producto_codigo: 'ARZ',
        unidad: 'kg', almacen_nombre: 'Central', proveedor_nombre: 'Acme', ...sobre
    };
}

beforeEach(() => jest.clearAllMocks());

describe('compraService.historial (C1)', () => {
    it('mapea compras con monto y totales', async () => {
        db.query.mockResolvedValue([[filaLote(), filaLote({ lote_id: 2, cantidad_inicial: 1 })], []]);
        const r = await CompraService.historial({});
        expect(r.compras[0]).toMatchObject({ lote: 'LOT-2026-001', monto: 500 });
        expect(r.totales).toEqual({ movimientos: 2, monto: 600 });
    });

    it('aplica filtros con parámetros (sin inyección)', async () => {
        db.query.mockResolvedValue([[], []]);
        await CompraService.historial({ proveedorId: 3, productoId: 10, desde: '2026-09-01', hasta: '2026-09-30' });
        const [sql, params] = db.query.mock.calls[0];
        expect(sql).toContain('l.proveedor_id = ?');
        expect(sql).toContain('l.producto_id = ?');
        expect(sql).toContain('l.fecha_ingreso >=');
        expect(params).toEqual([3, 10, '2026-09-01', '2026-09-30']);
    });

    it('ignora fechas malformadas y acota el límite', async () => {
        db.query.mockResolvedValue([[], []]);
        await CompraService.historial({ desde: 'ayer', limite: 9999 });
        const [sql] = db.query.mock.calls[0];
        expect(sql).not.toContain('fecha_ingreso >=');
        expect(sql).toContain('LIMIT 500');
    });
});

describe('compraService.resumenProveedor (C1)', () => {
    it('agrega totales y top de productos', async () => {
        db.query
            .mockResolvedValueOnce([[{ movimientos: 4, monto: 1000, ultima_compra: '2026-09-02', productos: 2 }], []])
            .mockResolvedValueOnce([[{ producto_id: 10, producto: 'Arroz', unidad: 'kg',
                movimientos: 3, cantidad: 30, monto: 900, ultima_compra: '2026-09-02' }], []]);
        const r = await CompraService.resumenProveedor(3);
        expect(r).toMatchObject({ movimientos: 4, monto: 1000, productos: 2 });
        expect(r.topProductos[0]).toMatchObject({ producto: 'Arroz', monto: 900 });
    });
});
