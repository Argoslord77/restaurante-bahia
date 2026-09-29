// services/borradorService.test.js
// T7: borrador del carrito compartido capitán → dependiente.
jest.mock('../config/db', () => ({ query: jest.fn() }));

const db = require('../config/db');
const BorradorService = require('./borradorService');

beforeEach(() => jest.clearAllMocks());

describe('borradorService.guardar (T7)', () => {
    const ITEMS = [
        { id: '1', nombre: 'Mojito', precio: 10, cantidad: 2, notas: 'sin azúcar', es_platillo_dia: false },
        { id: 2, nombre: 'Cerveza', precio: 5, cantidad: 1, notas: '', es_platillo_dia: false }
    ];

    it('valida pedido y mesa antes de tocar la BD', async () => {
        await expect(BorradorService.guardar({ idPedido: 0, idMesa: 3, items: ITEMS }))
            .rejects.toThrow('Pedido no válido');
        await expect(BorradorService.guardar({ idPedido: 50, idMesa: 0, items: ITEMS }))
            .rejects.toThrow('Mesa no válida');
        expect(db.query).not.toHaveBeenCalled();
    });

    it('hace upsert del borrador con los ítems normalizados', async () => {
        db.query.mockResolvedValue([{ affectedRows: 1 }]);
        const r = await BorradorService.guardar({ idPedido: 50, idMesa: 3, items: ITEMS, usuarioId: 9 });

        expect(r).toEqual({ pedidoId: 50, n: 2, vacio: false });
        const [sql, params] = db.query.mock.calls[0];
        expect(String(sql)).toContain('ON DUPLICATE KEY UPDATE');
        expect(params[0]).toBe(50);
        expect(params[1]).toBe(3);
        expect(JSON.parse(params[2])).toEqual([
            { id: 1, nombre: 'Mojito', precio: 10, cantidad: 2, notas: 'sin azúcar', es_platillo_dia: 0 },
            { id: 2, nombre: 'Cerveza', precio: 5, cantidad: 1, notas: '', es_platillo_dia: 0 }
        ]);
        expect(params[3]).toBe(9);
    });

    it('un carrito vacío elimina el borrador en vez de guardar', async () => {
        db.query.mockResolvedValue([{ affectedRows: 1 }]);
        const r = await BorradorService.guardar({ idPedido: 50, idMesa: 3, items: [], usuarioId: 9 });

        expect(r).toEqual({ pedidoId: 50, n: 0, vacio: true });
        const [sql, params] = db.query.mock.calls[0];
        expect(String(sql)).toContain('DELETE FROM borradores_carrito');
        expect(params).toEqual([50]);
    });

    it('descarta ítems inválidos y topa cantidades', async () => {
        db.query.mockResolvedValue([{ affectedRows: 1 }]);
        const r = await BorradorService.guardar({
            idPedido: 50, idMesa: 3, usuarioId: 9,
            items: [
                { id: 'x', nombre: 'Fantasma', precio: 1, cantidad: 1 },
                { id: 7, nombre: 'Ron', precio: 8, cantidad: 500 }
            ]
        });
        expect(r.n).toBe(1);
        const guardados = JSON.parse(db.query.mock.calls[0][1][2]);
        expect(guardados).toEqual([
            { id: 7, nombre: 'Ron', precio: 8, cantidad: 99, notas: '', es_platillo_dia: 0 }
        ]);
    });

    it('sin tabla instalada responde un mensaje claro', async () => {
        const err = new Error("Table 'bahia.borradores_carrito' doesn't exist");
        err.code = 'ER_NO_SUCH_TABLE';
        db.query.mockRejectedValue(err);
        await expect(BorradorService.guardar({ idPedido: 50, idMesa: 3, items: ITEMS }))
            .rejects.toThrow('aún no está instalada');
    });
});

describe('borradorService.obtener (T7)', () => {
    it('devuelve null con pedido inválido o sin borrador', async () => {
        await expect(BorradorService.obtener(0)).resolves.toBeNull();
        db.query.mockResolvedValue([[], []]);
        await expect(BorradorService.obtener(50)).resolves.toBeNull();
    });

    it('parsea los ítems (JSON de MySQL u objeto)', async () => {
        db.query.mockResolvedValue([[{ id_pedido: 50, id_mesa: 3, actualizado_en: '2026-09-28 12:00:00',
            items_json: JSON.stringify([{ id: 1, nombre: 'Mojito', cantidad: 2 }]),
            autor: 'Carlos Ruiz' }], []]);
        const b = await BorradorService.obtener(50);
        expect(b).toMatchObject({ id_pedido: 50, id_mesa: 3, autor: 'Carlos Ruiz' });
        expect(b.items).toEqual([{ id: 1, nombre: 'Mojito', cantidad: 2 }]);
    });

    it('un JSON corrupto o sin tabla devuelve vacío/null sin lanzar', async () => {
        db.query.mockResolvedValue([[{ id_pedido: 50, id_mesa: 3, items_json: '{roto', autor: '' }], []]);
        const b = await BorradorService.obtener(50);
        expect(b.items).toEqual([]);
        expect(b.autor).toBeNull();
        const err = new Error('no such table');
        err.errno = 1146;
        db.query.mockRejectedValue(err);
        await expect(BorradorService.obtener(50)).resolves.toBeNull();
    });
});

describe('borradorService.eliminar y listarParaDependiente (T7)', () => {
    it('eliminar nunca lanza aunque falle la BD', async () => {
        db.query.mockRejectedValue(new Error('caída'));
        await expect(BorradorService.eliminar(50)).resolves.toBeUndefined();
    });

    it('lista los borradores de las mesas asignadas al dependiente', async () => {
        db.query.mockResolvedValue([[
            { id_pedido: 50, id_mesa: 3, mesa_numero: 'Nro 3', actualizado_en: '2026-09-28 12:00:00',
              items_json: JSON.stringify([{ id: 1 }, { id: 2 }]), autor: 'Carlos Ruiz' }
        ], []]);
        const lista = await BorradorService.listarParaDependiente(7, 5);
        expect(lista).toEqual([{
            id_pedido: 50, id_mesa: 3, mesa_numero: 'Nro 3', n_items: 2,
            version: '2026-09-28 12:00:00', autor: 'Carlos Ruiz'
        }]);
        const [sql, params] = db.query.mock.calls[0];
        expect(String(sql)).toContain('FROM borradores_carrito b');
        expect(String(sql)).toContain('dam.dependiente_id = ?');
        expect(params).toEqual([5, 7, 7]);
    });

    it('sin turno/dependiente o con fallo devuelve []', async () => {
        await expect(BorradorService.listarParaDependiente(null, 5)).resolves.toEqual([]);
        await expect(BorradorService.listarParaDependiente(7, null)).resolves.toEqual([]);
        expect(db.query).not.toHaveBeenCalled();
        db.query.mockRejectedValue(new Error('caída'));
        await expect(BorradorService.listarParaDependiente(7, 5)).resolves.toEqual([]);
    });
});
