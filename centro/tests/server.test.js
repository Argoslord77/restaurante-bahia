// centro/tests/server.test.js — Web service: negocios, catálogos, búsqueda, snapshot.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { crearApp } = require('../server');

let srv;
let base;
const ruta = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'centro-')), 'datos.json');

beforeAll(done => {
    const { app } = crearApp({ rutaDatos: ruta });
    srv = app.listen(0, () => {
        base = `http://127.0.0.1:${srv.address().port}`;
        done();
    });
});

afterAll(done => { srv.close(done); });

async function postNegocio(nombre, contacto) {
    const r = await fetch(base + '/api/v1/negocios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, contacto }),
    });
    return { estado: r.status, cuerpo: await r.json() };
}

async function publicar(id, key, productos) {
    const r = await fetch(base + `/api/v1/negocios/${id}/productos`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': key },
        body: JSON.stringify({ productos }),
    });
    return { estado: r.status, cuerpo: await r.json() };
}

describe('Centro WS', () => {
    test('salud responde', async () => {
        const r = await fetch(base + '/salud');
        const j = await r.json();
        expect(j.ok).toBe(true);
        expect(j.app).toBe('centro-productos');
    });

    test('registrar negocio devuelve api_key una sola vez', async () => {
        const { estado, cuerpo } = await postNegocio('Bodega Azul', '555-1234');
        expect(estado).toBe(201);
        expect(cuerpo.negocio.id).toBe('n1');
        expect(cuerpo.negocio.api_key).toMatch(/^[0-9a-f]{48}$/);
        // El directorio público NO expone la key.
        const dir = await (await fetch(base + '/api/v1/negocios')).json();
        expect(dir.negocios[0].api_key).toBeUndefined();
        expect(dir.negocios[0].nombre).toBe('Bodega Azul');
    });

    test('sin nombre no registra', async () => {
        const { estado } = await postNegocio('  ');
        expect(estado).toBe(400);
    });

    test('publicar y buscar en varios negocios', async () => {
        const a = (await postNegocio('Tienda A')).cuerpo.negocio;
        const b = (await postNegocio('Tienda B')).cuerpo.negocio;
        await publicar(a.id, a.api_key, [
            { codigo: 'R1', nombre: 'Refresco', precio: 100 },
            { codigo: 'P2', nombre: 'Pan', precio: 25 },
        ]);
        await publicar(b.id, b.api_key, [{ codigo: 'R1', nombre: 'Refresco', precio: 90 }]);
        const j = await (await fetch(base + '/api/v1/productos?q=refresco')).json();
        expect(j.total).toBe(2);
        expect(j.productos.map(p => p.negocio).sort()).toEqual(['Tienda A', 'Tienda B']);
    });

    test('comparar ordena por precio', async () => {
        const j = await (await fetch(base + '/api/v1/precios/R1')).json();
        expect(j.ofertas.map(o => o.precio)).toEqual([90, 100]);
        expect(j.ofertas[0].negocio).toBe('Tienda B');
    });

    test('con key ajena no se publica', async () => {
        const { estado } = await publicar('n1', 'clave-falsa', [{ codigo: 'X', nombre: 'X', precio: 1 }]);
        expect(estado).toBe(403);
    });

    test('precio negativo se rechaza y no borra el catálogo', async () => {
        const a = (await postNegocio('Tienda C')).cuerpo.negocio;
        await publicar(a.id, a.api_key, [{ codigo: 'L1', nombre: 'Leche', precio: 50 }]);
        const { estado } = await publicar(a.id, a.api_key, [{ codigo: 'L1', nombre: 'Leche', precio: -5 }]);
        expect(estado).toBe(400);
        const j = await (await fetch(base + '/api/v1/productos?q=L1')).json();
        expect(j.productos[0].precio).toBe(50);
    });

    test('snapshot trae todo para el móvil', async () => {
        const j = await (await fetch(base + '/api/v1/snapshot')).json();
        expect(j.version).toBeGreaterThan(0);
        expect(j.negocios.length).toBeGreaterThanOrEqual(3);
        expect(j.productos.length).toBeGreaterThanOrEqual(4);
        expect(j.productos[0].negocio).toBeTruthy();
    });

    test('el JSON persiste en disco', async () => {
        const db = JSON.parse(fs.readFileSync(ruta, 'utf8'));
        expect(db.negocios.length).toBeGreaterThanOrEqual(3);
        expect(db.version).toBeGreaterThan(0);
    });
});
