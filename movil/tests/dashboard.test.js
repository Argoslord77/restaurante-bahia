// Pruebas del panel y textos para compartir (Fase 2).
const CFStorage = require('../www/js/storage');
const CFStore = require('../www/js/store');
const CFUsers = require('../www/js/users');
const CFAjustes = require('../www/js/ajustes');
const CFProductos = require('../www/js/productos');
const CFCaja = require('../www/js/caja');
const CFVentas = require('../www/js/ventas');
const CFReportes = require('../www/js/reportes');

async function escenario() {
    const store = CFStore.crear(CFStorage.backendLocal());
    await store.init();
    await CFAjustes.asegurar(store);
    const u = await CFUsers.crear(store, { nombre: 'María', pin: '1234', rol: 'cajero' });
    const a = await CFProductos.crear(store, { nombre: 'Tortilla', precio_costo: 14, precio_venta: 20, stock_inicial: 50 });
    const b = await CFProductos.crear(store, { nombre: 'Refresco', precio_costo: 12, precio_venta: 18, stock_inicial: 50 });
    const turno = await CFCaja.abrir(store, { usuario_id: u.id, fondo: 100 });
    await CFVentas.crear(store, {
        usuario_id: u.id, turno_id: turno,
        items: [{ producto_id: a, cantidad: 2 }],
        pagos: [{ metodo: 'efectivo', monto: 50 }]
    });
    await CFVentas.crear(store, {
        usuario_id: u.id, turno_id: turno,
        items: [{ producto_id: b, cantidad: 1 }],
        pagos: [{ metodo: 'tarjeta', monto: 20.88 }]
    });
    return { store, u, turno };
}

describe('Panel', () => {
    it('histograma por hora y métodos', async () => {
        const { store } = await escenario();
        const h = await CFReportes.ventasPorHora(store, {});
        expect(h.horas.length).toBe(24);
        const ahora = h.horas[new Date().getHours()];
        expect(ahora.n).toBe(2);
        expect(ahora.total).toBe(67.28);
        const m = await CFReportes.porMetodo(store, {});
        expect(m).toMatchObject({ efectivo: 50, tarjeta: 20.88, transferencia: 0 });
    });

    it('resumen con ticket promedio', async () => {
        const { store } = await escenario();
        const r = await CFReportes.resumenPeriodo(store, {});
        expect(r).toMatchObject({ n: 2, total: 67.28, ticket_promedio: 33.64, utilidad: 18 });
    });

    it('texto de cierre con arqueo', async () => {
        const { store, u, turno } = await escenario();
        // fondo 100 + efectivo 50 − cambio 3.60 = 146.40
        let txt = await CFReportes.textoCierre(store, turno);
        expect(txt).toContain('Turno #1');
        expect(txt).toContain('Esperado en caja: $146.40');
        expect(txt).toContain('aún abierto');
        await CFCaja.cerrar(store, { turno_id: turno, usuario_id: u.id, conteo_efectivo: 146.4 });
        txt = await CFReportes.textoCierre(store, turno);
        expect(txt).toContain('Diferencia: $0.00');
    });

    it('texto de ticket y de día', async () => {
        const { store } = await escenario();
        const lista = await CFVentas.listar(store, {});
        const t = await CFReportes.textoTicket(store, lista.filas[0].id);
        expect(t).toContain('TOTAL: $');
        expect(t).toContain('Mi Negocio');
        const d = await CFReportes.textoDia(store, {});
        expect(d).toContain('Ventas: 2');
        expect(d).toContain('Top:');
    });
});
