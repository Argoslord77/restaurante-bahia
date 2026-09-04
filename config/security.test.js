// config/security.test.js
'use strict';

const express = require('express');
const request = require('supertest');
const { POLITICA_CSP, POLITICA_HSTS, seguridadHttp, limitadorPeticiones } = require('./security');

describe('Política CSP', () => {
    test('permite manejadores inline: sin esto no imprimen los reportes', () => {
        expect(POLITICA_CSP.directives.scriptSrcAttr).toContain("'unsafe-inline'");
    });

    test('no bloquea script-src-attr (regresión del bug de window.print)', () => {
        expect(POLITICA_CSP.directives.scriptSrcAttr).not.toContain("'none'");
    });

    test('deja pasar los CDN de Bootstrap/jQuery usados por las vistas', () => {
        expect(POLITICA_CSP.directives.styleSrc).toContain('https://cdn.jsdelivr.net');
        expect(POLITICA_CSP.directives.scriptSrc).toContain('https://cdn.jsdelivr.net');
        expect(POLITICA_CSP.directives.fontSrc).toContain('https://cdn.jsdelivr.net');
    });

    test('mantiene HSTS de un año con preload', () => {
        expect(POLITICA_HSTS).toMatchObject({ maxAge: 31536000, includeSubDomains: true, preload: true });
    });
});

describe('seguridadHttp', () => {
    test('emite la cabecera CSP con script-src-attr', async () => {
        const app = express();
        app.use(seguridadHttp());
        app.get('/ping', (req, res) => res.send('ok'));

        const respuesta = await request(app).get('/ping');
        const csp = respuesta.headers['content-security-policy'] || '';
        expect(csp).toMatch(/script-src-attr 'unsafe-inline'/);
        expect(respuesta.headers['x-content-type-options']).toBe('nosniff');
    });

    test('admite desactivar HSTS (HTTP interno)', async () => {
        const app = express();
        app.use(seguridadHttp({ hsts: false }));
        app.get('/ping', (req, res) => res.send('ok'));

        const respuesta = await request(app).get('/ping');
        expect(respuesta.headers['strict-transport-security']).toBeUndefined();
    });
});

describe('limitadorPeticiones', () => {
    test('responde 429 en castellano al superar RATE_LIMIT_MAX', async () => {
        process.env.RATE_LIMIT_MAX = '2';
        process.env.RATE_LIMIT_WINDOW_MS = '60000';

        const app = express();
        app.use(limitadorPeticiones());
        app.get('/ping', (req, res) => res.send('ok'));

        await request(app).get('/ping').expect(200);
        await request(app).get('/ping').expect(200);
        const tercera = await request(app).get('/ping');

        expect(tercera.status).toBe(429);
        expect(tercera.body).toMatchObject({ success: false });
        expect(tercera.body.message).toMatch(/Demasiadas solicitudes/);

        delete process.env.RATE_LIMIT_MAX;
        delete process.env.RATE_LIMIT_WINDOW_MS;
    });

    test('ignora valores de entorno inválidos y usa los predeterminados', () => {
        process.env.RATE_LIMIT_MAX = 'abc';
        const middleware = limitadorPeticiones();
        expect(typeof middleware).toBe('function');
        delete process.env.RATE_LIMIT_MAX;
    });
});
