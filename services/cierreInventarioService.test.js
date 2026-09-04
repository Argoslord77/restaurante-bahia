// services/cierreInventarioService.test.js
jest.mock('../config/db', () => ({ query: jest.fn() }));
jest.mock('../services/kardexService', () => ({
    TIPOS_ENTRADA: ['AJUSTE_POSITIVO', 'COMPRA', 'RECEPCION', 'TRANSFERENCIA_ENTRADA', 'PRODUCCION_ENTRADA', 'DEVOLUCION_CLIENTE'],
    TIPOS_SALIDA: ['VENTA', 'CONSUMO_RECETA', 'MERMA', 'AJUSTE_NEGATIVO', 'DEVOLUCION_PROVEEDOR', 'PRODUCCION_SALIDA', 'TRANSFERENCIA_SALIDA'],
    ETIQUETAS_MOVIMIENTO: {
        VENTA: 'Venta directa',
        CONSUMO_RECETA: 'Consumo por venta',
        MERMA: 'Merma',
        AJUSTE_POSITIVO: 'Entrada/Ajuste positivo',
        AJUSTE_NEGATIVO: 'Salida/Ajuste negativo',
        COMPRA: 'Compra'
    }
}));

const dbMock = require('../config/db');
const servicio = require('./cierreInventarioService');

describe('CierreInventarioService', () => {
    beforeEach(() => {
        dbMock.query.mockReset();
    });

    test('resumenMovimientosTurno agrupa por tipo y producto', async () => {
        dbMock.query
            .mockResolvedValueOnce([[{ id: 1, fecha_apertura: '2026-08-29 10:00:00', fecha_cierre: null }]])
            .mockResolvedValueOnce([[
                {
                    tipo_movimiento: 'CONSUMO_RECETA', producto_id: 23, producto_codigo: '193010008',
                    producto_nombre: 'Harina', unidad_abrev: 'kg', unidad_nombre: 'Kilogramo',
                    almacen_id: 2, almacen_nombre: 'Cocina', cantidad: 0.590, valor: 4.5, movimientos: 2
                },
                {
                    tipo_movimiento: 'MERMA', producto_id: 23, producto_codigo: '193010008',
                    producto_nombre: 'Harina', unidad_abrev: 'kg', unidad_nombre: 'Kilogramo',
                    almacen_id: 2, almacen_nombre: 'Cocina', cantidad: 0.250, valor: 2.0, movimientos: 1
                },
                {
                    tipo_movimiento: 'COMPRA', producto_id: 23, producto_codigo: '193010008',
                    producto_nombre: 'Harina', unidad_abrev: 'kg', unidad_nombre: 'Kilogramo',
                    almacen_id: 1, almacen_nombre: 'Central', cantidad: 10, valor: 76, movimientos: 1
                }
            ]]);

        const data = await servicio.resumenMovimientosTurno(1);

        expect(data.turno.id).toBe(1);
        expect(data.resumen.totalMovimientos).toBe(4);
        expect(data.resumen.totalProductos).toBe(1);
        // Entradas: COMPRA; Salidas: CONSUMO_RECETA + MERMA
        expect(data.resumen.entradasCantidad).toBeCloseTo(10, 4);
        expect(data.resumen.salidasCantidad).toBeCloseTo(0.840, 4);
        expect(data.resumen.netoCantidad).toBeCloseTo(9.160, 4);
        expect(data.resumen.ventasValor).toBeCloseTo(4.5, 2);
        expect(data.resumen.mermasValor).toBeCloseTo(2.0, 2);
        expect(data.resumen.ajustesValor).toBeCloseTo(0, 2);

        expect(data.porTipo).toHaveLength(3);
        const consumo = data.porTipo.find(t => t.tipo === 'CONSUMO_RECETA');
        expect(consumo.etiqueta).toBe('Consumo por venta');
        expect(consumo.es_salida).toBe(true);
        expect(consumo.movimientos).toBe(2);

        expect(data.porProducto).toHaveLength(1);
        const p = data.porProducto[0];
        expect(p.nombre).toBe('Harina');
        expect(p.unidad).toBe('Kilogramo');
        expect(p.entradasCantidad).toBeCloseTo(10, 4);
        expect(p.salidasCantidad).toBeCloseTo(0.840, 4);
        expect(p.netoCantidad).toBeCloseTo(9.160, 4);
        expect(p.almacenes).toContain('Cocina');
        expect(p.almacenes).toContain('Central');

        expect(data.almacenes).toEqual(expect.arrayContaining(['Cocina', 'Central']));
    });

    test('resumenMovimientosTurno devuelve resumen vacío si no existe el turno', async () => {
        dbMock.query.mockResolvedValueOnce([[]]);
        const data = await servicio.resumenMovimientosTurno(999);
        expect(data.turno).toBeNull();
        expect(data.resumen.totalMovimientos).toBe(0);
        expect(data.porTipo).toEqual([]);
        expect(data.porProducto).toEqual([]);
    });

    test('movimientosTurnoACSV genera CSV con BOM y separador ;', () => {
        const data = {
            turno: { id: 1, fecha_apertura: '2026-08-29 10:00:00', fecha_cierre: null },
            resumen: { entradasCantidad: 10, entradasValor: 76, salidasCantidad: 0.84, salidasValor: 6.5, netoCantidad: 9.16, netoValor: 69.5 },
            porTipo: [{ tipo: 'COMPRA', etiqueta: 'Compra', es_entrada: true, es_salida: false, cantidad: 10, valor: 76, movimientos: 1 }],
            porProducto: [{ codigo: '193010008', nombre: 'Harina', almacenes: 'Cocina', unidad: 'Kilogramo', movimientos: 1, entradasCantidad: 10, entradasValor: 76, salidasCantidad: 0.84, salidasValor: 6.5, netoCantidad: 9.16, netoValor: 69.5 }]
        };
        const { csv } = servicio.movimientosTurnoACSV(data);
        expect(csv.startsWith('\uFEFF')).toBe(true);
        expect(csv).toContain('Harina');
        expect(csv).toContain(';');
        expect(csv.replace(';', '')).toContain('9,16');
    });
});
