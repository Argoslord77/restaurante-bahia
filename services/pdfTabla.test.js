// services/pdfTabla.test.js — Tablas PDF apaisadas en memoria.
const { tablaPDF, documentoPDF, fmtFecha, nombreUsuario } = require('./pdfTabla');

const COLUMNAS = [
    { titulo: 'Nombre', frac: 0.6 },
    { titulo: 'Precio', frac: 0.25, alinear: 'right' },
    { titulo: 'Estado', frac: 0.15, alinear: 'center' }
];

describe('pdfTabla', () => {
    test('genera un PDF válido con filas', async () => {
        const pdf = await tablaPDF({
            titulo: 'Prueba', subtitulo: 'Sub', columnas: COLUMNAS,
            filas: [['Ropa Vieja', '250,00', 'En carta'], ['Flan', '120,00', 'Oculto']],
            pie: 'Pie de prueba'
        });
        expect(Buffer.isBuffer(pdf)).toBe(true);
        expect(pdf.slice(0, 5).toString()).toBe('%PDF-');
        expect(pdf.length).toBeGreaterThan(1000);
        expect(pdf.slice(-6).toString()).toContain('%%EOF');
    });

    test('muchas filas generan varias páginas', async () => {
        const filas = Array.from({ length: 120 }, (_, i) => [`Fila ${i + 1}`, `${i + 1},00`, 'X']);
        const pdf = await tablaPDF({ titulo: 'Largo', subtitulo: '', columnas: COLUMNAS, filas, pie: '' });
        // Cada página del PDF deja una marca /Type /Page.
        const paginas = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
        expect(paginas).toBeGreaterThan(1);
    });

    test('sin filas no rompe', async () => {
        const pdf = await tablaPDF({ titulo: 'Vacío', subtitulo: '', columnas: COLUMNAS, filas: [], pie: '' });
        expect(pdf.slice(0, 5).toString()).toBe('%PDF-');
    });

    test('fmtFecha y nombreUsuario toleran entradas raras', () => {
        expect(fmtFecha(new Date(2026, 9, 10, 15, 4))).toBe('10/10/2026 15:04');
        expect(nombreUsuario({})).toBe('Sistema');
        expect(nombreUsuario({ user: { nombre: 'Ana' } })).toBe('Ana');
        expect(nombreUsuario({ session: { user: { nombre_usuario: 'ana7' } } })).toBe('ana7');
    });
});

describe('pdfTabla · documentoPDF multibloque', () => {
    test('pinta varios bloques con fila de totales en negrita', async () => {
        const pdf = await documentoPDF({
            titulo: 'Reporte', subtitulo: 'Sub', pie: 'Pie',
            bloques: [
                { titulo: 'Detalle', columnas: COLUMNAS, filas: [['A', '1,00', 'X']] },
                { titulo: 'Resumen', columnas: COLUMNAS,
                  filas: [{ bold: true, c: ['TOTALES', '1,00', ''] }] },
            ]
        });
        expect(pdf.slice(0, 5).toString()).toBe('%PDF-');
        expect(pdf.length).toBeGreaterThan(1000);
        expect(pdf.slice(-6).toString()).toContain('%%EOF');
    });

    test('salta los bloques vacíos y no rompe si todos lo están', async () => {
        const pdf = await documentoPDF({
            titulo: 'Vacío', subtitulo: '', pie: '',
            bloques: [{ titulo: 'Nada', columnas: COLUMNAS, filas: [] }]
        });
        expect(pdf.slice(0, 5).toString()).toBe('%PDF-');
    });
});
