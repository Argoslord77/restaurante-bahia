// services/reservaService.test.js
// V12 (C2): reservas — validación, anti-traslape, llegada con apertura
// de cuenta, cancelación/no-show con liberación de mesa.
jest.mock('../config/db', () => ({ query: jest.fn(), getConnection: jest.fn() }));
jest.mock('../models/pedidoModel', () => ({ create: jest.fn() }));
jest.mock('./turnoService', () => ({ obtenerTurnoActivo: jest.fn() }));
jest.mock('./aperturaMesaService', () => ({ hayDistribucion: jest.fn() }));

const db = require('../config/db');
const PedidoModel = require('../models/pedidoModel');
const TurnoService = require('./turnoService');
const AperturaMesaService = require('./aperturaMesaService');
const ReservaService = require('./reservaService');

const MESA_LIBRE = { id: 5, numero: 'Nro 5', capacidad: 4, estado: 'libre' };
const FUTURO = '2999-01-01T20:00';

function conexionCon(respuestas) {
    return {
        query: jest.fn(async (sql) => {
            const texto = String(sql);
            for (const [clave, valor] of respuestas) {
                if (texto.includes(clave)) return valor;
            }
            return [[], []];
        }),
        beginTransaction: jest.fn(),
        commit: jest.fn(),
        rollback: jest.fn(),
        release: jest.fn()
    };
}

beforeEach(() => jest.clearAllMocks());

describe('reservaService.crear (C2)', () => {
    it('valida mesa, nombre, comensales y fecha antes de tocar la BD', async () => {
        await expect(ReservaService.crear({ mesaId: 0, nombre: 'A', fechaReserva: FUTURO }))
            .rejects.toThrow('Mesa no válida');
        await expect(ReservaService.crear({ mesaId: 5, nombre: '  ', fechaReserva: FUTURO }))
            .rejects.toThrow('nombre del cliente');
        await expect(ReservaService.crear({ mesaId: 5, nombre: 'A', comensales: 0, fechaReserva: FUTURO }))
            .rejects.toThrow('al menos 1');
        await expect(ReservaService.crear({ mesaId: 5, nombre: 'A', fechaReserva: '2000-01-01T20:00' }))
            .rejects.toThrow('ya pasó');
        expect(db.query).not.toHaveBeenCalled();
        expect(db.getConnection).not.toHaveBeenCalled();
    });

    it('rechaza mesas ocupadas, en mantenimiento o desocupándose', async () => {
        for (const estado of ['ocupada', 'mantenimiento', 'desocupandose']) {
            db.query.mockResolvedValueOnce([[{ ...MESA_LIBRE, estado }], []]);
            await expect(ReservaService.crear({ mesaId: 5, nombre: 'Ana', fechaReserva: FUTURO }))
                .rejects.toThrow('Nro 5');
        }
    });

    it('rechaza traslapes de horario en la misma mesa', async () => {
        db.query.mockImplementation(async (sql) => {
            if (String(sql).includes('FROM mesas')) return [[{ ...MESA_LIBRE }], []];
            if (String(sql).includes('FROM reservas')) return [[{ id: 1, cliente_nombre: 'Juan' }], []];
            return [[], []];
        });
        await expect(ReservaService.crear({ mesaId: 5, nombre: 'Ana', fechaReserva: FUTURO }))
            .rejects.toThrow('reserva cercana');
    });

    it('crea la reserva y marca la mesa como reservada', async () => {
        db.query.mockImplementation(async (sql) => {
            if (String(sql).includes('FROM mesas')) return [[{ ...MESA_LIBRE }], []];
            return [[], []];
        });
        const conn = conexionCon([
            ['FROM mesas', [[{ ...MESA_LIBRE }], []]],
            ['INSERT INTO reservas', [{ insertId: 9 }, undefined]],
            ['UPDATE mesas', [{ affectedRows: 1 }, undefined]]
        ]);
        db.getConnection.mockResolvedValue(conn);

        const r = await ReservaService.crear({
            mesaId: 5, nombre: ' Ana ', telefono: '123', comensales: 3,
            fechaReserva: '2999-01-01T20:30', notas: 'terraza', usuarioId: 2
        });

        expect(r).toMatchObject({ id: 9, mesaId: 5, mesaNumero: 'Nro 5', nombre: 'Ana', comensales: 3 });
        const insert = conn.query.mock.calls.find(([sql]) => String(sql).includes('INSERT INTO reservas'));
        expect(insert[1]).toEqual([5, 'Ana', '123', 3, '2999-01-01 20:30:00', 'terraza', 2]);
        const updMesa = conn.query.mock.calls.find(([sql]) =>
            String(sql).includes('UPDATE mesas') && String(sql).includes('estado'));
        expect(updMesa[1]).toEqual(['reservada', 5]);
        expect(conn.commit).toHaveBeenCalled();
    });
});

