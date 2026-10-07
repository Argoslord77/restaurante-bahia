// movil/www/js/ventas.js — Ventas con descuento de stock (Fase 2).
// Acepta cantidades decimales (kg, L…) y productos tipo receta: al vender una
// receta descuenta los insumos según su receta y el costo de la línea es el
// escandallo real. Cada línea congela su consumo para devolver exacto al cancelar.
// La venta sigue siendo UN documento con detalles y pagos embebidos.
(function (root, factory) {
    const mod = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = mod;
    else root.CFVentas = mod;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const COL = 'ventas';
    const METODOS = ['efectivo', 'tarjeta', 'transferencia'];
    const redondear = n => Math.round((Number(n) || 0) * 100) / 100;
    const r3 = n => Math.round((Number(n) || 0) * 1000) / 1000;
    const hoyISO = () => {
        const f = new Date();
        const p = n => String(n).padStart(2, '0');
        return `${f.getFullYear()}-${p(f.getMonth() + 1)}-${p(f.getDate())}`;
    };
    const fechaValida = (v, defecto) =>
        /^\\d{4}-\\d{2}-\\d{2}$/.test(String(v || '')) ? String(v) : defecto;

    function modulos() {
        // Navegador: globales · jest: require.
        if (typeof module !== 'undefined' && module.exports) {
            return { Ajustes: require('./ajustes'), Money: require('./money'),
                     Productos: require('./productos'), Unidades: require('./unidades') };
        }
        return { Ajustes: globalThis.CFAjustes, Money: globalThis.CFMoney,
                 Productos: globalThis.CFProductos, Unidades: globalThis.CFUnidades };
    }

    async function crear(store, { usuario_id, turno_id, items, pagos, descuento = 0 }) {
        if (!usuario_id) throw new Error('Sesión no válida.');
        if (!turno_id) throw new Error('No hay turno de caja abierto.');
        if (!Array.isArray(items) || !items.length) throw new Error('La venta no tiene artículos.');
        if (!Array.isArray(pagos) || !pagos.length) throw new Error('Registre al menos un pago.');
        const { Ajustes, Money, Productos, Unidades } = modulos();

        const agrupado = new Map();
        for (const it of items) {
            const pid = parseInt(it && it.producto_id, 10);
            const cant = Number(it && it.cantidad);
            if (!Number.isInteger(pid) || pid <= 0) throw new Error('Artículo no válido.');
            if (!Number.isFinite(cant) || cant <= 0) throw new Error('Cantidad no válida.');
            agrupado.set(pid, r3((agrupado.get(pid) || 0) + cant));
        }
        for (const p of pagos) {
            if (!METODOS.includes(p && p.metodo)) throw new Error('Método de pago no válido.');
            if (!(Number(p.monto) > 0)) throw new Error('Monto de pago no válido.');
        }

        const turno = await store.obtener('turnos', Number(turno_id));
        if (!turno || turno.estado !== 'abierto') throw new Error('El turno de caja no está abierto.');
        const ivaPct = await Ajustes.ivaPct(store);

        const lineas = [];
        for (const [pid, cant] of agrupado) {
            const p = await store.obtener('productos', pid);
            if (!p) throw new Error('Un artículo ya no existe.');
            if (!p.activo) throw new Error(`"${p.nombre}" ya no está a la venta.`);
            const tipo = p.tipo || 'simple';
            if (tipo === 'insumo') throw new Error(`"${p.nombre}" es insumo: no se vende directo.`);
            const precio = Number(p.precio_venta) || 0;
            if (tipo === 'receta') {
                const disp = await Productos.disponibilidad(store, p);
                if (disp < cant) throw new Error(`Stock insuficiente de "${p.nombre}" (hay ${disp}).`);
                const consumo = [];
                for (const l of (p.receta || [])) {
                    const ins = await store.obtener('productos', l.insumo_id);
                    if (!ins || !ins.activo) throw new Error(`Falta el ingrediente de "${p.nombre}".`);
                    consumo.push({ insumo_id: l.insumo_id, cantidad_base: r3(Unidades.resolver(ins, l.cantidad, l.unidad)) });
                }
                lineas.push({ producto_id: pid, nombre: p.nombre, precio_unitario: precio,
                    costo_unitario: await Productos.costoUnitario(store, p), cantidad: cant,
                    subtotal: redondear(precio * cant), unidad: p.unidad || 'pza', tipo, consumo });
            } else {
                const stock = Number(p.stock) || 0;
                if (stock < cant) throw new Error(`Stock insuficiente de "${p.nombre}" (hay ${p.stock}).`);
                lineas.push({ producto_id: pid, nombre: p.nombre, precio_unitario: precio,
                    costo_unitario: Number(p.precio_costo) || 0, cantidad: cant,
                    subtotal: redondear(precio * cant), unidad: p.unidad || 'pza', tipo });
            }
        }

        const t = Money.totales(lineas.map(l => ({ precio: l.precio_unitario, cantidad: l.cantidad })),
                                descuento, ivaPct);
        const pagado = redondear(pagos.reduce((a, p) => a + Number(p.monto), 0));
        if (pagado + 1e-9 < t.total) throw new Error('El pago no cubre el total.');
        const cambio = redondear(pagado - t.total);

        const usuario = await store.obtener('usuarios', Number(usuario_id));
        const venta = await store.insertar(COL, {
            turno_id: Number(turno_id), usuario_id: Number(usuario_id),
            usuario_nombre: usuario ? usuario.nombre : null,
            subtotal: t.sub, descuento: t.desc, iva_pct: ivaPct, iva_monto: t.iva,
            total: t.total, cambio,
            detalles: lineas,
            pagos: pagos.map(p => ({ metodo: p.metodo, monto: redondear(p.monto) })),
            estado: 'cobrada', motivo_cancelacion: null,
            creado_en: new Date().toISOString(), dia: hoyISO()
        });

        for (const l of lineas) {
            if (l.tipo === 'receta') {
                for (const c of (l.consumo || [])) {
                    const ins = await store.obtener('productos', c.insumo_id);
                    const antes = ins ? (Number(ins.stock) || 0) : 0;
                    const despues = r3(antes - c.cantidad_base * l.cantidad);
                    if (ins) await store.actualizar('productos', c.insumo_id, { stock: despues });
                    await store.insertar('movimientos', {
                        producto_id: c.insumo_id, tipo: 'venta',
                        cantidad: r3(-c.cantidad_base * l.cantidad), unidad: (ins && ins.unidad) || 'pza',
                        stock_antes: r3(antes), stock_despues: despues,
                        motivo: `Venta #${venta.id} (${l.nombre})`, referencia_id: venta.id,
                        usuario_id: Number(usuario_id), creado_en: new Date().toISOString(), dia: hoyISO()
                    });
                }
            } else {
                const p = await store.obtener('productos', l.producto_id);
                const antes = p ? (Number(p.stock) || 0) : 0;
                const despues = r3(antes - l.cantidad);
                if (p) await store.actualizar('productos', l.producto_id, { stock: despues });
                await store.insertar('movimientos', {
                    producto_id: l.producto_id, tipo: 'venta', cantidad: r3(-l.cantidad),
                    unidad: (p && p.unidad) || 'pza',
                    stock_antes: r3(antes), stock_despues: despues,
                    motivo: `Venta #${venta.id}`, referencia_id: venta.id,
                    usuario_id: Number(usuario_id), creado_en: new Date().toISOString(), dia: hoyISO()
                });
            }
        }
        return { venta_id: venta.id, subtotal: t.sub, descuento: t.desc,
                 iva_pct: ivaPct, iva_monto: t.iva, total: t.total, cambio };
    }

    // Cancela una venta cobrada DENTRO del turno abierto (devuelve stock exacto).
    async function cancelar(store, { venta_id, usuario_id, motivo = null }) {
        const vid = parseInt(venta_id, 10);
        if (!Number.isInteger(vid) || vid <= 0) throw new Error('Venta no válida.');
        const venta = await store.obtener(COL, vid);
        if (!venta) throw new Error('La venta no existe.');
        if (venta.estado !== 'cobrada') throw new Error('Solo se cancelan ventas cobradas.');
        const turno = await store.obtener('turnos', Number(venta.turno_id));
        if (!turno || turno.estado !== 'abierto') throw new Error('Solo se cancela dentro del turno abierto.');
        await store.actualizar(COL, vid, { estado: 'cancelada', motivo_cancelacion: motivo || null });
        for (const d of (venta.detalles || [])) {
            const consumos = (d.tipo === 'receta' && Array.isArray(d.consumo)) ? d.consumo : null;
            if (consumos) {
                for (const c of consumos) {
                    const ins = await store.obtener('productos', c.insumo_id);
                    const antes = ins ? (Number(ins.stock) || 0) : 0;
                    const despues = r3(antes + c.cantidad_base * d.cantidad);
                    if (ins) await store.actualizar('productos', c.insumo_id, { stock: despues });
                    await store.insertar('movimientos', {
                        producto_id: c.insumo_id, tipo: 'devolucion',
                        cantidad: r3(c.cantidad_base * d.cantidad), unidad: (ins && ins.unidad) || 'pza',
                        stock_antes: r3(antes), stock_despues: despues,
                        motivo: `Cancela venta #${vid}`, referencia_id: vid,
                        usuario_id: usuario_id || null, creado_en: new Date().toISOString(), dia: hoyISO()
                    });
                }
            } else {
                if (!d.producto_id) continue;
                const p = await store.obtener('productos', d.producto_id);
                const antes = p ? (Number(p.stock) || 0) : 0;
                const despues = r3(antes + d.cantidad);
                if (p) await store.actualizar('productos', d.producto_id, { stock: despues });
                await store.insertar('movimientos', {
                    producto_id: d.producto_id, tipo: 'devolucion', cantidad: r3(d.cantidad),
                    unidad: (p && p.unidad) || 'pza',
                    stock_antes: r3(antes), stock_despues: despues,
                    motivo: `Cancela venta #${vid}`, referencia_id: vid,
                    usuario_id: usuario_id || null, creado_en: new Date().toISOString(), dia: hoyISO()
                });
            }
        }
        return { venta_id: vid };
    }

    async function listar(store, { desde = null, hasta = null, estado = null } = {}) {
        const hoy = hoyISO();
        const d = fechaValida(desde, hoy);
        const h = fechaValida(hasta, d);
        const filas = (await store.todos(COL))
            .filter(v => v.dia >= d && v.dia <= h)
            .filter(v => !estado || v.estado === estado)
            .sort((a, b) => b.id - a.id)
            .slice(0, 500)
            .map(v => ({ ...v, lineas: (v.detalles || []).length }));
        const cobradas = filas.filter(f => f.estado === 'cobrada');
        return {
            filas,
            totales: { n: cobradas.length,
                       total: redondear(cobradas.reduce((a, f) => a + (Number(f.total) || 0), 0)) },
            filtros: { desde: d, hasta: h }
        };
    }

    async function obtenerDetalle(store, id) {
        const venta = await store.obtener(COL, Number(id));
        if (!venta) return null;
        return { venta, detalles: venta.detalles || [], pagos: venta.pagos || [] };
    }

    return { crear, cancelar, listar, obtenerDetalle, METODOS, COL };
});
