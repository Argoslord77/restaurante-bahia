// services/costeoService.test.js
// Verifica las fórmulas del escandallo contra ejemplos publicados del sector,
// para que no dependan de mi criterio sino de valores contrastables.

const C = require('./costeoService');

describe('Ficha de costo · rendimiento y merma', () => {
    it('sin merma, el costo neto es el precio de compra', () => {
        const r = C.calcularFichaCosto({
            precio_compra: 10, cantidad_presentacion: 1,
            porcentaje_merma: 0, porcentaje_imprevistos: 0
        });
        expect(r.costo_unitario_neto).toBe(10);
        expect(r.rendimiento_porcentaje).toBe(100);
        expect(r.factor_rendimiento).toBe(1);
    });

    it('caso de las gambas: 12 €/kg con 40% de merma → 20 €/kg útil', () => {
        // Ejemplo estándar: si de 1 kg comprado solo aprovechas 600 g,
        // el kilo utilizable cuesta 12 / 0,6 = 20
        const r = C.calcularFichaCosto({
            precio_compra: 12, cantidad_presentacion: 1,
            porcentaje_merma: 40, porcentaje_imprevistos: 0
        });
        expect(r.costo_unitario_neto).toBe(20);
        expect(r.factor_rendimiento).toBe(1.6667);
        expect(r.sobrecosto_merma).toBe(8);
    });

    it('caso de la merluza: 12 €/kg con 50% de merma duplica el costo', () => {
        const r = C.calcularFichaCosto({
            precio_compra: 12, cantidad_presentacion: 1,
            porcentaje_merma: 50, porcentaje_imprevistos: 0
        });
        expect(r.costo_unitario_neto).toBe(24);
        expect(r.rendimiento_porcentaje).toBe(50);
    });

    it('reparte el precio entre las unidades de la presentación', () => {
        // Un saco de 25 kg a 500 → 20 por kg
        const r = C.calcularFichaCosto({
            precio_compra: 500, cantidad_presentacion: 25,
            porcentaje_merma: 0, porcentaje_imprevistos: 0
        });
        expect(r.costo_unitario_bruto).toBe(20);
    });

    it('limita la merma al 99,9% para no dividir por cero', () => {
        const r = C.calcularFichaCosto({
            precio_compra: 10, cantidad_presentacion: 1, porcentaje_merma: 100
        });
        expect(r.porcentaje_merma).toBe(99.9);
        expect(Number.isFinite(r.costo_unitario_neto)).toBe(true);
    });

    it('no revienta con una presentación de cero', () => {
        const r = C.calcularFichaCosto({ precio_compra: 10, cantidad_presentacion: 0 });
        expect(Number.isFinite(r.costo_final_unitario)).toBe(true);
    });
});

describe('Ficha de costo · costos directos, conceptos e imprevistos', () => {
    it('prorratea los costos directos entre las unidades', () => {
        // 100 de compra / 10 unidades = 10; flete 20 / 10 = 2 → 12
        const r = C.calcularFichaCosto({
            precio_compra: 100, cantidad_presentacion: 10, porcentaje_merma: 0,
            costo_flete: 20, porcentaje_imprevistos: 0
        });
        expect(r.costos_directos_unitarios).toBe(2);
        expect(r.costo_final_unitario).toBe(12);
    });

    it('aplica los imprevistos sobre el subtotal', () => {
        const r = C.calcularFichaCosto({
            precio_compra: 100, cantidad_presentacion: 1,
            porcentaje_merma: 0, porcentaje_imprevistos: 5
        });
        expect(r.importe_imprevistos).toBe(5);
        expect(r.costo_final_unitario).toBe(105);
    });

    it('admite conceptos libres fijos y porcentuales del operario', () => {
        const r = C.calcularFichaCosto({
            precio_compra: 100, cantidad_presentacion: 10, porcentaje_merma: 0,
            porcentaje_imprevistos: 0,
            conceptos: [
                { concepto: 'Etiquetado', tipo: 'FIJO', valor: 30 },      // 30/10 = 3
                { concepto: 'Almacenaje', tipo: 'PORCENTAJE', valor: 10 } // 10% de 10 = 1
            ]
        });
        expect(r.conceptos_fijos_unitarios).toBe(3);
        expect(r.conceptos_porcentaje_unitarios).toBe(1);
        expect(r.costo_final_unitario).toBe(14);
        expect(r.desglose_conceptos).toHaveLength(2);
    });

    it('encadena todo en el orden correcto', () => {
        // 200/10 = 20 bruto; merma 20% → 25 neto; flete 50/10 = 5 → 30; +10% = 33
        const r = C.calcularFichaCosto({
            precio_compra: 200, cantidad_presentacion: 10, porcentaje_merma: 20,
            costo_flete: 50, porcentaje_imprevistos: 10
        });
        expect(r.costo_unitario_bruto).toBe(20);
        expect(r.costo_unitario_neto).toBe(25);
        expect(r.subtotal_unitario).toBe(30);
        expect(r.costo_final_unitario).toBe(33);
    });
});

