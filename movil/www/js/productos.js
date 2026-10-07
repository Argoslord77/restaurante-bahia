// movil/www/js/productos.js — Catálogo con tipos de restaurante (Fase 2).
// simple: se vende y descuenta su propio stock · insumo: ingrediente con stock
// (no se vende directo) · receta: se vende y descuenta los insumos de su receta.
// El stock es decimal (kg, L…) y cada producto tiene unidad base + empaque de
// compra opcional (reja, caja…). La receta va embebida en el producto (atómica).
(function (root, factory) {
    const mod = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = mod;
    else root.CFProductos = mod;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const COL = 'productos';
    const COL_CAT = 'categorias';
    const TIPOS = ['simple', 'insumo', 'receta'];
    const num = (v, d) => { const n = Number(v); return Number.isFinite(n) ? n : (d || 0); };
    const r3 = n => Math.round((Number(n) || 0) * 1000) / 1000;
    const r2 = n => Math.round((Number(n) || 0) * 100) / 100;

    function mods() {
        if (typeof module !== 'undefined' && module.exports) return { Unidades: require('./unidades') };
        return { Unidades: globalThis.CFUnidades };
    }

    function normalizarTipo(t) {
        const tipo = String(t || 'simple').trim().toLowerCase();
        if (!TIPOS.includes(tipo)) throw new Error('Tipo de producto no válido.');
        return tipo;
    }

    function normalizarUnidad(u) {
        const { Unidades } = mods();
        const cod = String(u || 'U').trim();
        if (!Unidades.existe(cod)) throw new Error('Unidad no válida.');
        return cod;
    }

    function normalizarCompra(datos, unidad) {
        const { Unidades } = mods();
        const etiqueta = datos.compra_unidad ? String(datos.compra_unidad).trim() : '';
        const factor = Number(datos.compra_factor);
        if (!etiqueta) return { compra_unidad: null, compra_factor: null };
        if (etiqueta.length > 24) throw new Error('El nombre del empaque es muy largo.');
        if (etiqueta === unidad) throw new Error('El empaque debe ser distinto de la unidad base.');
        if (Unidades.existe(etiqueta)) {
            throw new Error('El empaque debe ser un nombre propio (reja, caja…), no una unidad del catálogo.');
        }
        if (!Number.isFinite(factor) || factor <= 0) {
            throw new Error('El empaque de compra necesita un factor mayor a 0.');
        }
        return { compra_unidad: etiqueta, compra_factor: r4(factor) };
    }
    const r4 = n => Math.round((Number(n) || 0) * 10000) / 10000;

    // Valida y normaliza líneas [{ insumo_id, cantidad, unidad }].
    async function normalizarReceta(store, lineas) {
        const { Unidades } = mods();
        if (!Array.isArray(lineas) || !lineas.length) {
            throw new Error('La receta necesita al menos un ingrediente.');
        }
        if (lineas.length > 50) throw new Error('La receta acepta máximo 50 ingredientes.');
        const norm = [];
        for (const l of lineas) {
            const iid = parseInt(l && l.insumo_id, 10);
            const cant = Number(l && l.cantidad);
            const uni = String((l && l.unidad) || '').trim() || 'U';
            if (!Number.isInteger(iid) || iid <= 0) throw new Error('Ingrediente no válido.');
            if (!Number.isFinite(cant) || cant <= 0) throw new Error('La cantidad del ingrediente debe ser mayor a 0.');
            const ins = await store.obtener(COL, iid);
            if (!ins) throw new Error('Un ingrediente ya no existe.');
            if ((ins.tipo || 'simple') === 'receta') {
                throw new Error(`"${ins.nombre}" es receta: las recetas no aceptan otra receta como ingrediente.`);
            }
            try { Unidades.resolver(ins, cant, uni); }
            catch (_) { throw new Error(`Unidad "${uni}" no válida para "${ins.nombre}".`); }
            norm.push({ insumo_id: iid, cantidad: r4(cant), unidad: uni });
        }
        return norm;
    }

    // Compat: productos viejos se leen como simple/U.
    function conDefectos(p) {
        return { ...p, tipo: p.tipo || 'simple', unidad: p.unidad || 'U',
                 compra_unidad: p.compra_unidad || null, compra_factor: p.compra_factor || null,
                 receta: Array.isArray(p.receta) ? p.receta : [] };
    }

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

    async function listar(store, { q = '', categoria = null, activos = true, tipo = null } = {}) {
        const cats = {};
        for (const c of await store.todos(COL_CAT)) cats[c.id] = c.nombre;
        const texto = String(q || '').trim().toLowerCase();
        let filas = await store.todos(COL);
        if (activos) filas = filas.filter(p => p.activo);
        if (categoria) filas = filas.filter(p => Number(p.categoria_id) === Number(categoria));
        if (tipo) filas = filas.filter(p => (p.tipo || 'simple') === tipo);
        if (texto) {
            filas = filas.filter(p => String(p.nombre || '').toLowerCase().includes(texto) ||
                                       String(p.sku || '').toLowerCase().includes(texto));
        }
        return filas
            .map(p => ({ ...conDefectos(p), categoria_nombre: p.categoria_id ? (cats[p.categoria_id] || null) : null }))
            .sort((a, b) => String(a.nombre).localeCompare(String(b.nombre)))
            .slice(0, 500);
    }

    async function buscarParaVenta(store, q) {
        const texto = String(q || '').trim().toLowerCase();
        if (!texto) return [];
        const filas = await listar(store, { q: texto, activos: true });
        const vendibles = [];
        for (const p of filas) {
            if (p.tipo === 'insumo') continue;
            const disp = p.tipo === 'receta' ? await disponibilidad(store, p) : (Number(p.stock) || 0);
            if (!(disp > 0)) continue;
            vendibles.push({ id: p.id, sku: p.sku, nombre: p.nombre, categoria_nombre: p.categoria_nombre,
                             precio_venta: p.precio_venta, stock: disp, unidad: p.unidad, tipo: p.tipo });
            if (vendibles.length >= 30) break;
        }
        return vendibles;
    }

    async function obtener(store, id) {
        const p = await store.obtener(COL, Number(id));
        if (!p) return null;
        let categoria_nombre = null;
        if (p.categoria_id) {
            const c = await store.obtener(COL_CAT, Number(p.categoria_id));
            if (c) categoria_nombre = c.nombre;
        }
        return { ...conDefectos(p), categoria_nombre };
    }

    async function skuExiste(store, sku, excluirId) {
        if (!sku) return false;
        const filas = await store.todos(COL);
        return filas.some(p => p.sku === sku && p.id !== excluirId);
    }

    function validarBase(datos, excluirId) {
        const nom = String(datos.nombre || '').trim();
        if (!nom) throw new Error('El nombre es obligatorio.');
        const costo = num(datos.precio_costo);
        const venta = num(datos.precio_venta);
        if (costo < 0 || venta < 0) throw new Error('Los precios no pueden ser negativos.');
        const codigo = datos.sku && String(datos.sku).trim() ? String(datos.sku).trim() : null;
        return { nom, costo, venta, codigo };
    }

    async function crear(store, datos, usuarioId) {
        const { nom, costo, venta, codigo } = validarBase(datos);
        if (await skuExiste(store, codigo, null)) throw new Error('Ese SKU ya existe.');
        const tipo = normalizarTipo(datos.tipo);
        const unidad = normalizarUnidad(datos.unidad);
        const compra = normalizarCompra(datos, unidad);
        const receta = tipo === 'receta' ? await normalizarReceta(store, datos.receta) : [];
        const inicial = Math.max(0, r3(num(datos.stock_inicial)));
        const minimo = Math.max(0, r3(num(datos.stock_minimo)));
        const fila = await store.insertar(COL, {
            sku: codigo, nombre: nom,
            categoria_id: datos.categoria_id ? Number(datos.categoria_id) : null,
            descripcion: datos.descripcion || null,
            precio_costo: costo, precio_venta: venta,
            tipo, unidad, ...compra, receta,
            stock: tipo === 'receta' ? 0 : inicial,
            stock_minimo: minimo, activo: true, creado_en: new Date().toISOString()
        });
        if (inicial > 0 && tipo !== 'receta') {
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
        const actual = await store.obtener(COL, Number(id));
        if (!actual) throw new Error('El producto no existe.');
        const { nom, costo, venta, codigo } = validarBase(datos);
        if (await skuExiste(store, codigo, Number(id))) throw new Error('Ese SKU ya existe.');
        const tipo = datos.tipo !== undefined ? normalizarTipo(datos.tipo) : (actual.tipo || 'simple');
        const unidad = datos.unidad !== undefined ? normalizarUnidad(datos.unidad) : (actual.unidad || 'U');
        let compra;
        if (datos.compra_unidad !== undefined || datos.compra_factor !== undefined) {
            compra = normalizarCompra({
                compra_unidad: datos.compra_unidad !== undefined ? datos.compra_unidad : actual.compra_unidad,
                compra_factor: datos.compra_factor !== undefined ? datos.compra_factor : actual.compra_factor
            }, unidad);
        } else {
            compra = { compra_unidad: actual.compra_unidad || null, compra_factor: actual.compra_factor || null };
        }
        let receta = Array.isArray(actual.receta) ? actual.receta : [];
        if (tipo === 'receta') {
            receta = datos.receta !== undefined ? await normalizarReceta(store, datos.receta) : receta;
            if (!receta.length) throw new Error('La receta necesita al menos un ingrediente.');
        } else receta = [];
        const cambios = {
            sku: codigo, nombre: nom,
            categoria_id: datos.categoria_id ? Number(datos.categoria_id) : null,
            descripcion: datos.descripcion !== undefined ? (datos.descripcion || null) : (actual.descripcion || null),
            precio_costo: costo, precio_venta: venta,
            tipo, unidad, ...compra, receta,
            stock_minimo: datos.stock_minimo !== undefined ? Math.max(0, r3(num(datos.stock_minimo))) : (Number(actual.stock_minimo) || 0)
        };
        if (tipo === 'receta') cambios.stock = 0;
        await store.actualizar(COL, Number(id), cambios);
        return true;
    }

    async function cambiarActivo(store, id, activo) {
        const ok = await store.actualizar(COL, Number(id), { activo: !!activo });
        if (!ok) throw new Error('El producto no existe.');
        return true;
    }

    // Porciones producibles con el stock actual de los insumos (entero).
    async function disponibilidad(store, producto) {
        const p = typeof producto === 'object' ? conDefectos(producto) : await obtener(store, producto);
        if (!p) return 0;
        if (p.tipo !== 'receta') return Number(p.stock) || 0;
        if (!p.receta.length) return 0;
        const { Unidades } = mods();
        let min = Infinity;
        for (const l of p.receta) {
            const ins = await store.obtener(COL, l.insumo_id);
            if (!ins || !ins.activo) return 0;
            const stockIns = Number(ins.stock) || 0;
            let enLinea;
            const uniIns = ins.unidad || 'U';
            if (l.unidad === uniIns) enLinea = stockIns;
            else if (l.unidad === ins.compra_unidad && Number(ins.compra_factor) > 0) {
                enLinea = stockIns / Number(ins.compra_factor);
            } else {
                try { enLinea = Unidades.convertir(stockIns, uniIns, l.unidad); }
                catch (_) { return 0; }
            }
            min = Math.min(min, Math.floor(enLinea / l.cantidad + 1e-9));
            if (min <= 0) return 0;
        }
        return min === Infinity ? 0 : min;
    }

    // Costo teórico de 1 porción (escandallo) o costo directo si no es receta.
    async function costoUnitario(store, producto) {
        const p = typeof producto === 'object' ? conDefectos(producto) : await obtener(store, producto);
        if (!p) return 0;
        if (p.tipo !== 'receta') return Number(p.precio_costo) || 0;
        const { Unidades } = mods();
        let total = 0;
        for (const l of (p.receta || [])) {
            const ins = await store.obtener(COL, l.insumo_id);
            if (!ins) continue;
            let enBase;
            try { enBase = Unidades.resolver(ins, l.cantidad, l.unidad); }
            catch (_) { continue; }
            total += enBase * (Number(ins.precio_costo) || 0);
        }
        return r2(total);
    }

    function diaLocal(d) {
        const f = d || new Date();
        const p = n => String(n).padStart(2, '0');
        return `${f.getFullYear()}-${p(f.getMonth() + 1)}-${p(f.getDate())}`;
    }

    return { listar, buscarParaVenta, obtener, crear, actualizar, cambiarActivo,
             listarCategorias, crearCategoria, mapaUsuarios, disponibilidad, costoUnitario,
             TIPOS, COL, COL_CAT };
});
