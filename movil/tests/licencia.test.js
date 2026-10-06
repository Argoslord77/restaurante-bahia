// Pruebas de la licencia móvil, incluida la interoperabilidad con el emisor
// real del proveedor (misma firma Ed25519, mismo formato .lic).
const crypto = require('crypto');
const CFStorage = require('../www/js/storage');
const CFStore = require('../www/js/store');
const CFAjustes = require('../www/js/ajustes');
const CFLicencia = require('../www/js/licencia');
const FirmaProveedor = require('../tools/firma'); // el código real del emisor

const par = FirmaProveedor.generarParDeClaves();

async function nuevoStore() {
    const store = CFStore.crear(CFStorage.backendLocal());
    await store.init();
    await CFAjustes.asegurar(store);
    CFLicencia.invalidarCache();
    return store;
}

// Emite como lo haría el proveedor: firma con su clave privada.
function emitirProveedor(store, extra, huella) {
    const datos = { version: 1, id: 'LIC-M1', cliente: 'Tienda Prueba', plan: 'ESTANDAR',
        emitida_en: new Date().toISOString(), expira_en: null, dias_uso: null,
        instalacion: store.instalacion(), huella: huella === undefined ? null : huella,
        funciones: ['pos'], gracia_dias: 7, notas: null, ...(extra || {}) };
    return JSON.stringify({ datos, firma: FirmaProveedor.firmar(datos, par.privada) });
}

