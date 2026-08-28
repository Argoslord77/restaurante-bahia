/*!
 * Select2 — Búsqueda instantánea al recibir foco (click o Tab)
 * Restaurante Bahía (28-08-2026)
 *
 * Comportamiento por defecto: cuando un campo select2 recibe el foco — ya
 * sea por CLICK o por TAB — el usuario puede comenzar a ESCRIBIR de inmediato
 * (el buscador del dropdown queda enfocado) sin necesidad de clicks extra.
 *
 * Cómo funciona (Select2 4.1.0-rc.0):
 *  - Por CLICK: select2 abre el dropdown por si solo (evento 'toggle' en
 *    mousedown) y su evento 'open' enfoca el buscador. Este script solo
 *    garantiza ese enfocado como refuerzo (por si el navegador no lo hace).
 *  - Por TAB: select2 NO abre el dropdown y el foco queda en la selección,
 *    donde no se puede escribir. Este script abre el dropdown; el evento
 *    'open' de select2 enfoca su buscador automáticamente.
 *
 * Detección click vs teclado: se rastrea la ULTIMA acción de entrada.
 *   - Un click en el select2 produce: mousedown (en ese contenedor) y luego
 *     el foco, sin teclas en medio  => foco por click.
 *   - Un Tab produce: keydown (Tab) y luego el foco => foco por teclado,
 *     aunque el usuario haya hecho click en el mismo campo antes.
 *
 * Uso: incluir este script DESPUÉS de select2.min.js en la vista.
 * No requiere opciones de inicialización: aplica a TODAS las instancias de
 * la página, incluidas las inicializadas dinámicamente en modales (el
 * manejo de eventos es delegado a nivel de documento).
 */
(function ($) {
    'use strict';

    // Última acción de entrada: { tipo: 'mouse', cont: <container|null> }
    // o { tipo: 'key' }.
    var ultimaAccion = null;

    function enfocarBuscador($container) {
        // El buscador vive en el dropdown, que select2 puede re-ubicar a
        // <body> al re-posicionar: se busca primero en el contenedor y luego
        // en el documento.
        var $search = $container.find('.select2-search--dropdown input.select2-search__field');
        if (!$search.length) {
            $search = $('.select2-container--open .select2-search--dropdown input.select2-search__field');
        }
        if ($search.length && document.activeElement !== $search[0]) {
            $search.trigger('focus');
        }
    }

    $(document).on('mousedown.select2instant', function (e) {
        var $cont = $(e.target).closest('.select2-container');
        ultimaAccion = { tipo: 'mouse', cont: $cont.length ? $cont[0] : null };
    });

    $(document).on('keydown.select2instant', function () {
        ultimaAccion = { tipo: 'key' };
    });

    $(document).on('focusin.select2instant', '.select2-container', function () {
        var $container = $(this);

        // Instancias deshabilitadas: sin comportamiento
        if ($container.hasClass('select2-container--disabled')) { return; }

        // Elemento original (<select> o <input>) al que pertenece el contenedor.
        // Select2 inserta el contenedor justo DESPUES del elemento original,
        // marcandolo con la clase 'select2-hidden-accessible'.
        var $orig = $container.prev('select, input');
        if (!$orig.length || !$orig.hasClass('select2-hidden-accessible')) {
            $orig = $container.siblings('select.select2-hidden-accessible, input.select2-hidden-accessible').first();
        }
        if (!$orig.length || !$orig.select2) { return; }

        // --- Foco por CLICK sobre ESTE contenedor ---
        // select2 abre/cierra el dropdown con su propio handler de mousedown
        // ('toggle'). No se debe interferir (un 'open' manual lo cerraria);
        // solo se garantiza, en el siguiente tick, que el buscador quedó
        // enfocado para escribir sin clicks extra.
        if (ultimaAccion && ultimaAccion.tipo === 'mouse' && ultimaAccion.cont === $container[0]) {
            setTimeout(function () {
                if ($container.hasClass('select2-container--open')) {
                    enfocarBuscador($container);
                }
            }, 0);
            return;
        }

        // --- Foco por TECLADO (Tab) u otro origen ---
        // select2 no abre el dropdown con el tab; lo abrimos. El evento
        // 'open' de select2 enfoca su buscador (se refuerza en el siguiente
        // tick por si el foco quedó en la selección).
        if (!$container.hasClass('select2-container--open')) {
            $orig.select2('open');
            setTimeout(function () {
                if ($container.hasClass('select2-container--open')) {
                    enfocarBuscador($container);
                }
            }, 0);
        }
    });
})(jQuery);
