// centro/tests/api.test.js — Cliente HTTP con fetch simulado.
const CFAPI = require('../www/js/api');

function stubFetch(respuestas) {
    const llamadas = [];
    const fn = async (url, opts) => {
        llamadas.push({ url, opts });
        const r = respuestas.shift() || { estado: 500, cuerpo: null };
        return {
            status: r.estado, ok: r.estado >= 200 && r.estado < 300,
            json: async () => { if (r.cuerpo === null) throw new Error('no-json'); return r.cuerpo; },
        };
    };
    fn.llamadas = llamadas;
    return fn;
}

describe('CFAPI', () => {
    test('buscar arma la URL y devuelve productos', async () => {
        const f = stubFetch([{ estado: 200, cuerpo: { ok: true, total: 1, productos: [{ codigo: 'R1' }] } }]);
        const api = CFAPI.crear({ base: 'http://srv:3101/', fetchImpl: f });
        const j = await api.buscar('refresco', { limite: 10 });
        expect(j.total).toBe(1);
        expect(f.llamadas[0].url).toBe('http://srv:3101/api/v1/productos?q=refresco&limite=10');
    });

    test('publicar manda la key y el catálogo', async () => {
        const f = stubFetch([{ estado: 200, cuerpo: { ok: true, version: 3, guardados: 2 } }]);
        const api = CFAPI.crear({ base: 'http://srv:3101', key: 'K', fetchImpl: f });
        const j = await api.publicar('n1', [{ codigo: 'A', nombre: 'A', precio: 1 }]);
        expect(j.guardados).toBe(2);
        expect(f.llamadas[0].opts.headers['X-API-Key']).toBe('K');
        expect(JSON.parse(f.llamadas[0].opts.body).productos).toHaveLength(1);
    });

    test('sin red → code RED', async () => {
        const api = CFAPI.crear({ base: 'http://srv:3101', fetchImpl: async () => { throw new Error('x'); } });
        const e = await api.salud().catch(x => x);
        expect(e.code).toBe('RED');
    });

    test('403 → NO_AUTORIZADO, 500 → SERVIDOR', async () => {
        const f1 = stubFetch([{ estado: 403, cuerpo: { ok: false, error: 'mala key' } }]);
        const e1 = await CFAPI.crear({ base: 'http://s', fetchImpl: f1 }).salud().catch(x => x);
        expect(e1.code).toBe('NO_AUTORIZADO');
        expect(e1.message).toBe('mala key');
        const f2 = stubFetch([{ estado: 500, cuerpo: null }]);
        const e2 = await CFAPI.crear({ base: 'http://s', fetchImpl: f2 }).salud().catch(x => x);
        expect(e2.code).toBe('SERVIDOR');
    });

    test('sin base no se crea', () => {
        expect(() => CFAPI.crear({})).toThrow('dirección');
    });
});