describe('Licencia móvil', () => {
    it('sin clave pública está dormida y no restringe', async () => {
        const store = await nuevoStore();
        const r = await CFLicencia.evaluar(store, { forzar: true });
        expect(r.estado).toBe('NO_CONFIGURADA');
        expect(r.operativa).toBe(true);
    });

    it('instala una licencia del proveedor y queda ACTIVA', async () => {
        const store = await nuevoStore();
        await CFLicencia.guardarPub(store, par.publica);
        const d = await CFLicencia.instalar(store, emitirProveedor(store));
        expect(d.id).toBe('LIC-M1');
        const r = await CFLicencia.evaluar(store, { forzar: true });
        expect(r.estado).toBe('ACTIVA');
        expect(r.problemas).toHaveLength(0);
        expect(r.instalacion.codigo).toMatch(/^[2-9A-HJ-NP-Z]{5}(-[2-9A-HJ-NP-Z]{5}){3}$/);
    });

    it('rechaza licencias alteradas o de otra clave', async () => {
        const store = await nuevoStore();
        await CFLicencia.guardarPub(store, par.publica);
        const lic = JSON.parse(emitirProveedor(store));
        lic.datos.plan = 'ETERNO';
        await expect(CFLicencia.instalar(store, JSON.stringify(lic))).rejects.toThrow('FIRMA_INVALIDA');
        const otroPar = FirmaProveedor.generarParDeClaves();
        const falsa = { datos: { version: 1, id: 'X' },
                        firma: FirmaProveedor.firmar({ version: 1, id: 'X' }, otroPar.privada) };
        await expect(CFLicencia.instalar(store, JSON.stringify(falsa))).rejects.toThrow('FIRMA_INVALIDA');
    });

    it('con clave pero sin licencia entra en gracia (operativa)', async () => {
        const store = await nuevoStore();
        await CFLicencia.guardarPub(store, par.publica);
        const r = await CFLicencia.evaluar(store, { forzar: true });
        expect(r.estado).toBe('GRACIA');
        expect(r.operativa).toBe(true);
        expect(r.problemas[0].codigo).toBe('SIN_ARCHIVO');
    });

    it('caducada sin gracia se BLOQUEA; con gracia sigue operativa', async () => {
        const ayer = new Date(Date.now() - 86400000).toISOString();
        const s1 = await nuevoStore();
        await CFLicencia.guardarPub(s1, par.publica);
        await CFLicencia.instalar(s1, emitirProveedor(s1, { expira_en: ayer, gracia_dias: 0 }));
        expect((await CFLicencia.evaluar(s1, { forzar: true })).estado).toBe('BLOQUEADA');
        const s2 = await nuevoStore();
        await CFLicencia.guardarPub(s2, par.publica);
        await CFLicencia.instalar(s2, emitirProveedor(s2, { expira_en: ayer }));
        const r2 = await CFLicencia.evaluar(s2, { forzar: true });
        expect(r2.estado).toBe('GRACIA');
        expect(r2.gracia.dias_restantes).toBe(7);
    });

    it('detecta reloj atrasado, instalación ajena y días agotados', async () => {
        const store = await nuevoStore();
        await CFLicencia.guardarPub(store, par.publica);
        await CFLicencia.instalar(store, emitirProveedor(store));
        await CFAjustes.set(store, 'lic_trinquete', String(Date.now() + 48 * 3600000));
        CFLicencia.invalidarCache();
        const r = await CFLicencia.evaluar(store, { forzar: true });
        expect(r.problemas.map(p => p.codigo)).toContain('RELOJ_ATRASADO');

        const otra = await nuevoStore();
        await CFLicencia.guardarPub(otra, par.publica);
        // licencia emitida para `store`, instalada en `otra`
        await CFLicencia.instalar(otra, emitirProveedor(store));
        const r2 = await CFLicencia.evaluar(otra, { forzar: true });
        expect(r2.problemas.map(p => p.codigo)).toContain('INSTALACION_DISTINTA');

        await CFAjustes.set(store, 'lic_trinquete', '0');
        await CFAjustes.set(store, 'lic_dias', '400');
        await CFLicencia.instalar(store, emitirProveedor(store, { dias_uso: 365 }));
        CFLicencia.invalidarCache();
        const r3 = await CFLicencia.evaluar(store, { forzar: true });
        expect(r3.problemas.map(p => p.codigo)).toContain('DIAS_AGOTADOS');
    });

    it('huella: mismo equipo pasa, otro equipo no', async () => {
        const store = await nuevoStore();
        const real = await CFLicencia.huellaActual();
        expect(CFLicencia.comparar(real, 70, real).puntuacion).toBe(100);
        const clon = JSON.parse(JSON.stringify(real));
        clon.componentes.dispositivo = 'otro'.padEnd(32, '0');
        const r = CFLicencia.comparar(real, 70, { componentes: { ...real.componentes, ...clon.componentes }, pesos: real.pesos });
        expect(r.coincide).toBe(false); // pierden 40 puntos → 60 < 70
        await CFLicencia.guardarPub(store, par.publica);
        const mala = await CFLicencia.huellaActual();
        mala.componentes.dispositivo = 'x'.padEnd(32, '0');
        mala.componentes.modelo = 'y'.padEnd(32, '0');
        await CFLicencia.instalar(store, emitirProveedor(store, {}, mala));
        const ev = await CFLicencia.evaluar(store, { forzar: true });
        expect(ev.problemas.map(p => p.codigo)).toContain('EQUIPO_DISTINTO');
    });

    it('la solicitud trae app, instalación y huella', async () => {
        const store = await nuevoStore();
        const s = await CFLicencia.solicitud(store, 'Abarrotes Lupita');
        expect(s.app).toBe('cajafacil-movil');
        expect(s.instalacion).toBe(store.instalacion());
        expect(s.huella.umbral).toBe(70);
        expect(Object.keys(s.huella.componentes)).toContain('dispositivo');
    });

    it('los eventos quedan en bitácora', async () => {
        const store = await nuevoStore();
        await CFLicencia.guardarPub(store, par.publica);
        await CFLicencia.evaluar(store, { forzar: true }); // inicia gracia → evento
        const evs = await store.todos('licencia_eventos');
        expect(evs.map(e => e.tipo)).toContain('GRACIA_INICIADA');
    });
});
