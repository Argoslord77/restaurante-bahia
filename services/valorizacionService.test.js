// services/valorizacionService.test.js
// Verifica la valorización: las 3 consultas, la exportación CSV (BOM + ';')
// y el PDF gemelo.
jest.mock('../config/db', () => ({ query: jest.fn() }));

const db = require('../config/db');
const ValorizacionService = require('./valorizacionService');

const porAlmacen = [
    { id: 1, nombre: 'Principal', lotes_con_stock: 3, unidades: 100, valor: 1500.5 },
    { id: 2, nombre: 'Cocina', lotes_con_stock: 1, unidades: 20, valor: 499.5 },
];
const lotes = [
    { id: 9, numero_lote: 'L-1', estado: 'ACTIVO', cantidad_actual: 50, costo_unitario: 20,
      fecha_vencimiento: new Date('2027-01-15'), valor_lote: 1000,
      producto_nombre: 'Arroz; especial', producto_codigo: 'ARZ', almacen_nombre: 'Principal' },
    { id: 10, numero_lote: 'L-2', estado: 'VENCIDO', cantidad_actual: 5, costo_unitario: 10,
      fecha_vencimiento: new Date('2025-01-01'), valor_lote: 50,
      producto_nombre: 'Leche', producto_codigo: null, almacen_nombre: 'Cocina' },
];
const vencidos = { lotes: 2, valor: 75.25 };

describe('valorizacionService · obtenerDatos', () => {
    beforeEach(() => jest.clearAllMocks());

    it('devuelve porAlmacen, lotes y vencidos con 3 consultas', async () => {
        db.query
            .mockResolvedValueOnce([porAlmacen])
            .mockResolvedValueOnce([lotes])
            .mockResolvedValueOnce([[vencidos]]);
        const datos = await ValorizacionService.obtenerDatos();
        expect(db.query).toHaveBeenCalledTimes(3);
        expect(datos.porAlmacen).toHaveLength(2);
        expect(datos.lotes).toHaveLength(2);
        expect(datos.vencidos).toEqual(vencidos);
    });

    it('tolera que no haya vencidos', async () => {
        db.query
            .mockResolvedValueOnce([[]])
            .mockResolvedValueOnce([[]])
            .mockResolvedValueOnce([[]]);
        const datos = await ValorizacionService.obtenerDatos();
        expect(datos.vencidos).toEqual({ lotes: 0, valor: 0 });
    });
});

describe('valorizacionService · valorizacionACSV', () => {
    it('genera BOM, cabeceras y totales con decimal coma', () => {
        const { csv, filas } = ValorizacionService.valorizacionACSV({ porAlmacen, lotes, vencidos });
        expect(csv.charCodeAt(0)).toBe(0xFEFF); // BOM UTF-8
        expect(csv).toContain('Resumen por almacén');
        expect(csv).toContain('Detalle por lote (top 200 por valor)');
        expect(csv).toContain('Valor en lotes vencidos (riesgo)');
        expect(csv).toContain('TOTAL GENERAL;;;2000,00;100,0 %');
        expect(csv).toContain('Arroz  especial'); // ';' saneado
        expect(csv).toContain('VENCIDO');
        expect(filas).toBe(2);
    });

    it('no divide por cero con almacenes vacíos', () => {
        const { csv } = ValorizacionService.valorizacionACSV({ porAlmacen: [], lotes: [], vencidos: { lotes: 0, valor: 0 } });
        expect(csv).toContain('TOTAL GENERAL;;;0,00;100,0 %');
    });
});

describe('valorizacionService · valorizacionAPDF', () => {
    it('genera un PDF válido', async () => {
        const pdf = await ValorizacionService.valorizacionAPDF(
            { porAlmacen, lotes, vencidos }, { generadoPor: 'Prueba' });
        expect(pdf.slice(0, 5).toString()).toBe('%PDF-');
        expect(pdf.length).toBeGreaterThan(1000);
    });

    it('tolera datos vacíos', async () => {
        const pdf = await ValorizacionService.valorizacionAPDF(
            { porAlmacen: [], lotes: [], vencidos: { lotes: 0, valor: 0 } });
        expect(pdf.slice(0, 5).toString()).toBe('%PDF-');
    });
});
