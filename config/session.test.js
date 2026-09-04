// config/session.test.js
'use strict';

const { opcionesSesion, sesion, contextoVistas, enModoHttp } = require('./session');

describe('opcionesSesion', () => {
    const secretoOriginal = process.env.SESSION_SECRET;
    const httpOriginal = process.env.SERVER_HTTP;
    const maxAgeOriginal = process.env.SESSION_MAX_AGE_MS;

    beforeEach(() => {
        process.env.SESSION_SECRET = 'secreto-de-prueba';
        delete process.env.SERVER_HTTP;
        delete process.env.SESSION_MAX_AGE_MS;
    });

    afterAll(() => {
        if (secretoOriginal === undefined) delete process.env.SESSION_SECRET;
        else process.env.SESSION_SECRET = secretoOriginal;
        if (httpOriginal === undefined) delete process.env.SERVER_HTTP;
        else process.env.SERVER_HTTP = httpOriginal;
        if (maxAgeOriginal === undefined) delete process.env.SESSION_MAX_AGE_MS;
        else process.env.SESSION_MAX_AGE_MS = maxAgeOriginal;
    });

    test('falla con mensaje accionable si falta SESSION_SECRET', () => {
        delete process.env.SESSION_SECRET;
        expect(() => opcionesSesion()).toThrow(/SESSION_SECRET/);
        expect(() => opcionesSesion()).toThrow(/\.env/);
    });

    test('cookie secure cuando se sirve HTTPS (modo por defecto)', () => {
        expect(opcionesSesion().cookie.secure).toBe(true);
    });

    test('cookie NO secure en modo HTTP: antes era imposible iniciar sesión con SERVER_HTTP=1', () => {
        process.env.SERVER_HTTP = '1';
        expect(enModoHttp()).toBe(true);
        expect(opcionesSesion().cookie.secure).toBe(false);
    });

    test('maxAge de una hora por defecto y configurable por env', () => {
        expect(opcionesSesion().cookie.maxAge).toBe(3600000);
        process.env.SESSION_MAX_AGE_MS = '60000';
        expect(opcionesSesion().cookie.maxAge).toBe(60000);
        process.env.SESSION_MAX_AGE_MS = 'no-numero';
        expect(opcionesSesion().cookie.maxAge).toBe(3600000);
    });

    test('endurecimiento de cookie: httpOnly y sameSite lax', () => {
        const { cookie } = opcionesSesion();
        expect(cookie.httpOnly).toBe(true);
        expect(cookie.sameSite).toBe('lax');
    });

    test('no reacopla en cada petición ni crea sesiones vacías', () => {
        expect(opcionesSesion()).toMatchObject({ resave: false, saveUninitialized: false });
    });

    test('sesion() devuelve un middleware Express', () => {
        expect(typeof sesion()).toBe('function');
    });
});

describe('contextoVistas', () => {
    function respuesta(req) {
        const res = { locals: {} };
        contextoVistas()(req, res, () => {});
        return res.locals;
    }

    test('expone los flashes y el usuario de sesión', () => {
        const req = {
            flash: (clave) => (clave === 'success_msg' ? ['Guardado'] : []),
            session: { user: { id: 3, nombre: 'Ana' } },
        };
        const locals = respuesta(req);
        expect(locals.success_msg).toEqual(['Guardado']);
        expect(locals.error_msg).toEqual([]);
        expect(locals.user.nombre).toBe('Ana');
    });

    test('user es null cuando no hay sesión (vistas no rompen)', () => {
        const req = { flash: () => [], session: {} };
        expect(respuesta(req).user).toBeNull();
    });

    test('llama a next exactamente una vez', () => {
        const next = jest.fn();
        contextoVistas()({ flash: () => [], session: {} }, { locals: {} }, next);
        expect(next).toHaveBeenCalledTimes(1);
    });
});
