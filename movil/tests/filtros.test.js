// Regresión: los filtros por fecha deben respetar el rango pedido.
// (La regex de fecha llegó a quedar con doble backslash y todo caía a «hoy».)
const CFStorage = require('../www/js/storage');
const CFStore = require('../www/js/store');
const CFUsers = require('../www/js/users');
const CFAjustes = require('../www/js/ajustes');
const CFProductos = require('../www/js/productos');
const CFCaja = require('../www/js/caja');
const CFVentas = require('../www/js/ventas');
const CFReportes = require('../www/js/reportes');

const diaISO = (base, delta) => {
    const d = new Date(base.getTime() + delta * 864e5);
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

async function escenario() {
    const store = CFStore.crear(CFStorage.backendLocal());
    await store.init();
    await CFAjustes.asegurar(store);
    const u = await CFUsers.crear(store, { nombre: 'María', pin: '1234', rol: 'cajero' });
    const p = await CFProductos.crear(store, { nombre: 'X', precio_venta: 10, stock_inicial: 10 }, u.id);
    const turno = await CFCaja.abrir(store, { usuario_id: u.id, fondo: 0 });
    await CFVentas.crear(store, {
        usuario_id: u.id, turno_id: turno,
        items: [{ producto_id: p, cantidad: 1 }],
        pagos: [{ metodo: 'efectivo', monto: 20 }]
    });
    return { store };
}

describe('Filtros por fecha', () => {
    it('un día sin ventas no muestra registros', async () => {
        const { store } = await escenario();
        const ayer = diaISO(new Date(), -1);
        const r = await CFVentas.listar(store, { desde: ayer, hasta: ayer });
        expect(r.filas).toHaveLength(0);
        expect(r.totales).toMatchObject({ n: 0, total: 0 });
        const rep = await CFReportes.ventasPorDia(store, { desde: ayer, hasta: ayer });
        expect(rep.dias).toHaveLength(0);
        expect(rep.totales.total).toBe(0);
    });

    it('el rango incluye ambos extremos', async () => {
        const { store } = await escenario();
        const hoy = diaISO(new Date(), 0);
        const r = await CFVentas.listar(store, { desde: diaISO(new Date(), -7), hasta: hoy });
        expect(r.filas).toHaveLength(1);
        expect(r.filtros).toMatchObject({ hasta: hoy });
    });

    it('fechas inválidas caen a hoy y el rango invertido no trae nada', async () => {
        const { store } = await escenario();
        const r = await CFVentas.listar(store, { desde: 'no-fecha', hasta: null });
        expect(r.filas).toHaveLength(1); // default: hoy
        const inv = await CFVentas.listar(store, { desde: diaISO(new Date(), 0), hasta: diaISO(new Date(), -5) });
        expect(inv.filas).toHaveLength(0);
    });
});
