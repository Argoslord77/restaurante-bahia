// movil/www/js/iconos.js — Set SVG "Ónix": iconos inline estilo línea, cero emojis.
// Uso: CFIconos.icono('productos') → '<svg …>…</svg>' (hereda color vía currentColor).
(function (root, factory) {
    const mod = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = mod;
    else root.CFIconos = mod;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';
    const P = {
        inicio: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.8V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.8"/><path d="M10 21v-6h4v6"/>',
        vender: '<path d="M5 3h14v18l-2.33-1.55L14.33 21l-2.33-1.55L9.67 21l-2.34-1.55L5 21V3z"/><path d="M9 8h6M9 12h6"/>',
        ventas: '<path d="M8.5 6h12M8.5 12h12M8.5 18h12"/><circle cx="4.5" cy="6" r="1.3" fill="currentColor" stroke="none"/><circle cx="4.5" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="4.5" cy="18" r="1.3" fill="currentColor" stroke="none"/>',
        caja: '<path d="M20 7H5a2 2 0 0 1 0-4h13v4"/><path d="M20 7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5"/><circle cx="17" cy="14" r="1.4" fill="currentColor" stroke="none"/>',
        mas: '<circle cx="5" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.7" fill="currentColor" stroke="none"/>',
        productos: '<path d="M21 8 12 3 3 8v8l9 5 9-5V8z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/>',
        inventario: '<rect x="5" y="4" width="14" height="17" rx="2"/><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M9 11h6M9 15h4"/>',
        reportes: '<path d="M4 4v16h16"/><path d="M8.5 16v-5M12.5 16V8M16.5 16v-8"/>',
        ajustes: '<path d="M4 7h9M17.5 7H20M4 12h3M11.5 12H20M4 17h11M19.5 17H20"/><circle cx="15" cy="7" r="2.2"/><circle cx="9" cy="12" r="2.2"/><circle cx="17" cy="17" r="2.2"/>',
        usuarios: '<circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 4.7a3.5 3.5 0 0 1 0 6.6"/><path d="M17.5 14.6c2.1.9 3.5 2.9 3.5 5.4"/>',
        impresora: '<path d="M7 8V3h10v5"/><rect x="3.5" y="8" width="17" height="8.5" rx="2"/><rect x="7" y="13.5" width="10" height="7"/>',
        licencia: '<circle cx="8" cy="16" r="4.5"/><path d="M11.2 12.8 20 4"/><path d="M15.5 8.5 19 12"/>',
        respaldo: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/>',
        salir: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
        descargar: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>',
        candado: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
        borrar: '<path d="M21 6H8l-5 6 5 6h13a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1z"/><path d="M12 10l6 6M18 10l-6 6"/>',
        alerta: '<path d="M12 3 2 20h20L12 3z"/><path d="M12 10v4"/><circle cx="12" cy="17" r="1" fill="currentColor" stroke="none"/>',
        buscar: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
        compartir: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>',
        luna: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
        sol: '<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>'
    };
    function icono(nombre, px) {
        const p = P[nombre] || '';
        const s = px ? ` width="${px}" height="${px}"` : '';
        return `<svg${s} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
    }
    return { icono, nombres: Object.keys(P) };
});
