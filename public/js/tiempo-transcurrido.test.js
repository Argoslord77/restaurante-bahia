// public/js/tiempo-transcurrido.test.js
// Ticker informativo de tiempos en elaboración (cada 10 s).
const TiempoTranscurrido = require('./tiempo-transcurrido');

describe('tiempo-transcurrido', () => {
    describe('formatearTiempoTranscurrido', () => {
        const f = TiempoTranscurrido.formatearTiempoTranscurrido;
        it('segundos bajo el minuto', () => {
            expect(f(1000, 1000)).toBe('0 s');
            expect(f(1000, 46000)).toBe('45 s');
        });
        it('minutos y segundos bajo la hora', () => {
            expect(f(0, 60000)).toBe('1:00');
            expect(f(0, 754000)).toBe('12:34');
        });
        it('horas, minutos y segundos', () => {
            expect(f(0, 3600000)).toBe('1:00:00');
            expect(f(0, 3912000)).toBe('1:05:12');
        });
        it('el futuro no muestra negativos', () => {
            expect(f(60000, 1000)).toBe('0 s');
        });
        it('valores inválidos devuelven elipsis', () => {
            expect(f(NaN, 1000)).toBe('…');
            expect(f(1000, NaN)).toBe('…');
        });
    });

    describe('_leerT0', () => {
        const leer = TiempoTranscurrido._leerT0;
        const stub = (attrs) => ({ getAttribute: (k) => (k in attrs ? attrs[k] : null) });
        it('prefiere data-t0-ms numérico', () => {
            expect(leer(stub({ 'data-t0-ms': '1700000000000', 'data-t0': '2020-01-01' }))).toBe(1700000000000);
        });
        it('acepta data-t0 como fecha ISO', () => {
            expect(leer(stub({ 'data-t0': '2026-09-10T14:32:00.000Z' }))).toBe(Date.parse('2026-09-10T14:32:00.000Z'));
        });
        it('devuelve NaN sin atributos o inválidos', () => {
            expect(leer(stub({}))).toBeNaN();
            expect(leer(stub({ 'data-t0-ms': 'no-numero' }))).toBeNaN();
            expect(leer(null)).toBeNaN();
        });
    });

    describe('actualizarTiempos', () => {
        it('actualiza los elementos con t0 válido', () => {
            const els = [
                { getAttribute: (k) => (k === 'data-t0-ms' ? String(Date.now() - 65000) : null), textContent: '…' },
                { getAttribute: () => null, textContent: '…' }
            ];
            global.document = { querySelectorAll: () => els };
            try {
                expect(TiempoTranscurrido.actualizarTiempos()).toBe(1);
                expect(els[0].textContent).toBe('1:05');
                expect(els[1].textContent).toBe('…');
            } finally {
                delete global.document;
            }
        });
    });
});
