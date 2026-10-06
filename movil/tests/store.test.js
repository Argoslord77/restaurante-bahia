// Pruebas del almacén JSON: CRUD, contadores, sellos y escritura atómica.
const CFStorage = require('../www/js/storage');
const CFStore = require('../www/js/store');

async function nuevoStore() {
    const store = CFStore.crear(CFStorage.backendLocal());
    await store.init();
    return store;
}

describe('Almacén JSON', () => {
    it('crea la identidad de instalación en el primer arranque', async () => {
        const store = await nuevoStore();
        expect(store.instalacion()).toMatch(/^[0-9a-f-]{36}$/);
        expect(store.meta().v).toBe(1);
    });

    it('CRUD completo con ids consecutivos', async () => {
        const store = await nuevoStore();
        const a = await store.insertar('productos', { nombre: 'Tortilla' });
        const b = await store.insertar('productos', { nombre: 'Queso' });
        expect(a.id).toBe(1);
        expect(b.id).toBe(2);
        expect((await store.todos('productos')).length).toBe(2);
        expect(await store.obtener('productos', 1)).toMatchObject({ nombre: 'Tortilla' });
        await store.actualizar('productos', 1, { nombre: 'Tortilla de maíz' });
        expect((await store.obtener('productos', 1)).nombre).toBe('Tortilla de maíz');
        expect(await store.eliminar('productos', 2)).toBe(true);
        expect(await store.obtener('productos', 2)).toBeNull();
    });

    it('los datos sobreviven a una "reapertura" (nueva instancia, mismo backend)', async () => {
        const backend = CFStorage.backendLocal();
        const s1 = CFStore.crear(backend);
        await s1.init();
        await s1.insertar('productos', { nombre: 'Salsa' });
        const s2 = CFStore.crear(backend);
        await s2.init();
        expect(s2.instalacion()).toBe(s1.instalacion());
        expect((await s2.todos('productos')).length).toBe(1);
    });

    it('detecta archivos editados fuera de la app (sello inválido)', async () => {
        const backend = CFStorage.backendLocal();
        const s1 = CFStore.crear(backend);
        await s1.init();
        await s1.insertar('productos', { nombre: 'Original' });
        // manipulación externa: editar el JSON a mano
        const crudo = JSON.parse(await backend.read('datos/productos.json'));
        crudo.data.filas[0].nombre = 'Alterado';
        await backend.write('datos/productos.json', JSON.stringify(crudo));
        const s2 = CFStore.crear(backend);
        await s2.init();
        await expect(s2.todos('productos')).rejects.toMatchObject({ code: 'SELLO_INVALIDO' });
    });

    it('la escritura atómica no deja temporales regados', async () => {
        const backend = CFStorage.backendLocal();
        const store = CFStore.crear(backend);
        await store.init();
        await store.insertar('productos', { nombre: 'A' });
        await store.insertar('productos', { nombre: 'B' });
        const archivos = await backend.list('');
        expect(archivos.some(a => a.endsWith('.tmp'))).toBe(false);
        expect(archivos).toContain('datos/productos.json');
    });
});
