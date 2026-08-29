// services/inventarioService.test.js
// Punto 5: los mensajes de stock del POS deben expresar las cantidades en la
// UNIDAD DE PRODUCCIÓN/CONSUMO (la de la receta), no en la de almacén/compra.
// Punto 6: resumen del movimiento de inventario de un turno (ventas, mermas...).

jest.mock('../config/db', () => ({
    query: jest.fn(),
    getConnection: jest.fn()
}));

const db = require('../config/db');
const InventarioService = require('./inventarioService');

// ---------- Fixtures de unidades / conversiones (UnidadMedidaService) ----------
const UNIDADES = [
    { id: 1, codigo: 'ML', nombre: 'Mililitro', abreviatura: 'ml', tipo: 'VOLUMEN', permite_decimales: 1, activa: 1 },
    { id: 2, codigo: 'BT', nombre: 'Botella', abreviatura: 'bt', tipo: 'VOLUMEN', permite_decimales: 1, activa: 1 },
    { id: 3, codigo: 'GR', nombre: 'Gramo', abreviatura: 'gr', tipo: 'PESO', permite_decimales: 1, activa: 1 }
];
// 1 botella (bt) = 700 ml (conversión por producto 10)
const CONVERSIONES = [
    { id: 1, producto_id: 10, unidad_origen_id: 2, unidad_destino_id: 1, factor: 700, activa: 1 }
];

// Receta del platillo 20: 50 ml de Ron (insumo 10, inventario en botellas)
const INGREDIENTE_RON = [{
    insumo_id: 10,
    insumo_nombre: 'Ron Añejo',
    cantidad_receta: 50,
    unidad_receta: 'Mililitro',
    porcentaje_merma: 0,
    es_opcional: 0,
    unidad_inventario: 'bt',
    unidad_inventario_nombre: 'Botella'
}];

/**
 * Enrutador de consultas SQL para el mock del pool: responde según el texto
 * de la consulta, imitando el comportamiento real de la BD de pruebas.
 */
function mockQuery(respuestas = {}) {
    const {
        ingredientes = INGREDIENTE_RON,
        lotesPorAlmacen = { 2: [], 5: [] },
        porTipo = [],
        globales = [{ movimientos: 0, productos: 0 }],
        consumo = [],
        salidas = []
    } = respuestas;

    db.query.mockImplementation(async (sql, params = []) => {
        const q = String(sql);
        if (q.includes('FROM unidades_medida')) return [UNIDADES];
        if (q.includes('FROM conversiones_unidades')) return [CONVERSIONES];
        if (q.includes('FROM receta_detalles rd')) return [ingredientes];
        if (q.includes('FROM platillos_menu pm')) {
            return [[{ almacen_destino: 2, almacen_categoria: null }]];
        }
        if (q.includes('FROM almacenes WHERE id IN')) {
            return [[{ id: 2, nombre: 'Cocina' }, { id: 5, nombre: 'Bar' }]];
        }
        if (q.includes('FROM lotes l')) {
            // stockLotesConvertidos: params = [productoId] o [productoId, almacenId]
            const almacenId = params.length > 1 ? Number(params[1]) : null;
            const rows = (lotesPorAlmacen[almacenId] || []).map(l => ({
                almacen_id: almacenId,
                cantidad_actual: l.cantidad,
                unidad_medida_id: l.unidad_medida_id,
                unidad_inventario_id: 2
            }));
            return [rows];
        }
        if (q.includes('GROUP BY mi.tipo_movimiento')) return [porTipo];
        if (q.includes('COUNT(DISTINCT mi.producto_id) AS productos')) return [globales];
        if (q.includes("IN ('CONSUMO_RECETA', 'VENTA')")) return [consumo];
        if (q.includes("IN ('MERMA', 'AJUSTE_NEGATIVO', 'DEVOLUCION_PROVEEDOR')")) return [salidas];
        return [[]];
    });
}

