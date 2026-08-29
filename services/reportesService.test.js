// services/reportesService.test.js
// Verifica los reportes de control: salud del inventario (agregados e
// impactos económicos) y margen real por platillo (cruce ventas × costo
// estándar con food cost ponderado).
jest.mock('../config/db', () => ({ query: jest.fn() }));

const db = require('../config/db');
const ReportesService = require('./reportesService');

describe('reportesService · saludInventario', () => {
    beforeEach(() => jest.clearAllMocks());

    it('agrupa las cuatro secciones y totaliza el impacto económico', async () => {
        db.query
            .mockResolvedValueOnce([[{ // bajo mínimo
                id: 1, codigo: 'P1', nombre: 'Limón', stock_minimo: 2, unidad: 'kg',
                stock_actual: 0.5, faltante: 1.5, costo_promedio: 2, costo_reposicion: 3
            }], []])
            .mockResolvedValueOnce([[{ // vencidos
                id: 1, numero_lote: 'LOT-1', cantidad_actual: 2, costo_unitario: 5,
                fecha_vencimiento: new Date('2026-08-01'), producto_id: 3, codigo: 'P3',
                producto: 'Crema', almacen: 'Central', valor_perdido: 10
            }], []])
            .mockResolvedValueOnce([[{ // por vencer
                id: 2, numero_lote: 'LOT-2', cantidad_actual: 1, costo_unitario: 4,
                fecha_vencimiento: new Date(), producto_id: 4, codigo: 'P4',
                producto: 'Leche', almacen: 'Central', dias_restantes: 3, valor_riesgo: 4
            }], []])
            .mockResolvedValueOnce([[{ // sin movimiento
                id: 5, codigo: 'P5', nombre: 'Vino', unidad: 'u',
                stock_actual: 6, valor_detenido: 90
            }], []]);

        const salud = await ReportesService.saludInventario();

        expect(salud.bajoMinimo).toHaveLength(1);
        expect(salud.bajoMinimo[0].costo_reposicion).toBe(3);
        expect(salud.vencidos[0].valor_perdido).toBe(10);
        expect(salud.porVencer[0].dias_restantes).toBe(3);
        expect(salud.sinMovimiento[0].valor_detenido).toBe(90);
        expect(salud.totales).toMatchObject({
            bajo_minimo: 1, costo_reposicion: 3,
            vencidos: 1, valor_perdido: 10,
            por_vencer: 1, valor_riesgo: 4,
            sin_movimiento: 1, valor_detenido: 90
        });
    });
});

describe('reportesService · margenPorPlatillo', () => {
    beforeEach(() => jest.clearAllMocks());

    it('cruza ventas con el costo estándar y calcula margen y food cost', async () => {
        db.query
            .mockResolvedValueOnce([[{ // ventas del período
                id_platillo: 11, es_platillo_dia: 0, nombre: 'Mojito',
                unidades: 10, ingreso: 50
            }], []])
            .mockResolvedValueOnce([[{ // receta activa
                receta_id: 100, platillo_id: 11, rendimiento: 1
            }], []])
            .mockResolvedValueOnce([[{ // ingredientes de la receta
                receta_id: 100, producto_id: 1, cantidad: 0.05, porcentaje_merma: 0,
                costo_unitario: 20 // costo por porción = 1.00
            }], []]);

        const reporte = await ReportesService.margenPorPlatillo({ desde: '2026-08-01', hasta: '2026-08-31' });

        expect(reporte.platillos).toHaveLength(1);
        const mojito = reporte.platillos[0];
        expect(mojito).toMatchObject({ nombre: 'Mojito', unidades: 10, ingreso: 50, costo_unitario: 1, costo_total: 10, margen: 40, food_cost: 20 });
        expect(reporte.totales).toMatchObject({ unidades: 10, ingreso: 50, costo: 10, margen: 40, food_cost: 20 });
        expect(reporte.sinReceta).toEqual([]);
    });

    it('separa los platillos vendidos sin ficha técnica', async () => {
        db.query
            .mockResolvedValueOnce([[
                { id_platillo: 11, es_platillo_dia: 0, nombre: 'Mojito', unidades: 10, ingreso: 50 },
                { id_platillo: 22, es_platillo_dia: 0, nombre: 'Pan de ajo', unidades: 2, ingreso: 4 }
            ], []])
            .mockResolvedValueOnce([[{ receta_id: 100, platillo_id: 11, rendimiento: 1 }], []])
            .mockResolvedValueOnce([[{ receta_id: 100, producto_id: 1, cantidad: 0.05, porcentaje_merma: 0, costo_unitario: 20 }], []]);

        const reporte = await ReportesService.margenPorPlatillo({ desde: '2026-08-01', hasta: '2026-08-31' });

        expect(reporte.platillos).toHaveLength(1); // sólo el Mojito tiene costo
        expect(reporte.sinReceta).toHaveLength(1);
        expect(reporte.sinReceta[0].nombre).toBe('Pan de ajo');
        expect(reporte.totales.platillos_sin_receta).toBe(1);
    });

    it('sin ventas en el período devuelve totales nulos', async () => {
        db.query.mockResolvedValueOnce([[], []]);
        const reporte = await ReportesService.margenPorPlatillo({ desde: '2026-08-01', hasta: '2026-08-31' });
        expect(reporte.platillos).toEqual([]);
        expect(reporte.totales).toBeNull();
    });

    it('normaliza el rango por defecto e invierte rangos cruzados', () => {
        const r = ReportesService.normalizarRango({ desde: '2026-08-29', hasta: '2026-08-01' });
        expect(r.desde).toBe('2026-08-01');
        expect(r.hasta).toBe('2026-08-29');
        const def = ReportesService.normalizarRango({});
        expect(def.desde).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
});
