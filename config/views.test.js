// config/views.test.js
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const {
    CARPETA_VISTAS,
    CARPETA_PUBLICA,
    RUTA_FAVICON,
    configurarVistas,
    estaticos,
    faviconMiddleware,
} = require('./views');

describe('configurarVistas', () => {
    test('fija EJS como motor y la carpeta views del proyecto', () => {
        const ajustes = {};
        const app = { set: (clave, valor) => { ajustes[clave] = valor; } };

        configurarVistas(app);

        expect(ajustes['view engine']).toBe('ejs');
        expect(ajustes.views).toBe(CARPETA_VISTAS);
    });

    test('devuelve la app para encadenar', () => {
        const app = { set: () => {} };
        expect(configurarVistas(app)).toBe(app);
    });

    test('las carpetas de vistas y públicos existen en el repo', () => {
        expect(fs.existsSync(CARPETA_VISTAS)).toBe(true);
        expect(fs.existsSync(CARPETA_PUBLICA)).toBe(true);
    });
});

describe('estaticos', () => {
    test('devuelve un middleware', () => {
        expect(typeof estaticos()).toBe('function');
    });
});

describe('faviconMiddleware', () => {
    test('si no existe el archivo devuelve un paso transparente (antes tiraba el proceso)', () => {
        const inexistente = path.join(os.tmpdir(), 'favicon-que-no-existe.png');
        const next = jest.fn();

        const middleware = faviconMiddleware(inexistente);
        middleware({}, {}, next);

        expect(typeof middleware).toBe('function');
        expect(next).toHaveBeenCalledTimes(1);
    });

    test('si existe el archivo usa serve-favicon', () => {
        const temporal = path.join(os.tmpdir(), `favicon-${Date.now()}.png`);
        fs.writeFileSync(temporal, Buffer.from('89504e470d0a1a0a', 'hex'));

        try {
            expect(typeof faviconMiddleware(temporal)).toBe('function');
        } finally {
            fs.unlinkSync(temporal);
        }
    });

    test('la ruta por defecto apunta a public/img/favicon.png', () => {
        expect(RUTA_FAVICON).toBe(path.join(CARPETA_PUBLICA, 'img', 'favicon.png'));
    });
});
