// movil/www/js/productos.js — Catálogo (mismas validaciones que la web).
(function (root, factory) {
    const mod = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = mod;
    else root.CFProductos = mod;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const COL = 'productos';
    const COL_CAT = 'categorias';
    const num = (v, d) => { const n = Number(v); return Number.isFinite(n) ? n : (d || 0); };

    async function mapaUsuarios(store) {
        const m = {};
        for (const u of await store.todos('usuarios')) m[u.id] = u.nombre;
        return m;
    }

    async function listarCategorias(store) {
        const cats = await store.todos(COL_CAT);
        return cats.slice().sort((a, b) => String(a.nombre).localeCompare(String(b.nombre)));
    }

    async function crearCategoria(store, nombre) {
        const nom = String(nombre || '').trim();
        if (!nom) throw new Error('El nombre de la categoría es obligatorio.');
        const cats = await store.todos(COL_CAT);
        if (cats.some(c => String(c.nombre).toLowerCase() === nom.toLowerCase())) {
            throw new Error('Esa categoría ya existe.');
        }
        const f = await store.insertar(COL_CAT, { nombre: nom, activo: true });
        return f.id;
    }

    async function listar(store, { q = '', categoria = null, activos = true } = {}) {
        const cats = {};
        for (const c of await store.todos(COL_CAT)) cats[c.id] = c.nombre;
        const texto = String(q || '').trim().toLowerCase();
        let filas = await store.todos(COL);
        if (activos) filas = filas.filter(p => p.activo);
        if (categoria) filas = filas.filter(p => Number(p.categoria_id) === Number(categoria));
        if (texto) {
            filas = filas.filter(p => String(p.nombre || '').toLowerCase().includes(texto) ||
                                       String(p.sku || '').toLowerCase().includes(texto));
        }
        return filas
            .map(p => ({ ...p, categoria_nombre: p.categoria_id ? (cats[p.categoria_id] || null) : null }))
            .sort((a, b) => String(a.nombre).localeCompare(String(b.nombre)))
            .slice(0, 500);
    }

    async function buscarParaVenta(store, q) {
        const texto = String(q || '').trim().toLowerCase();
        if (!texto) return [];
        const filas = await listar(store, { q: texto, activos: true });
        return filas.filter(p => Number(p.stock) > 0).slice(0, 30).map(p => ({
            id: p.id, sku: p.sku, nombre: p.nombre, categoria_nombre: p.categoria_nombre,
            precio_venta: p.precio_venta, stock: p.stock
        }));
    }

    async function obtener(store, id) {
        const p = await store.obtener(COL, Number(id));
        if (!p) return null;
        let categoria_nombre = null;
        if (p.categoria_id) {
            const c = await store.obtener(COL_CAT, Number(p.categoria_id));
            if (c) categoria_nombre = c.nombre;
        }
        return { ...p, categoria_nombre };
    }

    async function skuExiste(store, sku, excluirId) {
        if (!sku) return false;
        const filas = await store.todos(COL);
        return filas.some(p => p.sku === sku && p.id !== excluirId);
    }

    async function crear(store, datos, usuarioId) {
        const nom = String(datos.nombre || '').trim();
        if (!nom) throw new Error('El nombre es obligatorio.');
        const costo = num(datos.precio_costo);
        const venta = num(datos.precio_venta);
        if (costo < 0 || venta < 0) throw new Error('Los precios no pueden ser negativos.');
        const codigo = datos.sku && String(datos.sku).trim() ? String(datos.sku).trim() : null;
        if (await skuExiste(store, codigo, null)) throw new Error('Ese SKU ya existe.');
        const inicial = Math.max(0, parseInt(datos.stock_inicial, 10) || 0);
        const fila = await store.insertar(COL, {
            sku: codigo, nombre: nom,
            categoria_id: datos.categoria_id ? Number(datos.categoria_id) : null,
            descripcion: datos.descripcion || null,
            precio_costo: costo, precio_venta: venta,
            stock: inicial, stock_minimo: Math.max(0, parseInt(datos.stock_minimo, 10) || 0),
            activo: true, creado_en: new Date().toISOString()
        });
        if (inicial > 0) {
            // Como en la web: el movimiento inicial se asienta directo
            // (el stock ya quedó en la fila; no debe sumarse dos veces).
            await store.insertar('movimientos', {
                producto_id: fila.id, tipo: 'entrada', cantidad: inicial,
                stock_antes: 0, stock_despues: inicial,
                motivo: 'Stock inicial', referencia_id: null,
                usuario_id: usuarioId || null,
                creado_en: new Date().toISOString(), dia: diaLocal()
            });
        }
        return fila.id;
    }

    async function actualizar(store, id, datos) {
        const nom = String(datos.nombre || '').trim();
        if (!nom) throw new Error('El nombre es obligatorio.');
        const costo = num(datos.precio_costo);
        const venta = num(datos.precio_venta);
        if (costo < 0 || venta < 0) throw new Error('Los precios no pueden ser negativos.');
        const codigo = datos.sku && String(datos.sku).trim() ? String(datos.sku).trim() : null;
        if (await skuExiste(store, codigo, Number(id))) throw new Error('Ese SKU ya existe.');
        const ok = await store.actualizar(COL, Number(id), {
            sku: codigo, nombre: nom,
            categoria_id: datos.categoria_id ? Number(datos.categoria_id) : null,
            descripcion: datos.descripcion || null,
            precio_costo: costo, precio_venta: venta,
            stock_minimo: Math.max(0, parseInt(datos.stock_minimo, 10) || 0)
        });
        if (!ok) throw new Error('El producto no existe.');
        return true;
    }

    async function cambiarActivo(store, id, activo) {
        const ok = await store.actualizar(COL, Number(id), { activo: !!activo });
        if (!ok) throw new Error('El producto no existe.');
        return true;
    }

    function diaLocal(d) {
        const f = d || new Date();
        const p = n => String(n).padStart(2, '0');
        return `${f.getFullYear()}-${p(f.getMonth() + 1)}-${p(f.getDate())}`;
    }

    return { listar, buscarParaVenta, obtener, crear, actualizar, cambiarActivo,
             listarCategorias, crearCategoria, mapaUsuarios, COL, COL_CAT };
});
