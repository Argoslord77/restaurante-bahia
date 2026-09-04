// config/routes.test.js
'use strict';

const fs = require('fs');
const {
    REGISTRO_RUTAS,
    RUTA_RAIZ,
    rutaDeModulo,
    validarRegistro,
    montarRutas,
} = require('./routes');

describe('Registro central de rutas', () => {
    test('todos los módulos declarados existen en routes/', () => {
        for (const entrada of REGISTRO_RUTAS) {
            expect(fs.existsSync(rutaDeModulo(entrada.modulo))).toBe(true);
        }
    });

    test('no hay routers duplicados (regresión del doble montaje de transferenciaRoutes)', () => {
        const claves = REGISTRO_RUTAS.map((e) => `${e.prefijo}:${e.modulo}`);
        expect(new Set(claves).size).toBe(claves.length);
    });

    test('todos los prefijos son rutas absolutas', () => {
        for (const entrada of REGISTRO_RUTAS) {
            expect(entrada.prefijo.startsWith('/')).toBe(true);
        }
    });

    test('cada entrada documenta su finalidad', () => {
        for (const entrada of REGISTRO_RUTAS) {
            expect(typeof entrada.descripcion).toBe('string');
            expect(entrada.descripcion.length).toBeGreaterThan(5);
        }
    });

    test('authRoutes abre el registro y clienteRoutes lo cierra', () => {
        expect(REGISTRO_RUTAS[0].modulo).toBe('authRoutes');
        expect(REGISTRO_RUTAS[REGISTRO_RUTAS.length - 1].modulo).toBe('clienteRoutes');
    });

    test('cubre los módulos críticos del negocio', () => {
        const modulos = REGISTRO_RUTAS.map((e) => e.modulo);
        for (const esperado of ['posRoutes', 'turnoRoutes', 'licenciaRoutes', 'auditoriaRoutes', 'cierreDiaRoutes', 'fichaCostoRoutes']) {
            expect(modulos).toContain(esperado);
        }
    });

    test('la raíz redirige al dashboard de administración', () => {
        expect(RUTA_RAIZ).toMatchObject({ metodo: 'get', ruta: '/', destino: '/admin/dashboard' });
    });
});

describe('validarRegistro', () => {
    test('devuelve lista vacía con el registro real', () => {
        expect(validarRegistro()).toEqual([]);
    });

    test('detecta un router montado dos veces', () => {
        const problemas = validarRegistro([
            { prefijo: '/admin', modulo: 'userRoutes', descripcion: 'Usuarios' },
            { prefijo: '/admin', modulo: 'userRoutes', descripcion: 'Usuarios otra vez' },
        ]);
        expect(problemas.some((p) => /duplicado/i.test(p))).toBe(true);
    });

    test('detecta módulos inexistentes', () => {
        const problemas = validarRegistro([
            { prefijo: '/admin', modulo: 'noExisteRoutes', descripcion: 'Fantasma' },
        ]);
        expect(problemas.some((p) => /No existe/.test(p))).toBe(true);
    });

    test('detecta prefijos mal formados', () => {
        const problemas = validarRegistro([
            { prefijo: 'admin', modulo: 'userRoutes', descripcion: 'Sin barra' },
        ]);
        expect(problemas.some((p) => /Prefijo inválido/.test(p))).toBe(true);
    });
});

describe('montarRutas', () => {
    function appEspia() {
        const llamadas = [];
        return {
            llamadas,
            use: (...args) => llamadas.push({ tipo: 'use', args }),
            get: (...args) => llamadas.push({ tipo: 'get', args }),
        };
    }

    test('monta cada entrada del registro en su prefijo', () => {
        const app = appEspia();
        const registro = [
            { prefijo: '/', modulo: 'authRoutes', descripcion: 'Auth' },
            { prefijo: '/admin', modulo: 'userRoutes', descripcion: 'Usuarios' },
        ];
        montarRutas(app, registro);

        const usos = app.llamadas.filter((l) => l.tipo === 'use');
        expect(usos).toHaveLength(2);
        expect(usos[0].args[0]).toBe('/');
        expect(usos[1].args[0]).toBe('/admin');
        expect(typeof usos[0].args[1]).toBe('function');
    });

    test('registra la redirección de la raíz al final', () => {
        const app = appEspia();
        montarRutas(app, [{ prefijo: '/', modulo: 'authRoutes', descripcion: 'Auth' }]);

        const ultima = app.llamadas[app.llamadas.length - 1];
        expect(ultima.tipo).toBe('get');
        expect(ultima.args[0]).toBe('/');

        const res = { redirect: jest.fn() };
        ultima.args[1]({}, res);
        expect(res.redirect).toHaveBeenCalledWith('/admin/dashboard');
    });

    test('devuelve la app para encadenar', () => {
        const app = appEspia();
        expect(montarRutas(app, [])).toBe(app);
    });
});
