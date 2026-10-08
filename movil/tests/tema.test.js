// Pruebas del alternador de tema Ónix/Blanco (sin DOM real: dobles de prueba).
const CFStorage = require('../www/js/storage');
const CFStore = require('../www/js/store');
const CFAjustes = require('../www/js/ajustes');
const CFTema = require('../www/js/tema');

async function nuevoStore() {
    const store = CFStore.crear(CFStorage.backendLocal());
    await store.init();
    await CFAjustes.asegurar(store);
    return store;
}
function docFalso() {
    const links = { 'css-onix': { disabled: false }, 'css-blanco': { disabled: true } };
    const meta = { content: '#0b0f19', setAttribute(k, v) { this[k] = v; } };
    return { links, meta,
        getElementById: id => links[id] || null,
        querySelector: () => meta };
}
function memFalso() {
    const m = {};
    return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = v; } };
}

describe('Tema', () => {
    it('normaliza nombres y cae a onix', () => {
        expect(CFTema.normalizar('onix')).toBe('onix');
        expect(CFTema.normalizar('blanco')).toBe('blanco');
        expect(CFTema.normalizar('rosa')).toBe('onix');
        expect(CFTema.normalizar(undefined)).toBe('onix');
        expect(CFTema.normalizar(null)).toBe('onix');
        expect(CFTema.TEMAS).toEqual(['onix', 'blanco']);
    });

    it('aplicar enciende una hoja y apaga la otra + theme-color', () => {
        const d = docFalso();
        expect(CFTema.aplicar(d, 'blanco')).toBe('blanco');
        expect(d.links['css-blanco'].disabled).toBe(false);
        expect(d.links['css-onix'].disabled).toBe(true);
        expect(d.meta.content).toBe('#f1f4f9');
        CFTema.aplicar(d, 'onix');
        expect(d.links['css-onix'].disabled).toBe(false);
        expect(d.meta.content).toBe('#0b0f19');
    });

    it('aplicar tolera documento incompleto', () => {
        const vacio = { getElementById: () => null, querySelector: () => null };
        expect(() => CFTema.aplicar(vacio, 'blanco')).not.toThrow();
        expect(() => CFTema.aplicar(null, 'blanco')).not.toThrow();
        expect(CFTema.aplicar(vacio, 'typo')).toBe('onix');
    });

    it('leer usa onix por defecto; guardar persiste', async () => {
        const store = await nuevoStore();
        expect(await CFTema.leer(store)).toBe('onix');
        await CFTema.guardar(store, 'blanco');
        expect(await CFTema.leer(store)).toBe('blanco');
    });

    it('alternar voltea, persiste, aplica y espeja', async () => {
        const store = await nuevoStore();
        const d = docFalso();
        const mem = memFalso();
        const tenia = Object.prototype.hasOwnProperty.call(globalThis, 'localStorage');
        const previo = globalThis.localStorage;
        globalThis.localStorage = mem;
        try {
            expect(await CFTema.alternar(store, d)).toBe('blanco');
            expect(d.links['css-blanco'].disabled).toBe(false);
            expect(await CFTema.leer(store)).toBe('blanco');
            expect(mem.getItem('cf-tema')).toBe('blanco');
            expect(await CFTema.alternar(store, d)).toBe('onix');
            expect(await CFTema.leer(store)).toBe('onix');
        } finally {
            if (tenia) globalThis.localStorage = previo; else delete globalThis.localStorage;
        }
    });

    it('alternar acepta nombre explícito', async () => {
        const store = await nuevoStore();
        const d = docFalso();
        expect(await CFTema.alternar(store, d, 'blanco')).toBe('blanco');
        expect(await CFTema.alternar(store, d, 'blanco')).toBe('blanco'); // idempotente
        expect(await CFTema.alternar(store, d, 'typo')).toBe('onix');
    });

    it('sincronizar aplica lo guardado', async () => {
        const store = await nuevoStore();
        await CFTema.guardar(store, 'blanco');
        const d = docFalso();
        expect(await CFTema.sincronizar(store, d)).toBe('blanco');
        expect(d.links['css-blanco'].disabled).toBe(false);
    });

    it('prePintar lee el espejo sin almacén', () => {
        const mem = memFalso();
        mem.setItem('cf-tema', 'blanco');
        const d = docFalso();
        expect(CFTema.prePintar(d, mem)).toBe('blanco');
        expect(d.links['css-blanco'].disabled).toBe(false);
        mem.setItem('cf-tema', 'basura');
        expect(CFTema.prePintar(docFalso(), mem)).toBe('onix');
        expect(CFTema.prePintar(docFalso(), null)).toBe('onix');
    });

    it('espejo tolera memoria rota', () => {
        const rota = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); } };
        expect(() => CFTema.espejar('blanco', rota)).not.toThrow();
        expect(CFTema.espejo(rota)).toBe('onix');
    });
});
