// Pruebas del puente JS → plugin nativo CajaFacilPrinter (M1 del dojo)
// y de la selección de vía en impresora.js (nativo primero, viejo por ausencia).
const CFNativo = require('../www/js/printer-nativo');
const CFImpresora = require('../www/js/impresora');

function nativoFalso(llamadas, err) {
    return {
        list: async (t) => {
            llamadas.push(['list', t]);
            if (t.transport === 'bluetooth') return { devices: [{ address: 'AA:BB:CC:DD:EE:FF', name: 'PT-210' }] };
            if (t.transport === 'usb') return { devices: [{ vendorId: 1155, productId: 22304, name: 'POS58' }] };
            return { devices: [] }; // wifi sin descubrimiento en M1
        },
        print: async (t) => {
            llamadas.push(['print', t]);
            if (err) throw new Error(err); // el bridge entrega el código en message
            return { bytes: 128, ms: 120 };
        },
        solicitarPermiso: async (t) => { llamadas.push(['permiso', t]); return { granted: true }; },
        status: async () => ({ bluetooth: true, usbHost: true })
    };
}

function viejoFalso(llamadas) {
    return {
        list: async (t) => { llamadas.push(['viejo-list', t]); return { devices: [] }; },
        requestPermission: async () => ({ granted: true }),
        print: async (t) => { llamadas.push(['viejo-print', t]); return {}; }
    };
}

afterEach(() => {
    CFNativo._limpiarPlugin();
    CFImpresora._limpiarPlugin();
    CFImpresora._limpiarNativo();
    delete globalThis.Capacitor;
});

describe('printer-nativo (puente JS)', () => {
    it('disponible refleja el bridge', () => {
        expect(CFNativo.disponible()).toBe(false);
        globalThis.Capacitor = { Plugins: { CajaFacilPrinter: {} } };
        expect(CFNativo.disponible()).toBe(true);
    });

    it('lista bt/usb como destinos CF y tcp→wifi vacío', async () => {
        CFNativo._usarPlugin(nativoFalso([]));
        expect(await CFNativo.listar('bluetooth')).toEqual([
            { transporte: 'bluetooth', direccion: 'AA:BB:CC:DD:EE:FF', nombre: 'PT-210' }]);
        expect(await CFNativo.listar('usb')).toEqual([
            { transporte: 'usb', direccion: '1155:22304', nombre: 'POS58' }]);
        expect(await CFNativo.listar('tcp')).toEqual([]);
    });

    it('imprime con target + base64 + timeout y retorna métricas', async () => {
        const ll = [];
        CFNativo._usarPlugin(nativoFalso(ll));
        const r = await CFNativo.imprimir(
            { transporte: 'bluetooth', direccion: 'AA:BB:CC:DD:EE:FF' },
            new Uint8Array([0x1B, 0x40]), 5000);
        expect(r).toEqual({ bytes: 128, ms: 120 });
        expect(ll[0][1].transport).toBe('bluetooth');
        expect(ll[0][1].address).toBe('AA:BB:CC:DD:EE:FF');
        expect(ll[0][1].data).toBe('G0A=');
        expect(ll[0][1].timeoutMs).toBe(5000);
    });

    it('traduce tcp→wifi y usb→vid/pid', async () => {
        const ll = [];
        CFNativo._usarPlugin(nativoFalso(ll));
        await CFNativo.imprimir({ transporte: 'tcp', direccion: '192.168.1.50:9100' }, new Uint8Array([1]));
        expect(ll[0][1].transport).toBe('wifi');
        expect(ll[0][1].host).toBe('192.168.1.50');
        expect(ll[0][1].port).toBe(9100);
        await CFNativo.imprimir({ transporte: 'usb', direccion: '1155:22304' }, new Uint8Array([1]));
        expect(ll[1][1].transport).toBe('usb');
        expect(ll[1][1].vendorId).toBe(1155);
        expect(ll[1][1].productId).toBe(22304);
    });

    it('normaliza el código del bridge a Error .code en español', async () => {
        CFNativo._usarPlugin(nativoFalso([], 'connect_failed'));
        const e = await CFNativo.imprimir(
            { transporte: 'bluetooth', direccion: 'AA:BB:CC:DD:EE:FF' }, new Uint8Array([1]))
            .catch(x => x);
        expect(e.code).toBe('connect_failed');
        expect(e.message).toMatch('conectar');
    });

    it('permiso: bluetooth pregunta, usb/wifi pasan', async () => {
        const ll = [];
        CFNativo._usarPlugin(nativoFalso(ll));
        await expect(CFNativo.pedirPermiso({ transporte: 'bluetooth', direccion: 'X' })).resolves.toBe(true);
        expect(ll[0][0]).toBe('permiso');
        await expect(CFNativo.pedirPermiso({ transporte: 'usb', direccion: '1:2' })).resolves.toBe(true);
        expect(ll.length).toBe(1); // usb no llamó al bridge
    });

    it('destino mal formado falla sin tocar el bridge', async () => {
        const ll = [];
        CFNativo._usarPlugin(nativoFalso(ll));
        await expect(CFNativo.imprimir({ transporte: 'usb', direccion: 'x' }, new Uint8Array([1])))
            .rejects.toThrow('USB no válido');
        expect(ll.length).toBe(0);
    });

    it('B.5 #6: trabajo gigante (1 MB) se rechaza client-side sin tocar el bridge', async () => {
        const ll = [];
        CFNativo._usarPlugin(nativoFalso(ll));
        const e = await CFNativo.imprimir(
            { transporte: 'bluetooth', direccion: 'AA:BB:CC:DD:EE:FF' }, new Uint8Array(1024 * 1024))
            .catch(x => x);
        expect(e.code).toBe('invalid_data');
        expect(ll.length).toBe(0);
    });

    it('B.5 #6: trabajo vacío se rechaza igual', async () => {
        const ll = [];
        CFNativo._usarPlugin(nativoFalso(ll));
        const e = await CFNativo.imprimir(
            { transporte: 'bluetooth', direccion: 'AA:BB:CC:DD:EE:FF' }, new Uint8Array(0))
            .catch(x => x);
        expect(e.code).toBe('invalid_data');
        expect(ll.length).toBe(0);
    });

    it('B.5 #3: permiso denegado guía a Ajustes', async () => {
        CFNativo._usarPlugin({ ...nativoFalso([]), solicitarPermiso: async () => ({ granted: false }) });
        const e = await CFNativo.pedirPermiso({ transporte: 'bluetooth', direccion: 'X' }).catch(x => x);
        expect(e.code).toBe('permission_denied');
        expect(e.message).toMatch('Ajustes');
    });
});

