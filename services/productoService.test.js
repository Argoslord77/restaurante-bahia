// productoService.test.js — CSV del catálogo de inventario.
const productoService = require('./productoService');

jest.mock('../models/productoModel', () => ({ getAll: jest.fn() }));

describe('ProductoService.catalogoACSV', () => {
  it('genera CSV con BOM, ; y estados en texto', () => {
    const csv = productoService.catalogoACSV([
      { codigo: 'A1', nombre: 'Arroz;grano', categoria_nombre: 'Granos', unidad_nombre: 'kg', costo_promedio: 120.5, stock_minimo: 10, permitida_venta: 1, activo: 1 },
      { codigo: 'B2', nombre: 'Sal', costo_promedio: 0, stock_minimo: 0, permitida_venta: 0, activo: 0 }
    ]);
    expect(csv.charCodeAt(0)).toBe(0xFEFF);
    expect(csv).toContain('Codigo;Nombre;Categoria;U. Inventario;Costo Promedio;Stock Min;Venta Directa;Estado');
    expect(csv).toContain('A1;Arroz grano;Granos;kg;120,50;10,000;Si;Activo');
    expect(csv).toContain('B2;Sal;;;0,00;0,000;No;Inactivo');
  });

  it('lista vacía solo trae encabezados', () => {
    const csv = productoService.catalogoACSV([]);
    expect(csv).toContain('Catalogo de productos');
    expect(csv.split('\r\n').filter(Boolean)).toHaveLength(2);
  });

  it('catalogoAPDF genera un PDF válido en memoria', async () => {
    const pdf = await productoService.catalogoAPDF([
      { codigo: 'A1', nombre: 'Arroz', categoria_nombre: 'Granos', unidad_nombre: 'kg', costo_promedio: 120.5, stock_minimo: 10, permitida_venta: 1, activo: 1 }
    ], { generadoPor: 'Ana' });
    expect(Buffer.isBuffer(pdf)).toBe(true);
    expect(pdf.slice(0, 5).toString()).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(1000);
  });
});
