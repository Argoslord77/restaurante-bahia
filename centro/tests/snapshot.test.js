// centro/tests/snapshot.test.js — Snapshot local: guardar, buscar, comparar.
const CFStore = require('../www/js/store');
const CFStorage = require('../www/js/storage');
const CFAjustes = require('../www/js/ajustes');
const CFSnapshot = require('../www/js/snapshot');

const SNAP = {
    version: 7,
    exportado_en: '2026-10-08T00:00:00.000Z',
    negocios: [
        { id: 'n1', nombre: 'Tienda A', contacto: null, n_productos: 2, actualizado_en: 'x' },
        { id: 'n2', nombre: 'Tienda B', contacto: null, n_productos: 1, actualizado_en: 'x' },
    ],
    productos: [
        { negocio_id: 'n1', negocio: 'Tienda A', codigo: 'R1', nombre: 'Refresco', precio: 100, moneda: 'CUP' },
        { negocio_id: 'n1', negocio: 'Tienda A', codigo: 'P2', nombre: 'Pan', precio: 25, moneda: 'CUP' },
        { negocio_id: 'n2', negocio: 'Tienda B', codigo: 'R1', nombre: 'Refresco', precio: 90, moneda: 'CUP' },
    ],
};

async function tienda() {
    const store = CFStore.crear(CFStorage.backendLocal());
    await store.init();
    await CFAjustes.asegurar(store);
    return store;
}

describe('CFSnapshot', () => {
    test('guardar y estado', async () => {
        const store = await tienda();
        expect(await CFSnapshot.estado(store)).toBeNull();
        const r = await CFSnapshot.guardar(store, SNAP);
        expect(r).toEqual({ version: 7, negocios: 2, productos: 3 });
        const e = await CFSnapshot.estado(store);
        expect(e.version).toBe(7);
        expect(e.productos).toBe(3);
        // Guardar de nuevo reemplaza (un solo doc).
        await CFSnapshot.guardar(store, { ...SNAP, version: 8 });
        expect((await CFSnapshot.estado(store)).version).toBe(8);
        expect(await store.todos('centro_snapshot')).toHaveLength(1);
    });

    test('buscar local por texto y negocio', async () => {
        const store = await tienda();
        await CFSnapshot.guardar(store, SNAP);
        expect((await CFSnapshot.buscar(store, 'refr')).map(p => p.precio).sort((a, b) => a - b)).toEqual([90, 100]);
        expect(await CFSnapshot.buscar(store, 'R1', { negocio: 'n2' })).toHaveLength(1);
        expect(await CFSnapshot.buscar(store, 'zzz')).toHaveLength(0);
    });

    test('precios ordena ascendente', async () => {
        const store = await tienda();
        await CFSnapshot.guardar(store, SNAP);
        const of = await CFSnapshot.precios(store, 'r1');
        expect(of.map(o => o.negocio)).toEqual(['Tienda B', 'Tienda A']);
    });

    test('snapshot roto se rechaza', async () => {
        const store = await tienda();
        await expect(CFSnapshot.guardar(store, null)).rejects.toThrow('vacío');
        await expect(CFSnapshot.guardar(store, { version: 1 })).rejects.toThrow('incompleto');
        expect(await CFSnapshot.estado(store)).toBeNull();
    });
});
