// Pruebas de turnos de caja.
const CFStorage = require('../www/js/storage');
const CFStore = require('../www/js/store');
const CFUsers = require('../www/js/users');
const CFCaja = require('../www/js/caja');

async function nuevoStore() {
    const store = CFStore.crear(CFStorage.backendLocal());
    await store.init();
    return store;
}

describe('Caja', () => {
    it('abre un solo turno y lo cierra con arqueo', async () => {
        const store = await nuevoStore();
        const u = await CFUsers.crear(store, { nombre: 'María', pin: '1234', rol: 'cajero' });
        expect(await CFCaja.abierto(store)).toBeNull();
        const id = await CFCaja.abrir(store, { usuario_id: u.id, fondo: 200 });
        await expect(CFCaja.abrir(store, { usuario_id: u.id })).rejects.toThrow('abierto');
        const t = await CFCaja.abierto(store);
        expect(t.abierto_por_nombre).toBe('María');
        const r = await CFCaja.resumen(store, id);
        expect(r.esperado_efectivo).toBe(200);
        const c = await CFCaja.cerrar(store, { turno_id: id, usuario_id: u.id, conteo_efectivo: 210 });
        expect(c.diferencia).toBe(10);
        expect(await CFCaja.abierto(store)).toBeNull();
        await expect(CFCaja.cerrar(store, { turno_id: id, usuario_id: u.id, conteo_efectivo: 1 }))
            .rejects.toThrow('cerrado');
    });

    it('rechaza conteos inválidos', async () => {
        const store = await nuevoStore();
        const id = await CFCaja.abrir(store, { usuario_id: null, fondo: 0 });
        await expect(CFCaja.cerrar(store, { turno_id: id, conteo_efectivo: -5 })).rejects.toThrow('Conteo');
    });

    it('historial con ventas del turno', async () => {
        const store = await nuevoStore();
        const id = await CFCaja.abrir(store, { usuario_id: null, fondo: 0 });
        await CFCaja.cerrar(store, { turno_id: id, conteo_efectivo: 0 });
        const h = await CFCaja.historial(store);
        expect(h.length).toBe(1);
        expect(h[0].ventas_n).toBe(0);
    });
});
