// services/turnoService.test.js
// C4: retiros de efectivo — validación, vigencia y resta del esperado.
// C7: conteo de cuentas abiertas.
jest.mock('../config/db', () => ({ query: jest.fn(), getConnection: jest.fn() }));
jest.mock('../models/turnoModel', () => ({ findActive: jest.fn() }));

const db = require('../config/db');
const TurnoModel = require('../models/turnoModel');
const TurnoService = require('./turnoService');

const TURNO = { id: 7, monto_apertura: 100 };

beforeEach(() => {
    jest.clearAllMocks();
});

function simularTurno(estado) {
    db.query.mockImplementation(async (sql) => {
        if (String(sql).includes('FROM turnos_servicio')) return [[{ id: 7, estado }], []];
        return [[], []];
    });
}

describe('turnoService · registrarRetiro (C4)', () => {
    it('rechaza monto cero/negativo o motivo vacío', async () => {
        simularTurno('abierto');
        await expect(TurnoService.registrarRetiro({ turnoId: 7, monto: 0, motivo: 'x', usuarioId: 1 }))
            .rejects.toThrow('mayor que cero');
        await expect(TurnoService.registrarRetiro({ turnoId: 7, monto: 10, motivo: '  ', usuarioId: 1 }))
            .rejects.toThrow('motivo');
    });

    it('rechaza operar con el turno cerrado', async () => {
        simularTurno('cerrado');
        await expect(TurnoService.registrarRetiro({ turnoId: 7, monto: 10, motivo: 'caja fuerte', usuarioId: 1 }))
            .rejects.toThrow('turno abierto');
    });

    it('registra con dos decimales y devuelve el acta', async () => {
        simularTurno('abierto');
        db.query.mockImplementation(async (sql) => {
            if (String(sql).includes('FROM turnos_servicio')) return [[{ id: 7, estado: 'abierto' }], []];
            if (String(sql).includes('INSERT INTO retiros_efectivo')) return [{ insertId: 3 }, undefined];
            return [[], []];
        });
        const r = await TurnoService.registrarRetiro({ turnoId: 7, monto: 25.5, motivo: ' exceso ', usuarioId: 1 });
        expect(r).toMatchObject({ id: 3, turnoId: 7, monto: 25.5, motivo: 'exceso' });
        const insert = db.query.mock.calls.find(([sql]) => String(sql).includes('INSERT INTO retiros_efectivo'));
        expect(insert[1]).toEqual([7, '25.50', 'exceso', 1]);
    });
});

describe('turnoService · anularRetiro (C4)', () => {
    it('rechaza inexistente, ya anulado o turno cerrado', async () => {
        db.query.mockImplementation(async (sql) => {
            if (String(sql).includes('FROM retiros_efectivo')) return [[], []];
            return [[], []];
        });
        await expect(TurnoService.anularRetiro(99, 1)).rejects.toThrow('no existe');

        db.query.mockImplementation(async (sql) => {
            if (String(sql).includes('FROM retiros_efectivo')) return [[{ id: 1, turno_servicio_id: 7, monto: 10, anulado: 1 }], []];
            return [[], []];
        });
        await expect(TurnoService.anularRetiro(1, 1)).rejects.toThrow('ya está anulado');

        db.query.mockImplementation(async (sql) => {
            const texto = String(sql);
            if (texto.includes('FROM retiros_efectivo')) return [[{ id: 1, turno_servicio_id: 7, monto: 10, anulado: 0 }], []];
            if (texto.includes('FROM turnos_servicio')) return [[{ id: 7, estado: 'cerrado' }], []];
            return [[], []];
        });
        await expect(TurnoService.anularRetiro(1, 1)).rejects.toThrow('turno abierto');
    });

    it('anula con responsable y fecha', async () => {
        db.query.mockImplementation(async (sql) => {
            const texto = String(sql);
            if (texto.includes('FROM retiros_efectivo')) return [[{ id: 1, turno_servicio_id: 7, monto: 10, anulado: 0 }], []];
            if (texto.includes('FROM turnos_servicio')) return [[{ id: 7, estado: 'abierto' }], []];
            return [[], []];
        });
        const r = await TurnoService.anularRetiro(1, 5);
        expect(r).toMatchObject({ id: 1, monto: 10 });
        const upd = db.query.mock.calls.find(([sql]) => String(sql).includes('UPDATE retiros_efectivo'));
        expect(upd[1]).toEqual([5, 1]);
    });
});

describe('turnoService · totales y conteos', () => {
    it('totalRetirosVigentes suma solo no anulados (0 si no hay)', async () => {
        db.query.mockResolvedValueOnce([[{ total: 45.5 }], []]);
        await expect(TurnoService.totalRetirosVigentes(7)).resolves.toBe(45.5);
        expect(db.query.mock.calls[0][0]).toContain('anulado = 0');
        db.query.mockResolvedValueOnce([[{ total: null }], []]);
        await expect(TurnoService.totalRetirosVigentes(7)).resolves.toBe(0);
    });

    it('contarPedidosAbiertos devuelve cuentas y total (C7)', async () => {
        db.query.mockResolvedValueOnce([[{ cuentas: 3, total: 250 }], []]);
        await expect(TurnoService.contarPedidosAbiertos(7)).resolves.toEqual({ cuentas: 3, total: 250 });
        expect(db.query.mock.calls[0][0]).toContain('fecha_cierre IS NULL');
    });
});

describe('turnoService · cerrarTurnoActivo resta los retiros (C4)', () => {
    it('esperado = fondo + abonos − retiros y snapshot con total_retiros', async () => {
        TurnoModel.findActive.mockResolvedValue({ ...TURNO });
        const conexion = {
            query: jest.fn(async (sql) => {
                const texto = String(sql);
                if (texto.includes('FROM pedidos')) return [[], []];
                if (texto.includes('FROM retiros_efectivo')) return [[{ total: 30 }], []];
                return [[], []];
            }),
            beginTransaction: jest.fn(),
            commit: jest.fn(),
            rollback: jest.fn(),
            release: jest.fn()
        };
        db.getConnection.mockResolvedValue(conexion);

        const r = await TurnoService.cerrarTurnoActivo(1, 70, 'cierre');

        expect(r.totalRetiros).toBe(30);
        expect(r.montoEsperado).toBe(70); // 100 + 0 − 30
        expect(r.balanceEstado).toBe('cuadrado');
        const insert = conexion.query.mock.calls.find(([sql]) => String(sql).includes('INSERT INTO cierres_servicio'));
        expect(insert[0]).toContain('total_retiros');
    });
});
