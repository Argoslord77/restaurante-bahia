// Pruebas del constructor ESC/POS.
const E = require('../www/js/escpos');

const hex = b => Array.from(b).map(x => x.toString(16).padStart(2, '0')).join(' ');

describe('ESC/POS', () => {
    it('comandos básicos con bytes exactos', () => {
        expect(hex(E.init())).toBe('1b 40');
        expect(hex(E.align('c'))).toBe('1b 61 01');
        expect(hex(E.align('r'))).toBe('1b 61 02');
        expect(hex(E.align('l'))).toBe('1b 61 00');
        expect(hex(E.negrita(true))).toBe('1b 45 01');
        expect(hex(E.cortar())).toBe('1d 56 41 30');
    });

    it('codifica español en latin-1 (Café, niño)', () => {
        expect(hex(E.latin1('Café'))).toBe('43 61 66 e9');
        expect(hex(E.latin1('niño ¡hola!'))).toBe('6e 69 f1 6f 20 a1 68 6f 6c 61 21');
        expect(hex(E.latin1('a😀b'))).toBe('61 3f 62'); // emoji → '?'
    });

    it('fila de dos columnas mide exacto y trunca', () => {
        const f = E.fila2col('Tortilla', '$40.00', 32);
        expect(f.length).toBe(32);
        expect(f.endsWith('$40.00')).toBe(true);
        const larga = E.fila2col('Un nombre de producto larguísimo que no cabe', '$1.00', 32);
        expect(larga.length).toBe(32);
        expect(larga).toContain('...');
    });

    it('divide texto largo en líneas', () => {
        expect(E.dividir('hola mundo cruel', 10)).toEqual(['hola mundo', 'cruel']);
    });

    it('el ticket empieza con INIT+codepage y termina con corte', () => {
        const bytes = E.ticketBytes({
            negocio: 'Mi Negocio', pie: 'Gracias',
            venta: { id: 7, subtotal: 58, descuento: 8, iva_monto: 8, total: 58,
                     cambio: 42, estado: 'cobrada', creado_en: new Date().toISOString(), usuario_nombre: 'María' },
            detalles: [{ cantidad: 2, nombre: 'Tortilla', subtotal: 40 }],
            pagos: [{ metodo: 'efectivo', monto: 100 }]
        });
        expect(hex(bytes.slice(0, 5))).toBe('1b 40 1b 74 10');
        expect(hex(bytes.slice(-4))).toBe('1d 56 41 30');
        const texto = Buffer.from(bytes).toString('latin1');
        expect(texto).toContain('TOTAL $58.00');
        expect(texto).toContain('Ticket #7');
        expect(texto).toContain('Cambio');
    });
});
