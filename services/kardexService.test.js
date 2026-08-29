// services/kardexService.test.js
// Verifica la lógica del kardex: saldo inicial, saldo corrido, agregados
// por signo y exportación CSV.
jest.mock('../config/db', () => ({ query: jest.fn() }));

const db = require('../config/db');
const KardexService = require('./kardexService');

describe('kardexService · normalizarFiltros', () => {
    it('usa los últimos 30 días por defecto y valida fechas', () => {
        const f = KardexService.normalizarFiltros({});
        expect(f.desde).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(f.hasta).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(f.tipo).toBe('todos');
        expect(f.almacen_id).toBeNull();
    });

    it('descarta fechas inválidas y tipos desconocidos', () => {
        const f = KardexService.normalizarFiltros({ desde: 'abc', hasta: '9999-99-99', tipo: 'HACK' });
        expect(f.desde).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(f.tipo).toBe('todos');
    });

    it('ordena el rango si viene invertido', () => {
        const f = KardexService.normalizarFiltros({ desde: '2026-08-29', hasta: '2026-08-01' });
        expect(f.desde).toBe('2026-08-01');
        expect(f.hasta).toBe('2026-08-29');
    });
});

describe('kardexService · obtenerTarjeta', () => {
    beforeEach(() => jest.clearAllMocks());

    it('calcula saldo inicial, saldo corrido y totales del período', async () => {
        const fecha = s => new Date(s);
        // 1) producto · 2) saldo inicial (agregado por tipo) · 3) movimientos
        db.query
            .mockResolvedValueOnce([[{
                id: 7, codigo: 'P007', nombre: 'Ron', stock_minimo: 2,
                costo_promedio: 20, unidad: 'ml', stock_actual: 9, valor_stock: 180
            }], []])
            .mockResolvedValueOnce([[
                // Antes del período: entrada 10 (valor 200) y venta 6 (valor 120)
                { tipo_movimiento: 'AJUSTE_POSITIVO', cantidad: 10, valor: 200 },
                { tipo_movimiento: 'CONSUMO_RECETA', cantidad: 6, valor: 120 }
            ], []])
            .mockResolvedValueOnce([[
                { id: 1, fecha_movimiento: fecha('2026-08-10T10:00:00Z'), tipo_movimiento: 'AJUSTE_POSITIVO', documento_numero: 'LOT-2026-001', referencia_tipo: 'entrada_almacen', referencia_id: 1, cantidad: 10, costo_unitario: 20, costo_total: 200, stock_anterior: 0, stock_nuevo: 10, observaciones: 'Entrada manual', almacen: 'Central', numero_lote: 'LOT-2026-001', usuario: 'Admin' },
                { id: 2, fecha_movimiento: fecha('2026-08-20T15:00:00Z'), tipo_movimiento: 'MERMA', documento_numero: 'SM-000001', referencia_tipo: 'salida_manual', referencia_id: 1, cantidad: 5, costo_unitario: 20, costo_total: 100, stock_anterior: 10, stock_nuevo: 5, observaciones: 'Merma por rotura', almacen: 'Cocina', numero_lote: 'LOT-2026-001', usuario: 'Chef' }
            ], []]);

        const tarjeta = await KardexService.obtenerTarjeta(7, KardexService.normalizarFiltros({ desde: '2026-08-01', hasta: '2026-08-31' }));

        // Saldo inicial: 10 - 6 = 4 unidades, 200 - 120 = 80 en valor
        expect(tarjeta.saldoInicial.cantidad).toBe(4);
        expect(tarjeta.saldoInicial.valor).toBe(80);

        // Movimientos con saldo corrido: 4 + 10 = 14 → 14 - 5 = 9
        expect(tarjeta.movimientos).toHaveLength(2);
        expect(tarjeta.movimientos[0].entrada_cantidad).toBe(10);
        expect(tarjeta.movimientos[0].saldo_cantidad).toBe(14);
        expect(tarjeta.movimientos[1].salida_cantidad).toBe(5);
        expect(tarjeta.movimientos[1].saldo_cantidad).toBe(9);

        // Totales y etiquetas legibles
        expect(tarjeta.totales).toMatchObject({ entradas_cantidad: 10, entradas_valor: 200, salidas_cantidad: 5, salidas_valor: 100, saldo_cantidad: 9, saldo_valor: 180 });
        expect(tarjeta.movimientos[1].etiqueta).toBe('Merma');

        // Saldo final = existencia real → sin descuadre
        expect(tarjeta.descuadre).toBe(0);
    });

    it('marca el descuadre cuando el kardex no cuadra con los lotes', async () => {
        db.query
            .mockResolvedValueOnce([[{ id: 7, codigo: 'P007', nombre: 'Ron', stock_minimo: 0, costo_promedio: 20, unidad: 'ml', stock_actual: 5, valor_stock: 100 }], []])
            .mockResolvedValueOnce([[{ tipo_movimiento: 'AJUSTE_POSITIVO', cantidad: 10, valor: 200 }], []])
            .mockResolvedValueOnce([[]]);

        const tarjeta = await KardexService.obtenerTarjeta(7, KardexService.normalizarFiltros({ desde: '2026-08-01', hasta: '2026-08-31' }));
        expect(tarjeta.totales.saldo_cantidad).toBe(10);
        expect(tarjeta.descuadre).toBe(5); // kardex 10 vs lotes 5
    });

    it('rechaza ids inváliles y productos inexistentes', async () => {
        await expect(KardexService.obtenerTarjeta('abc', {})).rejects.toMatchObject({ status: 400 });
        db.query.mockResolvedValueOnce([[], []]);
        await expect(KardexService.obtenerTarjeta(999, KardexService.normalizarFiltros({}))).rejects.toMatchObject({ status: 404 });
    });
});