describe('reservaService.llegada (C2)', () => {
    it('exige distribución del día antes de sentar', async () => {
        TurnoService.obtenerTurnoActivo.mockResolvedValue({ id: 3 });
        AperturaMesaService.hayDistribucion.mockResolvedValue(false);
        const conn = conexionCon([
            ['FROM reservas', [[{ id: 1, id_mesa: 5, estado: 'pendiente', comensales: 2 }], []]]
        ]);
        db.getConnection.mockResolvedValue(conn);
        await expect(ReservaService.llegada(1, 7)).rejects.toThrow('distribución del día');
        expect(conn.rollback).toHaveBeenCalled();
    });

    it('exige turno abierto y mesa disponible', async () => {
        AperturaMesaService.hayDistribucion.mockResolvedValue(true);
        TurnoService.obtenerTurnoActivo.mockResolvedValue(null);
        const conn = conexionCon([
            ['FROM reservas', [[{ id: 1, id_mesa: 5, estado: 'pendiente', comensales: 2 }], []]]
        ]);
        db.getConnection.mockResolvedValue(conn);
        await expect(ReservaService.llegada(1, 7)).rejects.toThrow('turno abierto');
        expect(conn.rollback).toHaveBeenCalled();

        TurnoService.obtenerTurnoActivo.mockResolvedValue({ id: 3 });
        const conn2 = conexionCon([
            ['FROM reservas', [[{ id: 1, id_mesa: 5, estado: 'pendiente', comensales: 2 }], []]],
            ['FROM mesas', [[{ ...MESA_LIBRE, estado: 'ocupada' }], []]]
        ]);
        db.getConnection.mockResolvedValue(conn2);
        await expect(ReservaService.llegada(1, 7)).rejects.toThrow('ocupada por otra cuenta');
    });

    it('abre el pedido, ocupa la mesa y marca sentada', async () => {
        AperturaMesaService.hayDistribucion.mockResolvedValue(true);
        TurnoService.obtenerTurnoActivo.mockResolvedValue({ id: 3 });
        PedidoModel.create.mockResolvedValue(77);
        const conn = conexionCon([
            ['FROM reservas', [[{ id: 1, id_mesa: 5, estado: 'pendiente', comensales: 4 }], []]],
            ['FROM mesas', [[{ ...MESA_LIBRE, estado: 'reservada' }], []]]
        ]);
        db.getConnection.mockResolvedValue(conn);

        const r = await ReservaService.llegada(1, 7);

        expect(r).toMatchObject({ reservaId: 1, pedidoId: 77, mesaNumero: 'Nro 5' });
        expect(PedidoModel.create).toHaveBeenCalledWith(5, 7, 3, conn);
        const updPed = conn.query.mock.calls.find(([sql]) =>
            String(sql).includes('UPDATE pedidos SET comensales'));
        expect(updPed[1]).toEqual([4, 77]);
        expect(conn.commit).toHaveBeenCalled();
    });
});