describe('Costo del platillo', () => {
    it('suma cantidad × costo de cada ingrediente', () => {
        const r = C.calcularCostoPlatillo([
            { producto_id: 1, cantidad: 0.25, porcentaje_merma: 0, costo_unitario: 20 },
            { producto_id: 2, cantidad: 0.1, porcentaje_merma: 0, costo_unitario: 5 }
        ]);
        expect(r.costo_total).toBe(5.5);
        expect(r.completo).toBe(true);
    });

    it('aplica la merma propia de la receta', () => {
        // 0,5 kg netos con 20% de merma requieren 0,625 kg → 6,25
        const r = C.calcularCostoPlatillo([
            { cantidad: 0.5, porcentaje_merma: 20, costo_unitario: 10 }
        ]);
        expect(r.costo_total).toBe(6.25);
    });

    it('divide entre las porciones que rinde la receta', () => {
        const r = C.calcularCostoPlatillo(
            [{ cantidad: 1, porcentaje_merma: 0, costo_unitario: 40 }],
            { rendimiento: 4 });
        expect(r.costo_por_porcion).toBe(10);
        expect(r.porciones).toBe(4);
    });

    it('avisa de los ingredientes sin ficha en lugar de silenciarlos', () => {
        const r = C.calcularCostoPlatillo([
            { producto_id: 1, cantidad: 1, costo_unitario: 10 },
            { producto_id: 2, cantidad: 1, costo_unitario: 0 }
        ]);
        expect(r.ingredientes_sin_ficha).toBe(1);
        expect(r.completo).toBe(false);
        expect(r.detalle[1].sin_ficha).toBe(true);
    });
});

describe('Precio de venta e indicadores', () => {
    it('precio sugerido = costo / food cost objetivo', () => {
        expect(C.precioSugerido(3.5, 25).precio_exacto).toBe(14);
        expect(C.precioSugerido(26.25, 30).precio_exacto).toBe(87.5);
    });

    it('redondea al múltiplo indicado, siempre hacia arriba', () => {
        // Redondear a la baja dejaría el food cost por encima del objetivo
        expect(C.precioSugerido(30, 30, 5).precio_redondeado).toBe(100);
        expect(C.precioSugerido(30.3, 30, 5).precio_redondeado).toBe(105);
        expect(C.precioSugerido(30.3, 30, 0).precio_redondeado).toBe(101);
    });

    it('food cost y margen coinciden con el ejemplo del sector', () => {
        // 3,50 de coste vendido a 14 → 25%
        const i = C.calcularIndicadores(3.5, 14);
        expect(i.food_cost_porcentaje).toBe(25);
        expect(i.margen).toBe(10.5);
        expect(i.margen_porcentaje).toBe(75);
        expect(i.factor).toBe(4);
    });

    it('devuelve nulos si el platillo no tiene precio', () => {
        expect(C.calcularIndicadores(10, 0).food_cost_porcentaje).toBeNull();
    });

    it('el semáforo distingue los tres niveles', () => {
        expect(C.evaluarFoodCost(28, 30).nivel).toBe('bueno');
        expect(C.evaluarFoodCost(35, 30).nivel).toBe('ajustado');
        expect(C.evaluarFoodCost(60, 30).nivel).toBe('critico');
        expect(C.evaluarFoodCost(null, 30).nivel).toBe('desconocido');
    });
});

describe('Sugerencia para las tres cartas', () => {
    const opciones = { foodCostObjetivo: 30, multiploRedondeo: 5, tasaZelle: 400 };

    it('calcula la carta CUP con el food cost objetivo', () => {
        const s = C.sugerirPreciosCartas(30, { CUP: 90, COMISION: 100, ZELLE: 0.25 }, opciones);
        expect(s.CUP.exacto).toBe(100);   // 30 / 0,30
        expect(s.CUP.sugerido).toBe(100);
    });

    it('CONSERVA la proporción actual entre cartas', () => {
        // Comisión es 1,2× CUP y Zelle 1/400 de CUP: debe mantenerse
        const s = C.sugerirPreciosCartas(30, { CUP: 100, COMISION: 120, ZELLE: 0.25 }, opciones);
        expect(s.COMISION.sugerido).toBe(120);
        expect(s.ZELLE.sugerido).toBe(0.25);
    });

    it('propaga la subida a las tres cartas manteniendo la relación', () => {
        // El costo se duplica: todas las cartas deben duplicarse
        const s = C.sugerirPreciosCartas(60, { CUP: 100, COMISION: 120, ZELLE: 0.25 }, opciones);
        expect(s.CUP.sugerido).toBe(200);
        expect(s.COMISION.sugerido).toBe(240);
        expect(s.ZELLE.sugerido).toBe(0.5);
    });

    it('usa la tasa de cambio cuando la carta Zelle aún no tiene precio', () => {
        const s = C.sugerirPreciosCartas(30, { CUP: 100, COMISION: 0, ZELLE: 0 }, opciones);
        expect(s.ZELLE.sugerido).toBe(0.25);            // 100 / 400
        expect(s.COMISION.sugerido).toBe(110);          // factor por defecto 1,10
        expect(s.ZELLE.base).toMatch(/tasa/i);
    });

    it('mide el food cost de la carta Zelle en su propia moneda', () => {
        // Comparar un costo en CUP con un precio en USD daría un disparate
        const s = C.sugerirPreciosCartas(30, { CUP: 100, COMISION: 120, ZELLE: 0.25 }, opciones);
        expect(s.ZELLE.indicadores_sugerido.food_cost_porcentaje).toBe(30);
    });

    it('informa de la base usada para cada carta', () => {
        const s = C.sugerirPreciosCartas(30, { CUP: 100, COMISION: 120, ZELLE: 0.25 }, opciones);
        expect(s.CUP.base).toMatch(/Food cost/i);
        expect(s.COMISION.base).toMatch(/Proporción/i);
    });

    it('detecta que el precio actual deja el food cost fuera de objetivo', () => {
        // Costo 60 con precio 100 → 60% de food cost
        const s = C.sugerirPreciosCartas(60, { CUP: 100, COMISION: 120, ZELLE: 0.25 }, opciones);
        expect(s.CUP.indicadores_actual.food_cost_porcentaje).toBe(60);
        expect(s.CUP.indicadores_sugerido.food_cost_porcentaje).toBe(30);
    });
});
