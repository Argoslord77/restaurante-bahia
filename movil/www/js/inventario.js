// movil/www/js/inventario.js — Movimientos, kardex y valorizado (igual que web).
(function (root, factory) {
    const mod = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = mod;
    else root.CFInventario = mod;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const COL = 'movimientos';
    const TIPOS = ['entrada', 'salida', 'venta', 'devolucion', 'ajuste'];
    const redondear = n => Math.round((Number(n) || 0) * 100) / 100;
    const hoyISO = () => {
        const f = new Date();
        const p = n => String(n).padStart(2, '0');
        return `${f.getFullYear()}-${p(f.getMonth() + 1)}-${p(f.getDate())}`;
    };

    async function registrar(store, { producto_id, tipo, cantidad, motivo = null, usuario_id = null, referencia_id = null }) {
        const pid = parseInt(producto_id, 10);
        const cant = parseInt(cantidad, 10);
        if (!Number.isInteger(pid) || pid <= 0) throw new Error('Producto no válido.');
        if (!Number.isInteger(cant) || cant <= 0) throw new Error('La cantidad debe ser mayor a 0.');
        if (!TIPOS.includes(tipo)) throw new Error('Tipo de movimiento no válido.');
        const direccion = (tipo === 'salida' || tipo === 'venta') ? -1 : 1;
        const p = await store.obtener('productos', pid);
        if (!p) throw new Error('El producto no existe.');
        const antes = Number(p.stock) || 0;
        const despues = antes + direccion * cant;
        if (despues < 0) throw new Error('Stock insuficiente para este movimiento.');
        await store.actualizar('productos', pid, { stock: despues });
        await store.insertar(COL, {
            producto_id: pid, tipo, cantidad: direccion * cant,
            stock_antes: antes, stock_despues: despues,
            motivo: motivo || null, referencia_id: referencia_id || null,
            usuario_id: usuario_id || null, creado_en: new Date().toISOString(), dia: hoyISO()
        });
        return { producto_id: pid, antes, despues };
    }

    const entrada = (store, producto_id, cantidad, motivo, usuario_id) =>
        registrar(store, { producto_id, tipo: 'entrada', cantidad, motivo, usuario_id });
    const salida = (store, producto_id, cantidad, motivo, usuario_id) =>
        registrar(store, { producto_id, tipo: 'salida', cantidad, motivo, usuario_id });

    async function kardex(store, producto_id, limite) {
        const n = Math.min(500, Math.max(1, parseInt(limite, 10) || 100));
        const usuarios = {};
        for (const u of await store.todos('usuarios')) usuarios[u.id] = u.nombre;
        return (await store.todos(COL))
            .filter(m => Number(m.producto_id) === Number(producto_id))
            .sort((a, b) => b.id - a.id).slice(0, n)
            .map(m => ({ ...m, usuario_nombre: usuarios[m.usuario_id] || null }));
    }

    async function recientes(store, limite) {
        const n = Math.min(200, Math.max(1, parseInt(limite, 10) || 50));
        const prods = {};
        for (const p of await store.todos('productos')) prods[p.id] = p;
        const usuarios = {};
        for (const u of await store.todos('usuarios')) usuarios[u.id] = u.nombre;
        return (await store.todos(COL))
            .filter(m => prods[m.producto_id])
            .sort((a, b) => b.id - a.id).slice(0, n)
            .map(m => ({ ...m, producto_nombre: prods[m.producto_id].nombre,
                         sku: prods[m.producto_id].sku || null,
                         usuario_nombre: usuarios[m.usuario_id] || null }));
    }

    async function stockBajo(store) {
        const cats = {};
        for (const c of await store.todos('categorias')) cats[c.id] = c.nombre;
        return (await store.todos('productos'))
            .filter(p => p.activo && Number(p.stock) <= Number(p.stock_minimo))
            .map(p => ({ id: p.id, sku: p.sku || null, nombre: p.nombre,
                         stock: p.stock, stock_minimo: p.stock_minimo,
                         categoria_nombre: (p.categoria_id && cats[p.categoria_id]) || null }))
            .sort((a, b) => a.stock - b.stock || String(a.nombre).localeCompare(String(b.nombre)));
    }

    async function valorizado(store) {
        const cats = {};
        for (const c of await store.todos('categorias')) cats[c.id] = c.nombre;
        const filas = (await store.todos('productos'))
            .filter(p => p.activo)
            .map(p => {
                const stock = Number(p.stock) || 0;
                return { id: p.id, sku: p.sku || null, nombre: p.nombre,
                    categoria_nombre: (p.categoria_id && cats[p.categoria_id]) || null,
                    stock, precio_costo: Number(p.precio_costo) || 0,
                    precio_venta: Number(p.precio_venta) || 0,
                    valor_costo: redondear(stock * (Number(p.precio_costo) || 0)),
                    valor_venta: redondear(stock * (Number(p.precio_venta) || 0)) };
            })
            .sort((a, b) => String(a.nombre).localeCompare(String(b.nombre)));
        return {
            filas,
            totales: {
                costo: redondear(filas.reduce((a, f) => a + f.valor_costo, 0)),
                venta: redondear(filas.reduce((a, f) => a + f.valor_venta, 0)),
                unidades: filas.reduce((a, f) => a + f.stock, 0)
            }
        };
    }

    return { registrar, entrada, salida, kardex, recientes, stockBajo, valorizado, COL };
});