describe('reservaService.cerrar (C2)', () => {
    it('rechaza estado final inválido y reservas no pendientes', async () => {
        await expect(ReservaService.cerrar(1, 'sentada')).rejects.toThrow('no válido');
        const conn = conexionCon([
            ['FROM reservas', [[{ id: 1, id_mesa: 5, estado: 'sentada' }], []]]
        ]);
        db.getConnection.mockResolvedValue(conn);
        await expect(ReservaService.cerrar(1, 'cancelada')).rejects.toThrow('ya está sentada');
    });

    it('cancela y libera la mesa si quedó sin pendientes ni cuentas', async () => {
        const conn = conexionCon([
            ['FROM reservas WHERE id', [[{ id: 1, id_mesa: 5, estado: 'pendiente' }], []]],
            ['FROM reservas WHERE id_mesa', [[{ n: 0 }], []]],
            ['FROM pedidos', [[{ n: 0 }], []]],
            ['UPDATE mesas', [{ affectedRows: 1 }, undefined]]
        ]);
        // La primera respuesta de reservas es el FOR UPDATE; las siguientes, conteos.
        let llamadasReserva = 0;
        conn.query.mockImplementation(async (sql) => {
            const texto = String(sql);
            if (texto.includes('FROM reservas')) {
                llamadasReserva += 1;
                if (llamadasReserva === 1) return [[{ id: 1, id_mesa: 5, estado: 'pendiente' }], []];
                return [[{ n: 0 }], []];
            }
            if (texto.includes('FROM pedidos')) return [[{ n: 0 }], []];
            if (texto.includes('UPDATE mesas')) return [{ affectedRows: 1 }, undefined];
            return [[], []];
        });
        db.getConnection.mockResolvedValue(conn);

        const r = await ReservaService.cerrar(1, 'no_show');

        expect(r).toEqual({ reservaId: 1, estado: 'no_show', mesaLiberada: true });
        const upd = conn.query.mock.calls.find(([sql]) => String(sql).includes('UPDATE reservas'));
        expect(upd[1]).toEqual(['no_show', 1]);
    });

    it('no libera la mesa si tiene otra reserva pendiente', async () => {
        const conn = conexionCon([]);
        let llamadasReserva = 0;
        conn.query.mockImplementation(async (sql) => {
            const texto = String(sql);
            if (texto.includes('FROM reservas')) {
                llamadasReserva += 1;
                if (llamadasReserva === 1) return [[{ id: 1, id_mesa: 5, estado: 'pendiente' }], []];
                return [[{ n: 1 }], []];
            }
            return [[], []];
        });
        db.getConnection.mockResolvedValue(conn);

        const r = await ReservaService.cerrar(1, 'cancelada');

        expect(r.mesaLiberada).toBe(false);
        expect(conn.query.mock.calls.some(([sql]) => String(sql).includes('UPDATE mesas'))).toBe(false);
    });
});

describe('reservaService.listar (C2)', () => {
    it('mapea filas y marca vencidas las pasadas pendientes', async () => {
        db.query.mockResolvedValue([[
            { id: 1, id_mesa: 5, mesa_numero: 'Nro 5', mesa_capacidad: 4, cliente_nombre: 'A',
              cliente_telefono: null, comensales: 2, fecha_reserva: new Date(Date.now() - 3600000),
              estado: 'pendiente', notas: null, creado_por_nombre: 'Juan P' },
            { id: 2, id_mesa: 6, mesa_numero: 'Nro 6', mesa_capacidad: 2, cliente_nombre: 'B',
              cliente_telefono: '1', comensales: 1, fecha_reserva: new Date(Date.now() + 3600000),
              estado: 'pendiente', notas: null, creado_por_nombre: null }
        ], []]);
        const r = await ReservaService.listar('proximas');
        expect(r[0]).toMatchObject({ mesaNumero: 'Nro 5', vencida: true, creadoPor: 'Juan P' });
        expect(r[1]).toMatchObject({ vencida: false, creadoPor: '—' });
        expect(db.query.mock.calls[0][0]).toContain("estado = 'pendiente'");
    });
});

describe('reservaService.listarRango (calendario)', () => {
    it('valida el rango antes de consultar', async () => {
        await expect(ReservaService.listarRango('no-fecha', '2026-10-01')).rejects.toThrow('Rango de fechas');
        await expect(ReservaService.listarRango('2026-10-05', '2026-10-01')).rejects.toThrow('no puede ser mayor');
        await expect(ReservaService.listarRango('2026-01-01', '2026-12-31')).rejects.toThrow('62 días');
        expect(db.query).not.toHaveBeenCalled();
    });

    it('mapea filas con día y fecha en texto', async () => {
        db.query.mockResolvedValue([[
            { id: 1, id_mesa: 5, mesa_numero: 'Nro 5', cliente_nombre: 'A',
              cliente_telefono: null, comensales: '2', fecha_texto: '2026-09-30 20:00',
              dia: '2026-09-30', estado: 'pendiente', notas: null }
        ], []]);
        const r = await ReservaService.listarRango('2026-09-28', '2026-10-04');
        expect(r).toEqual([{
            id: 1, mesaId: 5, mesaNumero: 'Nro 5', nombre: 'A', telefono: null,
            comensales: 2, fecha: '2026-09-30 20:00', dia: '2026-09-30',
            estado: 'pendiente', notas: null
        }]);
        expect(db.query.mock.calls[0][1]).toEqual(['2026-09-28', '2026-10-04']);
    });
});

