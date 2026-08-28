// services/costeoService.js
// Motor de cálculo de la ficha de costo y del precio de venta.
//
// Contiene ÚNICAMENTE funciones puras: no toca la base de datos ni depende de
// Express. Así las fórmulas quedan aisladas, se pueden verificar una a una y
// reutilizar tanto desde el servidor como desde la vista.
//
// ─────────────────────────────────────────────────────────────────────────────
// FÓRMULAS ESTÁNDAR DEL SECTOR (escandallo / food cost)
//
//   Rendimiento (%)       = 100 − % merma
//   Factor de rendimiento = 1 / (rendimiento / 100)
//   Costo unitario bruto  = Precio de compra / cantidad de la presentación
//   Costo unitario neto   = Costo bruto / (1 − % merma / 100)
//   Costo final unitario  = (Costo neto + costos directos prorrateados)
//                           × (1 + % imprevistos / 100)
//
//   Costo del platillo    = Σ (cantidad del ingrediente × costo final del insumo)
//   Precio sugerido       = Costo del platillo / (food cost objetivo / 100)
//   Food cost (%)         = (Costo del platillo / Precio de venta) × 100
//   Margen bruto          = Precio de venta − Costo
//
// Referencia: práctica estándar de escandallo en hostelería. El food cost
// objetivo habitual está entre el 28% y el 35% según el tipo de local; el
// colchón de imprevistos ronda el 5%.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';

// Rangos de food cost recomendados, para orientar al operario en la interfaz
const REFERENCIAS_FOOD_COST = Object.freeze([
    { tipo: 'Alta cocina',            min: 25, max: 28 },
    { tipo: 'Restaurante a la carta', min: 28, max: 32 },
    { tipo: 'Comida rápida',          min: 30, max: 35 },
    { tipo: 'Cafetería / panadería',  min: 22, max: 28 }
]);

const CARTAS = Object.freeze(['CUP', 'COMISION', 'ZELLE']);

/** Convierte a número finito y no negativo; devuelve `porDefecto` si no lo es. */
function num(valor, porDefecto = 0) {
    const n = Number(valor);
    return Number.isFinite(n) ? n : porDefecto;
}

/** Redondea a `decimales` evitando los artefactos del punto flotante. */
function redondear(valor, decimales = 4) {
    const factor = Math.pow(10, decimales);
    return Math.round((num(valor) + Number.EPSILON) * factor) / factor;
}

/**
 * Redondea un precio al múltiplo indicado (por ejemplo, de 5 en 5 CUP).
 * Siempre hacia arriba: redondear a la baja dejaría el food cost por encima
 * del objetivo. Con múltiplo 0 se devuelve el valor con dos decimales.
 *
 * El cociente se sanea antes del techo porque la coma flotante lo estropea:
 * 100 × 1,10 da 110.00000000000001, y su techo entre 5 saltaría a 115. Sobre
 * un precio de venta eso es una subida injustificada del 4,5%.
 */
function redondearAMultiplo(valor, multiplo = 0) {
    const v = redondear(num(valor), 6);
    const m = num(multiplo);
    if (m <= 0) return redondear(v, 2);
    const entero = Math.ceil(redondear(v / m, 9));
    return redondear(entero * m, 2);
}

/**
 * Calcula la ficha de costo de un insumo de almacén.
 *
 * @param {object} ficha
 * @param {number} ficha.precio_compra          Precio de la presentación completa
 * @param {number} ficha.cantidad_presentacion  Unidades de inventario que trae
 * @param {number} ficha.porcentaje_merma       Merma de limpieza/preparación (%)
 * @param {number} ficha.costo_flete            Transporte imputable a la presentación
 * @param {number} ficha.costo_envase
 * @param {number} ficha.costo_mano_obra
 * @param {number} ficha.otros_costos
 * @param {number} ficha.porcentaje_imprevistos
 * @param {Array}  ficha.conceptos              Conceptos libres del operario
 *                                              [{concepto, tipo:'FIJO'|'PORCENTAJE', valor}]
 * @returns {object} Desglose completo, listo para mostrar y para persistir.
 */
