jest.mock('../config/db', () => ({ query: jest.fn(), getConnection: jest.fn() }));
const db = require('../config/db');
const AjusteService = require('./ajusteService');
beforeEach(() => jest.clearAllMocks());

describe('ajusteService', () => {
    it('get devuelve el valor o el defecto', async () => {
        db.query.mockResolvedValueOnce([[{ valor: 'Mi Tienda' }], []]);
        await expect(AjusteService.get('negocio_nombre', 'X')).resolves.toBe('Mi Tienda');
        db.query.mockResolvedValueOnce([[], []]);
        await expect(AjusteService.get('falta', 'X')).resolves.toBe('X');
    });
    it('ivaPct normaliza a número >= 0', async () => {
        db.query.mockResolvedValueOnce([[{ valor: '16.00' }], []]);
        await expect(AjusteService.ivaPct()).resolves.toBe(16);
        db.query.mockResolvedValueOnce([[{ valor: 'basura' }], []]);
        await expect(AjusteService.ivaPct()).resolves.toBe(0);
    });
    it('todos mapea clave/valor', async () => {
        db.query.mockResolvedValueOnce([[{ clave: 'a', valor: '1' }], []]);
        await expect(AjusteService.todos()).resolves.toEqual({ a: '1' });
    });
});
