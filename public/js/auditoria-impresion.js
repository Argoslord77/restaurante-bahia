/**
 * public/js/auditoria-impresion.js
 *
 * Registra la impresión REAL de un documento.
 *
 * El servidor solo puede saber que se abrió la vista del ticket; no sabe si el
 * usuario llegó a imprimir. Este script escucha el evento `beforeprint` del
 * navegador, que se dispara tanto con los botones de la aplicación como con
 * Ctrl+P o el menú del navegador, y envía una baliza al registro de auditoría.
 *
 * Uso: incluir en cualquier vista imprimible indicando qué se imprime.
 *
 *   <script src="/js/auditoria-impresion.js"
 *           data-documento="Pre-cuenta"
 *           data-entidad="Pedido"
 *           data-entidad-id="<%= pedido.id %>"></script>
 */
(function () {
    'use strict';

    var script = document.currentScript;
    if (!script) return;

    var documento = script.getAttribute('data-documento') || 'Documento';
    var entidad = script.getAttribute('data-entidad') || null;
    var entidadId = script.getAttribute('data-entidad-id') || null;
    var destino = script.getAttribute('data-endpoint') || '/admin/api/auditoria/impresion';

    // Evita duplicar el asiento cuando el navegador dispara el evento varias
    // veces por la misma orden de impresión (algunos lo hacen por página).
    var ultimoEnvio = 0;
    var MARGEN_MS = 3000;

    function registrarImpresion(origen) {
        var ahora = Date.now();
        if (ahora - ultimoEnvio < MARGEN_MS) return;
        ultimoEnvio = ahora;

        var carga = JSON.stringify({
            documento: documento,
            entidad: entidad,
            entidad_id: entidadId,
            origen: origen,
            url: window.location.pathname
        });

        // sendBeacon sobrevive al cierre de la ventana tras imprimir; si no
        // está disponible se recurre a fetch con keepalive.
        try {
            if (navigator.sendBeacon) {
                navigator.sendBeacon(destino, new Blob([carga], { type: 'application/json' }));
                return;
            }
        } catch (e) { /* se intenta con fetch */ }

        try {
            fetch(destino, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: carga,
                keepalive: true,
                credentials: 'same-origin'
            }).catch(function () { /* la auditoría no debe molestar al usuario */ });
        } catch (e) { /* silencio */ }
    }

    // Cubre el botón de la aplicación, Ctrl+P y el menú del navegador
    window.addEventListener('beforeprint', function () { registrarImpresion('navegador'); });

    // Safari y navegadores antiguos no emiten beforeprint: se usa matchMedia
    if (window.matchMedia) {
        var consulta = window.matchMedia('print');
        var alCambiar = function (mql) { if (mql.matches) registrarImpresion('media-query'); };
        if (consulta.addEventListener) consulta.addEventListener('change', alCambiar);
        else if (consulta.addListener) consulta.addListener(alCambiar);
    }
})();
