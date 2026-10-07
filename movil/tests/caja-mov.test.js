// Pruebas de movimientos de caja (Fase 2).
const CFStorage = require('../www/js/storage');
const CFStore = require('../www/js/store');
const CFUsers = require('../www/js/users');
const CFBackup = require('../www/js/backup');
const CFCaja = require('../www/js/caja');

async function escenario() {
    const store = CFStore.crear(CFStorage.backendLocal());
    await store.init();
    const u = await CFUsers.crear(store, { nombre: 'María', pin: '1234', rol: 'cajero' });
    const turno = await CFCaja.abrir(store, { usuario_id: u.id, fondo: 200 });
    return { store, u, turno };
}

describe('Movimientos de caja', () => {
    it('retiros y entradas ajustan el esperado', async () => {
        const { store, u, turno } = await escenario();
        await CFCaja.registrarMovimiento(store, { turno_id: turno, usuario_id: u.id, tipo: 'entrada', monto: 50, motivo: 'Cambio extra' });
        await CFCaja.registrarMovimiento(store, { turno_id: turno, usuario_id: u.id, tipo: 'retiro', monto: 30, motivo: 'Taxi' });
        const r = await CFCaja.resumen(store, turno);
        expect(r.entradas).toBe(50);
        expect(r.retiros).toBe(30);
        expect(r.esperado_efectivo).toBe(220);
        expect(r.movimientos.length).toBe(2);
        expect(r.movimientos[0]).toMatchObject({ tipo: 'entrada', usuario_nombre: 'María' });
    });

    it('el retiro no supera el efectivo y exige turno abierto', async () => {
        const { store, u, turno } = await escenario();
        await expect(CFCaja.registrarMovimiento(store, { turno_id: turno, usuario_id: u.id, tipo: 'retiro', monto: 500 }))
            .rejects.toThrow('supera');
        await expect(CFCaja.registrarMovimiento(store, { turno_id: turno, tipo: 'entrada', monto: 0 }))
            .rejects.toThrow('mayor a 0');
        await CFCaja.cerrar(store, { turno_id: turno, usuario_id: u.id, conteo_efectivo: 200 });
        await expect(CFCaja.registrarMovimiento(store, { turno_id: turno, tipo: 'entrada', monto: 10 }))
            .rejects.toThrow('cerrado');
    });

    it('el historial resume entradas y retiros', async () => {
        const { store, u, turno } = await escenario();
        await CFCaja.registrarMovimiento(store, { turno_id: turno, usuario_id: u.id, tipo: 'retiro', monto: 20 });
        const h = await CFCaja.historial(store);
        expect(h[0]).toMatchObject({ retiros: 20, entradas: 0 });
    });

    it('los movimientos viajan en el respaldo', async () => {
        const { store, u, turno } = await escenario();
        await CFCaja.registrarMovimiento(store, { turno_id: turno, usuario_id: u.id, tipo: 'retiro', monto: 20, motivo: 'Taxi' });
        expect(CFBackup.COLECCIONES).toContain('caja_movimientos');
        const paquete = JSON.parse(JSON.stringify(await CFBackup.generar(store)));
        const destino = CFStore.crear(CFStorage.backendLocal());
        await destino.init();
        await CFBackup.restaurar(destino, paquete);
        const movs = await CFCaja.movimientos(destino, turno);
        expect(movs).toHaveLength(1);
        expect(movs[0]).toMatchObject({ tipo: 'retiro', monto: 20, motivo: 'Taxi' });
    });
});
