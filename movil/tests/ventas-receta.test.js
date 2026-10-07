// Pruebas de ventas Fase 2: recetas y decimales.
const CFStorage = require('../www/js/storage');
const CFStore = require('../www/js/store');
const CFUsers = require('../www/js/users');
const CFAjustes = require('../www/js/ajustes');
const CFProductos = require('../www/js/productos');
const CFCaja = require('../www/js/caja');
const CFVentas = require('../www/js/ventas');

async function escenario() {
    const store = CFStore.crear(CFStorage.backendLocal());
    await store.init();
    await CFAjustes.asegurar(store);
    const u = await CFUsers.crear(store, { nombre: 'María', pin: '1234', rol: 'cajero' });
    const queso = await CFProductos.crear(store, {
        nombre: 'Queso', tipo: 'insumo', unidad: 'kg',
        precio_costo: 180, stock_inicial: 5
    });
    const tortilla = await CFProductos.crear(store, {
        nombre: 'Tortilla', tipo: 'insumo', unidad: 'pza',
        precio_costo: 1.2, stock_inicial: 100
    });
    const taco = await CFProductos.crear(store, {
        nombre: 'Taco', tipo: 'receta', unidad: 'pza', precio_venta: 25,
        receta: [
            { insumo_id: tortilla, cantidad: 2, unidad: 'pza' },
            { insumo_id: queso, cantidad: 80, unidad: 'g' }
        ]
    });
    const granel = await CFProductos.crear(store, {
        nombre: 'Queso a granel', unidad: 'kg', precio_costo: 180,
        precio_venta: 220, stock_inicial: 5
    });
    const turno = await CFCaja.abrir(store, { usuario_id: u.id, fondo: 100 });
    return { store, u, queso, tortilla, taco, granel, turno };
}

describe('Ventas receta', () => {
    it('vende recetas y descuenta insumos con costo real', async () => {
        const { store, u, taco, queso, tortilla, turno } = await escenario();
        const r = await CFVentas.crear(store, {
            usuario_id: u.id, turno_id: turno,
            items: [{ producto_id: taco, cantidad: 10 }],
            pagos: [{ metodo: 'efectivo', monto: 300 }]
        });
        // sub 250, IVA 40, total 290, cambio 10
        expect(r).toMatchObject({ subtotal: 250, iva_monto: 40, total: 290, cambio: 10 });
        expect((await store.obtener('productos', queso)).stock).toBe(4.2);
        expect((await store.obtener('productos', tortilla)).stock).toBe(80);
        const det = await CFVentas.obtenerDetalle(store, r.venta_id);
        expect(det.detalles[0].costo_unitario).toBe(16.8);
        expect(det.detalles[0].consumo.length).toBe(2);
        const movs = (await store.todos('movimientos')).filter(m => m.tipo === 'venta');
        expect(movs.length).toBe(2);
    });

    it('vende decimales de productos a granel', async () => {
        const { store, u, granel, turno } = await escenario();
        const r = await CFVentas.crear(store, {
            usuario_id: u.id, turno_id: turno,
            items: [{ producto_id: granel, cantidad: 0.5 }],
            pagos: [{ metodo: 'efectivo', monto: 200 }]
        });
        expect(r).toMatchObject({ subtotal: 110, total: 127.6 });
        expect((await store.obtener('productos', granel)).stock).toBe(4.5);
    });

    it('rechaza insumos directos y faltantes de receta', async () => {
        const { store, u, queso, taco, turno } = await escenario();
        await expect(CFVentas.crear(store, {
            usuario_id: u.id, turno_id: turno,
            items: [{ producto_id: queso, cantidad: 1 }],
            pagos: [{ metodo: 'efectivo', monto: 500 }]
        })).rejects.toThrow('no se vende directo');
        await expect(CFVentas.crear(store, {
            usuario_id: u.id, turno_id: turno,
            items: [{ producto_id: taco, cantidad: 51 }],
            pagos: [{ metodo: 'efectivo', monto: 99999 }]
        })).rejects.toThrow('Stock insuficiente');
    });

    it('cancelar una receta devuelve los insumos', async () => {
        const { store, u, taco, queso, tortilla, turno } = await escenario();
        const r = await CFVentas.crear(store, {
            usuario_id: u.id, turno_id: turno,
            items: [{ producto_id: taco, cantidad: 5 }],
            pagos: [{ metodo: 'efectivo', monto: 200 }]
        });
        await CFVentas.cancelar(store, { venta_id: r.venta_id, usuario_id: u.id, motivo: 'Prueba' });
        expect((await store.obtener('productos', queso)).stock).toBe(5);
        expect((await store.obtener('productos', tortilla)).stock).toBe(100);
        expect((await store.obtener('ventas', r.venta_id)).estado).toBe('cancelada');
    });
});
