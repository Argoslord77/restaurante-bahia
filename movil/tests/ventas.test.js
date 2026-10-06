// Pruebas de ventas: totales, stock, pagos y cancelación.
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
    const p1 = await CFProductos.crear(store, { nombre: 'Tortilla', precio_costo: 14, precio_venta: 20, stock_inicial: 50 }, u.id);
    const p2 = await CFProductos.crear(store, { nombre: 'Refresco', precio_costo: 12, precio_venta: 18, stock_inicial: 10 }, u.id);
    const turno = await CFCaja.abrir(store, { usuario_id: u.id, fondo: 100 });
    return { store, u, p1, p2, turno };
}

describe('Ventas', () => {
    it('cobra, descuenta stock y deja movimientos', async () => {
        const { store, u, p1, p2, turno } = await escenario();
        const r = await CFVentas.crear(store, {
            usuario_id: u.id, turno_id: turno,
            items: [{ producto_id: p1, cantidad: 2 }, { producto_id: p2, cantidad: 1 }],
            descuento: 8, pagos: [{ metodo: 'efectivo', monto: 100 }]
        });
        // sub 58, desc 8, base 50, IVA 8, total 58, cambio 42
        expect(r).toMatchObject({ subtotal: 58, descuento: 8, iva_monto: 8, total: 58, cambio: 42 });
        expect((await store.obtener('productos', p1)).stock).toBe(48);
        const movs = (await store.todos('movimientos')).filter(m => m.tipo === 'venta');
        expect(movs.length).toBe(2);
        const det = await CFVentas.obtenerDetalle(store, r.venta_id);
        expect(det.detalles.length).toBe(2);
        expect(det.pagos).toEqual([{ metodo: 'efectivo', monto: 100 }]);
    });

    it('exige turno abierto, stock y pago suficiente', async () => {
        const { store, u, p1, turno } = await escenario();
        await expect(CFVentas.crear(store, {
            usuario_id: u.id, turno_id: 999, items: [{ producto_id: p1, cantidad: 1 }],
            pagos: [{ metodo: 'efectivo', monto: 100 }]
        })).rejects.toThrow('abierto');
        await expect(CFVentas.crear(store, {
            usuario_id: u.id, turno_id: turno, items: [{ producto_id: p1, cantidad: 500 }],
            pagos: [{ metodo: 'efectivo', monto: 99999 }]
        })).rejects.toThrow('Stock insuficiente');
        await expect(CFVentas.crear(store, {
            usuario_id: u.id, turno_id: turno, items: [{ producto_id: p1, cantidad: 1 }],
            pagos: [{ metodo: 'efectivo', monto: 1 }]
        })).rejects.toThrow('no cubre');
        await expect(CFVentas.crear(store, {
            usuario_id: u.id, turno_id: turno, items: [{ producto_id: p1, cantidad: 1 }],
            pagos: [{ metodo: 'vales', monto: 100 }]
        })).rejects.toThrow('Método');
    });

    it('cancela dentro del turno y devuelve stock', async () => {
        const { store, u, p1, turno } = await escenario();
        const r = await CFVentas.crear(store, {
            usuario_id: u.id, turno_id: turno, items: [{ producto_id: p1, cantidad: 5 }],
            pagos: [{ metodo: 'efectivo', monto: 200 }]
        });
        expect((await store.obtener('productos', p1)).stock).toBe(45);
        await CFVentas.cancelar(store, { venta_id: r.venta_id, usuario_id: u.id, motivo: 'Prueba' });
        expect((await store.obtener('productos', p1)).stock).toBe(50);
        const v = await store.obtener('ventas', r.venta_id);
        expect(v.estado).toBe('cancelada');
        await expect(CFVentas.cancelar(store, { venta_id: r.venta_id, usuario_id: u.id }))
            .rejects.toThrow('cobradas');
    });

    it('no cancela de un turno ya cerrado', async () => {
        const { store, u, p1, turno } = await escenario();
        const r = await CFVentas.crear(store, {
            usuario_id: u.id, turno_id: turno, items: [{ producto_id: p1, cantidad: 1 }],
            pagos: [{ metodo: 'efectivo', monto: 100 }]
        });
        await CFCaja.cerrar(store, { turno_id: turno, usuario_id: u.id, conteo_efectivo: 100 });
        await expect(CFVentas.cancelar(store, { venta_id: r.venta_id, usuario_id: u.id }))
            .rejects.toThrow('turno abierto');
    });
});
