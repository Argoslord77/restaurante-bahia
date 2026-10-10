// services/pdfTabla.js — Tablas PDF apaisadas para listados y reportes
// (carta, inventario, kardex, centro de reportes, auditoría).
// Se genera en memoria y se descarga al vuelo. Soporta varias secciones
// por documento (bloques) y filas en negrita (totales).
const PDFDocument = require('pdfkit');

const ANCHO = 792; // Letter apaisado
const ALTO = 612;
const MARGEN_X = 36;
const MARGEN_SUP = 36;
const MARGEN_INF = 46;
const ANCHO_UTIL = ANCHO - MARGEN_X * 2;
const ALTURA_FILA = 16;

function fmtFecha(d = new Date()) {
    const p = n => String(n).padStart(2, '0');
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function nombreUsuario(req) {
    const u = (req && req.user) || (req && req.session && req.session.user) || {};
    return u.nombre || u.nombre_usuario || u.username || u.correo || 'Sistema';
}

function celda(v) {
    return String(v == null ? '' : v).replace(/[\r\n]+/g, ' ');
}

function truncar(texto, maxChars) {
    const t = celda(texto);
    if (t.length <= maxChars) return t;
    return t.slice(0, Math.max(0, maxChars - 1)) + '…';
}

// bloques: [{ titulo?, columnas: [{ titulo, frac (suman 1), alinear? }],
//             filas: [ [celdas...] | { bold: true, c: [celdas...] } ] }]
// Devuelve Buffer con el PDF completo.
function documentoPDF({ titulo, subtitulo, bloques, pie }) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ size: 'LETTER', layout: 'landscape', margin: 0, bufferPages: true });
            const trozos = [];
            doc.on('data', c => trozos.push(c));
            doc.on('end', () => resolve(Buffer.concat(trozos)));
            doc.on('error', reject);

            let y = 0;
            const xsDe = anchos => {
                const xs = [];
                let ac = MARGEN_X;
                for (const w of anchos) { xs.push(ac); ac += w; }
                return xs;
            };
            const nuevaPagina = () => { doc.addPage(); y = MARGEN_SUP; };
            const pintarTitulos = (columnas, xs, anchos) => {
                doc.fillColor('#1f2937').rect(MARGEN_X, y, ANCHO_UTIL, 20).fill();
                doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8.5);
                columnas.forEach((c, i) => {
                    doc.text(celda(c.titulo), xs[i] + 5, y + 6, {
                        width: anchos[i] - 10, align: c.alinear || 'left', lineBreak: false,
                    });
                });
                y += 20;
            };
            const pintarFila = (fila, columnas, xs, anchos, banda) => {
                const negrita = !!(fila && fila.bold);
                const celdas = negrita ? fila.c : fila;
                if (!negrita && banda % 2 === 1) {
                    doc.fillColor('#f3f4f6').rect(MARGEN_X, y, ANCHO_UTIL, ALTURA_FILA).fill();
                }
                if (negrita) {
                    doc.fillColor('#e5e7eb').rect(MARGEN_X, y, ANCHO_UTIL, ALTURA_FILA).fill();
                }
                doc.fillColor('#111827').font(negrita ? 'Helvetica-Bold' : 'Helvetica').fontSize(8);
                columnas.forEach((c, i) => {
                    const maxChars = Math.max(4, Math.floor((anchos[i] - 10) / 4.6));
                    doc.text(truncar(celdas[i], maxChars), xs[i] + 5, y + 4.5, {
                        width: anchos[i] - 10, align: c.alinear || 'left', lineBreak: false,
                    });
                });
                y += ALTURA_FILA;
            };

            // ── Encabezado del documento ──
            doc.fillColor('#111827').font('Helvetica-Bold').fontSize(16)
                .text(celda(titulo), MARGEN_X, MARGEN_SUP, { width: ANCHO_UTIL });
            doc.fillColor('#6b7280').font('Helvetica').fontSize(9)
                .text(celda(subtitulo), MARGEN_X, MARGEN_SUP + 22, { width: ANCHO_UTIL });
            y = MARGEN_SUP + 40;
            doc.strokeColor('#d1d5db').lineWidth(1)
                .moveTo(MARGEN_X, y).lineTo(MARGEN_X + ANCHO_UTIL, y).stroke();
            y += 12;

            // ── Bloques ──
            let bloquesPintados = 0;
            for (const b of bloques || []) {
                const filas = b ? b.filas || [] : [];
                if (!filas.length) continue; // secciones vacías no se imprimen
                const columnas = b.columnas || [];
                const anchos = columnas.map(c => Math.floor(c.frac * ANCHO_UTIL));
                const xs = xsDe(anchos);
                if (bloquesPintados > 0) y += 10;
                if (b.titulo) {
                    if (y + 36 > ALTO - MARGEN_INF) nuevaPagina();
                    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(11)
                        .text(celda(b.titulo), MARGEN_X, y, { width: ANCHO_UTIL });
                    y += 18;
                }
                if (y + 20 > ALTO - MARGEN_INF) nuevaPagina();
                pintarTitulos(columnas, xs, anchos);
                let banda = 0;
                for (const fila of filas) {
                    if (y + ALTURA_FILA > ALTO - MARGEN_INF) {
                        nuevaPagina();
                        pintarTitulos(columnas, xs, anchos);
                    }
                    pintarFila(fila, columnas, xs, anchos, banda);
                    banda++;
                }
                bloquesPintados++;
            }
            if (!bloquesPintados) {
                doc.fillColor('#6b7280').font('Helvetica-Oblique').fontSize(9)
                    .text('Sin filas para mostrar.', MARGEN_X, y, { width: ANCHO_UTIL });
            }

            // ── Pie en todas las páginas (segunda pasada) ──
            const rango = doc.bufferedPageRange();
            for (let i = 0; i < rango.count; i++) {
                doc.switchToPage(i);
                doc.fillColor('#6b7280').font('Helvetica').fontSize(8);
                doc.text(celda(pie), MARGEN_X, ALTO - 28, { width: ANCHO_UTIL - 90 });
                doc.text(`Pág. ${i + 1} de ${rango.count}`, MARGEN_X + ANCHO_UTIL - 90, ALTO - 28,
                    { width: 90, align: 'right' });
            }
            doc.end();
        } catch (e) { reject(e); }
    });
}

// Azúcar para documentos de una sola tabla (carta, inventario).
function tablaPDF({ titulo, subtitulo, columnas, filas, pie }) {
    return documentoPDF({ titulo, subtitulo, bloques: [{ columnas, filas }], pie });
}

module.exports = { tablaPDF, documentoPDF, fmtFecha, nombreUsuario };
