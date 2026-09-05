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
            { id: 5, mesero: 'Juan Perez ', rol: 'dependiente', cuentas: 10, cortesias: 1, ventas: 250, propinas: 15, excedentes: 0, descuentos: 5, ticket_promedio: 25 },
            { id: 8, mesero: 'Ana Gomez', rol: 'capitan', cuentas: 2, cortesias: 0, ventas: 50, propinas: 0, excedentes: 0, descuentos: 0, ticket_promedio: 25 }
        ], []]);

        const reporte = await ReportesService.ventasPorMesero({ desde: '2026-08-01', hasta: '2026-08-31' });

        expect(reporte.meseros).toHaveLength(2);
        expect(reporte.meseros[0]).toMatchObject({
            mesero: 'Juan Perez', rol: 'dependiente', cuentas: 10, cortesias: 1,
            ventas: 250, propinas: 15, excedentes: 0, ticket_promedio_real: 25
        });
        expect(reporte.totales).toMatchObject({
            meseros: 2, cuentas: 12, cortesias: 1, ventas: 300,
            propinas: 15, excedentes: 0, descuentos: 5, ticket_promedio: 25
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

describe('reportesService · consumoPorInsumo', () => {
    beforeEach(() => jest.clearAllMocks());

    it('agrupa entradas y salidas por insumo con el desglose de salidas', async () => {
        db.query.mockResolvedValueOnce([[
            { producto_id: 1, codigo: 'P1', nombre: 'Ron', unidad: 'ml', tipo_movimiento: 'AJUSTE_POSITIVO', cantidad: 100, valor: 2000 },
            { producto_id: 1, codigo: 'P1', nombre: 'Ron', unidad: 'ml', tipo_movimiento: 'CONSUMO_RECETA', cantidad: 80, valor: 1600 },
            { producto_id: 1, codigo: 'P1', nombre: 'Ron', unidad: 'ml', tipo_movimiento: 'MERMA', cantidad: 5, valor: 100 },
            { producto_id: 1, codigo: 'P1', nombre: 'Ron', unidad: 'ml', tipo_movimiento: 'CONTEO_FISICO', cantidad: 999, valor: 0 }
        ], []]);

        const reporte = await ReportesService.consumoPorInsumo({ desde: '2026-08-01', hasta: '2026-08-31', almacen_id: null });

        expect(reporte.insumos).toHaveLength(1);
        const ron = reporte.insumos[0];
        expect(ron).toMatchObject({
            nombre: 'Ron', entradas_cantidad: 100, entradas_valor: 2000,
            salidas_cantidad: 85, salidas_valor: 1700,
            venta_valor: 1600, merma_valor: 100
        });
        // El conteo físico es informativo: no aparece en el desglose
        expect(ron.detalle_salidas.map(d => d.etiqueta)).toEqual(['Consumo por venta', 'Merma']);
        expect(reporte.totales).toMatchObject({
            insumos: 1, entradas_valor: 2000, salidas_valor: 1700,
            consumo_venta_valor: 1600, merma_valor: 100
        });
    });

    it('ordena los insumos por valor de salida', async () => {
        db.query.mockResolvedValueOnce([[
            { producto_id: 1, codigo: 'P1', nombre: 'Limón', unidad: 'kg', tipo_movimiento: 'MERMA', cantidad: 1, valor: 2 },
            { producto_id: 2, codigo: 'P2', nombre: 'Ron', unidad: 'ml', tipo_movimiento: 'VENTA', cantidad: 50, valor: 1000 }
        ], []]);

        const reporte = await ReportesService.consumoPorInsumo({ desde: '2026-08-01', hasta: '2026-08-31', almacen_id: null });
        expect(reporte.insumos[0].nombre).toBe('Ron');
        expect(reporte.insumos[1].nombre).toBe('Limón');
    });
});

describe('reportesService · ventasPorHoras', () => {
    beforeEach(() => jest.clearAllMocks());

    it('distribuye por hora y día, e identifica los picos', async () => {
        // 1a consulta: por hora · 2a: por día
        db.query
            .mockResolvedValueOnce([[
                { hora: 13, cuentas: 5, ventas: 100, propinas: 10 },
                { hora: 20, cuentas: 8, ventas: 220, propinas: 22 }
            ], []])
            .mockResolvedValueOnce([[
                { dia: 6, cuentas: 6, ventas: 150, propinas: 15 },
                { dia: 7, cuentas: 7, ventas: 170, propinas: 17 }
            ], []]);

        const reporte = await ReportesService.ventasPorHoras({ desde: '2026-08-01', hasta: '2026-08-31' });

        expect(reporte.horas).toHaveLength(2);
        expect(reporte.horas[0]).toMatchObject({ hora: 13, etiqueta: '13:00', cuentas: 5, ventas: 100 });
        expect(reporte.horas[1]).toMatchObject({ hora: 20, etiqueta: '20:00', cuentas: 8, ventas: 220 });
        // DAYOFWEEK: 6 = viernes, 7 = sábado
        expect(reporte.dias.map(d => d.nombre)).toEqual(['Viernes', 'Sábado']);
        expect(reporte.horaPico).toMatchObject({ hora: 20, ventas: 220 });
        expect(reporte.diaPico).toMatchObject({ dia: 7, nombre: 'Sábado', ventas: 170 });
        expect(reporte.totales).toMatchObject({ cuentas: 13, ventas: 320, propinas: 32 });
        // La consulta filtra cuentas cobradas y usa la apertura de la cuenta
        const sqlHora = db.query.mock.calls[0][0];
        expect(sqlHora).toContain('p.creado_en');
        expect(sqlHora).toContain("estado_pago IN ('pagado', 'facturado', 'cortesia')");
    });

    it('sin datos devuelve picos nulos y totales en cero', async () => {
        db.query.mockReset();
        db.query.mockResolvedValueOnce([[], []]).mockResolvedValueOnce([[], []]);
        const reporte = await ReportesService.ventasPorHoras({ desde: '2026-08-01', hasta: '2026-08-31' });
        expect(reporte.horas).toEqual([]);
        expect(reporte.dias).toEqual([]);
        expect(reporte.horaPico).toBeNull();
        expect(reporte.diaPico).toBeNull();
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
            meseros: [{ mesero: 'Juan Perez', rol: 'dependiente', cuentas: 10, cortesias: 1, ventas: 250, propinas: 15, excedentes: 0, descuentos: 5, ticket_promedio: 25, ticket_promedio_real: 25 }],
            totales: { meseros: 1, cuentas: 10, cortesias: 1, ventas: 250, propinas: 15, excedentes: 0, descuentos: 5, ticket_promedio: 25 }
        };
        const csv = ReportesService.ventasMeseroACSV(reporte);
        expect(csv.charCodeAt(0)).toBe(0xFEFF);
        expect(csv).toContain('Mesero;Rol;Cuentas;Cortesias;Ventas;Ticket promedio;Propinas;Excedentes;Descuentos');
        expect(csv).toContain('Juan Perez;dependiente;10;1;250,00;25,00;15,00;0,00;5,00');
        expect(csv).toContain('TOTALES;;10;1;250,00;25,00;15,00;0,00;5,00');
    });

    it('consumoInsumosACSV lista insumos con su desglose y totales', () => {
        const reporte = {
            desde: '2026-08-01', hasta: '2026-08-31', almacen_id: null,
            insumos: [{
                nombre: 'Ron', codigo: 'P1', unidad: 'ml',
                entradas_cantidad: 100, entradas_valor: 2000,
                salidas_cantidad: 85, salidas_valor: 1700,
                venta_valor: 1600, merma_valor: 100,
                detalle_salidas: [{ etiqueta: 'Consumo por venta', cantidad: 80, valor: 1600 }, { etiqueta: 'Merma', cantidad: 5, valor: 100 }]
            }],
            totales: { insumos: 1, entradas_valor: 2000, salidas_valor: 1700, consumo_venta_valor: 1600, merma_valor: 100 }
        };
        const csv = ReportesService.consumoInsumosACSV(reporte);
        expect(csv.charCodeAt(0)).toBe(0xFEFF);
        expect(csv).toContain('Insumo;Codigo;Unidad;Entradas cant;Entradas valor;Salidas cant;Salidas valor;Salidas: venta;Salidas: merma/ajuste;Desglose de salidas');
        expect(csv).toContain('Ron;P1;ml;100,000;2000,00;85,000;1700,00;1600,00;100,00;Consumo por venta 80,000 ($1600,00) | Merma 5,000 ($100,00)');
        expect(csv).toContain('TOTALES;;;;2000,00;;1700,00;1600,00;100,00;Insumos: 1');
    });

    it('ventasHorasACCSV vuelca las dos distribuciones', () => {
        const reporte = {
            desde: '2026-08-01', hasta: '2026-08-31',
            horas: [{ hora: 20, etiqueta: '20:00', cuentas: 8, ventas: 220, propinas: 22 }],
            dias: [{ dia: 7, nombre: 'Sábado', cuentas: 7, ventas: 170, propinas: 17 }],
            totales: { cuentas: 15, ventas: 390, propinas: 39, ticket_promedio: 26 }
        };
        const csv = ReportesService.ventasHorasACSV(reporte);
        expect(csv.charCodeAt(0)).toBe(0xFEFF);
        expect(csv).toContain('POR HORA');
        expect(csv).toContain('20:00;8;220,00;22,00');
        expect(csv).toContain('POR DIA DE LA SEMANA');
        expect(csv).toContain('Sábado;7;170,00;17,00');
        expect(csv).toContain('TOTALES;;15;390,00;39,00');
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
