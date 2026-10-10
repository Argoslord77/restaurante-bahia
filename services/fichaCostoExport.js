// services/fichaCostoExport.js
// Exportaciones CSV/PDF de las fichas de costo: el listado de insumos y el
// panel de rentabilidad de la carta. Funciones puras sobre los datos que ya
// calculan fichaCostoService + el controlador (sin acceso a BD).
'use strict';

const pdfTabla = require('./pdfTabla');

const BOM = String.fromCharCode(0xFEFF);
const CRLF = String.fromCharCode(13, 10);

/** Formatea un número para CSV con separador decimal coma (Excel es-ES). */
const csvNum = (v, dec = 2) => Number(v || 0).toFixed(dec).replace('.', ',');

/** Dinero como en las vistas ($ + es-ES). */
const dinero = v => '$' + Number(v || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const sinPuntoComa = s => String(s == null ? '' : s).replace(/[;\r\n]+/g, ' ');

const pctCSV = (v, dec = 1) => (v == null ? '' : ((v > 0 ? '+' : '') + Number(v).toFixed(dec).replace('.', ',') + ' %'));

const fFecha = f => {
    const d = f instanceof Date ? f : new Date(f);
    return !f || isNaN(d) ? '—' : d.toLocaleString('es-ES');
};

/** Etiqueta de estado de ficha, igual que los badges de la vista. */
function estadoFicha(p) {
    if (p.enUso && p.tieneFicha) return `Ficha completa (${p.numRecetas || 0})`;
    if (p.enUso) return 'Sin ficha';
    if (p.tieneFicha) return 'Tiene ficha';
    return 'Vacía';
}

// ---------------------------------------------------------------------------
// Listado de insumos con ficha de costo
// ---------------------------------------------------------------------------

/**
 * Exporta el listado de insumos a CSV (separador ';' + BOM UTF-8).
 * @returns {{csv: string, filas: number}}
 */
function listadoACSV(productos) {
    const filas = [];
    filas.push('Fichas de costo — listado de insumos');
    filas.push(`Fecha;${new Date().toLocaleString('es-ES')}`);
    filas.push('');
    filas.push('Insumo;Código;Unidad;Costo prom.;En uso;Ficha;Receta x UMV;Var. receta;Costo ficha;Var. ficha;Actualizado');
    for (const p of productos) {
        filas.push([
            sinPuntoComa(p.nombre),
            sinPuntoComa(p.codigo),
            sinPuntoComa(p.unidad_medida),
            csvNum(p.costo_promedio_ponderado, 4),
            p.enUso ? 'Sí' : 'No',
            sinPuntoComa(estadoFicha(p)),
            p.costoRecetaUMV != null ? csvNum(p.costoRecetaUMV, 4) : '',
            pctCSV(p.variacionRecetaPct),
            p.costoFicha != null ? csvNum(p.costoFicha, 4) : '',
            pctCSV(p.variacionFichaPct),
            p.actualizado_en ? fFecha(p.actualizado_en) : ''
        ].join(';'));
    }
    return { csv: BOM + filas.join(CRLF) + CRLF, filas: productos.length };
}

/** PDF del listado de insumos (gemelo de listadoACSV, carta apaisada). */
async function listadoAPDF(productos, meta = {}) {
    const negocio = (meta && meta.negocio) || 'Restaurante Bahía';
    const autor = (meta && meta.generadoPor) || 'Sistema';
    const fmtCosto = v => v == null ? '—' : Number(v).toLocaleString('es-ES', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
    const fmtVar = v => v == null ? '—' : ((v > 0 ? '+' : '') + Number(v).toFixed(1).replace('.', ',') + ' %');
    const filas = productos.map(p => [
        p.nombre,
        p.codigo || '—',
        p.unidad_medida,
        fmtCosto(p.costo_promedio_ponderado),
        p.enUso ? '✓' : '—',
        estadoFicha(p),
        fmtCosto(p.costoRecetaUMV),
        fmtVar(p.variacionRecetaPct),
        fmtCosto(p.costoFicha),
        fmtVar(p.variacionFichaPct),
        p.actualizado_en ? fFecha(p.actualizado_en) : '—'
    ]);
    return pdfTabla.documentoPDF({
        titulo: 'Fichas de costo — listado de insumos',
        subtitulo: `${negocio} · ${pdfTabla.fmtFecha()} · Generado por ${autor}`,
        bloques: [
            { titulo: `Insumos (${productos.length})`, columnas: [
                { titulo: 'Insumo', frac: 0.20 },
                { titulo: 'Código', frac: 0.09 },
                { titulo: 'UM', frac: 0.04, alinear: 'center' },
                { titulo: 'Costo prom.', frac: 0.08, alinear: 'right' },
                { titulo: 'Uso', frac: 0.04, alinear: 'center' },
                { titulo: 'Ficha', frac: 0.13, alinear: 'center' },
                { titulo: 'Receta x UMV', frac: 0.08, alinear: 'right' },
                { titulo: 'Var R', frac: 0.07, alinear: 'right' },
                { titulo: 'Costo ficha', frac: 0.08, alinear: 'right' },
                { titulo: 'Var F', frac: 0.07, alinear: 'right' },
                { titulo: 'Actualizado', frac: 0.12 },
            ], filas: filas.length ? filas : [['(Sin insumos)', '', '', '', '', '', '', '', '', '', '']] },
        ],
        pie: 'Restaurante Bahía — Fichas de costo',
    });
}

// ---------------------------------------------------------------------------
// Rentabilidad de la carta
// ---------------------------------------------------------------------------

/**
 * Exporta el panel de rentabilidad a CSV (separador ';' + BOM UTF-8).
 * @returns {{csv: string, filas: number}}
 */
function rentabilidadACSV(platillos, resumen, objetivo) {
    const filas = [];
    filas.push('Rentabilidad de la carta');
    filas.push(`Fecha;${new Date().toLocaleString('es-ES')}`);
    filas.push(`Objetivo food cost;${csvNum(objetivo, 1)} %`);
    filas.push('');
    filas.push('Platillo;Costo;Precio CUP;Comisión;Zelle;Food cost %;Evaluación;Margen;Precio sugerido;Diferencia');
    for (const p of platillos) {
        filas.push([
            sinPuntoComa(p.nombre),
            csvNum(p.costo),
            p.precio_cup != null ? csvNum(p.precio_cup) : '',
            p.precio_comision != null ? csvNum(p.precio_comision) : '',
            p.precio_zelle != null ? csvNum(p.precio_zelle) : '',
            p.food_cost_porcentaje != null ? csvNum(p.food_cost_porcentaje, 1) + ' %' : '',
            sinPuntoComa(p.evaluacion && p.evaluacion.etiqueta),
            p.margen != null ? csvNum(p.margen) : '',
            p.sugerido != null ? csvNum(p.sugerido) : '',
            (p.precio_cup != null && p.sugerido != null) ? csvNum(p.sugerido - p.precio_cup) : ''
        ].join(';'));
    }
    filas.push('');
    filas.push('Resumen');
    filas.push(`Platillos;${resumen.total}`);
    filas.push(`Sin precio;${resumen.sin_precio}`);
    filas.push(`Con insumos sin ficha;${resumen.incompletos}`);
    filas.push(`Críticos;${resumen.criticos}`);
    filas.push(`Food cost medio;${resumen.food_cost_medio != null ? csvNum(resumen.food_cost_medio) + ' %' : ''}`);
    return { csv: BOM + filas.join(CRLF) + CRLF, filas: platillos.length };
}

/** PDF de la rentabilidad (gemelo de rentabilidadACSV, carta apaisada). */
async function rentabilidadAPDF(platillos, resumen, objetivo, meta = {}) {
    const negocio = (meta && meta.negocio) || 'Restaurante Bahía';
    const autor = (meta && meta.generadoPor) || 'Sistema';
    const filas = platillos.map(p => {
        const critico = p.evaluacion && p.evaluacion.nivel === 'critico';
        const dif = (p.precio_cup != null && p.sugerido != null) ? p.sugerido - p.precio_cup : null;
        const c = [
            p.nombre + (p.ingredientes_sin_ficha > 0 ? ` (${p.ingredientes_sin_ficha} s/ficha)` : ''),
            dinero(p.costo),
            p.precio_cup != null ? dinero(p.precio_cup) : '—',
            p.precio_comision != null ? dinero(p.precio_comision) : '—',
            p.precio_zelle != null ? dinero(p.precio_zelle) : '—',
            p.food_cost_porcentaje != null ? Number(p.food_cost_porcentaje).toFixed(1).replace('.', ',') + ' %' : '—',
            (p.evaluacion && p.evaluacion.etiqueta) || '—',
            p.margen != null ? dinero(p.margen) : '—',
            p.sugerido != null ? dinero(p.sugerido) : '—',
            dif != null ? dinero(dif) : '—'
        ];
        return critico ? { bold: true, c } : c;
    });
    return pdfTabla.documentoPDF({
        titulo: 'Rentabilidad de la carta',
        subtitulo: `${negocio} · ${pdfTabla.fmtFecha()} · Generado por ${autor} · Objetivo food cost ${csvNum(objetivo, 1)} %`,
        bloques: [
            { titulo: `Platillos (${platillos.length})`, columnas: [
                { titulo: 'Platillo', frac: 0.20 },
                { titulo: 'Costo', frac: 0.08, alinear: 'right' },
                { titulo: 'CUP', frac: 0.08, alinear: 'right' },
                { titulo: 'Comisión', frac: 0.08, alinear: 'right' },
                { titulo: 'Zelle', frac: 0.08, alinear: 'right' },
                { titulo: 'Food cost', frac: 0.08, alinear: 'right' },
                { titulo: 'Evaluación', frac: 0.12 },
                { titulo: 'Margen', frac: 0.08, alinear: 'right' },
                { titulo: 'Sugerido', frac: 0.08, alinear: 'right' },
                { titulo: 'Diferencia', frac: 0.12, alinear: 'right' },
            ], filas: filas.length ? filas : [['(Sin platillos)', '', '', '', '', '', '', '', '', '']] },
            { titulo: 'Resumen', columnas: [
                { titulo: 'Concepto', frac: 0.50 },
                { titulo: 'Valor', frac: 0.50, alinear: 'right' },
            ], filas: [
                ['Platillos', String(resumen.total)],
                ['Sin precio', String(resumen.sin_precio)],
                ['Con insumos sin ficha', String(resumen.incompletos)],
                ['Críticos', String(resumen.criticos)],
                ['Food cost medio', resumen.food_cost_medio != null ? csvNum(resumen.food_cost_medio) + ' %' : '—'],
            ] },
        ],
        pie: 'Restaurante Bahía — Rentabilidad de la carta',
    });
}

module.exports = { estadoFicha, listadoACSV, listadoAPDF, rentabilidadACSV, rentabilidadAPDF };
