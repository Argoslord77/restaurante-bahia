// Pruebas de inventario móvil.
const CFStorage = require('../www/js/storage');
const CFStore = require('../www/js/store');
const CFProductos = require('../www/js/productos');
const CFInventario = require('../www/js/inventario');

async function escenario() {
    const store = CFStore.crear(CFStorage.backendLocal());
    await store.init();
    const id = await CFProductos.crear(store, { nombre: 'Tortilla', precio_costo: 14, precio_venta: 20, stock_inicial: 10, stock_minimo: 5 });
    const bajo = await CFProductos.crear(store, { nombre: 'Sal', precio_costo: 8, precio_venta: 12, stock_inicial: 2, stock_minimo: 5 });
    return { store, id, bajo };
}

describe('Inventario', () => {
    it('entradas y salidas mueven el stock con kardex', async () => {
        const { store, id } = await escenario();
        await CFInventario.entrada(store, id, 5, 'Compra', 1);
        expect((await store.obtener('productos', id)).stock).toBe(15);
        await CFInventario.salida(store, id, 3, 'Merma', 1);
        expect((await store.obtener('productos', id)).stock).toBe(12);
        const k = await CFInventario.kardex(store, id);
        expect(k.length).toBe(3); // inicial + entrada + salida
        expect(k[0].tipo).toBe('salida');
        expect(k[0]).toMatchObject({ stock_antes: 15, stock_despues: 12 });
    });

    it('el stock no baja de cero', async () => {
        const { store, id } = await escenario();
        await expect(CFInventario.salida(store, id, 99, 'X', 1)).rejects.toThrow('Stock insuficiente');
    });

    it('stock bajo y valorizado', async () => {
        const { store } = await escenario();
        const bajo = await CFInventario.stockBajo(store);
        expect(bajo.map(p => p.nombre)).toEqual(['Sal']);
        const val = await CFInventario.valorizado(store);
        expect(val.totales.unidades).toBe(12);
        expect(val.totales.costo).toBe(14 * 10 + 8 * 2);
    });
});
