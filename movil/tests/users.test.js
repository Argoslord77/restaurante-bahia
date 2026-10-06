// Pruebas de usuarios con PIN.
const CFStorage = require('../www/js/storage');
const CFStore = require('../www/js/store');
const CFUsers = require('../www/js/users');

async function nuevoStore() {
    const store = CFStore.crear(CFStorage.backendLocal());
    await store.init();
    return store;
}

describe('Usuarios con PIN', () => {
    it('crea y verifica con el PIN correcto', async () => {
        const store = await nuevoStore();
        const u = await CFUsers.crear(store, { nombre: 'María', pin: '1234', rol: 'cajero' });
        expect(u.rol).toBe('cajero');
        const ok = await CFUsers.verificar(store, u.id, '1234');
        expect(ok).toMatchObject({ nombre: 'María' });
    });

    it('rechaza PIN incorrecto o usuario inexistente', async () => {
        const store = await nuevoStore();
        const u = await CFUsers.crear(store, { nombre: 'Juan', pin: '9999', rol: 'vendedor' });
        expect(await CFUsers.verificar(store, u.id, '0000')).toBeNull();
        expect(await CFUsers.verificar(store, 999, '9999')).toBeNull();
    });

    it('nunca guarda el PIN en claro', async () => {
        const store = await nuevoStore();
        const u = await CFUsers.crear(store, { nombre: 'Ana', pin: '4321', rol: 'administrador' });
        const fila = await store.obtener('usuarios', u.id);
        expect(fila.pin).toBeUndefined();
        expect(fila.pin_hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('valida PIN y rol', async () => {
        const store = await nuevoStore();
        await expect(CFUsers.crear(store, { nombre: 'X', pin: '12', rol: 'cajero' })).rejects.toThrow('PIN');
        await expect(CFUsers.crear(store, { nombre: 'X', pin: 'abcd', rol: 'cajero' })).rejects.toThrow('PIN');
        await expect(CFUsers.crear(store, { nombre: 'X', pin: '1234', rol: 'dueño' })).rejects.toThrow('Rol');
    });

    it('cambia el PIN', async () => {
        const store = await nuevoStore();
        const u = await CFUsers.crear(store, { nombre: 'Luis', pin: '1111', rol: 'vendedor' });
        await CFUsers.cambiarPin(store, u.id, '2222');
        expect(await CFUsers.verificar(store, u.id, '1111')).toBeNull();
        expect(await CFUsers.verificar(store, u.id, '2222')).not.toBeNull();
    });
});
