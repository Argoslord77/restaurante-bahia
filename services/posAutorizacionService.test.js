// services/posAutorizacionService.test.js
// Reglas de autorización del POS gobernadas por las Opciones generales:
// quién toma órdenes y quién autoriza cortesías.
jest.mock('../config/db', () => ({ query: jest.fn() }));
jest.mock('./settingService', () => ({ get: jest.fn(), set: jest.fn() }));
jest.mock('bcryptjs', () => ({ compare: jest.fn() }));

const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const SettingService = require('./settingService');
const PosAutorizacionService = require('./posAutorizacionService');

describe('posAutorizacionService · toma de órdenes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('modo "todos": capitanes y dependientes pueden tomar', async () => {
        SettingService.get.mockResolvedValue('todos');
        await expect(PosAutorizacionService.puedeTomarOrdenes('capitan')).resolves.toBe(true);
        await expect(PosAutorizacionService.puedeTomarOrdenes('dependiente')).resolves.toBe(true);
        await expect(PosAutorizacionService.puedeTomarOrdenes('administrador')).resolves.toBe(true);
    });

    it('modo "solo_capitanes": el dependiente queda bloqueado', async () => {
        SettingService.get.mockResolvedValue('solo_capitanes');
        await expect(PosAutorizacionService.puedeTomarOrdenes('capitan')).resolves.toBe(true);
        await expect(PosAutorizacionService.puedeTomarOrdenes('dependiente')).resolves.toBe(false);
        await expect(PosAutorizacionService.puedeTomarOrdenes('superadministrador')).resolves.toBe(true);
    });

    it('un valor desconocido o ausente cae al modo permisivo "todos"', async () => {
        SettingService.get.mockResolvedValue('___basura___');
        await expect(PosAutorizacionService.modoTomaOrdenes()).resolves.toBe('todos');
        SettingService.get.mockResolvedValue(0);
        await expect(PosAutorizacionService.modoTomaOrdenes()).resolves.toBe('todos');
    });

    it('roles ajenos al servicio nunca toman órdenes', async () => {
        SettingService.get.mockResolvedValue('todos');
        await expect(PosAutorizacionService.puedeTomarOrdenes('cocinero')).resolves.toBe(false);
        await expect(PosAutorizacionService.puedeTomarOrdenes('cajero')).resolves.toBe(false);
        await expect(PosAutorizacionService.puedeTomarOrdenes(null)).resolves.toBe(false);
    });
});

describe('posAutorizacionService · autorización de cortesías', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('por defecto la cortesía exige autorización', async () => {
        SettingService.get.mockImplementation(async (clave, def) => def);
        await expect(PosAutorizacionService.cortesiaRequiereAutorizacion()).resolves.toBe(true);
    });

    it('respeta el interruptor de Opciones generales', async () => {
        SettingService.get.mockResolvedValue(false);
        await expect(PosAutorizacionService.cortesiaRequiereAutorizacion()).resolves.toBe(false);
        SettingService.get.mockResolvedValue('0');
        await expect(PosAutorizacionService.cortesiaRequiereAutorizacion()).resolves.toBe(false);
    });

    it('autorizan administradores y capitán por defecto', async () => {
        SettingService.get.mockImplementation(async (clave, def) => def);
        await expect(PosAutorizacionService.puedeAutorizarCortesia('capitan')).resolves.toBe(true);
        await expect(PosAutorizacionService.puedeAutorizarCortesia('administrador')).resolves.toBe(true);
        await expect(PosAutorizacionService.puedeAutorizarCortesia('dependiente')).resolves.toBe(false);
    });

    it('verificarSupervisor acepta un supervisor activo con clave válida', async () => {
        SettingService.get.mockImplementation(async (clave, def) => def);
        pool.query.mockResolvedValue([[{ id: 7, nombre: 'Ana', apellidos: 'Gómez', usuario: 'ana', rol: 'capitan', password: 'hash', activo: 1 }], []]);
        bcrypt.compare.mockResolvedValue(true);

        const resultado = await PosAutorizacionService.verificarSupervisor('ana', 'secreta');
        expect(resultado.ok).toBe(true);
        expect(resultado.supervisor).toMatchObject({ id: 7, rol: 'capitan' });
        expect(bcrypt.compare).toHaveBeenCalledWith('secreta', 'hash');
    });

    it('verificarSupervisor rechaza clave incorrecta sin detallar el motivo', async () => {
        pool.query.mockResolvedValue([[{ id: 7, usuario: 'ana', rol: 'capitan', password: 'hash', activo: 1 }], []]);
        bcrypt.compare.mockResolvedValue(false);

        const resultado = await PosAutorizacionService.verificarSupervisor('ana', 'mala');
        expect(resultado.ok).toBe(false);
        expect(resultado.error).toMatch(/inválidas/);
    });

    it('verificarSupervisor rechaza usuarios sin nivel de autorización', async () => {
        SettingService.get.mockImplementation(async (clave, def) => def);
        pool.query.mockResolvedValue([[{ id: 9, usuario: 'juan', rol: 'dependiente', password: 'hash', activo: 1 }], []]);
        bcrypt.compare.mockResolvedValue(true);

        const resultado = await PosAutorizacionService.verificarSupervisor('juan', 'secreta');
        expect(resultado.ok).toBe(false);
        expect(resultado.error).toMatch(/no tiene nivel/);
    });

    it('verificarSupervisor rechaza cuentas inactivas', async () => {
        pool.query.mockResolvedValue([[{ id: 7, usuario: 'ana', rol: 'capitan', password: 'hash', activo: 0 }], []]);
        bcrypt.compare.mockResolvedValue(true);

        const resultado = await PosAutorizacionService.verificarSupervisor('ana', 'secreta');
        expect(resultado.ok).toBe(false);
        expect(resultado.error).toMatch(/no está activa/);
    });
});

describe('posAutorizacionService · columnas de cortesía', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('agrega solo las columnas que faltan y devuelve true', async () => {
        pool.query.mockImplementation(async (sql) => {
            if (String(sql).startsWith('SHOW COLUMNS')) {
                return [[{ Field: 'id' }, { Field: 'cortesia_motivo' }], []];
            }
            return [[], []];
        });

        await expect(PosAutorizacionService.asegurarColumnasCortesia()).resolves.toBe(true);
        const ddl = pool.query.mock.calls.map(c => String(c[0]));
        expect(ddl.some(s => s.includes('cortesia_autorizada_por'))).toBe(true);
        expect(ddl.some(s => s.includes('cortesia_autorizada_en'))).toBe(true);
        // cortesia_motivo ya existía: no debe regenerarse
        expect(ddl.filter(s => s.startsWith('ALTER TABLE pedidos ADD COLUMN cortesia_motivo'))).toHaveLength(0);
    });
});
