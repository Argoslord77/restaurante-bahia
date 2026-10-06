// Pruebas de respaldo y restauración.
const CFStorage = require('../www/js/storage');
const CFStore = require('../www/js/store');
const CFBackup = require('../www/js/backup');
const CFUsers = require('../www/js/users');

async function nuevoStore(backend) {
    const store = CFStore.crear(backend || CFStorage.backendLocal());
    await store.init();
    return store;
}

describe('Respaldos', () => {
    it('exportar → borrar todo → restaurar recupera los datos', async () => {
        const store = await nuevoStore();
        await CFUsers.crear(store, { nombre: 'María', pin: '1234', rol: 'administrador' });
        await store.insertar('productos', { nombre: 'Tortilla', precio: 2 });
        // El paquete viaja como texto (JSON/WhatsApp/correo)
        const texto = JSON.stringify(await CFBackup.generar(store));
        const paquete = JSON.parse(texto);

        const otroBackend = CFStorage.backendLocal();
        const destino = await nuevoStore(otroBackend);
        await CFBackup.restaurar(destino, paquete);
        expect(destino.instalacion()).toBe(store.instalacion());
        expect((await destino.todos('productos')).length).toBe(1);
        const u = (await destino.todos('usuarios'))[0];
        expect(await CFUsers.verificar(destino, u.id, '1234')).not.toBeNull();
    });

    it('rechaza respaldos alterados o ajenos', async () => {
        const store = await nuevoStore();
        await store.insertar('productos', { nombre: 'A' });
        const paquete = await CFBackup.generar(store);
        paquete.datos.archivos.productos = paquete.datos.archivos.productos.replace('A', 'B');
        await expect(CFBackup.validar(store, paquete)).rejects.toThrow('alterado');
        await expect(CFBackup.validar(store, { app: 'otro' })).rejects.toThrow('CajaFácil');
    });

    it('el nombre de archivo incluye fecha y hora', () => {
        const n = CFBackup.nombreArchivo(new Date(2026, 9, 6, 8, 5));
        expect(n).toBe('cajafacil-respaldo-20261006-0805.json');
    });
});
