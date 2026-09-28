// services/cuentaService.test.js
// V12 (C3): trasladar/unir/dividir — cuentas operables, totales
// recalculados con la fórmula del POS y cierre por fusión en ceros.
jest.mock('../config/db', () => ({ query: jest.fn(), getConnection: jest.fn() }));
jest.mock('../models/pedidoModel', () => ({ create: jest.fn() }));
jest.mock('./auditLogService', () => ({ registrar: jest.fn(async () => 1) }));

const db = require('../config/db');
const PedidoModel = require('../models/pedidoModel');
const AuditLogService = require('./auditLogService');
const CuentaService = require('./cuentaService');

function cuentaAbierta(sobre = {}) {
    return {
        id: 10, id_mesa: 5, mesa_numero: 'Nro 5', id_usuario_mesero: 7,
        turno_servicio_id: 3, estado_pago: 'pendiente', estado_pedido: 'pendiente',
        fecha_cierre: null, subtotal: 100, total: 100, propina: 0, descuento: 0,
        impresiones_precuenta: 0, ...sobre
    };
}

function conexionTx(impl) {
    return {
        query: jest.fn(impl),
        beginTransaction: jest.fn(),
        commit: jest.fn(),
        rollback: jest.fn(),
        release: jest.fn()
    };
}

beforeEach(() => jest.clearAllMocks());

describe('cuentaService.listarAbiertas / detalleCuenta (C3)', () => {
    it('mapea abiertas y marca operables solo las pendientes', async () => {
        db.query.mockResolvedValue([[
            { id: 10, id_mesa: 5, mesa_numero: 'Nro 5', turno_servicio_id: 3, mesero: 'Juan ',
              estado_pago: 'pendiente', subtotal: 100, total: 100, propina: 0,
              comensales: 2, lineas: 3, impresiones_precuenta: 1, creado_en: 'x', fecha_cierre: null },
            { id: 11, id_mesa: 6, mesa_numero: 'Nro 6', turno_servicio_id: 3, mesero: null,
              estado_pago: 'facturado', subtotal: 50, total: 50, propina: 0,
              comensales: 1, lineas: 1, impresiones_precuenta: 0, creado_en: 'x', fecha_cierre: null }
        ], []]);
        const r = await CuentaService.listarAbiertas();
        expect(r[0]).toMatchObject({ turnoId: 3, mesero: 'Juan', operable: true, precuenta: true });
        expect(r[1]).toMatchObject({ mesero: '—', operable: false });
    });

    it('detalleCuenta devuelve null si no existe; mapea líneas', async () => {
        db.query.mockResolvedValueOnce([[], []]);
        await expect(CuentaService.detalleCuenta(99)).resolves.toBeNull();
        db.query
            .mockResolvedValueOnce([[{ id: 10, id_mesa: 5, mesa_numero: 'Nro 5', mesero: 'Juan',
                total: 150, propina: 0, turno_servicio_id: 3, fecha_cierre: null, estado_pago: 'pendiente' }], []])
            .mockResolvedValueOnce([[{ id: 1, cantidad: 2, precio_unitario: 50, estado_item: 'entregado',
                notas_especiales: null, nombre: 'Pollo' }], []]);
        const r = await CuentaService.detalleCuenta(10);
        expect(r.operable).toBe(true);
        expect(r.lineas).toEqual([{ id: 1, nombre: 'Pollo', cantidad: 2, precio: 50,
            importe: 100, estado: 'entregado', notas: null }]);
    });
});

