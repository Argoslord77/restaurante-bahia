// middlewares/compress.test.js
// D3: gzip sin dependencias — comprime HTML/JSON grandes, respeta
// binarios, cuerpos chicos y clientes sin Accept-Encoding.
const zlib = require('zlib');
const compresionGzip = require('./compress');

function resFalso() {
    const headers = {};
    const res = {
        __enviado: null,
        getHeader: (k) => headers[k],
        setHeader: (k, v) => { headers[k] = v; },
        removeHeader: (k) => { delete headers[k]; },
        send: function (cuerpo) { res.__enviado = cuerpo; return res; }
    };
    return { res, headers };
}

describe('compress · gzip', () => {
    it('sin Accept-Encoding no toca res.send', () => {
        const { res } = resFalso();
        const original = res.send;
        compresionGzip({ headers: {} }, res, jest.fn());
        expect(res.send).toBe(original);
    });

    it('cuerpo chico pasa sin comprimir', () => {
        const { res, headers } = resFalso();
        compresionGzip({ headers: { 'accept-encoding': 'gzip' } }, res, jest.fn());
        res.send('<p>hola</p>');
        expect(res.__enviado).toBe('<p>hola</p>');
        expect(headers['Content-Encoding']).toBeUndefined();
    });

    it('HTML grande se comprime y conserva el tipo', () => {
        const { res, headers } = resFalso();
        compresionGzip({ headers: { 'accept-encoding': 'gzip, deflate' } }, res, jest.fn());
        const html = '<p>' + 'x'.repeat(5000) + '</p>';
        res.send(html);
        expect(headers['Content-Encoding']).toBe('gzip');
        expect(headers['Content-Type']).toContain('text/html');
        expect(zlib.gunzipSync(res.__enviado).toString()).toBe(html);
    });

    it('objeto JSON grande se comprime como json', () => {
        const { res, headers } = resFalso();
        compresionGzip({ headers: { 'accept-encoding': 'gzip' } }, res, jest.fn());
        const obj = { datos: 'y'.repeat(5000) };
        res.send(obj);
        expect(headers['Content-Encoding']).toBe('gzip');
        expect(headers['Content-Type']).toContain('application/json');
        expect(JSON.parse(zlib.gunzipSync(res.__enviado).toString())).toEqual(obj);
    });

    it('binario (imagen) no se comprime', () => {
        const { res, headers } = resFalso();
        res.setHeader('Content-Type', 'image/png');
        compresionGzip({ headers: { 'accept-encoding': 'gzip' } }, res, jest.fn());
        const buf = Buffer.alloc(5000, 7);
        res.send(buf);
        expect(res.__enviado).toBe(buf);
        expect(headers['Content-Encoding']).toBeUndefined();
    });
});
