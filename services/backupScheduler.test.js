// services/backupScheduler.test.js
// A4: lógica pura del respaldo automático — hora de ejecución,
// retención y configuración (sin tocar mysqldump ni el disco).
jest.mock('../config/logger', () => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn() }));
const sched = require('./backupScheduler');

describe('backupScheduler.esHoraDeRespaldar', () => {
    it('dispara a la hora configurada si hoy no respaldó', () => {
        const ahora = new Date(2026, 8, 27, 3, 4, 0);
        expect(sched.esHoraDeRespaldar(ahora, 3, false)).toBe(true);
    });

    it('no repite si ya respaldó hoy', () => {
        const ahora = new Date(2026, 8, 27, 3, 4, 0);
        expect(sched.esHoraDeRespaldar(ahora, 3, true)).toBe(false);
    });

    it('fuera de hora no dispara', () => {
        const ahora = new Date(2026, 8, 27, 14, 0, 0);
        expect(sched.esHoraDeRespaldar(ahora, 3, false)).toBe(false);
    });
});

describe('backupScheduler.seleccionarParaBorrar', () => {
    const archivos = [
        { nombre: 'a.sql', mtimeMs: 100 },
        { nombre: 'b.sql', mtimeMs: 300 },
        { nombre: 'c.sql', mtimeMs: 200 }
    ];

    it('conserva los N más recientes y marca el resto', () => {
        const sobran = sched.seleccionarParaBorrar(archivos, 2);
        expect(sobran.map(a => a.nombre)).toEqual(['a.sql']);
    });

    it('si hay menos que conservar, no borra nada', () => {
        expect(sched.seleccionarParaBorrar(archivos, 7)).toEqual([]);
    });
});

describe('backupScheduler.leerConfig', () => {
    const ENV = process.env;
    beforeEach(() => { process.env = { ...ENV }; });
    afterAll(() => { process.env = ENV; });

    it('defaults: activo, 03:00, 7 días', () => {
        delete process.env.RESPALDO_AUTO;
        delete process.env.RESPALDO_HORA;
        delete process.env.RESPALDO_DIAS;
        const cfg = sched.leerConfig();
        expect(cfg).toMatchObject({ activo: true, hora: 3, dias: 7 });
    });

    it('respeta variables y acota rangos', () => {
        process.env.RESPALDO_AUTO = '0';
        process.env.RESPALDO_HORA = '99';
        process.env.RESPALDO_DIAS = '99';
        const cfg = sched.leerConfig();
        expect(cfg).toMatchObject({ activo: false, hora: 23, dias: 30 });
    });
});

describe('backupScheduler.hayRespaldoDeHoy', () => {
    it('directorio inexistente = no hay respaldo (sin lanzar)', async () => {
        await expect(sched.hayRespaldoDeHoy('/tmp/no-existe-bahia-xyz')).resolves.toBe(false);
    });
});
