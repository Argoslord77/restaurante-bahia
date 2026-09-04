// config/app.test.js
// Prueba de humo del ensamblado completo: la app debe construirse, responder el
// sondeo de vida y redirigir la raíz SIN necesidad de base de datos.
'use strict';

const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.SERVER_HTTP = '1';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'secreto-de-prueba';

const { createApp, sondaDeVida } = require('./app');

describe('createApp', () => {
    let app;

    beforeAll(() => {
        app = createApp();
    });

    afterAll(async () => {
        try {
            await require('./db').end();
        } catch (error) {
            /* sin BD disponible: no hay nada que cerrar */
        }
    });

    test('devuelve una aplicación Express utilizable', () => {
        expect(typeof app).toBe('function');
        expect(typeof app.use).toBe('function');
        expect(typeof app.listen).toBe('function');
    });

    test('GET /api/health responde 200 con estado ok', async () => {
        const respuesta = await request(app).get('/api/health');
        expect(respuesta.status).toBe(200);
        expect(respuesta.body.status).toBe('ok');
        expect(respuesta.body.servicio).toBe('restaurante-bahia');
        expect(typeof respuesta.body.uptime_seg).toBe('number');
    });

    test('la raíz redirige a /admin/dashboard', async () => {
        const respuesta = await request(app).get('/');
        expect([301, 302]).toContain(respuesta.status);
        expect(respuesta.headers.location).toBe('/admin/dashboard');
    });

    test('toda respuesta lleva la CSP que permite imprimir', async () => {
        const respuesta = await request(app).get('/api/health');
        expect(respuesta.headers['content-security-policy']).toMatch(/script-src-attr 'unsafe-inline'/);
    });

    test('las rutas de administración quedan montadas (login no devuelve 404 de Express)', async () => {
        const respuesta = await request(app).get('/login');
        expect(respuesta.status).not.toBe(404);
    });

    test('con montarRutas:false solo vive el sondeo', async () => {
        const appSinRutas = createApp({ montarRutas: false });
        const salud = await request(appSinRutas).get('/api/health');
        expect(salud.status).toBe(200);

        const raiz = await request(appSinRutas).get('/');
        expect(raiz.status).toBe(404);
    });

    test('un registro de rutas inválido impide construir la app con mensaje claro', () => {
        expect(() => createApp({
            registro: [{ prefijo: 'admin', modulo: 'noExisteRoutes', descripcion: 'Fantasma' }],
        })).toThrow(/Registro de rutas inválido/);
    });

    test('acepta un registro alternativo válido', async () => {
        const appReducida = createApp({ registro: [{ prefijo: '/', modulo: 'authRoutes', descripcion: 'Auth' }] });
        const respuesta = await request(appReducida).get('/api/health');
        expect(respuesta.status).toBe(200);
    });
});

describe('sondaDeVida', () => {
    test('informa entorno y hora en ISO', () => {
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        sondaDeVida()({}, res);

        expect(res.status).toHaveBeenCalledWith(200);
        const cuerpo = res.json.mock.calls[0][0];
        expect(cuerpo.status).toBe('ok');
        expect(cuerpo.entorno).toBe('test');
        expect(() => new Date(cuerpo.hora)).not.toThrow();
        expect(new Date(cuerpo.hora).toISOString()).toBe(cuerpo.hora);
    });
});
