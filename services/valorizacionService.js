// services/valorizacionService.js
// Valorización de inventario: cuánto vale lo almacenado, por almacén y por lote.
// Centraliza las 3 consultas que antes vivían en el controlador para que la vista
// web y las exportaciones (CSV/PDF) usen exactamente los mismos datos.
'use strict';

const db = require('../config/db');
const pdfTabla = require('./pdfTabla');

const BOM = String.fromCharCode(0xFEFF);
const CRLF = String.fromCharCode(13, 10);

/**
 * Obtiene los datos de la valorización:
 * - porAlmacen: valor agrupado por almacén (lotes con stock, unidades, valor).
 * - lotes: top 200 lotes con stock ordenados por valor descendente.
 * - vencidos: { lotes, valor } inmovilizado en lotes vencidos.
 */
async function obtenerDatos() {
    const [porAlmacen] = await db.query(`
        SELECT a.id, a.nombre,
               COUNT(l.id) AS lotes_con_stock,
               COALESCE(SUM(l.cantidad_actual), 0) AS unidades,
               COALESCE(SUM(l.cantidad_actual * l.costo_unitario), 0) AS valor
        FROM almacenes a
        LEFT JOIN lotes l ON l.almacen_id = a.id AND l.cantidad_actual > 0 AND l.estado = 'ACTIVO'
        WHERE a.activo = 1
        GROUP BY a.id, a.nombre
        ORDER BY valor DESC
    `);
    const [lotes] = await db.query(`
        SELECT l.id, l.numero_lote, l.estado, l.cantidad_actual, l.costo_unitario,
               l.fecha_vencimiento,
               (l.cantidad_actual * l.costo_unitario) AS valor_lote,
               p.nombre AS producto_nombre, p.codigo AS producto_codigo,
               a.nombre AS almacen_nombre
        FROM lotes l
        INNER JOIN productos p ON l.producto_id = p.id
        INNER JOIN almacenes a ON l.almacen_id = a.id
        WHERE l.cantidad_actual > 0
        ORDER BY valor_lote DESC
        LIMIT 200
    `);
    const [vencidos] = await db.query(`
        SELECT COUNT(*) AS lotes, COALESCE(SUM(l.cantidad_actual * l.costo_unitario), 0) AS valor
        FROM lotes l
        WHERE l.estado = 'VENCIDO' AND l.cantidad_actual > 0
    `);
    return { porAlmacen, lotes, vencidos: vencidos[0] || { lotes: 0, valor: 0 } };
}

/** Formatea un número para CSV con separador decimal coma (Excel es-ES). */
const csvNum = (v, dec = 2) => Number(v || 0).toFixed(dec).replace('.', ',');