function calcularFichaCosto(ficha = {}) {
    const precioCompra = Math.max(0, num(ficha.precio_compra));
    // La presentación nunca puede ser 0: sería una división por cero
    const cantidad = Math.max(0.000001, num(ficha.cantidad_presentacion, 1));
    // La merma se limita al 99,9%: al 100% el rendimiento sería nulo
    const merma = Math.min(99.9, Math.max(0, num(ficha.porcentaje_merma)));
    const imprevistos = Math.max(0, num(ficha.porcentaje_imprevistos));

    const rendimiento = 100 - merma;
    const factorRendimiento = 100 / rendimiento;

    // 1. Costo por unidad de inventario, tal cual se compra
    const costoUnitarioBruto = precioCompra / cantidad;

    // 2. Ajuste por merma: lo aprovechable sale más caro que lo comprado
    const costoUnitarioNeto = costoUnitarioBruto * factorRendimiento;

    // 3. Costos directos fijos, prorrateados entre las unidades de la presentación
    const directosPresentacion =
        Math.max(0, num(ficha.costo_flete)) +
        Math.max(0, num(ficha.costo_envase)) +
        Math.max(0, num(ficha.costo_mano_obra)) +
        Math.max(0, num(ficha.otros_costos));
    const directosUnitarios = directosPresentacion / cantidad;

    // 4. Conceptos libres definidos por el operario
    const conceptos = Array.isArray(ficha.conceptos) ? ficha.conceptos : [];
    let conceptosFijosUnitarios = 0;
    let conceptosPorcentaje = 0;
    const desgloseConceptos = [];

    for (const c of conceptos) {
        const valor = num(c.valor);
        if (String(c.tipo).toUpperCase() === 'PORCENTAJE') {
            conceptosPorcentaje += valor;
            desgloseConceptos.push({
                concepto: c.concepto, tipo: 'PORCENTAJE', valor,
                importe_unitario: redondear(costoUnitarioNeto * (valor / 100), 6)
            });
        } else {
            const unitario = valor / cantidad;
            conceptosFijosUnitarios += unitario;
            desgloseConceptos.push({
                concepto: c.concepto, tipo: 'FIJO', valor,
                importe_unitario: redondear(unitario, 6)
            });
        }
    }

    // Los porcentajes libres se aplican sobre el costo con merma, igual que
    // los imprevistos: representan sobrecostos proporcionales al insumo.
    const importeConceptosPorcentaje = costoUnitarioNeto * (conceptosPorcentaje / 100);

    // 5. Subtotal e imprevistos
    const subtotal = costoUnitarioNeto + directosUnitarios +
                     conceptosFijosUnitarios + importeConceptosPorcentaje;
    const importeImprevistos = subtotal * (imprevistos / 100);
    const costoFinalUnitario = subtotal + importeImprevistos;

    // Cuánto encarece la merma respecto del precio de compra puro
    const sobrecostoMerma = costoUnitarioNeto - costoUnitarioBruto;

    return {
        // Entradas normalizadas
        precio_compra: redondear(precioCompra, 4),
        cantidad_presentacion: redondear(cantidad, 4),
        porcentaje_merma: redondear(merma, 3),
        porcentaje_imprevistos: redondear(imprevistos, 3),

        // Rendimiento
        rendimiento_porcentaje: redondear(rendimiento, 3),
        factor_rendimiento: redondear(factorRendimiento, 4),

        // Escalonado del costo
        costo_unitario_bruto: redondear(costoUnitarioBruto, 6),
        costo_unitario_neto: redondear(costoUnitarioNeto, 6),
        sobrecosto_merma: redondear(sobrecostoMerma, 6),
        costos_directos_unitarios: redondear(directosUnitarios, 6),
        conceptos_fijos_unitarios: redondear(conceptosFijosUnitarios, 6),
        conceptos_porcentaje_unitarios: redondear(importeConceptosPorcentaje, 6),
        subtotal_unitario: redondear(subtotal, 6),
        importe_imprevistos: redondear(importeImprevistos, 6),
        costo_final_unitario: redondear(costoFinalUnitario, 6),

        desglose_conceptos: desgloseConceptos
    };
}