describe('cuentaService.trasladar (C3)', () => {
    it('valida destino y exige mesa libre', async () => {
        await expect(CuentaService.trasladar(10, 0, {})).rejects.toThrow('no válida');
        const conn = conexionTx(async (sql, params) => {
            if (String(sql).includes('FOR UPDATE')) return [[cuentaAbierta()], []];
            if (String(sql).includes('FROM mesas')) return [[{ id: 6, numero: 'Nro 6', estado: 'ocupada' }], []];
            return [[], []];
        });
        db.getConnection.mockResolvedValue(conn);
        await expect(CuentaService.trasladar(10, 6, {})).rejects.toThrow('no está libre');
        expect(conn.rollback).toHaveBeenCalled();
    });

    it('mueve la cuenta, ocupa destino y libera origen vacía', async () => {
        const conn = conexionTx(async (sql, params) => {
            const texto = String(sql);
            if (texto.includes('FOR UPDATE')) return [[cuentaAbierta()], []];
            if (texto.includes('FROM mesas')) return [[{ id: 6, numero: 'Nro 6', estado: 'libre' }], []];
            if (texto.includes('COUNT(*)')) return [[{ n: 0 }], []];
            if (texto.includes('UPDATE mesas')) return [{ affectedRows: 1 }, undefined];
            return [[], []];
        });
        db.getConnection.mockResolvedValue(conn);

        const r = await CuentaService.trasladar(10, 6, { id: 1, nombre: 'A', rol: 'cajero' });

        expect(r).toMatchObject({ pedidoId: 10, mesaOrigen: 'Nro 5', mesaDestino: 'Nro 6', origenLiberada: true });
        const mov = conn.query.mock.calls.find(([sql]) => String(sql).includes('UPDATE pedidos SET id_mesa'));
        expect(mov[1]).toEqual([6, 10]);
        expect(AuditLogService.registrar).toHaveBeenCalledWith(expect.objectContaining({
            accion: 'TRASLADAR_CUENTA', entidad_id: 10
        }));
    });

    it('conserva la mesa origen si le quedan más cuentas', async () => {
        const conn = conexionTx(async (sql) => {
            const texto = String(sql);
            if (texto.includes('FOR UPDATE')) return [[cuentaAbierta()], []];
            if (texto.includes('FROM mesas')) return [[{ id: 6, numero: 'Nro 6', estado: 'libre' }], []];
            if (texto.includes('COUNT(*)')) return [[{ n: 2 }], []];
            return [[], []];
        });
        db.getConnection.mockResolvedValue(conn);
        const r = await CuentaService.trasladar(10, 6, {});
        expect(r.origenLiberada).toBe(false);
    });

    it('rechaza cuentas cerradas o no pendientes', async () => {
        const conn = conexionTx(async () => [[cuentaAbierta({ fecha_cierre: '2026-01-01' })], []]);
        db.getConnection.mockResolvedValue(conn);
        await expect(CuentaService.trasladar(10, 6, {})).rejects.toThrow('ya está cerrada');
    });
});

describe('cuentaService.unir (C3)', () => {
    function connUnir(origen, destino, lineasMovidas = 3, subtotalDestino = 250) {
        return conexionTx(async (sql, params) => {
            const texto = String(sql);
            if (texto.includes('FOR UPDATE')) {
                return [[Number(params[0]) === origen.id ? origen : destino], []];
            }
            if (texto.includes('UPDATE detalles_pedido SET id_pedido')) {
                return [{ affectedRows: lineasMovidas }, undefined];
            }
            if (texto.includes('SUM(cantidad * precio_unitario)')) return [[{ subtotal: subtotalDestino }], []];
            if (texto.includes('COUNT(*)')) return [[{ n: 0 }], []];
            return [{ affectedRows: 1 }, undefined];
        });
    }

    it('exige cuentas distintas del mismo turno y origen sin propina', async () => {
        const conn = connUnir(cuentaAbierta({ id: 10 }), cuentaAbierta({ id: 10 }));
        db.getConnection.mockResolvedValue(conn);
        await expect(CuentaService.unir(10, 10, {})).rejects.toThrow('misma cuenta');

        const conn2 = connUnir(cuentaAbierta({ id: 10, turno_servicio_id: 3 }),
            cuentaAbierta({ id: 11, turno_servicio_id: 4 }));
        db.getConnection.mockResolvedValue(conn2);
        await expect(CuentaService.unir(10, 11, {})).rejects.toThrow('mismo turno');

        const conn3 = connUnir(cuentaAbierta({ id: 10, propina: 5 }), cuentaAbierta({ id: 11 }));
        db.getConnection.mockResolvedValue(conn3);
        await expect(CuentaService.unir(10, 11, {})).rejects.toThrow('propina');
    });

    it('mueve líneas, recalcula destino y fusiona origen en ceros', async () => {
        const conn = connUnir(cuentaAbierta({ id: 10, id_mesa: 5 }), cuentaAbierta({ id: 11, id_mesa: 6 }));
        db.getConnection.mockResolvedValue(conn);

        const r = await CuentaService.unir(10, 11, { id: 1 });

        expect(r).toMatchObject({ origenId: 10, destinoId: 11, lineasMovidas: 3, totalDestino: 250 });
        const mov = conn.query.mock.calls.find(([sql]) =>
            String(sql).includes('UPDATE detalles_pedido SET id_pedido'));
        expect(mov[0]).toContain("estado_item != ?");
        expect(mov[1]).toEqual([11, 10, 'cancelado']);
        const fusion = conn.query.mock.calls.find(([sql]) =>
            String(sql).includes('fecha_cierre = NOW()') && String(sql).includes('→ #'));
        expect(fusion[1]).toEqual(['cancelado', 'fusionada', 11, 10]);
        expect(AuditLogService.registrar).toHaveBeenCalledWith(expect.objectContaining({
            accion: 'UNIR_CUENTAS'
        }));
    });
});

