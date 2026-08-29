// services/reportesService.test.js
// Verifica los reportes de control: salud del inventario, margen real
// por platillo, ventas por mesero y las exportaciones CSV.
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

describe('reportesService · ventasPorMesero', () => {
    beforeEach(() => jest.clearAllMocks());

    it('agrupa el desempeño por mesero y totaliza el período', async () => {
        db.query.mockResolvedValueOnce([[
            { id: 5, mesero: 'Juan Perez ', rol: 'dependiente', cuentas: 10, cortesias: 1, ventas: 250, propinas: 15, descuentos: 5, ticket_promedio: 25 },
            { id: 8, mesero: 'Ana Gomez', rol: 'capitan', cuentas: 2, cortesias: 0, ventas: 50, propinas: 0, descuentos: 0, ticket_promedio: 25 }
        ], []]);

        const reporte = await ReportesService.ventasPorMesero({ desde: '2026-08-01', hasta: '2026-08-31' });

        expect(reporte.meseros).toHaveLength(2);
        expect(reporte.meseros[0]).toMatchObject({
            mesero: 'Juan Perez', rol: 'dependiente', cuentas: 10, cortesias: 1,
            ventas: 250, propinas: 15, ticket_promedio_real: 25
        });
        expect(reporte.totales).toMatchObject({
            meseros: 2, cuentas: 12, cortesias: 1, ventas: 300,
            propinas: 15, descuentos: 5, ticket_promedio: 25
        });

        // La consulta filtra por cuentas cobradas del período
        const sql = db.query.mock.calls[0][0];
        expect(sql).toContain('fecha_cierre IS NOT NULL');
        expect(sql).toContain("estado_pago IN ('pagado', 'facturado', 'cortesia')");
    });

    it('sin ventas devuelve lista vacía con totales en cero', async () => {
        db.query.mockResolvedValueOnce([[], []]);
        const reporte = await ReportesService.ventasPorMesero({ desde: '2026-08-01', hasta: '2026-08-31' });
        expect(reporte.meseros).toEqual([]);
        expect(reporte.totales.ventas).toBe(0);
        expect(reporte.totales.cuentas).toBe(0);
    });
});

describe('reportesService · exportaciones CSV', () => {
    it('margenACSV lleva BOM, cabecera, filas y totales', () => {
        const reporte = {
            desde: '2026-08-01', hasta: '2026-08-31',
            platillos: [{ nombre: 'Mojito', unidades: 10, ingreso: 50, costo_unitario: 1, costo_total: 10, margen: 40, margen_unitario: 4, food_cost: 20 }],
            sinReceta: [{ nombre: 'Pan', unidades: 2, ingreso: 4, motivo: 'x' }],
            totales: { unidades: 10, ingreso: 50, costo: 10, margen: 40, food_cost: 20 }
        };
        const csv = ReportesService.margenACSV(reporte);
        expect(csv.charCodeAt(0)).toBe(0xFEFF);
        expect(csv).toContain('Margen real por platillo');
        expect(csv).toContain('Platillo;Unidades;Ingreso;Costo unit.;Costo total;Margen;Margen por unidad;Food cost %');
        expect(csv).toContain('Mojito;10;50,00;1,0000;10,00;40,00;4,00;20,0');
        expect(csv).toContain('TOTALES;10;50,00;;10,00;40,00;;20,0');
        expect(csv).toContain('SIN FICHA TECNICA;Pan;2;4,00');
    });

    it('saludACCSV vuelca las cuatro secciones y el resumen', () => {
        const salud = {
            bajoMinimo: [{ nombre: 'Limón', codigo: 'P1', stock_minimo: 2, faltante: 1.5, stock_actual: 0.5, costo_reposicion: 3 }],
            vencidos: [{ producto: 'Crema', codigo: 'P3', numero_lote: 'LOT-1', fecha_vencimiento: new Date('2026-08-01T00:00:00Z'), cantidad_actual: 2, valor_perdido: 10 }],
            porVencer: [{ producto: 'Leche', codigo: 'P4', numero_lote: 'LOT-2', dias_restantes: 3, cantidad_actual: 1, valor_riesgo: 4 }],
            sinMovimiento: [{ nombre: 'Vino', codigo: 'P5', stock_actual: 6, valor_detenido: 90 }],
            totales: { bajo_minimo: 1, costo_reposicion: 3, vencidos: 1, valor_perdido: 10, por_vencer: 1, valor_riesgo: 4, sin_movimiento: 1, valor_detenido: 90 }
        };
        const csv = ReportesService.saludACSV(salud);
        expect(csv.charCodeAt(0)).toBe(0xFEFF);
        expect(csv).toContain('Bajo minimo;Limón;P1;Minimo 2,000 / Faltante 1,500;0,500;3,00');
        expect(csv).toContain('Vencido;Crema;P3;Lote LOT-1 vencio 2026-08-01 00:00;2,000;10,00');
        expect(csv).toContain('Por vencer;Leche;P4;Lote LOT-2 vence en 3 dia(s);1,000;4,00');
        expect(csv).toContain('Sin rotacion 30 dias;Vino;P5;Sin movimientos;6,000;90,00');
        expect(csv).toContain('RESUMEN;Lotes vencidos;1;Perdida consumada;10,00');
    });

    it('ventasMeseroACSV lista meseros y totales', () => {
        const reporte = {
            desde: '2026-08-01', hasta: '2026-08-31',
            meseros: [{ mesero: 'Juan Perez', rol: 'dependiente', cuentas: 10, cortesias: 1, ventas: 250, propinas: 15, descuentos: 5, ticket_promedio: 25, ticket_promedio_real: 25 }],
            totales: { meseros: 1, cuentas: 10, cortesias: 1, ventas: 250, propinas: 15, descuentos: 5, ticket_promedio: 25 }
        };
        const csv = ReportesService.ventasMeseroACSV(reporte);
        expect(csv.charCodeAt(0)).toBe(0xFEFF);
        expect(csv).toContain('Mesero;Rol;Cuentas;Cortesias;Ventas;Ticket promedio;Propinas;Descuentos');
        expect(csv).toContain('Juan Perez;dependiente;10;1;250,00;25,00;15,00;5,00');
        expect(csv).toContain('TOTALES;;10;1;250,00;25,00;15,00;5,00');
    });

    it('explosionACCSV separa resumen por insumo y detalle por venta', () => {
        const csv = ReportesService.explosionACSV({
            turnoSeleccionado: 7,
            resumenInsumos: [{ insumo: 'Ron', codigo: 'P1', unidad: 'ml', teorico: 100, real: 115, desviacion: 15, desviacion_pct: 15, costo: 200 }],
            filas: [{ turno: 'Noche', numero_pedido: 15, mesa: '5', platillo_vendido: 'Mojito', cantidad_platillos_vendidos: 2, insumo_descontado: 'Ron', consumo_total_teorico: 100, consumo_real_kardex: 115, costo_total_insumo: 200 }]
        });
        expect(csv.charCodeAt(0)).toBe(0xFEFF);
        expect(csv).toContain('Explosion de recetas (teorico vs real);Turno 7');
        expect(csv).toContain('RESUMEN POR INSUMO');
        expect(csv).toContain('Ron;P1;ml;100,000;115,000;15,000;15,0;200,00');
        expect(csv).toContain('DETALLE POR VENTA');
        expect(csv).toContain('Noche;15;5;Mojito;2;Ron;100,000;115,000;200,00');
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
