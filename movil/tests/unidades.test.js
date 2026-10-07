// Pruebas de unidades y conversiones (Fase 2). Unidad base de conteo: U.
const CFUnidades = require('../www/js/unidades');

describe('Unidades', () => {
    it('convierte dentro de la dimensión', () => {
        expect(CFUnidades.convertir(2, 'kg', 'g')).toBe(2000);
        expect(CFUnidades.convertir(500, 'g', 'kg')).toBe(0.5);
        expect(CFUnidades.convertir(1.5, 'L', 'ml')).toBe(1500);
        expect(CFUnidades.convertir(3, 'U', 'U')).toBe(3);
    });

    it('rechaza conversiones entre dimensiones', () => {
        expect(() => CFUnidades.convertir(1, 'kg', 'U')).toThrow('No se puede convertir');
        expect(() => CFUnidades.convertir(1, 'L', 'kg')).toThrow('No se puede convertir');
        expect(() => CFUnidades.convertir(1, 'bulto', 'kg')).toThrow('Unidad no válida');
    });

    it('resuelve empaques de compra a la unidad base', () => {
        const refresco = { unidad: 'U', compra_unidad: 'reja', compra_factor: 24 };
        expect(CFUnidades.resolver(refresco, 2, 'reja')).toBe(48);
        expect(CFUnidades.resolver(refresco, 5, 'U')).toBe(5);
        expect(CFUnidades.resolver(refresco, 5, null)).toBe(5);
        const queso = { unidad: 'kg', compra_unidad: 'bulto', compra_factor: 25 };
        expect(CFUnidades.resolver(queso, 1, 'bulto')).toBe(25);
        expect(CFUnidades.resolver(queso, 800, 'g')).toBe(0.8);
        expect(() => CFUnidades.resolver(queso, 1, 'L')).toThrow('No se puede convertir');
    });

    it('productos viejos (sin unidad) se asumen en unidades', () => {
        expect(CFUnidades.resolver({ nombre: 'X' }, 4, null)).toBe(4);
        expect(CFUnidades.aceptadas({})).toEqual(['U']);
    });

    it('formatea recortando ceros', () => {
        expect(CFUnidades.formatear(2.5, 'kg')).toBe('2.5 kg');
        expect(CFUnidades.formatear(3, 'U')).toBe('3 U');
        expect(CFUnidades.formatear(0.08, 'kg')).toBe('0.08 kg');
        expect(CFUnidades.fmtCant(48)).toBe('48');
    });

    it('marca unidades como enteras', () => {
        expect(CFUnidades.entera('U')).toBe(true);
        expect(CFUnidades.entera('kg')).toBe(false);
    });

    it('acepta pza como alias histórico de U', () => {
        expect(CFUnidades.existe('pza')).toBe(true);
        expect(CFUnidades.dimension('pza')).toBe('conteo');
        expect(CFUnidades.convertir(2, 'pza', 'U')).toBe(2);
        expect(CFUnidades.formatear(3, 'pza')).toBe('3 U');
        expect(CFUnidades.entera('pza')).toBe(true);
        expect(CFUnidades.resolver({ unidad: 'pza' }, 4, 'pza')).toBe(4);
        expect(CFUnidades.aceptadas({ unidad: 'pza' })).toEqual(['U']);
    });
});