/**
 * Costo de un platillo a partir de los ingredientes de su receta.
 *
 * Cada ingrediente aporta: cantidad × costo final del insumo, ajustado por la
 * merma propia de la receta (la que se produce al elaborar el plato, distinta
 * de la merma de limpieza que ya recoge la ficha del insumo).
 *
 * @param {Array} ingredientes [{cantidad, porcentaje_merma, costo_unitario, ...}]
 * @param {object} opciones {rendimiento: porciones que produce la receta}
 */
function calcularCostoPlatillo(ingredientes = [], opciones = {}) {
    const porciones = Math.max(1, num(opciones.rendimiento, 1));
    const detalle = [];
    let costoTotal = 0;
    let sinCosto = 0;

    for (const ing of (Array.isArray(ingredientes) ? ingredientes : [])) {
        const cantidad = Math.max(0, num(ing.cantidad ?? ing.cantidad_requerida));
        const mermaReceta = Math.min(99.9, Math.max(0, num(ing.porcentaje_merma)));
        const costoUnitario = num(ing.costo_unitario ?? ing.costo_final_unitario);

        // Misma lógica que en la ficha: para obtener la cantidad neta hay que
        // partir de una cantidad bruta mayor
        const cantidadEfectiva = cantidad * (100 / (100 - mermaReceta));
        const costo = cantidadEfectiva * costoUnitario;

        if (costoUnitario <= 0) sinCosto += 1;
        costoTotal += costo;

        detalle.push({
            producto_id: ing.producto_id ?? null,
            producto_nombre: ing.producto_nombre ?? null,
            cantidad: redondear(cantidad, 4),
            porcentaje_merma: redondear(mermaReceta, 3),
            cantidad_efectiva: redondear(cantidadEfectiva, 6),
            costo_unitario: redondear(costoUnitario, 6),
            costo: redondear(costo, 4),
            sin_ficha: costoUnitario <= 0
        });
    }

    return {
        costo_total: redondear(costoTotal, 4),
        costo_por_porcion: redondear(costoTotal / porciones, 4),
        porciones,
        ingredientes_sin_ficha: sinCosto,
        completo: sinCosto === 0,
        detalle
    };
}

/**
 * Indicadores de rentabilidad de un platillo frente a un precio de venta.
 */
function calcularIndicadores(costo, precioVenta) {
    const c = Math.max(0, num(costo));
    const p = num(precioVenta);
    if (p <= 0) {
        return { food_cost_porcentaje: null, margen: null, margen_porcentaje: null, factor: null };
    }
    return {
        food_cost_porcentaje: redondear((c / p) * 100, 2),
        margen: redondear(p - c, 2),
        margen_porcentaje: redondear(((p - c) / p) * 100, 2),
        factor: c > 0 ? redondear(p / c, 2) : null
    };
}

/**
 * Precio de venta mínimo para respetar un food cost objetivo.
 *   Precio = Costo / (food cost objetivo / 100)
 */
function precioSugerido(costo, foodCostObjetivo = 30, multiploRedondeo = 0) {
    const c = Math.max(0, num(costo));
    const objetivo = Math.min(99, Math.max(1, num(foodCostObjetivo, 30)));
    const bruto = c / (objetivo / 100);
    return {
        precio_exacto: redondear(bruto, 2),
        precio_redondeado: redondearAMultiplo(bruto, multiploRedondeo),
        food_cost_objetivo: objetivo
    };
}

/**
 * Precios sugeridos para las tres cartas.
 *
 * La carta CUP se calcula con el food cost objetivo. Las cartas COMISIÓN y
 * ZELLE se derivan CONSERVANDO LA PROPORCIÓN que el platillo ya tenía respecto
 * a la carta CUP: es la forma honesta de proponer un ajuste sin inventarse la
 * política comercial del restaurante. Si el platillo no tiene todavía precio en
 * alguna carta, se recurre a los factores de reserva indicados.
 *
 * @param {number} costoPorcion
 * @param {object} preciosActuales {CUP, COMISION, ZELLE}
 * @param {object} opciones {foodCostObjetivo, multiploRedondeo,
 *                           factorComision, tasaZelle}
 */