describe('reservaService.llegada · titularidad del salón (T8)', () => {
    const MesaAsignacionService = require('./mesaAsignacionService');

    function prepararLlegada() {
        AperturaMesaService.hayDistribucion.mockResolvedValue(true);
        TurnoService.obtenerTurnoActivo.mockResolvedValue({ id: 3 });
        PedidoModel.create.mockResolvedValue(77);
        const conn = conexionCon([
            ['FROM reservas', [[{ id: 1, id_mesa: 5, estado: 'pendiente', comensales: 4 }], []]],
            ['FROM mesas', [[{ ...MESA_LIBRE, estado: 'reservada' }], []]]
        ]);
        db.getConnection.mockResolvedValue(conn);
        return conn;
    }

    it('atribuye el pedido al dependiente asignado aunque siente un admin', async () => {
        const conn = prepararLlegada();
        const original = MesaAsignacionService.resolverMeseroTitular;
        MesaAsignacionService.resolverMeseroTitular = jest.fn()
            .mockResolvedValue({ id: 5, nombre: 'Juan', esAsignado: true });
        try {
            const r = await ReservaService.llegada(1, 7); // 7 = admin que presiona Sentar
            expect(MesaAsignacionService.resolverMeseroTitular).toHaveBeenCalledWith(5, 3, 7);
            expect(PedidoModel.create).toHaveBeenCalledWith(5, 5, 3, conn);
            expect(r).toMatchObject({ pedidoId: 77, titularId: 5, titularEsAsignado: true });
            expect(conn.commit).toHaveBeenCalled();
        } finally {
            MesaAsignacionService.resolverMeseroTitular = original;
        }
    });

    it('sin asignación vigente, el pedido queda a nombre de quien sienta', async () => {
        const conn = prepararLlegada();
        const original = MesaAsignacionService.resolverMeseroTitular;
        MesaAsignacionService.resolverMeseroTitular = jest.fn()
            .mockResolvedValue({ id: 7, nombre: null, esAsignado: false });
        try {
            const r = await ReservaService.llegada(1, 7);
            expect(PedidoModel.create).toHaveBeenCalledWith(5, 7, 3, conn);
            expect(r).toMatchObject({ titularId: 7, titularEsAsignado: false });
        } finally {
            MesaAsignacionService.resolverMeseroTitular = original;
        }
    });
});

describe('reservaService.crear · candado anti-doble-reserva (T9)', () => {
    it('rechaza la mesa con reserva pendiente (pre-chequeo)', async () => {
        db.query.mockImplementation(async (sql) => {
            const texto = String(sql);
            if (texto.includes('FROM mesas')) return [[{ ...MESA_LIBRE }], []];
            if (texto.includes('COUNT(*) AS n')) return [[{ n: 1 }], []];
            return [[], []];
        });
        await expect(ReservaService.crear({ mesaId: 5, nombre: 'Ana', fechaReserva: FUTURO }))
            .rejects.toThrow('ya tiene una reserva pendiente');
        expect(db.getConnection).not.toHaveBeenCalled();
    });

    it('revalida dentro de la transacción (carrera entre recepcionistas)', async () => {
        db.query.mockImplementation(async (sql) => {
            const texto = String(sql);
            if (texto.includes('FROM mesas')) return [[{ ...MESA_LIBRE }], []];
            return [[], []]; // pre-chequeo limpio + sin traslape
        });
        const conn = conexionCon([
            ['FROM mesas', [[{ ...MESA_LIBRE }], []]],
            ['COUNT(*) AS n', [[{ n: 1 }], []]] // otro recepcionista ganó la mesa
        ]);
        db.getConnection.mockResolvedValue(conn);
        await expect(ReservaService.crear({ mesaId: 5, nombre: 'Ana', fechaReserva: FUTURO }))
            .rejects.toThrow('ya tiene una reserva pendiente');
        expect(conn.rollback).toHaveBeenCalled();
        expect(conn.commit).not.toHaveBeenCalled();
    });

    it('permite reservar una mesa marcada reservada sin pendientes (estado viejo)', async () => {
        db.query.mockImplementation(async (sql) => {
            const texto = String(sql);
            if (texto.includes('FROM mesas')) return [[{ ...MESA_LIBRE, estado: 'reservada' }], []];
            return [[], []];
        });
        const conn = conexionCon([
            ['FROM mesas', [[{ ...MESA_LIBRE, estado: 'reservada' }], []]],
            ['INSERT INTO reservas', [{ insertId: 9 }, undefined]]
        ]);
        db.getConnection.mockResolvedValue(conn);
        const r = await ReservaService.crear({ mesaId: 5, nombre: 'Ana', fechaReserva: FUTURO });
        expect(r).toMatchObject({ id: 9, mesaId: 5 });
        expect(conn.commit).toHaveBeenCalled();
    });
});
