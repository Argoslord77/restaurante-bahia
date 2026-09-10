// public/js/tiempo-transcurrido.js
//
// Detalle informacional: tiempos "en elaboración" / "abierta hace" que se
// refrescan en vivo cada 10 segundos en las pantallas de pedidos no cerrados
// (monitores de cocina/bar, salón del dependiente/capitán y listado de
// pedidos en consumo).
//
// Uso: marcar el elemento con data-t0-ms="<epoch en ms>" (preferido) o
// data-t0="<fecha parseable por Date>" e iniciar el ticker una sola vez:
//     TiempoTranscurrido.iniciarTickerTiempos();
//
// UMD: en el navegador expone window.TiempoTranscurrido; en Node (pruebas)
// se puede requerir con require().
(function (root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    } else {
        root.TiempoTranscurrido = api;
    }
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    function dosDigitos(n) {
        return String(n).padStart(2, '0');
    }

    function numeroValido(v) {
        if (v === null || v === undefined || v === '') return NaN;
        const n = +v;
        return isFinite(n) ? n : NaN;
    }

    // "45 s" | "12:05" | "1:05:12". Nunca lanza.
    function formatearTiempoTranscurrido(desdeMs, ahoraMs) {
        const desde = numeroValido(desdeMs);
        const ahora = numeroValido(ahoraMs);
        if (!isFinite(desde) || !isFinite(ahora)) return '…';
        const seg = Math.max(0, Math.floor((ahora - desde) / 1000));
        if (seg < 60) return seg + ' s';
        const min = Math.floor(seg / 60);
        if (min < 60) return min + ':' + dosDigitos(seg % 60);
        return Math.floor(min / 60) + ':' + dosDigitos(min % 60) + ':' + dosDigitos(seg % 60);
    }

    function leerT0(el) {
        if (!el || typeof el.getAttribute !== 'function') return NaN;
        const ms = el.getAttribute('data-t0-ms');
        if (ms !== null && ms !== '' && ms !== undefined) {
            const v = Number(ms);
            return isFinite(v) ? v : NaN;
        }
        const t0 = el.getAttribute('data-t0');
        if (!t0) return NaN;
        const v = new Date(t0).getTime();
        return isFinite(v) ? v : NaN;
    }

    // Refresca todos los elementos del selector. Devuelve cuántos actualizó.
    function actualizarTiempos(selector) {
        if (typeof document === 'undefined' || !document.querySelectorAll) return 0;
        const ahora = Date.now();
        let n = 0;
        document.querySelectorAll(selector || '[data-t0-ms],[data-t0]').forEach((el) => {
            const t0 = leerT0(el);
            if (isFinite(t0)) {
                el.textContent = formatearTiempoTranscurrido(t0, ahora);
                n += 1;
            }
        });
        return n;
    }

    // Refresco inmediato + intervalo (10 s por defecto). Devuelve el timer.
    function iniciarTickerTiempos(selector, intervaloMs) {
        actualizarTiempos(selector);
        return setInterval(() => actualizarTiempos(selector), intervaloMs || 10000);
    }

    return {
        formatearTiempoTranscurrido,
        actualizarTiempos,
        iniciarTickerTiempos,
        _leerT0: leerT0
    };
});
