// services/aperturaMesaService.test.js
// Puerta de apertura de mesas: exige distribución del turno y rechaza
// mesas reservadas/ocupadas con mensajes accionables.
jest.mock('../config/db', () => ({ query: jest.fn(), getConnection: jest.fn() }));

const db = require('../config/db');
const Apertura = require('./aperturaMesaService');

const MESA = (estado) => ({ id: 8, numero: 'Nro 8', capacidad: 4, estado });

beforeEach(() => jest.clearAllMocks());

describe('aperturaMesaService.hayDistribucion', () => {
    it('es true cuando el turno tiene detalles de asignación', async () => {
        db.query.mockResolvedValueOnce([[{ n: 12 }], []]);
        await expect(Apertura.hayDistribucion(3)).resolves.toBe(true);
        expect(db.query.mock.calls[0][1]).toEqual([3]);
    });

    it('es false sin turno o sin detalles', async () => {
        await expect(Apertura.hayDistribucion(null)).resolves.toBe(false);
        db.query.mockResolvedValueOnce([[{ n: 0 }], []]);
        await expect(Apertura.hayDistribucion(3)).resolves.toBe(false);
    });
});

describe('aperturaMesaService.verificarMesaParaApertura', () => {
    it('pasa con mesa libre y devuelve la mesa', async () => {
        db.query.mockResolvedValueOnce([[MESA('libre')], []]);
        await expect(Apertura.verificarMesaParaApertura(8)).resolves.toEqual(MESA('libre'));
    });

    it('rechaza mesa inexistente', async () => {
        db.query.mockResolvedValueOnce([[], []]);
        const e = await Apertura.verificarMesaParaApertura(99).catch((x) => x);
        expect(e.codigo).toBe('MESA_INEXISTENTE');
    });

    it('rechaza reservada indicando ir a Reservas/Sentar (con datos del cliente)', async () => {
        db.query
            .mockResolvedValueOnce([[MESA('reservada')], []])
            .mockResolvedValueOnce([[{ cliente_nombre: 'Juan', fecha_corta: '28/09 20:00', comensales: 2 }], []]);
        const e = await Apertura.verificarMesaParaApertura(8).catch((x) => x);
        expect(e.codigo).toBe('MESA_RESERVADA');
        expect(e.message).toMatch(/RESERVADA/);
        expect(e.message).toMatch(/Juan/);
        expect(e.message).toMatch(/Sentar/);
    });

    it('rechaza reservada aunque ya no tenga pendiente visible', async () => {
        db.query
            .mockResolvedValueOnce([[MESA('reservada')], []])
            .mockResolvedValueOnce([[], []]);
        const e = await Apertura.verificarMesaParaApertura(8).catch((x) => x);
        expect(e.codigo).toBe('MESA_RESERVADA');
        expect(e.message).toMatch(/módulo Reservas/);
    });

    it('rechaza ocupada, mantenimiento y desocupándose', async () => {
        for (const [estado, codigo] of [
            ['ocupada', 'MESA_OCUPADA'],
            ['mantenimiento', 'MESA_MANTENIMIENTO'],
            ['desocupandose', 'MESA_DESOCUPANDOSE']
        ]) {
            db.query.mockResolvedValueOnce([[MESA(estado)], []]);
            const e = await Apertura.verificarMesaParaApertura(8).catch((x) => x);
            expect(e.codigo).toBe(codigo);
        }
    });
});

describe('aperturaMesaService.autorizarApertura', () => {
    it('bloquea todo si no hay distribución del turno', async () => {
        db.query.mockResolvedValueOnce([[{ n: 0 }], []]);
        const e = await Apertura.autorizarApertura(8, 3).catch((x) => x);
        expect(e.codigo).toBe('SIN_DISTRIBUCION');
        expect(e.message).toMatch(/distribución del día/);
        expect(db.query).toHaveBeenCalledTimes(1); // ni mira la mesa
    });

    it('autoriza mesa libre con distribución hecha', async () => {
        db.query
            .mockResolvedValueOnce([[{ n: 5 }], []])
            .mockResolvedValueOnce([[MESA('libre')], []]);
        await expect(Apertura.autorizarApertura(8, 3)).resolves.toEqual({ mesa: MESA('libre') });
    });
});