function sugerirPreciosCartas(costoPorcion, preciosActuales = {}, opciones = {}) {
    const objetivo = num(opciones.foodCostObjetivo, 30);
    const multiplo = num(opciones.multiploRedondeo, 0);

    const cupActual = num(preciosActuales.CUP);
    const comisionActual = num(preciosActuales.COMISION);
    const zelleActual = num(preciosActuales.ZELLE);

    const baseCup = precioSugerido(costoPorcion, objetivo, multiplo);
    const nuevoCup = baseCup.precio_redondeado;

    // Proporción actual de cada carta respecto a CUP
    const ratioComision = cupActual > 0 && comisionActual > 0 ? comisionActual / cupActual : null;
    const ratioZelle = cupActual > 0 && zelleActual > 0 ? zelleActual / cupActual : null;

    // Reservas configurables por si la carta aún no tiene precio
    const factorComision = num(opciones.factorComision, 1.10);
    const tasaZelle = Math.max(0.000001, num(opciones.tasaZelle, 1));

    const nuevoComision = ratioComision !== null
        ? redondearAMultiplo(nuevoCup * ratioComision, multiplo)
        : redondearAMultiplo(nuevoCup * factorComision, multiplo);

    // La carta Zelle está en otra moneda: no se redondea al múltiplo del CUP
    const nuevoZelle = ratioZelle !== null
        ? redondear(nuevoCup * ratioZelle, 2)
        : redondear(nuevoCup / tasaZelle, 2);

    return {
        CUP: {
            actual: cupActual || null,
            sugerido: nuevoCup,
            exacto: baseCup.precio_exacto,
            base: 'Food cost objetivo',
            indicadores_actual: calcularIndicadores(costoPorcion, cupActual),
            indicadores_sugerido: calcularIndicadores(costoPorcion, nuevoCup)
        },
        COMISION: {
            actual: comisionActual || null,
            sugerido: nuevoComision,
            exacto: redondear(ratioComision !== null ? nuevoCup * ratioComision : nuevoCup * factorComision, 2),
            base: ratioComision !== null
                ? `Proporción actual respecto a CUP (×${redondear(ratioComision, 4)})`
                : `Factor por defecto (×${factorComision})`,
            indicadores_actual: calcularIndicadores(costoPorcion, comisionActual),
            indicadores_sugerido: calcularIndicadores(costoPorcion, nuevoComision)
        },
        ZELLE: {
            actual: zelleActual || null,
            sugerido: nuevoZelle,
            exacto: nuevoZelle,
            base: ratioZelle !== null
                ? `Proporción actual respecto a CUP (×${redondear(ratioZelle, 6)})`
                : `Conversión por tasa (÷${tasaZelle})`,
            // El food cost de la carta Zelle se mide contra el costo convertido
            // a esa moneda; comparar pesos con dólares no tendría sentido.
            indicadores_actual: calcularIndicadores(
                ratioZelle !== null && cupActual > 0 ? costoPorcion * (zelleActual / cupActual) : costoPorcion / tasaZelle,
                zelleActual),
            indicadores_sugerido: calcularIndicadores(
                ratioZelle !== null && cupActual > 0 ? costoPorcion * (zelleActual / cupActual) : costoPorcion / tasaZelle,
                nuevoZelle)
        }
    };
}

/** Semáforo para la interfaz según el food cost obtenido. */
function evaluarFoodCost(porcentaje, objetivo = 30) {
    if (porcentaje === null || porcentaje === undefined) {
        return { nivel: 'desconocido', etiqueta: 'Sin precio', clase: 'secondary' };
    }
    const p = num(porcentaje);
    const obj = num(objetivo, 30);
    if (p <= obj) return { nivel: 'bueno', etiqueta: 'Dentro del objetivo', clase: 'success' };
    if (p <= obj * 1.25) return { nivel: 'ajustado', etiqueta: 'Ajustado', clase: 'warning' };
    return { nivel: 'critico', etiqueta: 'Por encima del objetivo', clase: 'danger' };
}

module.exports = {
    CARTAS,
    REFERENCIAS_FOOD_COST,
    calcularFichaCosto,
    calcularCostoPlatillo,
    calcularIndicadores,
    precioSugerido,
    sugerirPreciosCartas,
    evaluarFoodCost,
    redondear,
    redondearAMultiplo
};