// ------------------------------------------------------------------ Punto 5
describe('InventarioService.verificarStockPlatillo (unidades de producción/consumo en el POS)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reinicia la caché de unidades para que cada test cargue sus fixtures
        const UMS = require('./unidadMedidaService');
        UMS.invalidateCache();
    });

    it('expresa requerido/disponible en la unidad de la receta (ml) y conserva la de almacén (bt)', async () => {
        // Cocina tiene 1 botella de Ron (700 ml)
        mockQuery({ lotesPorAlmacen: { 2: [{ cantidad: 1, unidad_medida_id: 2 }], 5: [] } });

        const res = await InventarioService.verificarStockPlatillo(20, 1, null);

        expect(res.suficiente).toBe(true);
        expect(res.faltantes).toHaveLength(0);
        expect(res.detalle).toHaveLength(1);

        const d = res.detalle[0];
        // Presentación en unidad de PRODUCCIÓN/CONSUMO (receta en ml)
        expect(d.unidad).toBe('ml');
        expect(d.requerido).toBeCloseTo(50, 4);
        expect(d.disponible).toBeCloseTo(700, 4); // 1 botella expresada en ml
        // Referencia secundaria en unidad de inventario (botellas)
        expect(d.unidad_inventario).toBe('Botella');
        expect(d.requerido_inventario).toBeCloseTo(50 / 700, 4);
        expect(d.disponible_inventario).toBeCloseTo(1, 4);
    });

    it('reporta el faltante en la unidad de la receta cuando no hay stock', async () => {
        mockQuery({ lotesPorAlmacen: { 2: [], 5: [] } });

        const res = await InventarioService.verificarStockPlatillo(20, 2, null);

        expect(res.suficiente).toBe(false);
        expect(res.faltantes).toHaveLength(1);

        const f = res.faltantes[0];
        expect(f.unidad).toBe('ml');
        expect(f.requerido).toBeCloseTo(100, 4); // 50 ml x 2 unidades
        expect(f.disponible).toBe(0);
        expect(f.faltante).toBeCloseTo(100, 4);
        expect(f.requerido_inventario).toBeCloseTo(100 / 700, 4);
    });

    it('incluye la merma en la cantidad requerida mostrada', async () => {
        mockQuery({
            ingredientes: [{
                ...INGREDIENTE_RON[0],
                cantidad_receta: 100,
                porcentaje_merma: 20 // requiere 100 / (1 - 0.2) = 125 ml
            }],
            lotesPorAlmacen: { 2: [], 5: [] }
        });

        const res = await InventarioService.verificarStockPlatillo(20, 1, null);

        expect(res.faltantes[0].requerido).toBeCloseTo(125, 4);
        expect(res.faltantes[0].unidad).toBe('ml');
    });
});

describe('InventarioService.verificarStockRonda (unidades de producción/consumo en el POS)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        const UMS = require('./unidadMedidaService');
        UMS.invalidateCache();
    });

    it('reporta los faltantes de la ronda en la unidad de la receta', async () => {
        mockQuery({ lotesPorAlmacen: { 2: [], 5: [] } });

        const res = await InventarioService.verificarStockRonda([
            { platillo_id: 20, es_platillo_dia: false, cantidad: 3 }
        ]);

        expect(res.suficiente).toBe(false);
        expect(res.faltantes).toHaveLength(1);

        const f = res.faltantes[0];
        expect(f.unidad).toBe('ml');
        expect(f.requerido).toBeCloseTo(150, 4); // 50 ml x 3
        expect(f.disponible).toBe(0);
        expect(f.faltante).toBeCloseTo(150, 4);
        expect(f.requerido_inventario).toBeCloseTo(150 / 700, 4);
        expect(f.unidad_inventario).toBe('Botella');
    });

    it('muestra el disponible de la ronda convertido a la unidad de la receta', async () => {
        mockQuery({ lotesPorAlmacen: { 2: [{ cantidad: 1, unidad_medida_id: 2 }], 5: [] } });

        const res = await InventarioService.verificarStockRonda([
            { platillo_id: 20, es_platillo_dia: false, cantidad: 2 }
        ]);

        expect(res.suficiente).toBe(true);
        expect(res.detalle[0].unidad).toBe('ml');
        expect(res.detalle[0].requerido).toBeCloseTo(100, 4);
        expect(res.detalle[0].disponible).toBeCloseTo(700, 4);
    });
});

