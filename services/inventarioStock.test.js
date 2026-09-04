// services/inventarioStock.test.js
// Contrato del aviso de stock del POS: la unidad PRIMARIA mostrada es la de
// PRODUCCIÓN/CONSUMO de la receta; la de almacén/compra va como secundaria.
jest.mock('../config/db', () => ({ query: jest.fn() }));

jest.mock('./unidadMedidaService', () => ({
    obtenerFactor: jest.fn(),
    stockLotesConvertidos: jest.fn()
}));
jest.mock('./almacenService', () => ({}));

const dbMock = require('../config/db');
const InventarioService = require('./inventarioService');
const UnidadMedidaService = require('./unidadMedidaService');

describe('InventarioService.verificarStockPlatillo · unidades de producción', () => {
    beforeEach(() => {
        dbMock.query.mockReset();
        UnidadMedidaService.obtenerFactor.mockReset();
        UnidadMedidaService.stockLotesConvertidos.mockReset();

        jest.spyOn(InventarioService, '_resloverAreasProduccionPlatillo').mockResolvedValue({
            preferido: { id: 2, nombre: 'Cocina' },
            alterno: { id: 5, nombre: 'Bar' }
        });

        // Una sola consulta de ingredientes: Harina, receta en GRAMOS,
        // almacén/compra en kg (factor 0.001).
        dbMock.query.mockResolvedValueOnce([[
            {
                insumo_id: 23,
                cantidad_receta: 590,
                unidad_receta: 'Gramo',
                porcentaje_merma: 0,
                es_opcional: 0,
                insumo_nombre: 'Harina',
                unidad_inventario: 'kg',
                unidad_inventario_nombre: 'Kilogramo',
                unidad_produccion_nombre: 'Gramo',
                unidad_produccion_abrev: 'gr',
                unidad_produccion_codigo: 'G'
            }
        ]]);
        UnidadMedidaService.obtenerFactor.mockResolvedValue(0.001);
        // Stock por lotes: se consulta por área (Cocina + Bar), por eso la
        // mitad por llamada: 500 g en 'Gramo' / 0.5 kg en 'kg' en total.
        UnidadMedidaService.stockLotesConvertidos.mockImplementation(async (pid, destino) => ({
            total: String(destino).toLowerCase() === 'kg' ? 0.25 : 250,
            sinConversion: false
        }));
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('faltante con unidad primaria de producción y secundaria de almacén', async () => {
        const r = await InventarioService.verificarStockPlatillo(113, 1);

        expect(r.suficiente).toBe(false);
        expect(r.faltantes).toHaveLength(1);
        const f = r.faltantes[0];

        expect(f.insumo_nombre).toBe('Harina');
        // PRIMARIO: unidad de producción/consumo (la de la receta)
        expect(f.unidad).toBe('Gramo');
        expect(f.unidad_medida).toBe('Gramo');
        expect(f.requerido).toBeCloseTo(590, 4);
        expect(f.disponible).toBeCloseTo(500, 4);
        // SECUNDARIO: equivalente en almacén/compra
        expect(f.requerido_inventario).toBeCloseTo(0.59, 6);
        expect(f.disponible_inventario).toBeCloseTo(0.5, 6);
        expect(f.unidad_inventario).toBe('Kilogramo');
        expect(f.unidad_inventario_abrev).toBe('kg');
        expect(f.areas).toBe('Cocina + Bar');
    });

    test('insumo opcional sin stock no bloquea (va a advertencias)', async () => {
        dbMock.query.mockReset();
        dbMock.query.mockResolvedValueOnce([[
            {
                insumo_id: 23,
                cantidad_receta: 590,
                unidad_receta: 'Gramo',
                porcentaje_merma: 0,
                es_opcional: 1,
                insumo_nombre: 'Harina',
                unidad_inventario: 'kg',
                unidad_inventario_nombre: 'Kilogramo',
                unidad_produccion_nombre: 'Gramo',
                unidad_produccion_abrev: 'gr',
                unidad_produccion_codigo: 'G'
            }
        ]]);
        UnidadMedidaService.obtenerFactor.mockResolvedValue(0.001);
        UnidadMedidaService.stockLotesConvertidos.mockResolvedValue({ total: 0.1, sinConversion: false });

        const r = await InventarioService.verificarStockPlatillo(113, 1);
        expect(r.suficiente).toBe(true);
        expect(r.faltantes).toHaveLength(0);
        expect(r.advertencias).toHaveLength(1);
        expect(r.advertencias[0].unidad).toBe('Gramo');
        expect(r.advertencias[0].detalle).toContain('opcional');
    });

    test('sin receta devuelve suficiente sin faltantes', async () => {
        dbMock.query.mockReset();
        dbMock.query.mockResolvedValueOnce([[]]);
        const r = await InventarioService.verificarStockPlatillo(80, 1);
        expect(r.suficiente).toBe(true);
        expect(r.sin_receta).toBe(true);
    });
});
