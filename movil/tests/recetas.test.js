// Pruebas de tipos restaurante: insumos, recetas, disponibilidad y escandallo.
const CFStorage = require('../www/js/storage');
const CFStore = require('../www/js/store');
const CFProductos = require('../www/js/productos');

async function escenario() {
    const store = CFStore.crear(CFStorage.backendLocal());
    await store.init();
    const queso = await CFProductos.crear(store, {
        nombre: 'Queso Oaxaca', tipo: 'insumo', unidad: 'kg',
        compra_unidad: 'bulto', compra_factor: 20,
        precio_costo: 180, stock_inicial: 5, stock_minimo: 1
    });
    const tortilla = await CFProductos.crear(store, {
        nombre: 'Tortilla', tipo: 'insumo', unidad: 'pza',
        precio_costo: 1.2, stock_inicial: 100, stock_minimo: 20
    });
    const taco = await CFProductos.crear(store, {
        nombre: 'Taco al pastor', tipo: 'receta', unidad: 'pza', precio_venta: 25,
        receta: [
            { insumo_id: tortilla, cantidad: 2, unidad: 'pza' },
            { insumo_id: queso, cantidad: 80, unidad: 'g' }
        ]
    });
    return { store, queso, tortilla, taco };
}

describe('Recetas', () => {
    it('calcula disponibilidad por el ingrediente límite', async () => {
        const { store, taco } = await escenario();
        // queso: 5kg/0.08 = 62 · tortilla: 100/2 = 50 → 50
        expect(await CFProductos.disponibilidad(store, taco)).toBe(50);
    });

    it('calcula el costo teórico (escandallo)', async () => {
        const { store, taco } = await escenario();
        // 0.08*180 + 2*1.2 = 16.8
        expect(await CFProductos.costoUnitario(store, taco)).toBe(16.8);
    });

    it('la venta solo ofrece simples y recetas con existencia', async () => {
        const { store } = await escenario();
        const res = await CFProductos.buscarParaVenta(store, 'taco');
        expect(res.length).toBe(1);
        expect(res[0]).toMatchObject({ tipo: 'receta', stock: 50, unidad: 'pza' });
        expect(await CFProductos.buscarParaVenta(store, 'queso')).toHaveLength(0);
        expect(await CFProductos.buscarParaVenta(store, 'tortilla')).toHaveLength(0);
    });

    it('valida recetas y empaques', async () => {
        const { store, taco, queso } = await escenario();
        await expect(CFProductos.crear(store, { nombre: 'X', tipo: 'receta' }))
            .rejects.toThrow('ingrediente');
        await expect(CFProductos.crear(store, {
            nombre: 'Y', tipo: 'receta',
            receta: [{ insumo_id: taco, cantidad: 1, unidad: 'pza' }]
        })).rejects.toThrow('otra receta');
        await expect(CFProductos.crear(store, {
            nombre: 'Z', tipo: 'receta',
            receta: [{ insumo_id: queso, cantidad: 1, unidad: 'L' }]
        })).rejects.toThrow('no válida');
        await expect(CFProductos.crear(store, { nombre: 'W', compra_unidad: 'reja' }))
            .rejects.toThrow('factor');
        await expect(CFProductos.crear(store, { nombre: 'V', unidad: 'tonelada' }))
            .rejects.toThrow('Unidad no válida');
        await expect(CFProductos.crear(store, { nombre: 'U', tipo: 'combo' }))
            .rejects.toThrow('Tipo');
    });

    it('las recetas nacen sin stock propio', async () => {
        const { store, taco } = await escenario();
        expect((await CFProductos.obtener(store, taco)).stock).toBe(0);
    });
});