/** Dinero como en la vista ($ + es-ES). */
const dinero = v => '$' + Number(v || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Fecha de vencimiento: YYYY-MM-DD (CSV) o es-ES (PDF). */
const fVenceCSV = f => (f instanceof Date ? f.toISOString().slice(0, 10) : String(f || '').slice(0, 10)) || '—';
const fVencePDF = f => {
    if (!f) return '—';
    const d = f instanceof Date ? f : new Date(f);
    return isNaN(d) ? '—' : d.toLocaleDateString('es-ES');
};

const sinPuntoComa = s => String(s == null ? '' : s).replace(/[;\r\n]+/g, ' ');

const estadoLote = e => (e === 'VENCIDO' ? 'VENCIDO' : 'Disponible');

/**
 * Exporta la valorización a CSV (separador ';' + BOM UTF-8).
 * @returns {{csv: string, filas: number}}
 */
function valorizacionACSV({ porAlmacen, lotes, vencidos }) {
    const total = porAlmacen.reduce((s, a) => s + parseFloat(a.valor || 0), 0);
    const filas = [];
    filas.push('Valorización de inventario');
    filas.push(`Fecha;${new Date().toLocaleString('es-ES')}`);
    filas.push('');
    filas.push('Resumen por almacén');
    filas.push('Almacén;Lotes con stock;Unidades;Valor;Porcentaje');
    for (const a of porAlmacen) {
        const pct = total > 0 ? (parseFloat(a.valor || 0) / total) * 100 : 0;
        filas.push([
            sinPuntoComa(a.nombre),
            a.lotes_con_stock,
            csvNum(a.unidades, 0),
            csvNum(a.valor),
            pct.toFixed(1).replace('.', ',') + ' %'
        ].join(';'));
    }
    filas.push(`TOTAL GENERAL;;;${csvNum(total)};100,0 %`);
    filas.push('');
    filas.push('Detalle por lote (top 200 por valor)');
    filas.push('Producto;Código;Almacén;Lote;Vence;Estado;Cantidad;Costo unit.;Valor');
    for (const l of lotes) {
        filas.push([
            sinPuntoComa(l.producto_nombre),
            sinPuntoComa(l.producto_codigo || l.id),
            sinPuntoComa(l.almacen_nombre),
            sinPuntoComa(l.numero_lote),
            fVenceCSV(l.fecha_vencimiento),
            estadoLote(l.estado),
            csvNum(l.cantidad_actual, 3),
            csvNum(l.costo_unitario),
            csvNum(l.valor_lote)
        ].join(';'));
    }
    filas.push('');
    filas.push('Valor en lotes vencidos (riesgo)');
    filas.push(`Lotes;${vencidos.lotes || 0};Valor;${csvNum(vencidos.valor)}`);

    return { csv: BOM + filas.join(CRLF) + CRLF, filas: lotes.length };
}

/** PDF de la valorización (gemelo de valorizacionACSV, carta apaisada). */
async function valorizacionAPDF({ porAlmacen, lotes, vencidos }, meta = {}) {
    const negocio = (meta && meta.negocio) || 'Restaurante Bahía';
    const autor = (meta && meta.generadoPor) || 'Sistema';
    const total = porAlmacen.reduce((s, a) => s + parseFloat(a.valor || 0), 0);

    const filasResumen = porAlmacen.map(a => {
        const pct = total > 0 ? (parseFloat(a.valor || 0) / total) * 100 : 0;
        return [
            a.nombre,
            String(a.lotes_con_stock),
            Number(a.unidades || 0).toLocaleString('es-ES'),
            dinero(a.valor),
            pct.toFixed(1).replace('.', ',') + ' %'
        ];
    });
    filasResumen.push({ bold: true, c: ['TOTAL GENERAL', '', '', dinero(total), '100 %'] });

    const filaLote = l => [
        l.producto_nombre,
        l.almacen_nombre,
        l.numero_lote,
        fVencePDF(l.fecha_vencimiento),
        estadoLote(l.estado),
        Number(l.cantidad_actual || 0).toLocaleString('es-ES'),
        dinero(l.costo_unitario),
        dinero(l.valor_lote)
    ];
    const filasLotes = lotes.map(l => (l.estado === 'VENCIDO' ? { bold: true, c: filaLote(l) } : filaLote(l)));

    return pdfTabla.documentoPDF({
        titulo: 'Valorización de inventario',
        subtitulo: `${negocio} · ${pdfTabla.fmtFecha()} · Generado por ${autor}`,
        bloques: [
            { titulo: 'Resumen por almacén', columnas: [
                { titulo: 'Almacén', frac: 0.40 },
                { titulo: 'Lotes', frac: 0.10, alinear: 'center' },
                { titulo: 'Unidades', frac: 0.14, alinear: 'right' },
                { titulo: 'Valor', frac: 0.20, alinear: 'right' },
                { titulo: '% Total', frac: 0.16, alinear: 'right' },
            ], filas: filasResumen },
            { titulo: 'Detalle por lote (top 200 por valor)', columnas: [
                { titulo: 'Producto', frac: 0.22 },
                { titulo: 'Almacén', frac: 0.12 },
                { titulo: 'Lote', frac: 0.10 },
                { titulo: 'Vence', frac: 0.09, alinear: 'center' },
                { titulo: 'Estado', frac: 0.10, alinear: 'center' },
                { titulo: 'Cantidad', frac: 0.10, alinear: 'right' },
                { titulo: 'Costo unit.', frac: 0.11, alinear: 'right' },
                { titulo: 'Valor', frac: 0.16, alinear: 'right' },
            ], filas: filasLotes.length ? filasLotes : [['(Sin lotes con stock)', '', '', '', '', '', '', '']] },
            { titulo: 'Valor en lotes vencidos (riesgo)', columnas: [
                { titulo: 'Concepto', frac: 0.50 },
                { titulo: 'Valor', frac: 0.50, alinear: 'right' },
            ], filas: [
                ['Lotes vencidos con stock', String(vencidos.lotes || 0)],
                ['Valor inmovilizado', dinero(vencidos.valor)],
            ] },
        ],
        pie: 'Restaurante Bahía — Valorización de inventario',
    });
}

module.exports = { obtenerDatos, valorizacionACSV, valorizacionAPDF };
