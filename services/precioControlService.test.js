// services/precioControlService.test.js
// Control de precios de cartas: activación, designación y autorización.
jest.mock('../config/db', () => ({ query: jest.fn() }));
jest.mock('./settingService', () => ({ get: jest.fn(), set: jest.fn() }));

const pool = require('../config/db');
const SettingService = require('./settingService');
const PrecioControlService = require('./precioControlService');

const ADMIN = { id: 7, usuario: 'boss', nombre: 'Jefe', apellidos: 'Total', rol: 'administrador', activo: 1 };

function simularConfig({ activo = false, usuarioId = '', filaUsuario = null } = {}) {
    SettingService.get.mockImplementation(async (clave, valorPorDefecto) => {
        if (clave === 'precio_control_activo') return activo;
        if (clave === 'precio_control_usuario_id') return usuarioId;
        return valorPorDefecto;
    });
    SettingService.set.mockResolvedValue(true);
    pool.query.mockResolvedValue([filaUsuario ? [filaUsuario] : [], []]);
}

describe('precioControlService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('controlActivo', () => {
        it('lee el ajuste (true, "1" o ausente)', async () => {
            SettingService.get.mockResolvedValueOnce(true);
            await expect(PrecioControlService.controlActivo()).resolves.toBe(true);
            SettingService.get.mockResolvedValueOnce('1');
            await expect(PrecioControlService.controlActivo()).resolves.toBe(true);
            SettingService.get.mockResolvedValueOnce(false);
            await expect(PrecioControlService.controlActivo()).resolves.toBe(false);
        });
    });

    describe('obtenerConfiguracion', () => {
        it('resuelve al designado válido', async () => {
            simularConfig({ activo: true, usuarioId: '7', filaUsuario: ADMIN });
            await expect(PrecioControlService.obtenerConfiguracion()).resolves.toEqual({
                activo: true,
                usuarioId: 7,
                usuario: { id: 7, usuario: 'boss', nombre: 'Jefe Total', rol: 'administrador' }
            });
        });

        it('usuario null si el designado perdió rol, actividad o existencia', async () => {
            simularConfig({ activo: true, usuarioId: '9', filaUsuario: { ...ADMIN, id: 9, rol: 'dependiente' } });
            let cfg = await PrecioControlService.obtenerConfiguracion();
            expect(cfg.usuarioId).toBe(9);
            expect(cfg.usuario).toBeNull();

            simularConfig({ activo: true, usuarioId: '7', filaUsuario: { ...ADMIN, activo: 0 } });
            cfg = await PrecioControlService.obtenerConfiguracion();
            expect(cfg.usuario).toBeNull();

            simularConfig({ activo: true, usuarioId: '7', filaUsuario: null });
            cfg = await PrecioControlService.obtenerConfiguracion();
            expect(cfg.usuario).toBeNull();
        });
    });

    describe('guardarActivo', () => {
        it('activar sin designado válido falla (400)', async () => {
            simularConfig({ activo: false, usuarioId: '' });
            const error = await PrecioControlService.guardarActivo(true).catch((e) => e);
            expect(error.httpStatus).toBe(400);
            expect(SettingService.set).not.toHaveBeenCalled();
        });

        it('activar con designado guarda "1"', async () => {
            simularConfig({ activo: false, usuarioId: '7', filaUsuario: ADMIN });
            const r = await PrecioControlService.guardarActivo('1');
            expect(r).toEqual({ anterior: false, nuevo: true, sinCambios: false });
            expect(SettingService.set).toHaveBeenCalledWith(
                'precio_control_activo', '1', expect.any(String), 'general', 'boolean'
            );
        });

        it('desactivar guarda "0" sin exigir designado', async () => {
            simularConfig({ activo: true, usuarioId: '' });
            const r = await PrecioControlService.guardarActivo(false);
            expect(r.nuevo).toBe(false);
            expect(SettingService.set).toHaveBeenCalledWith(
                'precio_control_activo', '0', expect.any(String), 'general', 'boolean'
            );
        });

        it('sin cambios no escribe', async () => {
            simularConfig({ activo: true, usuarioId: '7', filaUsuario: ADMIN });
            const r = await PrecioControlService.guardarActivo(true);
            expect(r.sinCambios).toBe(true);
            expect(SettingService.set).not.toHaveBeenCalled();
        });
    });

    describe('guardarUsuarioDesignado', () => {
        it('designa a un administrador activo', async () => {
            simularConfig({ activo: false, usuarioId: '' });
            pool.query.mockResolvedValue([[ADMIN], []]);
            const r = await PrecioControlService.guardarUsuarioDesignado('7');
            expect(r).toMatchObject({ anterior: null, nuevo: 7, sinCambios: false });
            expect(r.usuario.nombre).toBe('Jefe Total');
            expect(SettingService.set).toHaveBeenCalledWith(
                'precio_control_usuario_id', '7', expect.any(String), 'general', 'number'
            );
        });

        it('rechaza dependiente, inactivo, inexistente e inválido (400)', async () => {
            simularConfig({ activo: false, usuarioId: '' });
            pool.query.mockResolvedValue([[{ ...ADMIN, id: 9, rol: 'dependiente' }], []]);
            let e = await PrecioControlService.guardarUsuarioDesignado(9).catch((x) => x);
            expect(e.httpStatus).toBe(400);
            expect(e.message).toContain('rol');

            pool.query.mockResolvedValue([[{ ...ADMIN, activo: 0 }], []]);
            e = await PrecioControlService.guardarUsuarioDesignado(7).catch((x) => x);
            expect(e.httpStatus).toBe(400);

            pool.query.mockResolvedValue([[], []]);
            e = await PrecioControlService.guardarUsuarioDesignado(77).catch((x) => x);
            expect(e.httpStatus).toBe(400);

            e = await PrecioControlService.guardarUsuarioDesignado('abc').catch((x) => x);
            expect(e.httpStatus).toBe(400);
            expect(SettingService.set).not.toHaveBeenCalled();
        });

        it('no retira al designado con control activo; sí con control inactivo', async () => {
            simularConfig({ activo: true, usuarioId: '7', filaUsuario: ADMIN });
            const e = await PrecioControlService.guardarUsuarioDesignado('').catch((x) => x);
            expect(e.httpStatus).toBe(400);
            expect(SettingService.set).not.toHaveBeenCalled();

            simularConfig({ activo: false, usuarioId: '7', filaUsuario: ADMIN });
            const r = await PrecioControlService.guardarUsuarioDesignado('');
            expect(r).toMatchObject({ anterior: 7, nuevo: null, sinCambios: false });
            expect(SettingService.set).toHaveBeenCalledWith(
                'precio_control_usuario_id', '', expect.any(String), 'general', 'number'
            );
        });
    });

    describe('puedeModificarPrecios', () => {
        it('sin control todos pueden', async () => {
            simularConfig({ activo: false });
            await expect(PrecioControlService.puedeModificarPrecios(2)).resolves.toMatchObject({ permitido: true });
        });

        it('con control solo el designado', async () => {
            simularConfig({ activo: true, usuarioId: '7', filaUsuario: ADMIN });
            await expect(PrecioControlService.puedeModificarPrecios(7)).resolves.toMatchObject({ permitido: true });
            const no = await PrecioControlService.puedeModificarPrecios(2);
            expect(no.permitido).toBe(false);
            expect(no.mensaje).toContain('Jefe Total');
            expect(no.usuarioControl.id).toBe(7);
        });

        it('con control y sin designado válido nadie puede', async () => {
            simularConfig({ activo: true, usuarioId: '' });
            const r = await PrecioControlService.puedeModificarPrecios(7);
            expect(r.permitido).toBe(false);
            expect(r.mensaje).toContain('Opciones generales');
        });
    });
});
