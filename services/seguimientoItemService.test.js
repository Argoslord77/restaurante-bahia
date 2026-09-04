// services/seguimientoItemService.test.js
// La traza de tiempos por ítem es un registro secundario: debe escribir las
// marcas correctas según el estado destino, no hacer nada si la base aún no
// tiene las columnas y, sobre todo, nunca romper la operación del POS o del
// monitor cuando falla.
jest.mock('../config/db', () => ({ query: jest.fn() }));
jest.mock('../config/schema', () => ({
    hasColumn: jest.fn(async () => true),
    invalidate: jest.fn()
}));

const db = require('../config/db');
const Schema = require('../config/schema');
const Seguimiento = require('./seguimientoItemService');

describe('seguimientoItemService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        Schema.hasColumn.mockResolvedValue(true);
        db.query.mockResolvedValue([{ affectedRows: 1 }, []]);
    });

    it('anota la hora de envío a producción sin pisar la primera', async () => {
        await Seguimiento.registrarTransicion({ detalleIds: [7], estado: 'en_cocina', usuarioId: 3 });

        const [sql, valores] = db.query.mock.calls[0];
        expect(sql).toContain('enviado_en = COALESCE(enviado_en, NOW())');
        expect(sql).not.toContain('listo_en');
        expect(valores).toEqual([[7]]);
    });

    it('en "listo" guarda la hora de producción y quién la sacó', async () => {
        await Seguimiento.registrarTransicion({ detalleIds: [7, 8], estado: 'listo', usuarioId: 12 });

        const [sql, valores] = db.query.mock.calls[0];
        expect(sql).toContain('listo_en = NOW()');
        expect(sql).toContain('usuario_produccion_id = ?');
        expect(valores).toEqual([12, [7, 8]]);
    });

    it('en "entregado" usa el pedido completo cuando no hay lista de ítems', async () => {
        await Seguimiento.registrarTransicion({
            pedidoId: 31, estado: 'entregado', usuarioId: 5, exclusivo: "entregado_en IS NULL"
        });

        const [sql, valores] = db.query.mock.calls[0];
        expect(sql).toContain('WHERE id_pedido = ?');
        expect(sql).toContain('AND entregado_en IS NULL');
        expect(sql).toContain('entregado_en = NOW()');
        expect(valores).toEqual([31]);
    });

    it('no escribe nada en estados que no generan marca de tiempo', async () => {
        await Seguimiento.registrarTransicion({ detalleIds: [7], estado: 'cancelado' });
        await Seguimiento.registrarTransicion({ detalleIds: [7], estado: 'en_espera' });
        await Seguimiento.registrarTransicion({ detalleIds: [7] });
        await Seguimiento.registrarTransicion({ estado: 'entregado' });

        expect(db.query).not.toHaveBeenCalled();
    });

    it('si la base no tiene las columnas, no intenta escribir', async () => {
        Schema.hasColumn.mockResolvedValue(false);

        const r = await Seguimiento.registrarTransicion({ detalleIds: [7], estado: 'listo' });

        expect(r).toEqual({ ok: false, afectado: 0 });
        expect(db.query).not.toHaveBeenCalled();
    });

    it('un fallo del INSERT no interrumpe el servicio', async () => {
        db.query.mockRejectedValueOnce(new Error('LOCK_WAIT_TIMEOUT'));

        // No lanza: el llamador (POS o monitor) sigue su camino.
        const r = await Seguimiento.registrarTransicion({ detalleIds: [7], estado: 'entregado' });

        expect(r).toEqual({ ok: false, afectado: 0 });
    });

    it('usa la conexión de la transacción cuando se le pasa', async () => {
        const conn = { query: jest.fn().mockResolvedValue([{ affectedRows: 2 }, []]) };

        await Seguimiento.registrarTransicion({ detalleIds: [7, 8], estado: 'entregado', conn });

        expect(conn.query).toHaveBeenCalled();
        expect(db.query).not.toHaveBeenCalled();
    });

    it('registrarEnvio marca solo los ítems que nacieron en producción', async () => {
        await Seguimiento.registrarEnvio({ detalleIds: [1, 2, null] });

        const [sql, valores] = db.query.mock.calls[0];
        expect(sql).toContain("estado_item IN ('en_cocina', 'en_bar', 'en_preparacion')");
        expect(valores).toEqual([[1, 2]]);
    });
});