describe('cuentaService.dividir (C3)', () => {
    function connDividir(origen, subtotales, lineasRestantes, destino = null) {
        return conexionTx(async (sql, params) => {
            const texto = String(sql);
            if (texto.includes('FOR UPDATE')) {
                if (destino && Number(params[0]) === destino.id) return [[destino], []];
                return [[origen], []];
            }
            if (texto.includes('FROM detalles_pedido') && texto.includes('IN (?)')) {
                return [[{ id: 1 }, { id: 2 }], []];
            }
            if (texto.includes('SUM(cantidad * precio_unitario)')) {
                return [[{ subtotal: subtotales.shift() }], []];
            }
            if (texto.includes('COUNT(*)')) return [[{ n: lineasRestantes }], []];
            return [{ affectedRows: 1 }, undefined];
        });
    }

    it('exige selección y líneas vigentes de la origen', async () => {
        await expect(CuentaService.dividir(10, [], null, {})).rejects.toThrow('al menos un ítem');
        const conn = conexionTx(async (sql) => {
            if (String(sql).includes('FOR UPDATE')) return [[cuentaAbierta()], []];
            if (String(sql).includes('FROM detalles_pedido')) return [[{ id: 1 }], []];
            return [[], []];
        });
        db.getConnection.mockResolvedValue(conn);
        await expect(CuentaService.dividir(10, [1, 999], null, {})).rejects.toThrow('ya no están disponibles');
    });

    it('crea cuenta nueva en la mesa y reparte totales', async () => {
        PedidoModel.create.mockResolvedValue(20);
        const conn = connDividir(cuentaAbierta({ id: 10, id_mesa: 5, id_usuario_mesero: 7 }), [60, 40], 1);
        db.getConnection.mockResolvedValue(conn);

        const r = await CuentaService.dividir(10, [1, 2], null, { id: 1 });

        expect(r).toMatchObject({ origenId: 10, destinoId: 20, pedidoNuevo: true,
            lineasMovidas: 2, totalDestino: 60, totalOrigen: 40, origenCerrado: false });
        expect(PedidoModel.create).toHaveBeenCalledWith(5, 7, 3, conn);
        const recalc = conn.query.mock.calls.filter(([sql]) =>
            String(sql).includes('UPDATE pedidos SET subtotal'));
        expect(recalc).toHaveLength(2); // destino y origen
        expect(AuditLogService.registrar).toHaveBeenCalledWith(expect.objectContaining({
            accion: 'DIVIDIR_CUENTA'
        }));
    });

    it('cierra la origen en ceros si se lleva todos los ítems', async () => {
        PedidoModel.create.mockResolvedValue(20);
        const conn = connDividir(cuentaAbierta({ id: 10 }), [100, 0], 0);
        db.getConnection.mockResolvedValue(conn);

        const r = await CuentaService.dividir(10, [1, 2], null, {});

        expect(r.origenCerrado).toBe(true);
        const fusion = conn.query.mock.calls.find(([sql]) =>
            String(sql).includes('fecha_cierre = NOW()') && String(sql).includes('→ #'));
        expect(fusion).toBeTruthy();
    });
});
