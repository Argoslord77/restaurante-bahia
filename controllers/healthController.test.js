// controllers/healthController.test.js
// D2: /salud — 200 con sondas cuando la BD responde, 503 si no.
jest.mock('../config/logger', () => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn() }));
jest.mock('../config/db', () => ({ query: jest.fn() }));

const db = require('../config/db');
const { estadoSalud } = require('./healthController');

function resMock() {
    return { status: jest.fn().mockReturnThis(), json: jest.fn() };
}

describe('healthController.estadoSalud', () => {
    beforeEach(() => jest.clearAllMocks());

    it('200 con db/memoria/disco cuando todo responde', async () => {
        db.query.mockResolvedValue([[{ ok: 1 }], []]);
        const res = resMock();

        await estadoSalud({}, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            ok: true,
            uptime_s: expect.any(Number),
            memoria: expect.objectContaining({ rss_mb: expect.any(Number) })
        }));
        const cuerpo = res.json.mock.calls[0][0];
        expect(cuerpo.db).toMatchObject({ ok: true, ms: expect.any(Number) });
    });

    it('503 con ok:false si la BD no responde (sin lanzar)', async () => {
        db.query.mockRejectedValue(new Error('ECONNREFUSED'));
        const res = resMock();

        await estadoSalud({}, res);

        expect(res.status).toHaveBeenCalledWith(503);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            ok: false,
            db: { ok: false, ms: null }
        }));
    });
});
