// Pruebas de migraciones de esquema.
const CFStorage = require('../www/js/storage');
const CFStore = require('../www/js/store');
const CFAjustes = require('../www/js/ajustes');
const CFProductos = require('../www/js/productos');
const CFMigraciones = require('../www/js/migraciones');

async function nuevoStore() {
    const store = CFStore.crear(CFStorage.backendLocal());
    await store.init();
    await CFAjustes.asegurar(store);
    return store;
}

describe('Migraciones', () => {
    it('migra pza→U en productos, recetas, movimientos y ventas', async () => {
        const store = await nuevoStore();
        const pid = (await store.insertar('productos', {
            nombre: 'X', unidad: 'pza', stock: 5, tipo: 'simple', activo: true, receta: [] })).id;
        const ins = (await store.insertar('productos', {
            nombre: 'I', unidad: 'pza', stock: 10, tipo: 'insumo', activo: true })).id;
        await store.insertar('productos', {
            nombre: 'R', unidad: 'pza', tipo: 'receta', stock: 0, activo: true,
            receta: [{ insumo_id: ins, cantidad: 2, unidad: 'pza' }] });
        await store.insertar('movimientos', {
            producto_id: pid, tipo: 'entrada', cantidad: 5, unidad: 'pza',
            stock_antes: 0, stock_despues: 5 });
        await store.insertar('ventas', {
            detalles: [{ producto_id: pid, nombre: 'X', cantidad: 1, unidad: 'pza' }],
            estado: 'cobrada', dia: '2026-01-01' });
        const r = await CFMigraciones.migrar(store);
        expect(r.aplicadas).toEqual([1]);
        expect((await store.obtener('productos', pid)).unidad).toBe('U');
        const rec = (await store.todos('productos')).find(p => p.nombre === 'R');
        expect(rec.receta[0].unidad).toBe('U');
        expect((await store.todos('movimientos'))[0].unidad).toBe('U');
        expect((await store.todos('ventas'))[0].detalles[0].unidad).toBe('U');
        expect(await CFAjustes.get(store, 'mig_v', '?')).toBe('1');
    });

    it('es idempotente y no toca datos nuevos', async () => {
        const store = await nuevoStore();
        await CFProductos.crear(store, { nombre: 'N', precio_venta: 10, stock_inicial: 3 });
        expect((await CFMigraciones.migrar(store)).aplicadas).toEqual([1]);
        expect((await CFMigraciones.migrar(store)).aplicadas).toEqual([]);
        const p = (await store.todos('productos'))[0];
        expect(p.unidad).toBe('U');
    });

    it('los datos viejos operan aun sin migrar (alias)', async () => {
        const store = await nuevoStore();
        const ins = (await store.insertar('productos', {
            nombre: 'I', unidad: 'pza', stock: 10, tipo: 'insumo', activo: true,
            precio_costo: 2 })).id;
        const rec = await CFProductos.crear(store, {
            nombre: 'R', tipo: 'receta', unidad: 'U', precio_venta: 20,
            receta: [{ insumo_id: ins, cantidad: 2, unidad: 'pza' }]
        });
        expect(await CFProductos.disponibilidad(store, rec)).toBe(5);
    });
});
