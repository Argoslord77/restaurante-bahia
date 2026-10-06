jest.mock('../config/db', () => ({ query: jest.fn(), getConnection: jest.fn() }));
const db = require('../config/db');
const CajaService = require('./cajaService');
beforeEach(() => jest.clearAllMocks());

describe('cajaService', () => {
    it('abrir falla si ya hay turno abierto', async () => {
        db.query.mockResolvedValueOnce([[{ id: 3 }], []]);
        await expect(CajaService.abrir({ usuario_id: 1, fondo: 500 })).rejects.toThrow('abierto');
    });
    it('abrir crea el turno con fondo', async () => {
        db.query.mockResolvedValueOnce([[], []]).mockResolvedValueOnce([{ insertId: 4 }]);
        const id = await CajaService.abrir({ usuario_id: 1, fondo: 500 });
        expect(id).toBe(4);
        expect(db.query.mock.calls[1][1]).toEqual([1, 500]);
    });
    it('resumen calcula esperado = fondo + efectivo - cambio', async () => {
        db.query
            .mockResolvedValueOnce([[{ id: 3, fondo_inicial: 500 }], []])
            .mockResolvedValueOnce([[{ n: 2, total: 300, cambio: 20 }], []])
            .mockResolvedValueOnce([[{ metodo: 'efectivo', monto: 220 }, { metodo: 'tarjeta', monto: 100 }], []]);
        const r = await CajaService.resumenTurno(3);
        expect(r.ventas_n).toBe(2);
        expect(r.porMetodo).toMatchObject({ efectivo: 220, tarjeta: 100, transferencia: 0 });
        expect(r.esperado_efectivo).toBe(700); // 500 + 220 - 20
    });
    it('cerrar guarda conteo y diferencia', async () => {
        const conn = {
            query: jest.fn(async (sql) => {
                if (String(sql).includes('FOR UPDATE')) return [[{ id: 3, estado: 'abierto' }], []];
                return [[], []];
            }),
            beginTransaction: jest.fn(), commit: jest.fn(), rollback: jest.fn(), release: jest.fn()
        };
        db.getConnection.mockResolvedValue(conn);
        db.query
            .mockResolvedValueOnce([[{ id: 3, fondo_inicial: 500 }], []])
            .mockResolvedValueOnce([[{ n: 1, total: 100, cambio: 0 }], []])
            .mockResolvedValueOnce([[{ metodo: 'efectivo', monto: 100 }], []]);
        const r = await CajaService.cerrar({ turno_id: 3, usuario_id: 1, conteo_efectivo: 610 });
        expect(r.diferencia).toBe(10); // 610 - 600
        expect(conn.commit).toHaveBeenCalled();
    });
});
