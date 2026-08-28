// services/precioService.test.js
// Regla de resolución de precio por carta. El fallo reportado era que, al
// cambiar una mesa a la carta COMISION o ZELLE, los platillos sin precio propio
// en esa carta aparecían en el menú del cliente como si estuvieran agotados.

jest.mock('../config/db', () => ({ query: jest.fn() }));

const PrecioService = require('./precioService');
const { resolverPrecio, seleccionarPrecio, validarPrecioConfigurado, aplicarPrecio } = PrecioService;

// Platillo con las tres cartas configuradas
const COMPLETO = { id: 1, nombre: 'Arroz con camarones', precio: 500, precio_alt: 600, precio_usd: 1.25 };
// Platillo con solo el precio base: el caso que provocaba el fallo
const SOLO_CUP = { id: 2, nombre: 'Ropa vieja', precio: 450, precio_alt: null, precio_usd: null };
// Platillo sin ningún precio
const SIN_PRECIO = { id: 3, nombre: 'Fantasma', precio: null, precio_alt: null, precio_usd: null };

const ctx = (carta, extra = {}) => ({
    carta,
    permitir_precio_derivado: true,
    factor_comision: 1.10,
    tasa_zelle: 400,
    moneda_codigo: carta === 'ZELLE' ? 'ZELLE' : 'CUP',
    simbolo_moneda: '$',
    factor_cambio: carta === 'ZELLE' ? 400 : 1,
    ...extra
});

describe('Precio propio de cada carta', () => {
    it('usa el precio configurado de la carta activa', () => {
        expect(seleccionarPrecio(COMPLETO, ctx('CUP'))).toBe(500);
        expect(seleccionarPrecio(COMPLETO, ctx('COMISION'))).toBe(600);
        expect(seleccionarPrecio(COMPLETO, ctx('ZELLE'))).toBe(1.25);
    });

    it('nunca deriva cuando la carta ya tiene precio propio', () => {
        expect(resolverPrecio(COMPLETO, ctx('COMISION')).derivado).toBe(false);
        expect(resolverPrecio(COMPLETO, ctx('ZELLE')).derivado).toBe(false);
    });
});

describe('Derivación desde el precio base (el fallo reportado)', () => {
    it('COMISION sin precio propio se deriva del CUP por el factor', () => {
        const r = resolverPrecio(SOLO_CUP, ctx('COMISION'));
        expect(r.precio).toBe(495);        // 450 × 1,10
        expect(r.derivado).toBe(true);
        expect(r.base).toMatch(/CUP/);
    });

    it('ZELLE sin precio propio se convierte con la tasa de la moneda', () => {
        const r = resolverPrecio(SOLO_CUP, ctx('ZELLE'));
        expect(r.precio).toBe(1.13);       // 450 ÷ 400, redondeado a 2 decimales
        expect(r.derivado).toBe(true);
    });

    it('CUP nunca se deriva: es la carta base', () => {
        expect(resolverPrecio(SIN_PRECIO, ctx('CUP')).precio).toBeNull();
    });

    it('sin precio base no se inventa nada', () => {
        expect(resolverPrecio(SIN_PRECIO, ctx('COMISION')).precio).toBeNull();
        expect(resolverPrecio(SIN_PRECIO, ctx('ZELLE')).precio).toBeNull();
    });

    it('sin tasa de cambio no se deriva la carta Zelle', () => {
        // Es preferible no ofrecer el platillo a ofrecerlo a un precio inventado
        expect(resolverPrecio(SOLO_CUP, ctx('ZELLE', { tasa_zelle: null })).precio).toBeNull();
    });

    it('respeta el factor de comisión configurado', () => {
        expect(resolverPrecio(SOLO_CUP, ctx('COMISION', { factor_comision: 1.25 })).precio).toBe(562.5);
    });
});

describe('Modo estricto (derivación desactivada)', () => {
    const estricto = c => ctx(c, { permitir_precio_derivado: false });

    it('vuelve el comportamiento anterior: sin precio propio, no hay precio', () => {
        expect(resolverPrecio(SOLO_CUP, estricto('COMISION')).precio).toBeNull();
        expect(resolverPrecio(SOLO_CUP, estricto('ZELLE')).precio).toBeNull();
    });

    it('pasar solo el nombre de la carta no deriva (compatibilidad hacia atrás)', () => {
        expect(seleccionarPrecio(SOLO_CUP, 'COMISION')).toBeNull();
        expect(seleccionarPrecio(COMPLETO, 'COMISION')).toBe(600);
    });
});

describe('Coherencia entre lo que se muestra y lo que se cobra', () => {
    it('el precio validado al cobrar es el mismo que se mostró en el menú', () => {
        for (const carta of ['CUP', 'COMISION', 'ZELLE']) {
            const contexto = ctx(carta);
            const mostrado = aplicarPrecio(SOLO_CUP, contexto).precio;
            const cobrado = validarPrecioConfigurado(SOLO_CUP, contexto);
            expect(cobrado).toBe(mostrado);
        }
    });

    it('marca el platillo como disponible cuando el precio se pudo derivar', () => {
        const p = aplicarPrecio(SOLO_CUP, ctx('ZELLE'));
        expect(p.disponible).toBe(true);
        expect(p.precio_configurado).toBe(true);
        expect(p.precio_derivado).toBe(true);
        expect(p.precio).toBe(1.13);
    });

    it('un platillo sin ningún precio sigue marcándose como no disponible', () => {
        const p = aplicarPrecio(SIN_PRECIO, ctx('ZELLE'));
        expect(p.disponible).toBe(false);
        expect(p.precio_no_configurado).toBe(true);
    });

    it('el cobro falla con un mensaje claro si no hay precio posible', () => {
        expect(() => validarPrecioConfigurado(SIN_PRECIO, ctx('ZELLE')))
            .toThrow(/no tiene configurado un valor válido/);
    });
});
