// Pruebas de inventario Fase 2: decimales, unidades y mermas.
const CFStorage = require('../www/js/storage');
const CFStore = require('../www/js/store');
const CFProductos = require('../www/js/productos');
const CFInventario = require('../www/js/inventario');

async function escenario() {
    const store = CFStore.crear(CFStorage.backendLocal());
    await store.init();
    const queso = await CFProductos.crear(store, {
        nombre: 'Queso', tipo: 'insumo', unidad: 'kg',
        compra_unidad: 'bulto', compra_factor: 20,
        precio_costo: 180, stock_inicial: 5, stock_minimo: 2
    });
    const refresco = await CFProductos.crear(store, {
        nombre: 'Refresco', unidad: 'pza',
        compra_unidad: 'reja', compra_factor: 24,
        precio_costo: 12, precio_venta: 18, stock_inicial: 24
    });
    return { store, queso, refresco };
}

describe('Inventario UoM', () => {
    it('captura entradas en empaques y otras unidades', async () => {
        const { store, queso, refresco } = await escenario();
        await CFInventario.entrada(store, refresco, 2, 'Compra', 1, 'reja');
        expect((await store.obtener('productos', refresco)).stock).toBe(72);
        await CFInventario.entrada(store, queso, 500, 'Compra', 1, 'g');
        expect((await store.obtener('productos', queso)).stock).toBe(5.5);
        const k = await CFInventario.kardex(store, queso);
        expect(k[0]).toMatchObject({ tipo: 'entrada', cantidad: 0.5, cantidad_origen: 500, unidad_origen: 'g' });
    });

    it('la merma descuenta y queda en kardex', async () => {
        const { store, queso } = await escenario();
        await CFInventario.merma(store, queso, 0.25, 'Se echó a perder', 1);
        expect((await store.obtener('productos', queso)).stock).toBe(4.75);
        const k = await CFInventario.kardex(store, queso);
        expect(k[0]).toMatchObject({ tipo: 'merma', cantidad: -0.25 });
    });

    it('rechaza unidades ajenas y sobregiros decimales', async () => {
        const { store, queso } = await escenario();
        await expect(CFInventario.entrada(store, queso, 1, 'X', 1, 'L')).rejects.toThrow('convertir');
        await expect(CFInventario.salida(store, queso, 99, 'X', 1)).rejects.toThrow('Stock insuficiente');
        await expect(CFInventario.salida(store, queso, 0, 'X', 1)).rejects.toThrow('mayor a 0');
    });

    it('stock bajo trae unidad y tipo', async () => {
        const { store, queso } = await escenario();
        await CFInventario.merma(store, queso, 4, 'Merma fuerte', 1);
        const bajo = await CFInventario.stockBajo(store);
        expect(bajo).toHaveLength(1);
        expect(bajo[0]).toMatchObject({ nombre: 'Queso', stock: 1, unidad: 'kg', tipo: 'insumo' });
    });
});
