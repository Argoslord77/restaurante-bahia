// Pruebas del catálogo móvil.
const CFStorage = require('../www/js/storage');
const CFStore = require('../www/js/store');
const CFProductos = require('../www/js/productos');

async function nuevoStore() {
    const store = CFStore.crear(CFStorage.backendLocal());
    await store.init();
    return store;
}

describe('Catálogo', () => {
    it('categorías únicas y ordenadas', async () => {
        const store = await nuevoStore();
        await CFProductos.crearCategoria(store, 'Bebidas');
        await CFProductos.crearCategoria(store, 'Abarrotes');
        await expect(CFProductos.crearCategoria(store, 'bebidas')).rejects.toThrow('ya existe');
        const cats = await CFProductos.listarCategorias(store);
        expect(cats.map(c => c.nombre)).toEqual(['Abarrotes', 'Bebidas']);
    });

    it('crea producto con stock inicial y movimiento de entrada', async () => {
        const store = await nuevoStore();
        const cat = await CFProductos.crearCategoria(store, 'Abarrotes');
        const id = await CFProductos.crear(store, {
            sku: 'AB-1', nombre: 'Tortilla', categoria_id: cat,
            precio_costo: 14, precio_venta: 20, stock_inicial: 50, stock_minimo: 10
        }, 1);
        const p = await CFProductos.obtener(store, id);
        expect(p.stock).toBe(50);
        expect(p.categoria_nombre).toBe('Abarrotes');
        const movs = await store.todos('movimientos');
        expect(movs.length).toBe(1);
        expect(movs[0]).toMatchObject({ tipo: 'entrada', cantidad: 50, motivo: 'Stock inicial' });
    });

    it('valida nombre, precios y SKU único', async () => {
        const store = await nuevoStore();
        await expect(CFProductos.crear(store, { nombre: '' })).rejects.toThrow('obligatorio');
        await expect(CFProductos.crear(store, { nombre: 'X', precio_venta: -1 })).rejects.toThrow('negativos');
        await CFProductos.crear(store, { sku: 'DUP', nombre: 'A', precio_venta: 10 });
        await expect(CFProductos.crear(store, { sku: 'DUP', nombre: 'B' })).rejects.toThrow('SKU');
    });

    it('busca para la venta solo vendibles', async () => {
        const store = await nuevoStore();
        await CFProductos.crear(store, { nombre: 'Tortilla', precio_venta: 20, stock_inicial: 5 });
        const sinStock = await CFProductos.crear(store, { nombre: 'Tortilla integral', precio_venta: 22 });
        await CFProductos.cambiarActivo(store, sinStock, false);
        expect(await CFProductos.buscarParaVenta(store, 'tortilla')).toHaveLength(1);
        expect(await CFProductos.buscarParaVenta(store, '')).toHaveLength(0);
    });
});
