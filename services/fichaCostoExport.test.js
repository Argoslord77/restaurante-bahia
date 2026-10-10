// services/fichaCostoExport.test.js
// Verifica las exportaciones del listado de insumos y de la rentabilidad:
// CSV con BOM + ';' y PDFs gemelos.
const FichaExport = require('./fichaCostoExport');

const productos = [
    { nombre: 'Arroz', codigo: 'ARZ', unidad_medida: 'kg', costo_promedio_ponderado: 12.5,
      enUso: true, tieneFicha: true, numRecetas: 3, costoRecetaUMV: 12.0, variacionRecetaPct: -4.0,
      costoFicha: 13.0, variacionFichaPct: 4.0, actualizado_en: new Date('2026-10-01 10:00:00') },
    { nombre: 'Sal', codigo: null, unidad_medida: 'kg', costo_promedio_ponderado: 2,
      enUso: true, tieneFicha: false, numRecetas: 0, costoRecetaUMV: null, variacionRecetaPct: null,
      costoFicha: null, variacionFichaPct: null, actualizado_en: null },
    { nombre: 'Viejo', codigo: 'VJ', unidad_medida: 'ud', costo_promedio_ponderado: 1,
      enUso: false, tieneFicha: false, numRecetas: 0, costoRecetaUMV: null, variacionRecetaPct: null,
      costoFicha: null, variacionFichaPct: null, actualizado_en: null },
];

const platillos = [
    { nombre: 'Congrí', costo: 30, precio_cup: 120, precio_comision: 100, precio_zelle: 1.2,
      food_cost_porcentaje: 25.0, evaluacion: { nivel: 'ok', etiqueta: 'Saludable' },
      ingredientes_sin_ficha: 0, margen: 90, sugerido: 100 },
    { nombre: 'Langosta', costo: 200, precio_cup: 300, precio_comision: null, precio_zelle: null,
      food_cost_porcentaje: 66.7, evaluacion: { nivel: 'critico', etiqueta: 'Revisar precio' },
      ingredientes_sin_ficha: 2, margen: 100, sugerido: 580 },
];

const resumen = { total: 2, sin_precio: 0, incompletos: 1, criticos: 1, food_cost_medio: 45.85 };

describe('fichaCostoExport · estadoFicha', () => {
    it('etiqueta los 4 estados igual que la vista', () => {
        expect(FichaExport.estadoFicha(productos[0])).toBe('Ficha completa (3)');
        expect(FichaExport.estadoFicha(productos[1])).toBe('Sin ficha');
        expect(FichaExport.estadoFicha({ enUso: false, tieneFicha: true })).toBe('Tiene ficha');
        expect(FichaExport.estadoFicha(productos[2])).toBe('Vacía');
    });
});

describe('fichaCostoExport · listadoACSV / listadoAPDF', () => {
    it('genera CSV con BOM y 11 columnas', () => {
        const { csv, filas } = FichaExport.listadoACSV(productos);
        expect(csv.charCodeAt(0)).toBe(0xFEFF); // BOM UTF-8
        expect(csv).toContain('Fichas de costo — listado de insumos');
        expect(csv).toContain('Insumo;Código;Unidad;Costo prom.;En uso;Ficha;Receta x UMV;Var. receta;Costo ficha;Var. ficha;Actualizado');
        expect(csv).toContain('Ficha completa (3)');
        expect(csv).toContain('Sin ficha');
        expect(csv).toContain('+4,0 %');
        expect(filas).toBe(3);
    });

    it('genera un PDF válido', async () => {
        const pdf = await FichaExport.listadoAPDF(productos, { generadoPor: 'Prueba' });
        expect(pdf.slice(0, 5).toString()).toBe('%PDF-');
        expect(pdf.length).toBeGreaterThan(1000);
    });
});

describe('fichaCostoExport · rentabilidadACSV / rentabilidadAPDF', () => {
    it('genera CSV con objetivo, 3 precios y resumen', () => {
        const { csv, filas } = FichaExport.rentabilidadACSV(platillos, resumen, 30);
        expect(csv.charCodeAt(0)).toBe(0xFEFF); // BOM UTF-8
        expect(csv).toContain('Objetivo food cost;30,0 %');
        expect(csv).toContain('Platillo;Costo;Precio CUP;Comisión;Zelle;Food cost %;Evaluación;Margen;Precio sugerido;Diferencia');
        expect(csv).toContain('Revisar precio');
        expect(csv).toContain('Críticos;1');
        expect(csv).toContain('Food cost medio;45,85 %');
        expect(filas).toBe(2);
    });

    it('genera un PDF válido', async () => {
        const pdf = await FichaExport.rentabilidadAPDF(platillos, resumen, 30, { generadoPor: 'Prueba' });
        expect(pdf.slice(0, 5).toString()).toBe('%PDF-');
        expect(pdf.length).toBeGreaterThan(1000);
    });
});
