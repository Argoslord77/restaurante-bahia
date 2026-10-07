// Pruebas del driver de impresión (con plugin simulado).
const CFStorage = require('../www/js/storage');
const CFStore = require('../www/js/store');
const CFUsers = require('../www/js/users');
const CFAjustes = require('../www/js/ajustes');
const CFProductos = require('../www/js/productos');
const CFCaja = require('../www/js/caja');
const CFVentas = require('../www/js/ventas');
const CFImpresora = require('../www/js/impresora');

async function nuevoStore() {
    const store = CFStore.crear(CFStorage.backendLocal());
    await store.init();
    await CFAjustes.asegurar(store);
    return store;
}

function pluginFalso(llamadas, errorPrint) {
    return {
        list: async ({ transport }) => ({
            devices: transport === 'bluetooth'
                ? [{ transport, address: 'AA:BB:CC:DD:EE:FF', name: 'PT-210' }]
                : [{ transport, vendorId: 1155, productId: 22304, name: 'POS58' }]
        }),
        requestPermission: async (t) => { llamadas.push(['permiso', t]); return { granted: true }; },
        print: async (t) => {
            llamadas.push(['print', t]);
            if (errorPrint) { const e = new Error('x'); e.code = errorPrint; throw e; }
            return {};
        }
    };
}

afterEach(() => { CFImpresora._limpiarPlugin(); CFImpresora._limpiarNativo(); });

describe('Impresora', () => {
    it('base64 exacto de bytes', () => {
        expect(CFImpresora.bytesABase64(new Uint8Array([0x1B, 0x40]))).toBe('G0A=');
    });

    it('lista bluetooth y usb como destinos', async () => {
        CFImpresora._usarPlugin(pluginFalso([]));
        expect(await CFImpresora.listar('bluetooth')).toEqual([
            { transporte: 'bluetooth', direccion: 'AA:BB:CC:DD:EE:FF', nombre: 'PT-210' }]);
        expect(await CFImpresora.listar('usb')).toEqual([
            { transporte: 'usb', direccion: '1155:22304', nombre: 'POS58' }]);
    });

    it('imprime el ticket a la impresora por defecto', async () => {
        const llamadas = [];
        CFImpresora._usarPlugin(pluginFalso(llamadas));
        const store = await nuevoStore();
        const u = await CFUsers.crear(store, { nombre: 'M', pin: '1234', rol: 'cajero' });
        const p = await CFProductos.crear(store, { nombre: 'T', precio_venta: 20, stock_inicial: 5 }, u.id);
        const turno = await CFCaja.abrir(store, { usuario_id: u.id, fondo: 0 });
        const v = await CFVentas.crear(store, {
            usuario_id: u.id, turno_id: turno, items: [{ producto_id: p, cantidad: 1 }],
            pagos: [{ metodo: 'efectivo', monto: 100 }] });
        await CFImpresora.guardarDefecto(store,
            { transporte: 'bluetooth', direccion: 'AA:BB:CC:DD:EE:FF', nombre: 'PT-210' });
        await CFImpresora.imprimirTicket(store, v.venta_id);
        expect(llamadas.length).toBe(1);
        expect(llamadas[0][0]).toBe('print');
        expect(llamadas[0][1].transport).toBe('bluetooth');
        expect(llamadas[0][1].address).toBe('AA:BB:CC:DD:EE:FF');
        // los bytes viajan en base64 y empiezan con INIT (1B 40 → 'G0A')
        expect(llamadas[0][1].data.startsWith('G0A')).toBe(true);
    });

    it('traduce errores del plugin a español', async () => {
        CFImpresora._usarPlugin(pluginFalso([], 'not_found'));
        const store = await nuevoStore();
        await CFImpresora.guardarDefecto(store,
            { transporte: 'bluetooth', direccion: 'AA:BB:CC:DD:EE:FF', nombre: 'X' });
        await expect(CFImpresora.prueba(store)).rejects.toThrow('no encontrada');
    });

    it('prueba expone métricas de la vía nativa (B.5 #9)', async () => {
        CFImpresora._usarNativo({ disponible: () => true,
            imprimir: async () => ({ bytes: 200, ms: 33 }) });
        const store = await nuevoStore();
        await CFImpresora.guardarDefecto(store,
            { transporte: 'tcp', direccion: '10.0.0.9:9100', nombre: 'W' });
        await expect(CFImpresora.prueba(store)).resolves.toEqual({ bytes: 200, ms: 33 });
    });

    it('sin plugin ni impresora avisa con claridad', async () => {
        CFImpresora._usarPlugin(null);
        expect(CFImpresora.disponible()).toBe(false);
        await expect(CFImpresora.listar('bluetooth')).rejects.toThrow('no disponible');
        const store = await nuevoStore();
        await expect(CFImpresora.imprimirTicket(store, 1)).rejects.toThrow('Sin impresora');
    });
});