// ------------------------------------------------------------------ Punto 6
describe('InventarioService.movimientosPorTurno (kardex del turno para caja/cierre)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('devuelve una estructura vacía si no hay turno', async () => {
        const res = await InventarioService.movimientosPorTurno(null);
        expect(res.totales.movimientos).toBe(0);
        expect(res.resumenTipos).toHaveLength(0);
        expect(res.consumoVenta).toHaveLength(0);
        expect(res.mermas).toHaveLength(0);
    });

    it('agrega por tipo de movimiento con etiquetas legibles y totales correctos', async () => {
        mockQuery({
            porTipo: [
                { tipo_movimiento: 'CONSUMO_RECETA', movimientos: 8, productos: 3, costo_total: 120.5 },
                { tipo_movimiento: 'MERMA', movimientos: 2, productos: 1, costo_total: 15 },
                { tipo_movimiento: 'TRANSFERENCIA_ENTRADA', movimientos: 1, productos: 1, costo_total: 50 }
            ],
            globales: [{ movimientos: 11, productos: 4 }],
            consumo: [
                {
                    producto_id: 10, codigo: 'RON-001', producto: 'Ron Añejo',
                    cantidad_total: 350, movimientos: 8, comandas: 5, unidad: 'ml', costo_total: 120.5
                }
            ],
            salidas: [
                {
                    producto_id: 12, producto: 'Harina', tipo_movimiento: 'MERMA',
                    cantidad_total: 2, movimientos: 2, unidad: 'gr', costo_total: 15,
                    observacion: 'Salida manual (merma): producto vencido'
                }
            ]
        });

        const turno = { id: 9, fecha_apertura: new Date('2026-08-29T08:00:00'), fecha_cierre: null };
        const res = await InventarioService.movimientosPorTurno(turno);

        // Resumen por tipos con etiquetas y orden de prioridad (venta primero)
        expect(res.resumenTipos.map(t => t.tipo_movimiento))
            .toEqual(['CONSUMO_RECETA', 'MERMA', 'TRANSFERENCIA_ENTRADA']);
        expect(res.resumenTipos[0].etiqueta).toBe('Consumo por venta');
        expect(res.resumenTipos[1].etiqueta).toBe('Merma');

        // Totales
        expect(res.totales.movimientos).toBe(11);
        expect(res.totales.productos).toBe(4);
        expect(res.totales.costo_consumo_venta).toBeCloseTo(120.5, 2);
        expect(res.totales.costo_mermas).toBeCloseTo(15, 2);
        expect(res.totales.costo_entradas).toBeCloseTo(50, 2); // transferencia entrada

        // Detalle de consumo por venta
        expect(res.consumoVenta).toHaveLength(1);
        expect(res.consumoVenta[0]).toMatchObject({
            producto: 'Ron Añejo', codigo: 'RON-001',
            cantidad_total: 350, unidad: 'ml', comandas: 5, costo_total: 120.5
        });

        // Detalle de mermas
        expect(res.mermas).toHaveLength(1);
        expect(res.mermas[0]).toMatchObject({
            producto: 'Harina', etiqueta: 'Merma',
            cantidad_total: 2, unidad: 'gr', costo_total: 15
        });

        // La ventana del turno queda referenciada
        expect(new Date(res.desde).getFullYear()).toBe(2026);
        expect(res.hasta).toBeInstanceOf(Date);
    });

    it('respeta la fecha de cierre del turno como fin de la ventana', async () => {
        mockQuery();
        const turno = {
            id: 9,
            fecha_apertura: new Date('2026-08-29T08:00:00'),
            fecha_cierre: new Date('2026-08-29T17:30:00')
        };
        const res = await InventarioService.movimientosPorTurno(turno);
        expect(new Date(res.hasta).getHours()).toBe(17);
    });
});
