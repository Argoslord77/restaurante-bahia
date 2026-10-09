// middlewares/deslizarSesion.test.js — La actividad renueva la sesión,
// como mucho una escritura cada 5 minutos por usuario.
const { deslizarSesion } = require('./auth');

function req(sesion, autenticado = true) {
    return { session: sesion, isAuthenticated: () => autenticado };
}

describe('deslizarSesion', () => {
    test('sin sesión o invitado no toca nada', () => {
        const next = jest.fn();
        deslizarSesion({}, {}, next);
        deslizarSesion(req({}, false), {}, next);
        deslizarSesion(req(undefined), {}, next);
        expect(next).toHaveBeenCalledTimes(3);
    });

    test('primera operación marca la actividad', () => {
        const sesion = { user: { id: 1 } };
        deslizarSesion(req(sesion), {}, jest.fn());
        expect(sesion.ultima_actividad).toBeLessThanOrEqual(Date.now());
        expect(Date.now() - sesion.ultima_actividad).toBeLessThan(5000);
    });

    test('dentro de 5 minutos no reescribe', () => {
        const sesion = { user: { id: 1 }, ultima_actividad: Date.now() - 60 * 1000 };
        deslizarSesion(req(sesion), {}, jest.fn());
        expect(sesion.ultima_actividad).toBeLessThan(Date.now() - 30 * 1000);
    });

    test('tras 5 minutos renueva la vigencia', () => {
        const vieja = Date.now() - 6 * 60 * 1000;
        const sesion = { user: { id: 1 }, ultima_actividad: vieja };
        deslizarSesion(req(sesion), {}, jest.fn());
        expect(sesion.ultima_actividad).toBeGreaterThan(vieja);
    });
});
