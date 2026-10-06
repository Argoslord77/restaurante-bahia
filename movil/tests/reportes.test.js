// Pruebas de reportes móviles.
const CFStorage = require('../www/js/storage');
const CFStore = require('../www/js/store');
const CFUsers = require('../www/js/users');
const CFAjustes = require('../www/js/ajustes');
const CFProductos = require('../www/js/productos');
const CFCaja = require('../www/js/caja');
const CFVentas = require('../www/js/ventas');
const CFReportes = require('../www/js/reportes');
const CFDatos = require('../www/js/datos');

async function escenario() {
    const store = CFStore.crear(CFStorage.backendLocal());
    await store.init();
    const u = await CFUsers.crear(store, { nombre: 'María', pin: '1234', rol: 'cajero' });
    await CFDatos.sembrar(store, u.id);
    const turno = await CFCaja.abrir(store, { usuario_id: u.id, fondo: 0 });
    const prods = await CFProductos.listar(store, {});
    const tortilla = prods.find(p => p.sku === 'AB-001');
    const refresco = prods.find(p => p.sku === 'BE-001');
    await CFVentas.crear(store, {
        usuario_id: u.id, turno_id: turno,
        items: [{ producto_id: tortilla.id, cantidad: 2 }, { producto_id: refresco.id, cantidad: 1 }],
        pagos: [{ metodo: 'efectivo', monto: 100 }]
    });
    return { store, u };
}

describe('Reportes', () => {
    it('ventas por día con utilidad', async () => {
        const { store } = await escenario();
        const r = await CFReportes.ventasPorDia(store, {});
        expect(r.dias.length).toBe(1);
        // tortilla 20x2 + refresco 18 = 58; IVA 9.28; total 67.28
        expect(r.dias[0]).toMatchObject({ n: 1, subtotal: 58, total: 67.28 });
        // utilidad: (20-14)*2 + (18-12)*1 = 18
        expect(r.dias[0].utilidad).toBe(18);
        expect(r.totales.total).toBe(67.28);
    });

    it('más vendidos ordena por cantidad', async () => {
        const { store } = await escenario();
        const r = await CFReportes.masVendidos(store, {});
        expect(r.filas[0]).toMatchObject({ nombre: 'Tortillas de maíz (kg)', cantidad: 2 });
    });

    it('ticket trae negocio y pie', async () => {
        const { store } = await escenario();
        const lista = await CFVentas.listar(store, {});
        const t = await CFReportes.ticket(store, lista.filas[0].id);
        expect(t.negocio).toBe('Mi Negocio');
        expect(t.detalles.length).toBe(2);
    });

    it('la semilla crea 8 productos y no se repite', async () => {
        const { store, u } = await escenario();
        expect((await store.todos('productos')).length).toBe(8);
        await expect(CFDatos.sembrar(store, u.id)).rejects.toThrow('Ya hay productos');
    });
});