describe('kardexService · listarProductos', () => {
    beforeEach(() => jest.clearAllMocks());

    it('agrega entradas y salidas del período por producto usando el signo', async () => {
        db.query
            .mockResolvedValueOnce([[{ id: 7, codigo: 'P007', nombre: 'Ron', stock_minimo: 2, costo_promedio: 20, unidad: 'ml', stock_actual: 9, valor_stock: 180 }], []])
            .mockResolvedValueOnce([[{ n: 1 }]])
            .mockResolvedValueOnce([[
                { producto_id: 7, tipo_movimiento: 'AJUSTE_POSITIVO', cantidad: 10, valor: 200 },
                { producto_id: 7, tipo_movimiento: 'MERMA', cantidad: 4, valor: 80 },
                { producto_id: 7, tipo_movimiento: 'CONTEO_FISICO', cantidad: 99, valor: 0 } // informativo: se ignora
            ], []]);

        const listado = await KardexService.listarProductos(
            KardexService.normalizarFiltros({ desde: '2026-08-01', hasta: '2026-08-31' }),
            { pagina: 1 }
        );

        expect(listado.total).toBe(1);
        expect(listado.productos[0]).toMatchObject({
            id: 7, stock_actual: 9, entradas: 10, salidas: 4, valor_entradas: 200, valor_salidas: 80
        });
    });
});

describe('kardexService · tarjetaACSV', () => {
    it('genera CSV con BOM, cabecera, saldo inicial, movimientos y totales', () => {
        const tarjeta = {
            producto: { id: 7, codigo: 'P007', nombre: 'Ron', unidad: 'ml', stock_actual: 9, valor_stock: 180 },
            filtros: { desde: '2026-08-01', hasta: '2026-08-31', almacen_id: null, tipo: 'todos' },
            saldoInicial: { cantidad: 4, valor: 80 },
            movimientos: [
                { fecha: new Date('2026-08-10T10:00:00Z'), etiqueta: 'Entrada/Ajuste positivo', documento: 'LOT-2026-001', lote: 'LOT-2026-001', almacen: 'Central', usuario: 'Admin', observaciones: 'Entrada manual de inventario', entrada_cantidad: 10, entrada_costo: 20, entrada_valor: 200, salida_cantidad: null, salida_costo: null, salida_valor: null, saldo_cantidad: 14, saldo_valor: 280 },
                { fecha: new Date('2026-08-20T15:00:00Z'), etiqueta: 'Merma', documento: 'SM-000001', lote: '', almacen: 'Cocina', usuario: 'Chef', observaciones: '', entrada_cantidad: null, entrada_costo: null, entrada_valor: null, salida_cantidad: 5, salida_costo: 20, salida_valor: 100, saldo_cantidad: 9, saldo_valor: 180 }
            ],
            totales: { entradas_cantidad: 10, entradas_valor: 200, salidas_cantidad: 5, salidas_valor: 100, saldo_cantidad: 9, saldo_valor: 180 },
            descuadre: 0
        };

        const { csv, filas } = KardexService.tarjetaACSV(tarjeta);
        const lineas = csv.split('\r\n');

        expect(csv.charCodeAt(0)).toBe(0xFEFF); // BOM UTF-8
        expect(filas).toBe(2);
        expect(lineas[0]).toContain('Kardex de inventario - P007 - Ron (ml)');
        expect(lineas[3]).toContain('Entrada cant');
        // Saldo inicial en la columna 13 (Saldo cant) y 14 (Saldo valor)
        const saldoInicial = lineas[4].split(';');
        expect(saldoInicial).toHaveLength(15);
        expect(saldoInicial[0]).toBe('(Saldo inicial)');
        expect(saldoInicial[12]).toBe('4,000');
        expect(saldoInicial[13]).toBe('80,00');
        // Movimiento de entrada: cant 10 en columna 7
        const mov1 = lineas[5].split(';');
        expect(mov1[1]).toBe('Entrada/Ajuste positivo');
        expect(mov1[6]).toBe('10,000');
        expect(mov1[8]).toBe('200,00');
        // Movimiento de salida: cant 5 en columna 10
        const mov2 = lineas[6].split(';');
        expect(mov2[1]).toBe('Merma');
        expect(mov2[9]).toBe('5,000');
        expect(mov2[11]).toBe('100,00');
        // Totales y existencia
        expect(csv).toContain('TOTALES');
        expect(csv).toContain('Existencia actual (lotes)');
        expect(csv).toContain('Descuadre kardex vs lotes');
    });
});
