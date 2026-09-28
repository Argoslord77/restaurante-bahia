// config/sessionStore.test.js
// A2: store de sesiones en MySQL — persistencia, expiración y
// degradación elegante (un fallo de BD nunca revienta la petición).
jest.mock('./logger', () => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn() }));

const MysqlSessionStore = require('./sessionStore');

function dbFalso() {
    return { query: jest.fn() };
}

function promesaStore(store, metodo, ...args) {
    return new Promise((resolve, reject) => {
        store[metodo](...args, (err, data) => (err ? reject(err) : resolve(data)));
    });
}

describe('sessionStore · persistencia', () => {
    it('get devuelve la sesión parseada si no expiró', async () => {
        const db = dbFalso();
        db.query.mockResolvedValue([[{ sess: JSON.stringify({ user: { id: 1 } }) }], []]);
        const store = new MysqlSessionStore(db);

        const sess = await promesaStore(store, 'get', 'abc');
        expect(sess).toEqual({ user: { id: 1 } });
        expect(db.query.mock.calls[0][0]).toContain('expira_en > NOW()');
    });

    it('get devuelve null si no hay fila o el JSON está corrupto', async () => {
        const db = dbFalso();
        db.query.mockResolvedValueOnce([[], []])
            .mockResolvedValueOnce([[{ sess: 'no-json{{{' }], []]);
        const store = new MysqlSessionStore(db);

        await expect(promesaStore(store, 'get', 'x')).resolves.toBeNull();
        await expect(promesaStore(store, 'get', 'y')).resolves.toBeNull();
    });

    it('set guarda con upsert y expiración futura', async () => {
        const db = dbFalso();
        db.query.mockResolvedValue([[], []]);
        const store = new MysqlSessionStore(db, { ttlMs: 60000 });

        await promesaStore(store, 'set', 'abc', { cookie: { maxAge: 60000 }, user: 1 });
        const [sql, params] = db.query.mock.calls[0];
        expect(sql).toContain('ON DUPLICATE KEY UPDATE');
        expect(params[0]).toBe('abc');
        expect(new Date(params[2]).getTime()).toBeGreaterThan(Date.now());
    });

    it('touch solo actualiza la expiración', async () => {
        const db = dbFalso();
        db.query.mockResolvedValue([[], []]);
        const store = new MysqlSessionStore(db);

        await promesaStore(store, 'touch', 'abc', { cookie: {} });
        expect(db.query.mock.calls[0][0]).toMatch(/UPDATE \S+ SET expira_en/);
    });

    it('limpiarExpiradas borra por fecha y devuelve el conteo', async () => {
        const db = dbFalso();
        db.query.mockResolvedValue([{ affectedRows: 3 }, undefined]);
        const store = new MysqlSessionStore(db);

        await expect(store.limpiarExpiradas()).resolves.toBe(3);
        expect(db.query.mock.calls[0][0]).toContain('expira_en <= NOW()');
    });
});

describe('sessionStore · degradación ante fallo de BD', () => {
    it('get con error devuelve null en vez de reventar', async () => {
        const db = dbFalso();
        db.query.mockRejectedValue(new Error('ECONNREFUSED'));
        const store = new MysqlSessionStore(db);

        await expect(promesaStore(store, 'get', 'abc')).resolves.toBeNull();
    });

    it('set con error registra y resuelve (no propaga)', async () => {
        const db = dbFalso();
        db.query.mockRejectedValue(new Error('ECONNREFUSED'));
        const store = new MysqlSessionStore(db);

        await expect(promesaStore(store, 'set', 'abc', { cookie: {} })).resolves.toBeUndefined();
    });
});
