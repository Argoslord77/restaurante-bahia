// Pruebas de editar/eliminar usuarios (solo administradores en la UI;
// aquí se verifican las reglas del dominio).
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
    const admin = await CFUsers.crear(store, { nombre: 'Admin', pin: '1234', rol: 'administrador' });
    const cajero = await CFUsers.crear(store, { nombre: 'Cajero', pin: '2222', rol: 'cajero' });
    return { store, admin, cajero };
}

describe('Administrar usuarios', () => {
    it('edita nombre y rol', async () => {
        const { store, admin, cajero } = await escenario();
        await CFUsers.actualizar(store, cajero.id, { nombre: 'Cajero 2', rol: 'vendedor' }, { actorId: admin.id });
        const u = await store.obtener('usuarios', cajero.id);
        expect(u).toMatchObject({ nombre: 'Cajero 2', rol: 'vendedor' });
    });

    it('valida nombre, rol y existencia', async () => {
        const { store, admin, cajero } = await escenario();
        await expect(CFUsers.actualizar(store, cajero.id, { nombre: '' }, { actorId: admin.id }))
            .rejects.toThrow('obligatorio');
        await expect(CFUsers.actualizar(store, cajero.id, { rol: 'dueño' }, { actorId: admin.id }))
            .rejects.toThrow('Rol');
        await expect(CFUsers.actualizar(store, 999, { nombre: 'X' }, { actorId: admin.id }))
            .rejects.toThrow('no existe');
    });

    it('nadie cambia su propio rol, pero sí su nombre', async () => {
        const { store, admin } = await escenario();
        await expect(CFUsers.actualizar(store, admin.id, { rol: 'cajero' }, { actorId: admin.id }))
            .rejects.toThrow('propio rol');
        await CFUsers.actualizar(store, admin.id, { nombre: 'Admin 2' }, { actorId: admin.id });
        expect((await store.obtener('usuarios', admin.id)).nombre).toBe('Admin 2');
    });

    it('siempre queda un administrador activo', async () => {
        const { store, admin, cajero } = await escenario();
        await expect(CFUsers.actualizar(store, admin.id, { rol: 'cajero' }, { actorId: cajero.id }))
            .rejects.toThrow('administrador activo');
        await expect(CFUsers.eliminar(store, admin.id, { actorId: cajero.id }))
            .rejects.toThrow('administrador activo');
        await expect(CFUsers.cambiarActivo(store, admin.id, false, { actorId: cajero.id }))
            .rejects.toThrow('administrador activo');
        const admin2 = await CFUsers.crear(store, { nombre: 'Admin 2', pin: '3333', rol: 'administrador' });
        await CFUsers.eliminar(store, admin.id, { actorId: admin2.id });
        expect(await store.obtener('usuarios', admin.id)).toBeNull();
    });

    it('no se elimina ni desactiva a sí mismo', async () => {
        const { store, admin } = await escenario();
        await expect(CFUsers.eliminar(store, admin.id, { actorId: admin.id }))
            .rejects.toThrow('propio usuario');
        await expect(CFUsers.cambiarActivo(store, admin.id, false, { actorId: admin.id }))
            .rejects.toThrow('sí mismo');
    });

    it('al eliminar se conservan ventas y turnos', async () => {
        const { store, admin, cajero } = await escenario();
        await CFAjustes.asegurar(store);
        const p = await CFProductos.crear(store, { nombre: 'X', precio_venta: 10, stock_inicial: 5 }, admin.id);
        const turno = await CFCaja.abrir(store, { usuario_id: cajero.id, fondo: 0 });
        await CFVentas.crear(store, {
            usuario_id: cajero.id, turno_id: turno,
            items: [{ producto_id: p, cantidad: 1 }],
            pagos: [{ metodo: 'efectivo', monto: 20 }]
        });
        await CFUsers.eliminar(store, cajero.id, { actorId: admin.id });
        const lista = await CFVentas.listar(store, {});
        expect(lista.filas).toHaveLength(1);
        expect(lista.filas[0].usuario_nombre).toBe('Cajero');
        const t = await CFCaja.abierto(store);
        expect(t.abierto_por_nombre).toBeNull(); // sin romperse
    });
});
