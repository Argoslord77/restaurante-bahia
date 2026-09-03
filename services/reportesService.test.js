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

describe('reportesService · consumoPorInsumo', () => {
    beforeEach(() => jest.clearAllMocks());

    it('agrupa entradas y salidas por insumo con el desglose de salidas', async () => {
        db.query.mockResolvedValueOnce([[
            { producto_id: 1, codigo: 'P1', nombre: 'Ron', unidad: 'ml', tipo_movimiento: 'AJUSTE_POSITIVO', cantidad: 100, valor: 2000 },
            { producto_id: 1, codigo: 'P1', nombre: 'Ron', unidad: 'ml', tipo_movimiento: 'CONSUMO_RECETA', cantidad: 80, valor: 1600 },
            { producto_id: 1, codigo: 'P1', nombre: 'Ron', unidad: 'ml', tipo_movimiento: 'MERMA', cantidad: 5, valor: 100 },
            { producto_id: 1, codigo: 'P1', nombre: 'Ron', unidad: 'ml', tipo_movimiento: 'CONTEO_FISICO', cantidad: 999, valor: 0 }
        ], []]).mockResolvedValueOnce([[ // stock vigente en todos los almacenes (ordenado por nombre)
            { producto_id: 1, almacen: 'Cocina', categoria: 'produccion', cantidad: 3 },
            { producto_id: 1, almacen: 'Central', categoria: 'logistico', cantidad: 12.5 }
        ], []]);

        const reporte = await ReportesService.consumoPorInsumo({ desde: '2026-08-01', hasta: '2026-08-31', almacen_id: null });

        expect(reporte.insumos).toHaveLength(1);
        const ron = reporte.insumos[0];
        expect(ron).toMatchObject({
            nombre: 'Ron', entradas_cantidad: 100, entradas_valor: 2000,
            salidas_cantidad: 85, salidas_valor: 1700,
            venta_valor: 1600, merma_valor: 100
        });
        // Stock sumado de los almacenes logístico y de producción
        expect(ron.stock_total).toBe(15.5);
        expect(ron.stock_almacenes).toEqual([
            { almacen: 'Cocina', categoria: 'produccion', cantidad: 3 },
            { almacen: 'Central', categoria: 'logistico', cantidad: 12.5 }
        ]);
        // La consulta de stock suma lotes activos sin filtrar almacén
        const sqlStock = db.query.mock.calls[1][0];
        expect(sqlStock).toContain("l.estado = 'ACTIVO'");
        expect(sqlStock).toContain('FROM lotes');
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
        ], []]).mockResolvedValueOnce([[
            { producto_id: 2, almacen: 'Bar', categoria: 'produccion', cantidad: 4 }
        ], []]);

        const reporte = await ReportesService.consumoPorInsumo({ desde: '2026-08-01', hasta: '2026-08-31', almacen_id: null });
        expect(reporte.insumos[0].nombre).toBe('Ron');
        expect(reporte.insumos[1].nombre).toBe('Limón');
        expect(reporte.insumos[0].stock_total).toBe(4);
        expect(reporte.insumos[1].stock_total).toBe(0);
    });

    it('sin insumos con movimiento no consulta el stock', async () => {
        db.query.mockResolvedValueOnce([[], []]);
        const reporte = await ReportesService.consumoPorInsumo({ desde: '2026-08-01', hasta: '2026-08-31', almacen_id: null });
        expect(reporte.insumos).toEqual([]);
        expect(db.query).toHaveBeenCalledTimes(1);
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
            meseros: [{ mesero: 'Juan Perez', rol: 'dependiente', cuentas: 10, cortesias: 1, ventas: 250, propinas: 15, descuentos: 5, ticket_promedio: 25, ticket_promedio_real: 25 }],
            totales: { meseros: 1, cuentas: 10, cortesias: 1, ventas: 250, propinas: 15, descuentos: 5, ticket_promedio: 25 }
        };
        const csv = ReportesService.ventasMeseroACSV(reporte);
        expect(csv.charCodeAt(0)).toBe(0xFEFF);
        expect(csv).toContain('Mesero;Rol;Cuentas;Cortesias;Ventas;Ticket promedio;Propinas;Descuentos');
        expect(csv).toContain('Juan Perez;dependiente;10;1;250,00;25,00;15,00;5,00');
        expect(csv).toContain('TOTALES;;10;1;250,00;25,00;15,00;5,00');
    });

    it('consumoInsumosACSV lista insumos con su desglose y totales', () => {
        const reporte = {
            desde: '2026-08-01', hasta: '2026-08-31', almacen_id: null,
            insumos: [{
                nombre: 'Ron', codigo: 'P1', unidad: 'ml',
                entradas_cantidad: 100, entradas_valor: 2000,
                salidas_cantidad: 85, salidas_valor: 1700,
                stock_total: 15.5,
                stock_almacenes: [{ almacen: 'Central', categoria: 'logistico', cantidad: 12.5 }, { almacen: 'Cocina', categoria: 'produccion', cantidad: 3 }],
                venta_valor: 1600, merma_valor: 100,
                detalle_salidas: [{ etiqueta: 'Consumo por venta', cantidad: 80, valor: 1600 }, { etiqueta: 'Merma', cantidad: 5, valor: 100 }]
            }],
            totales: { insumos: 1, entradas_valor: 2000, salidas_valor: 1700, consumo_venta_valor: 1600, merma_valor: 100 }
        };
        const csv = ReportesService.consumoInsumosACSV(reporte);
        expect(csv.charCodeAt(0)).toBe(0xFEFF);
        expect(csv).toContain('Insumo;Codigo;Unidad;Entradas cant;Entradas valor;Salidas cant;Salidas valor;Stock total (todos los almacenes);Stock por almacen;Salidas: venta;Salidas: merma/ajuste;Desglose de salidas');
        expect(csv).toContain('Ron;P1;ml;100,000;2000,00;85,000;1700,00;15,500;Central 12,500 | Cocina 3,000;1600,00;100,00;Consumo por venta 80,000 ($1600,00) | Merma 5,000 ($100,00)');
        expect(csv).toContain('TOTALES;;;;2000,00;;1700,00;;;1600,00;100,00;Insumos: 1');
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

// ── Ventas y movimiento de inventario del turno ──────────────────────────
// Escenario: turno #4 con tres productos vendidos (un trago, un platillo
// de carta y un platillo del día sin receta), tres cuentas cobradas y
// descuentos de kardex en dos de ellas.
function programarTurno() {
    db.query
        .mockResolvedValueOnce([[ // turnos
            { id: 4, fecha_apertura: new Date('2026-09-03T10:00:00'), fecha_cierre: null, estado: 'abierto', nombre: 'Juan Perez' }
        ], []])
        .mockResolvedValueOnce([[ // ventas por platillo
            { id_platillo: 12, es_platillo_dia: 0, nombre: 'Mojito Bahía', tipo: 'BEBIDAS', categoria: 'Cócteles', cuentas: 2, unidades: 5, venta: 47.5 },
            { id_platillo: 31, es_platillo_dia: 0, nombre: 'Filete de pescado', tipo: 'COMESTIBLES', categoria: 'Fuertes', cuentas: 2, unidades: 2, venta: 34 },
            { id_platillo: 2, es_platillo_dia: 1, nombre: 'Ceviche del día', tipo: 'COMESTIBLES', categoria: null, cuentas: 1, unidades: 1, venta: 12 }
        ], []])
        .mockResolvedValueOnce([[ // comandas que contienen cada platillo
            { pedido_id: 21, id_platillo: 12, es_platillo_dia: 0, cantidad: 3 },
            { pedido_id: 22, id_platillo: 12, es_platillo_dia: 0, cantidad: 2 },
            { pedido_id: 21, id_platillo: 31, es_platillo_dia: 0, cantidad: 1 },
            { pedido_id: 23, id_platillo: 31, es_platillo_dia: 0, cantidad: 1 },
            { pedido_id: 23, id_platillo: 2, es_platillo_dia: 1, cantidad: 1 }
        ], []])
        .mockResolvedValueOnce([[ // teórico por platillo (receta activa)
            { id_platillo: 12, es_platillo_dia: 0, insumo_id: 7, codigo_insumo: 'RON-BL', insumo: 'Ron blanco', unidad: 'ml', cantidad_unitaria: 60, porcentaje_merma: 0, costo_estimado: 0.02, unidades_vendidas: 5, consumo_teorico: 300, costo_teorico: 6 },
            { id_platillo: 31, es_platillo_dia: 0, insumo_id: 9, codigo_insumo: 'PESC', insumo: 'Pescado', unidad: 'kg', cantidad_unitaria: 0.25, porcentaje_merma: 10, costo_estimado: 40, unidades_vendidas: 2, consumo_teorico: 0.5556, costo_teorico: 22.2222 }
        ], []])
        .mockResolvedValueOnce([[ // cuentas cobradas
            { id: 21, mesa: 4, mesero: 'Juan Perez', estado_pago: 'pagado', creado_en: new Date('2026-09-03T12:10:00'), fecha_cierre: new Date('2026-09-03T12:40:00'), total: 28.5, lineas: 2, unidades: 4, venta: 28.5 },
            { id: 22, mesa: 2, mesero: 'Ana Gomez', estado_pago: 'cortesia', creado_en: new Date('2026-09-03T13:00:00'), fecha_cierre: new Date('2026-09-03T13:30:00'), total: 19, lineas: 1, unidades: 2, venta: 19 },
            { id: 23, mesa: 7, mesero: 'Juan Perez', estado_pago: 'pagado', creado_en: new Date('2026-09-03T14:00:00'), fecha_cierre: null, total: 46, lineas: 2, unidades: 2, venta: 46 }
        ], []])
        .mockResolvedValueOnce([[ // consumo real por comanda e insumo
            { pedido_id: 21, insumo_id: 7, codigo_insumo: 'RON-BL', insumo: 'Ron blanco', unidad: 'ml', movimientos: 2, consumo_real: 180, costo_real: 3.6 },
            { pedido_id: 22, insumo_id: 7, codigo_insumo: 'RON-BL', insumo: 'Ron blanco', unidad: 'ml', movimientos: 1, consumo_real: 120, costo_real: 2.4 },
            { pedido_id: 21, insumo_id: 9, codigo_insumo: 'PESC', insumo: 'Pescado', unidad: 'kg', movimientos: 1, consumo_real: 0.28, costo_real: 11.2 }
        ], []])
        .mockResolvedValueOnce([[ // movimientos por cuenta
            { pedido_id: 21, movimientos: 3, insumos: 2, cantidad_descontada: 180.28, costo_descontado: 14.8 },
            { pedido_id: 22, movimientos: 1, insumos: 1, cantidad_descontada: 120, costo_descontado: 2.4 }
        ], []]);
    InventarioService.movimientosPorTurno.mockResolvedValue({
        desde: new Date('2026-09-03T10:00:00'), hasta: new Date('2026-09-03T14:00:00'),
        resumenTipos: [{ tipo_movimiento: 'CONSUMO_RECETA', etiqueta: 'Consumo por venta', movimientos: 4, productos: 2, costo_total: 17.2 }],
        consumoVenta: [], mermas: [],
        totales: { movimientos: 4, productos: 2, costo_consumo_venta: 17.2, costo_mermas: 0, costo_entradas: 0 }
    });
}


jest.mock('./inventarioService', () => ({ movimientosTurno: null, movimientosPorTurno: jest.fn() }));
const InventarioService = require('./inventarioService');

describe('reportesService · ventasTurno', () => {
    beforeEach(() => jest.resetAllMocks());

    it('agrega ventas, teórico y real por platillo, y fusiona el kardex por cuenta', async () => {
        programarTurno();
        const reporte = await ReportesService.ventasTurno({ turnoId: 4, incluirInventario: true });

        expect(reporte.turnoSeleccionado).toBe(4);
        expect(reporte.incluirInventario).toBe(true);

        const mojito = reporte.platillos[0];
        expect(mojito).toMatchObject({ nombre: 'Mojito Bahía', etiqueta: 'Trago', unidades: 5, venta: 47.5, costo_teorico: 6 });
        // El real atribuye al mojito TODO el kardex de sus comandas (21 y 22),
        // incluido el pescado descontado en la comanda 21 que también trajo filete.
        expect(mojito.costo_real).toBe(17.2);
        expect(mojito.desviacion).toBe(11.2);

        const filete = reporte.platillos[1];
        expect(filete.costo_teorico).toBe(22.22);
        expect(filete.costo_real).toBe(14.8);

        const ceviche = reporte.platillos[2];
        expect(ceviche.es_dia).toBe(true);
        expect(ceviche.tiene_receta).toBe(false);
        expect(ceviche.costo_teorico).toBeNull();
        expect(ceviche.costo_real).toBe(0);
        expect(ceviche.desviacion).toBeNull();

        expect(reporte.totales).toMatchObject({
            cuentas: 3, unidades: 8, tragos: 5, platillos_comestibles: 3,
            venta: 93.5, costo_teorico: 28.22, costo_real: 32, desviacion: 3.78
        });
        expect(reporte.cuentas.find(c => c.id === 21)).toMatchObject({ movimientos: 3, costo_descontado: 14.8 });
        expect(reporte.cuentas.find(c => c.id === 23)).toMatchObject({ movimientos: null, costo_descontado: null });
        // Resumen de kardex por insumo
        const ron = reporte.insumos.find(i => i.insumo === 'Ron blanco');
        expect(ron).toMatchObject({ cantidad: 300, costo: 6, movimientos: 3, comandas: 2 });
        // La sección de movimiento del turno viene del servicio de inventario
        expect(InventarioService.movimientosPorTurno).toHaveBeenCalledTimes(1);
        expect(reporte.movimientosTurno.totales.movimientos).toBe(4);
    });

    it('sin licencia de inventario no consulta el kardex y deja el real en null', async () => {
        db.query
            .mockResolvedValueOnce([[{ id: 4, fecha_apertura: new Date(), fecha_cierre: null, estado: 'abierto', nombre: 'X' }], []])
            .mockResolvedValueOnce([[{ id_platillo: 12, es_platillo_dia: 0, nombre: 'Mojito Bahía', tipo: 'BEBIDAS', categoria: null, cuentas: 1, unidades: 2, venta: 19 }], []])
            .mockResolvedValueOnce([[{ pedido_id: 21, id_platillo: 12, es_platillo_dia: 0, cantidad: 2 }], []])
            .mockResolvedValueOnce([[{ id_platillo: 12, es_platillo_dia: 0, insumo_id: 7, codigo_insumo: 'RON-BL', insumo: 'Ron blanco', unidad: 'ml', cantidad_unitaria: 60, porcentaje_merma: 0, costo_estimado: 0.02, unidades_vendidas: 2, consumo_teorico: 120, costo_teorico: 2.4 }], []])
            .mockResolvedValueOnce([[{ id: 21, mesa: 1, mesero: 'X', estado_pago: 'pagado', creado_en: new Date(), fecha_cierre: null, total: 19, lineas: 1, unidades: 2, venta: 19 }], []]);

        const reporte = await ReportesService.ventasTurno({ turnoId: 4, incluirInventario: false });

        expect(db.query).toHaveBeenCalledTimes(5); // turnos + ventas + comandas + teórico + cuentas
        expect(reporte.totales.costo_real).toBeNull();
        expect(reporte.totales.desviacion).toBeNull();
        expect(reporte.insumos).toEqual([]);
        expect(reporte.movimientosTurno).toBeNull();
        expect(reporte.platillos[0].costo_real).toBeNull();
        expect(InventarioService.movimientosPorTurno).not.toHaveBeenCalled();
    });

    it('sin filtro explícito cae al turno más reciente (porDefectoAlUltimo)', async () => {
        programarTurno();
        const reporte = await ReportesService.ventasTurno({ turnoId: null, incluirInventario: true, porDefectoAlUltimo: true });
        expect(reporte.turnoSeleccionado).toBe(4);
    });
});

describe('reportesService · detallePlatilloTurno', () => {
    beforeEach(() => jest.resetAllMocks());

    it('escala la receta a las unidades vendidas y compara contra el kardex real', async () => {
        db.query
            .mockResolvedValueOnce([[ // ficha del platillo
                { id: 12, nombre: 'Mojito Bahía', precio: 9.5, foto: null, categoria: 'Cócteles', tipo: 'BEBIDAS', es_platillo_dia: 0 }
            ], []])
            .mockResolvedValueOnce([[{ id: 4, fecha_apertura: new Date(), fecha_cierre: null, estado: 'abierto', nombre: 'X' }], []]) // turnos
            .mockResolvedValueOnce([[ // líneas de venta
                { pedido_id: 21, mesa: 4, mesero: 'Juan', cantidad: 3, precio_unitario: 9.5, importe: 28.5, estado_item: 'entregado', notas_especiales: null, estado_pago: 'pagado', creado_en: new Date(), fecha_cierre: new Date() },
                { pedido_id: 22, mesa: 2, mesero: 'Ana', cantidad: 2, precio_unitario: 9.5, importe: 19, estado_item: 'entregado', notas_especiales: null, estado_pago: 'pagado', creado_en: new Date(), fecha_cierre: new Date() }
            ], []])
            .mockResolvedValueOnce([[ // receta unitaria
                { insumo_id: 7, codigo_insumo: 'RON-BL', insumo: 'Ron blanco', unidad: 'ml', cantidad_unitaria: 60, porcentaje_merma: 0, costo_estimado: 0.02 },
                { insumo_id: 11, codigo_insumo: 'HIER-B', insumo: 'Hierbabuena', unidad: 'g', cantidad_unitaria: 10, porcentaje_merma: 5, costo_estimado: 0.05 }
            ], []])
            .mockResolvedValueOnce([[ // movimientos de las comandas
                { id: 1, fecha_movimiento: new Date(), tipo_movimiento: 'VENTA', cantidad: 180, costo_unitario: 0.02, costo_total: 3.6, stock_anterior: 5000, stock_nuevo: 4820, documento_numero: 'PED-000021', observaciones: '', pedido_id: 21, insumo_id: 7, codigo_insumo: 'RON-BL', insumo: 'Ron blanco', unidad: 'ml', almacen: 'Bar', numero_lote: 'L-104' },
                { id: 2, fecha_movimiento: new Date(), tipo_movimiento: 'VENTA', cantidad: 40, costo_unitario: 0.05, costo_total: 2, stock_anterior: 500, stock_nuevo: 460, documento_numero: 'PED-000021', observaciones: '', pedido_id: 21, insumo_id: 11, codigo_insumo: 'HIER-B', insumo: 'Hierbabuena', unidad: 'g', almacen: 'Bar', numero_lote: 'L-105' }
            ], []]);

        const detalle = await ReportesService.detallePlatilloTurno({ turnoId: 4, platilloId: 12, esDia: 0, incluirInventario: true });

        expect(detalle.platillo).toMatchObject({ nombre: 'Mojito Bahía', etiqueta: 'Trago' });
        expect(detalle.unidades).toBe(5);
        expect(detalle.venta).toBe(47.5);

        // Teórico escalado: 60 ml × 5 = 300; hierbabuena con 5 % de merma
        // usa la fórmula del motor de descuento: 10 / 0.95 × 5 = 52.632
        expect(detalle.teorico[0]).toMatchObject({ insumo: 'Ron blanco', total: 300, costo_total: 6 });
        expect(detalle.teorico[1].total).toBeCloseTo(52.632, 2);

        const ron = detalle.real.porInsumo.find(i => i.insumo === 'Ron blanco');
        expect(ron).toMatchObject({ cantidad: 180, teorico_total: 300, desviacion: -120, movimientos: 1 });
        const hierba = detalle.real.porInsumo.find(i => i.insumo === 'Hierbabuena');
        expect(hierba.desviacion).toBeCloseTo(-12.632, 2);

        expect(detalle.totales).toMatchObject({ lineas: 2, unidades: 5, venta: 47.5, costo_teorico: 8.63, costo_real: 5.6 });
        expect(detalle.real.totales.movimientos).toBe(2);
    });

    it('devuelve null si el platillo no existe', async () => {
        db.query.mockResolvedValueOnce([[], []]);
        const detalle = await ReportesService.detallePlatilloTurno({ platilloId: 999, esDia: 1, incluirInventario: true });
        expect(detalle).toBeNull();
    });
});

describe('reportesService · CSV del turno', () => {
    beforeEach(() => jest.resetAllMocks());

    it('el CSV del turno separa secciones y respeta el gate de licencia', async () => {
        programarTurno();
        const reporte = await ReportesService.ventasTurno({ turnoId: 4, incluirInventario: true });
        const csv = ReportesService.ventasTurnoACSV(reporte);
        expect(csv.startsWith('\uFEFF')).toBe(true);
        expect(csv).toContain('Ventas y consumo del turno;Turno #4 (Juan Perez)');
        expect(csv).toContain('TRAGOS Y PLATILLOS VENDIDOS');
        expect(csv).toContain('CONSUMO REAL POR INSUMO (KARDEX)');
        expect(csv).toContain('MOVIMIENTO DE INVENTARIO DEL TURNO (POR TIPO)');
        expect(csv).toContain('CUENTAS DEL ALCANCE');

        programarTurno();
        const sinLicencia = await ReportesService.ventasTurno({ turnoId: 4, incluirInventario: false });
        const csv2 = ReportesService.ventasTurnoACSV(sinLicencia);
        expect(csv2).toContain('Requiere licencia con la funcion inventario');
        expect(csv2).not.toContain('CONSUMO REAL POR INSUMO');
    });

    it('el CSV del detalle incluye ventas, receta y kardex', async () => {
        db.query
            .mockResolvedValueOnce([[{ id: 12, nombre: 'Mojito Bahía', precio: 9.5, foto: null, categoria: 'Cócteles', tipo: 'BEBIDAS', es_platillo_dia: 0 }], []])
            .mockResolvedValueOnce([[{ id: 4, fecha_apertura: new Date(), fecha_cierre: null, estado: 'abierto', nombre: 'X' }], []])
            .mockResolvedValueOnce([[{ pedido_id: 21, mesa: 4, mesero: 'Juan', cantidad: 3, precio_unitario: 9.5, importe: 28.5, estado_item: 'entregado', notas_especiales: null, estado_pago: 'pagado', creado_en: new Date(), fecha_cierre: new Date() }], []])
            .mockResolvedValueOnce([[{ insumo_id: 7, codigo_insumo: 'RON-BL', insumo: 'Ron blanco', unidad: 'ml', cantidad_unitaria: 60, porcentaje_merma: 0, costo_estimado: 0.02 }], []])
            .mockResolvedValueOnce([[{ id: 1, fecha_movimiento: new Date(), tipo_movimiento: 'VENTA', cantidad: 180, costo_unitario: 0.02, costo_total: 3.6, stock_anterior: 5000, stock_nuevo: 4820, documento_numero: 'PED-000021', observaciones: '', pedido_id: 21, insumo_id: 7, codigo_insumo: 'RON-BL', insumo: 'Ron blanco', unidad: 'ml', almacen: 'Bar', numero_lote: 'L-104' }], []]);

        const detalle = await ReportesService.detallePlatilloTurno({ turnoId: 4, platilloId: 12, esDia: 0, incluirInventario: true });
        const csv = ReportesService.platilloTurnoACSV(detalle);
        expect(csv).toContain('VENTAS POR COMANDA');
        expect(csv).toContain('CONSUMO TEORICO (RECETA × UNIDADES VENDIDAS)');
        expect(csv).toContain('CONSUMO REAL (KARDEX) DE LAS COMANDAS QUE INCLUYEN EL PLATILLO');
        expect(csv).toContain('MOVIMIENTOS DE INVENTARIO');
        expect(csv).toContain('Mojito Bahía');
    });
});

// ── Tendencias de venta ──────────────────────────────────────────────────
describe('reportesService · tendencias', () => {
    beforeEach(() => jest.resetAllMocks());

    it('compara contra el período anterior de igual duración y clasifica productos', async () => {
        db.query
            .mockResolvedValueOnce([[ // serie diaria (actual 08-05..08-08, anterior 08-01..08-04)
                { dia: '2026-08-01', cuentas: 5, venta: 100 },
                { dia: '2026-08-02', cuentas: 8, venta: 200 },
                { dia: '2026-08-03', cuentas: 0, venta: 0 },
                { dia: '2026-08-04', cuentas: 10, venta: 300 },
                { dia: '2026-08-05', cuentas: 6, venta: 150 },
                { dia: '2026-08-06', cuentas: 6, venta: 150 },
                { dia: '2026-08-07', cuentas: 0, venta: 0 },
                { dia: '2026-08-08', cuentas: 12, venta: 400 }
            ], []])
            .mockResolvedValueOnce([[ // productos cur vs prev
                { id_platillo: 1, es_platillo_dia: 0, nombre: 'Nuevo', tipo: 'BEBIDAS', categoria: 'Cócteles', unidades_cur: 6, unidades_prev: 0, venta_cur: 60, venta_prev: 0 },
                { id_platillo: 2, es_platillo_dia: 0, nombre: 'Mojito', tipo: 'BEBIDAS', categoria: 'Cócteles', unidades_cur: 10, unidades_prev: 5, venta_cur: 95, venta_prev: 47.5 },
                { id_platillo: 3, es_platillo_dia: 0, nombre: 'Estable', tipo: 'COMESTIBLES', categoria: 'Fuertes', unidades_cur: 5, unidades_prev: 5, venta_cur: 80, venta_prev: 80 },
                { id_platillo: 4, es_platillo_dia: 0, nombre: 'Filete', tipo: 'COMESTIBLES', categoria: 'Fuertes', unidades_cur: 4, unidades_prev: 8, venta_cur: 152, venta_prev: 304 },
                { id_platillo: 5, es_platillo_dia: 1, nombre: 'Ceviche del día', tipo: 'COMESTIBLES', categoria: null, unidades_cur: 0, unidades_prev: 3, venta_cur: 0, venta_prev: 84 }
            ], []])
            .mockResolvedValueOnce([[ // categorías
                { tipo: 'BEBIDAS', categoria: 'Cócteles', unidades_cur: 16, unidades_prev: 5, venta_cur: 155, venta_prev: 47.5 },
                { tipo: 'COMESTIBLES', categoria: 'Fuertes', unidades_cur: 9, unidades_prev: 13, venta_cur: 232, venta_prev: 384 }
            ], []]);

        const reporte = await ReportesService.tendencias({ desde: '2026-08-05', hasta: '2026-08-08' });

        // Período anterior equivalente: 4 días inmediatamente previos
        expect(reporte.prevDesde).toBe('2026-08-01');
        expect(reporte.prevHasta).toBe('2026-08-04');
        expect(reporte.agrupacion).toBe('diaria');
        expect(reporte.serie).toHaveLength(4);

        // Totales de caja actuales vs anteriores
        expect(reporte.totales).toMatchObject({
            venta: 700, venta_prev: 600, venta_delta_pct: 16.7,
            cuentas: 24, cuentas_prev: 23,
            ticket: 29.17, ticket_prev: 26.09
        });

        // Ritmo: media 2.ª mitad (200) vs 1.ª mitad (150) → +33.3 acelerando
        expect(reporte.ritmo).toEqual({ delta_pct: 33.3, direccion: 'acelerando' });

        // Clasificación de tendencias por producto
        const porNombre = Object.fromEntries(reporte.platillos.map(p => [p.nombre, p]));
        expect(porNombre['Nuevo'].estado).toBe('nuevo');
        expect(porNombre['Mojito'].estado).toBe('sube');
        expect(porNombre['Mojito'].unidades_delta_pct).toBe(100);
        expect(porNombre['Estable'].estado).toBe('estable');
        expect(porNombre['Filete'].estado).toBe('baja');
        expect(porNombre['Ceviche del día'].estado).toBe('sin-ventas');

        // Topes: primero los nuevos, luego por % de crecimiento
        expect(reporte.alza.map(p => p.nombre)).toEqual(['Nuevo', 'Mojito']);
        expect(reporte.baja.map(p => p.nombre)).toEqual(['Ceviche del día', 'Filete']);

        // Corte por tipo agregando categorías
        const tragos = reporte.tipos.find(t => t.etiqueta === 'Tragos');
        expect(tragos).toMatchObject({ unidades_cur: 16, unidades_prev: 5, estado: 'sube' });
    });

    it('agrupa por semanas cuando el alcance es largo', async () => {
        db.query
            .mockResolvedValueOnce([[{ dia: '2026-06-01', cuentas: 2, venta: 50 }, { dia: '2026-08-01', cuentas: 3, venta: 90 }], []])
            .mockResolvedValueOnce([[], []])
            .mockResolvedValueOnce([[], []]);

        const reporte = await ReportesService.tendencias({ desde: '2026-06-01', hasta: '2026-08-03' });

        expect(reporte.agrupacion).toBe('semanal');
        expect(reporte.serie.length).toBeGreaterThan(5);
        expect(reporte.serie[0].etiqueta).toMatch(/^Semana del 01\/06/);
        // Todas las ventas caen en su semana correspondiente
        const totalSerie = reporte.serie.reduce((s, d) => s + d.venta, 0);
        expect(totalSerie).toBe(140);
    });

    it('el CSV incluye resumen, serie, segmentos y productos', async () => {
        db.query
            .mockResolvedValueOnce([[{ dia: '2026-08-05', cuentas: 6, venta: 150 }, { dia: '2026-08-04', cuentas: 10, venta: 300 }], []])
            .mockResolvedValueOnce([[{ id_platillo: 2, es_platillo_dia: 0, nombre: 'Mojito', tipo: 'BEBIDAS', categoria: 'Cócteles', unidades_cur: 10, unidades_prev: 5, venta_cur: 95, venta_prev: 47.5 }], []])
            .mockResolvedValueOnce([[{ tipo: 'BEBIDAS', categoria: 'Cócteles', unidades_cur: 10, unidades_prev: 5, venta_cur: 95, venta_prev: 47.5 }], []]);

        const reporte = await ReportesService.tendencias({ desde: '2026-08-05', hasta: '2026-08-05' });
        const csv = ReportesService.tendenciasACSV(reporte);

        expect(csv.startsWith('\uFEFF')).toBe(true);
        expect(csv).toContain('Tendencias de venta;2026-08-05;a;2026-08-05;comparado con;2026-08-04;a;2026-08-04');
        expect(csv).toContain('RESUMEN');
        expect(csv).toContain('SERIE DIARIA');
        expect(csv).toContain('POR TIPO Y CATEGORIA');
        expect(csv).toContain('PRODUCTOS');
        expect(csv).toContain('Mojito');
        expect(csv).toContain('A la alza');
    });
});
