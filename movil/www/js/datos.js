// movil/www/js/datos.js — Datos de ejemplo para probar en el teléfono.
(function (root, factory) {
    const mod = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = mod;
    else root.CFDatos = mod;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    function mods() {
        if (typeof module !== 'undefined' && module.exports) {
            return { Ajustes: require('./ajustes'), Productos: require('./productos') };
        }
        return { Ajustes: globalThis.CFAjustes, Productos: globalThis.CFProductos };
    }

    async function sembrar(store, usuarioId) {
        const { Ajustes, Productos } = mods();
        await Ajustes.asegurar(store);
        if ((await store.todos('productos')).length) {
            throw new Error('Ya hay productos: no se sembró nada.');
        }
        const cats = {};
        for (const nombre of ['Abarrotes', 'Bebidas', 'Limpieza']) {
            cats[nombre] = await Productos.crearCategoria(store, nombre);
        }
        const items = [
            ['AB-001', 'Tortillas de maíz (kg)', 'Abarrotes', 14, 20, 50, 10],
            ['AB-002', 'Frijol negro (kg)', 'Abarrotes', 28, 38, 30, 5],
            ['AB-003', 'Arroz (kg)', 'Abarrotes', 22, 30, 30, 5],
            ['AB-004', 'Aceite vegetal (L)', 'Abarrotes', 38, 52, 24, 6],
            ['BE-001', 'Refresco de cola (600ml)', 'Bebidas', 12, 18, 60, 12],
            ['BE-002', 'Agua natural (1L)', 'Bebidas', 8, 14, 60, 12],
            ['LI-001', 'Detergente (kg)', 'Limpieza', 30, 42, 20, 4],
            ['LI-002', 'Jabón de trastes (500ml)', 'Limpieza', 18, 26, 20, 4]
        ];
        for (const [sku, nombre, cat, costo, venta, stock, minimo] of items) {
            await Productos.crear(store, {
                sku, nombre, categoria_id: cats[cat],
                precio_costo: costo, precio_venta: venta,
                stock_inicial: stock, stock_minimo: minimo
            }, usuarioId || null);
        }
        return items.length;
    }

    return { sembrar };
});