describe('impresora: selección de vía', () => {
    it('prefiere nativo cuando existe y no toca el viejo', async () => {
        const ln = [], lv = [];
        globalThis.Capacitor = { Plugins: { CajaFacilPrinter: nativoFalso(ln), ThermalPrinter: viejoFalso(lv) } };
        expect(CFImpresora.disponible()).toBe(true);
        await CFImpresora.listar('bluetooth');
        expect(ln.length).toBe(1);
        expect(lv.length).toBe(0);
        await CFImpresora.imprimir({ transporte: 'bluetooth', direccion: 'AA:BB:CC:DD:EE:FF' }, new Uint8Array([1]));
        expect(ln.length).toBe(2);
        expect(lv.length).toBe(0);
    });

    it('usa el viejo solo por ausencia del nativo', async () => {
        const lv = [];
        globalThis.Capacitor = { Plugins: { ThermalPrinter: viejoFalso(lv) } };
        await CFImpresora.listar('bluetooth');
        expect(lv.length).toBe(1);
        expect(lv[0][0]).toBe('viejo-list');
    });

    it('error del nativo se reporta, NO se reintenta en el viejo (anti doble ticket)', async () => {
        const ln = [], lv = [];
        globalThis.Capacitor = {
            Plugins: { CajaFacilPrinter: nativoFalso(ln, 'connect_failed'), ThermalPrinter: viejoFalso(lv) }
        };
        await expect(CFImpresora.imprimir(
            { transporte: 'bluetooth', direccion: 'AA:BB:CC:DD:EE:FF' }, new Uint8Array([1])))
            .rejects.toThrow('conectar');
        expect(lv.length).toBe(0); // el viejo jamás se tocó
    });

    it('ausencia forzada (null) gana aunque exista nativo', async () => {
        globalThis.Capacitor = { Plugins: { CajaFacilPrinter: nativoFalso([]) } };
        CFImpresora._usarPlugin(null);
        expect(CFImpresora.disponible()).toBe(false);
        await expect(CFImpresora.listar('bluetooth')).rejects.toThrow('no disponible');
    });

    it('B.5 #9: vía nativa expone métricas bytes/ms', async () => {
        globalThis.Capacitor = { Plugins: { CajaFacilPrinter: nativoFalso([]) } };
        const r = await CFImpresora.imprimir(
            { transporte: 'bluetooth', direccion: 'AA:BB:CC:DD:EE:FF' }, new Uint8Array([1]));
        expect(r).toEqual({ bytes: 128, ms: 120 });
    });

    it('B.5 #6 vía impresora: gigante no llega a ningún driver', async () => {
        const ln = [], lv = [];
        globalThis.Capacitor = { Plugins: { CajaFacilPrinter: nativoFalso(ln), ThermalPrinter: viejoFalso(lv) } };
        await expect(CFImpresora.imprimir(
            { transporte: 'bluetooth', direccion: 'AA:BB:CC:DD:EE:FF' }, new Uint8Array(300000)))
            .rejects.toThrow('Datos de impresión no válidos');
        expect(ln.length).toBe(0);
        expect(lv.length).toBe(0);
    });
});
