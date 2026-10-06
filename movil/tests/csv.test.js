// Pruebas de exportación CSV.
const C = require('../www/js/csv');

describe('CSV', () => {
    it('escapa separador, comillas y saltos', () => {
        const t = C.tabla(['A', 'B'], [['x;y', 'di"ce'], ['l1\nl2', 5]]);
        expect(t).toContain('"x;y"');
        expect(t).toContain('"di""ce"');
        expect(t[0]).toBe('﻿'); // BOM
    });

    it('ventas por día con decimales con coma', () => {
        const t = C.ventasPorDia({
            dias: [{ dia: '2026-10-06', n: 2, subtotal: 100, descuento: 0, iva: 16, total: 116, utilidad: 20 }],
            totales: { n: 2, subtotal: 100, descuento: 0, iva: 16, total: 116, utilidad: 20 }
        });
        expect(t).toContain('Dia;Ventas;Subtotal');
        expect(t).toContain('2026-10-06;2;100,00;0,00;16,00;116,00;20,00');
    });

    it('más vendidos y valorizado', () => {
        const m = C.masVendidos({ filas: [{ nombre: 'Tortilla', cantidad: 3, importe: 60 }] });
        expect(m).toContain('Tortilla;3;60,00');
        const v = C.valorizado({ filas: [{ sku: 'AB-1', nombre: 'Tortilla', categoria_nombre: 'Ab',
            stock: 10, precio_costo: 14, precio_venta: 20, valor_costo: 140, valor_venta: 200 }],
            totales: { unidades: 10, costo: 140, venta: 200 } });
        expect(v).toContain('TOTAL');
        expect(v).toContain('200,00');
    });

    it('nombre de archivo con fecha', () => {
        expect(C.nombre('ventas')).toMatch(/^cajafacil-ventas-\d{8}\.csv$/);
    });
});
