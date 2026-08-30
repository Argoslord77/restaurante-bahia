/**
 * public/js/limpiar-busqueda.js
 *
 * Icono de vaciado (×) automático para las cajas de búsqueda.
 *
 * - Detecta las cajas por id / name / placeholder (que contengan "busc",
 *   "search" o "filtro") o por el atributo data-limpiar.
 * - Inserta un botón "fa-circle-xmark" sobre el borde derecho que vacía la
 *   caja con un clic y dispara los eventos 'input' y 'keyup' para que el
 *   filtro de cada vista se actualice solo (todos escuchan 'input').
 * - data-limpiar="no"          → la caja se ignora (p.ej. el POS, que trae
 *                                su propio botón de limpiar).
 * - data-limpiar               → fuerza la instalación aunque el id/name no
 *                                parezca de búsqueda.
 * - data-limpiar-enviar="si"   → tras vaciar, envía el formulario GET
 *                                (filtros de servidor: kardex, fichas de
 *                                costo, auditoría).
 * - Sin manejadores inline: compatible con la política de seguridad (CSP).
 * - Las cajas que aparezcan después (modales, contenido dinámico) se
 *   atienden solas gracias a un MutationObserver.
 */
(function () {
    'use strict';

    var PATRON = /(busc|search|filtro|filtrar)/i;
    var SELECTOR = 'input[type="text"], input[type="search"], input:not([type])';

    var ESTILO = [
        '.limpiar-busqueda-btn{position:absolute;right:8px;top:50%;transform:translateY(-50%);',
        'border:0;background:transparent;padding:2px 4px;line-height:1;color:#6c757d;',
        'cursor:pointer;font-size:15px;z-index:5;display:flex;align-items:center;}',
        '.limpiar-busqueda-btn:hover{color:#dc3545;}',
        '.limpiar-busqueda-btn:focus-visible{outline:2px solid #0d6efd;border-radius:4px;}'
    ].join('');

    function califica(input) {
        var tipo = (input.getAttribute('type') || 'text').toLowerCase();
        if (tipo !== 'text' && tipo !== 'search') return false;
        if (input.disabled || input.readOnly) return false;
        var marca = input.getAttribute('data-limpiar');
        if (marca === 'no') return false;
        if (marca !== null) return true; // data-limpiar presente (a secas o con valor)
        if (tipo === 'search') return true;
        return PATRON.test(input.id || '') ||
            PATRON.test(input.getAttribute('name') || '') ||
            PATRON.test(input.getAttribute('placeholder') || '');
    }

    function instalar(input) {
        if (input.getAttribute('data-limpiar-instalado')) return;
        input.setAttribute('data-limpiar-instalado', '1');

        var contenedor = input.parentElement;
        if (!contenedor) return;

        // El contenedor es el contexto de posicionamiento del botón.
        if (window.getComputedStyle(contenedor).position === 'static') {
            contenedor.style.position = 'relative';
        }

        // Que el texto nunca quede debajo del icono.
        var padDerecho = parseFloat(window.getComputedStyle(input).paddingRight) || 0;
        if (padDerecho < 30) input.style.paddingRight = '30px';

        var boton = document.createElement('button');
        boton.type = 'button';
        boton.className = 'limpiar-busqueda-btn';
        boton.setAttribute('aria-label', 'Vaciar búsqueda');
        boton.title = 'Vaciar';
        boton.innerHTML = '<i class="fa-solid fa-circle-xmark"></i>';
        boton.style.display = 'none';

        function refrescar() {
            boton.style.display = input.value ? '' : 'none';
        }

        function vaciar() {
            if (!input.value) return;
            input.value = '';
            refrescar();
            // Avisar a los filtros de la vista (escuchan 'input'; algunos 'keyup').
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('keyup', { bubbles: true }));
            if (input.getAttribute('data-limpiar-enviar') === 'si' && input.form) {
                input.form.submit();
                return;
            }
            input.focus();
        }

        boton.addEventListener('click', vaciar);
        // Accesibilidad: el botón también responde a teclado.
        boton.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                vaciar();
            }
        });

        input.addEventListener('input', refrescar);
        input.addEventListener('change', refrescar);
        input.addEventListener('keyup', refrescar);
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && input.value) vaciar();
        });

        // Dentro de un .input-group el botón va ANTES del campo: si quedara
        // como último hijo, la regla ":not(:last-child)" de Bootstrap le
        // quitaría el redondeo derecho al campo de búsqueda.
        if (contenedor.classList.contains('input-group')) {
            contenedor.insertBefore(boton, input);
        } else {
            contenedor.appendChild(boton);
        }
        refrescar();
    }

    function revisar(raiz) {
        var inputs = (raiz || document).querySelectorAll(SELECTOR);
        Array.prototype.forEach.call(inputs, function (input) {
            if (califica(input)) instalar(input);
        });
    }

    function iniciar() {
        var estilo = document.createElement('style');
        estilo.textContent = ESTILO;
        document.head.appendChild(estilo);
        revisar(document);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', iniciar);
    } else {
        iniciar();
    }

    // Cajas que aparecen después (modales, contenido dinámico).
    var pendiente = null;
    new MutationObserver(function () {
        if (pendiente) return;
        pendiente = setTimeout(function () {
            pendiente = null;
            revisar(document);
        }, 120);
    }).observe(document.documentElement, { childList: true, subtree: true });
})();
