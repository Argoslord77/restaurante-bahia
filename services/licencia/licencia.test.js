// services/licencia/licencia.test.js
// Pruebas de las piezas puras del sistema de licencias: firma criptográfica y
// huella ponderada del equipo. Lo que depende de la base de datos se verifica
// en la prueba de integración.

const Firma = require('./firma');
const Huella = require('./huella');

describe('Firma de licencias · Ed25519', () => {
    const par = Firma.generarParDeClaves();
    const datos = { id: 'LIC-1', cliente: 'Bahía', expira_en: '2027-01-01', funciones: ['pos'] };

    it('una licencia legítima verifica', () => {
        expect(Firma.verificar(datos, Firma.firmar(datos, par.privada), par.publica)).toBe(true);
    });

    it('alterar CUALQUIER campo invalida la firma', () => {
        const f = Firma.firmar(datos, par.privada);
        for (const campo of ['id', 'cliente', 'expira_en']) {
            expect(Firma.verificar({ ...datos, [campo]: 'alterado' }, f, par.publica)).toBe(false);
        }
    });

    it('añadir un campo invalida la firma', () => {
        const f = Firma.firmar(datos, par.privada);
        expect(Firma.verificar({ ...datos, plan: 'ETERNO' }, f, par.publica)).toBe(false);
    });

    it('otra clave privada no sirve para emitir licencias', () => {
        const pirata = Firma.generarParDeClaves();
        expect(Firma.verificar(datos, Firma.firmar(datos, pirata.privada), par.publica)).toBe(false);
    });

    it('la serialización es canónica: el orden de las claves no importa', () => {
        const f = Firma.firmar({ a: 1, b: 2 }, par.privada);
        expect(Firma.verificar({ b: 2, a: 1 }, f, par.publica)).toBe(true);
    });

    it('una firma corrupta no lanza excepción, solo es inválida', () => {
        expect(Firma.verificar(datos, 'no-es-base64-valido!!', par.publica)).toBe(false);
        expect(Firma.verificar(datos, '', par.publica)).toBe(false);
    });

    it('el código de instalación es corto, estable y sin caracteres ambiguos', () => {
        const c1 = Firma.codigoCorto('instalacion-x');
        const c2 = Firma.codigoCorto('instalacion-x');
        expect(c1).toBe(c2);
        expect(c1).toMatch(/^[2-9A-HJ-NP-Z]{5}(-[2-9A-HJ-NP-Z]{5}){3}$/);
        expect(Firma.codigoCorto('instalacion-y')).not.toBe(c1);
        // Sin 0/O ni 1/I/L, que se confunden al dictar por teléfono
        expect(c1).not.toMatch(/[01OIL]/);
    });
});

describe('Huella del equipo · comparación ponderada', () => {
    const base = {
        componentes: { maquina:'m1', disco:'d1', red:'r1', cpu:'c1',
                       nucleos:'n1', so:'s1', equipo:'e1', memoria:'me1' },
        pesos: { maquina:28, disco:18, red:16, cpu:12, nucleos:6, so:8, equipo:7, memoria:5 }
    };
    const con = cambios => ({ componentes: { ...base.componentes, ...cambios }, pesos: base.pesos });

    it('el mismo equipo puntúa 100', () => {
        expect(Huella.comparar(base, 70, con({})).puntuacion).toBe(100);
    });

    it('tolera cambios de hardware habituales', () => {
        // Tarjeta de red nueva
        expect(Huella.comparar(base, 70, con({ red: 'r2' })).coincide).toBe(true);
        // Ampliación de memoria
        expect(Huella.comparar(base, 70, con({ memoria: 'me2' })).coincide).toBe(true);
        // Renombrar el equipo
        expect(Huella.comparar(base, 70, con({ equipo: 'e2' })).coincide).toBe(true);
        // Los tres a la vez (28% del peso): justo en el límite
        expect(Huella.comparar(base, 70, con({ red:'r2', memoria:'me2', equipo:'e2' })).puntuacion).toBe(72);
    });

    it('un equipo distinto NO pasa el umbral', () => {
        const otro = con({ maquina:'x', disco:'y', red:'z', cpu:'w', nucleos:'v', equipo:'u', memoria:'t' });
        const r = Huella.comparar(base, 70, otro);
        expect(r.coincide).toBe(false);
        expect(r.puntuacion).toBeLessThan(20);
    });

    it('cambiar solo el identificador del sistema no basta para pasar', () => {
        // Ni siquiera el componente de mayor peso decide por sí solo
        const r = Huella.comparar(base, 70, con({ maquina: 'clonado' }));
        expect(r.puntuacion).toBe(72);
        expect(r.divergentes).toEqual(['maquina']);
    });

    it('los componentes no detectables al activar no penalizan', () => {
        // Si al emitir la licencia no se pudo leer el serial del disco, ese
        // componente se excluye del total en lugar de contar como fallo.
        const sinDisco = { componentes: { ...base.componentes, disco: null }, pesos: base.pesos };
        const r = Huella.comparar(sinDisco, 70, con({}));
        expect(r.ausentes).toContain('disco');
        expect(r.puntuacion).toBe(100);
        expect(r.peso_evaluable).toBe(82);
    });

    it('la huella real del equipo trae componentes y pesos', () => {
        const h = Huella.actual();
        expect(Object.keys(h.componentes).length).toBeGreaterThanOrEqual(8);
        expect(h.resumen).toHaveLength(64);
        expect(Huella.comparar(h, 70).coincide).toBe(true);
    });
});

describe('Licencia · funciones contratadas', () => {
    const { tieneFuncion } = require('./licenciaService');

    it('sin sistema de licencias (instalación dormida) no restringe nada', () => {
        expect(tieneFuncion(null, 'inventario')).toBe(true);
        expect(tieneFuncion({ estado: 'NO_CONFIGURADA', licencia: null }, 'inventario')).toBe(true);
    });

    it('una licencia sin lista de funciones no restringe nada', () => {
        expect(tieneFuncion({ licencia: { id: 'LIC-1', funciones: [] } }, 'inventario')).toBe(true);
        expect(tieneFuncion({ licencia: { id: 'LIC-1' } }, 'inventario')).toBe(true);
    });

    it('con lista declarada, la función debe venir incluida', () => {
        const evaluacion = { licencia: { id: 'LIC-1', funciones: ['pos', 'inventario', 'costeo'] } };
        expect(tieneFuncion(evaluacion, 'inventario')).toBe(true);
        expect(tieneFuncion(evaluacion, 'auditoria')).toBe(false);
    });

    it('la comparación no distingue mayúsculas', () => {
        expect(tieneFuncion({ licencia: { funciones: ['POS', 'Inventario'] } }, 'INVENTARIO')).toBe(true);
    });
});
