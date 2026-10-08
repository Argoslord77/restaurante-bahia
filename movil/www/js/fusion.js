/* Fusion — combinar un respaldo de OTRO equipo SIN borrar los datos locales.
 * Caso de uso: vendedores ambulantes con su tableta exportan sus ventas y el
 * dueño las COMBINA en la tableta principal (las ventas se agregan, nada se
 * reemplaza).
 * Reglas:
 *  - Solo se importan: ventas, los movimientos causados por esas ventas y los
 *    productos / categorías nuevos que necesiten. El inventario propio del
 *    vendedor (entradas, ajustes, mermas) NO se importa. Usuarios, ajustes,
 *    licencia y movimientos de caja NUNCA se tocan.
 *  - Las ventas fusionadas se asignan al turno de caja ABIERTO actual.
 *  - El stock se recalcula contra las existencias locales (puede quedar en
 *    negativo y se reporta).
 *  - Idempotente: cada fila importada lleva marca {origen, coleccion,
 *    id_origen}; además cada paquete combinado se registra en la colección
 *    `fusiones` por su suma, así el mismo archivo dos veces se rechaza.
 */
(function () {
    'use strict';

    const ROLES_EXPORTAR = ['administrador', 'vendedor'];
    const ROLES_ADMIN = ['administrador'];

    function mods() {
        if (typeof require === 'function') {
            return {
                Backup: require('./backup'),
                Inv: require('./inventario'),
                Ventas: require('./ventas'),
                Unidades: require('./unidades'),
            };
        }
        const g = typeof globalThis !== 'undefined' ? globalThis : window;
        return { Backup: g.CFBackup, Inv: g.CFInventario, Ventas: g.CFVentas, Unidades: g.CFUnidades };
    }

    // ---- Roles ----------------------------------------------------------------
    // ¿Quién puede EXPORTAR sus datos para compartirlos? Dueño y vendedores.
    function puedeExportar(rol) { return ROLES_EXPORTAR.includes(rol); }
    // ¿Quién puede REEMPLAZAR todo / COMBINAR respaldos? Solo el dueño.
    function puedeRestaurar(rol) { return ROLES_ADMIN.includes(rol); }
    function puedeCombinar(rol) { return ROLES_ADMIN.includes(rol); }

    // ---- Utilidades -----------------------------------------------------------
    function r3(n) { return Math.round((Number(n) + Number.EPSILON) * 1000) / 1000; }
    function num(n) { const v = Number(n); return Number.isFinite(v) ? v : 0; }
    function normSku(s) { return String(s == null ? '' : s).trim(); }
    function normNom(s) { return String(s == null ? '' : s).trim().toLowerCase(); }
    function marca(origen, coleccion, id) { return { origen, coleccion, id_origen: id }; }
    function clave(origen, coleccion, id) { return origen + '|' + coleccion + '|' + id; }
    function ahoraISO() { return new Date().toISOString(); }

    // Filas de una colección dentro del paquete (formato de CFBackup:
    // cada archivo es {v, data:{filas:[...]}}; se tolera un arreglo plano).
    // Nunca lanza: paquete ajeno o colección ausente → [].
    function filasDe(paquete, coleccion) {
        try {
            const arch = paquete && paquete.datos && paquete.datos.archivos;
            const txt = arch && arch[coleccion];
            if (!txt) return [];
            const parsed = JSON.parse(txt);
            if (Array.isArray(parsed)) return parsed;
            const filas = parsed && parsed.data && parsed.data.filas;
            return Array.isArray(filas) ? filas : [];
        } catch (_) { return []; }
    }

    function porIdAsc(a, b) { return (Number(a.id) || 0) - (Number(b.id) || 0); }

    async function indiceFusion(store, origen) {
        const idx = new Map();
        for (const col of ['categorias', 'productos', 'ventas', 'movimientos']) {
            const filas = await store.todos(col);
            for (const f of filas) {
                if (f && f.fusion && f.fusion.origen === origen && f.fusion.coleccion === col) {
                    idx.set(clave(origen, col, f.fusion.id_origen), f);
                }
            }
        }
        return idx;
    }

    // ---- Combinar -------------------------------------------------------------
    // store: tienda local (dueño). paquete: respaldo exportado por otro equipo.
    // opts: { usuario_id, turno_id } del dueño y su turno abierto.
    // Devuelve un reporte con lo agregado / omitido / saltado.
    async function combinar(store, paquete, opts) {
        const { Backup, Inv, Ventas, Unidades } = mods();
        if (!Backup || !Inv || !Ventas || !Unidades) {
            throw new Error('Módulos de fusión no disponibles.');
        }
        const adminId = opts && opts.usuario_id != null ? Number(opts.usuario_id) : null;
        const turnoId = opts && opts.turno_id != null ? Number(opts.turno_id) : null;
        if (!adminId) throw new Error('Falta el usuario que combina.');
        if (!turnoId) throw new Error('Abra un turno de caja para recibir las ventas.');

        // 1. Integridad del paquete (misma validación que restaurar).
        await Backup.validar(store, paquete);

        // 2. Origen: otro equipo y paquete no combinado antes.
        const origen = paquete.instalacion;
        if (!origen) throw new Error('El respaldo no trae identidad de equipo.');
        if (origen === store.instalacion()) {
            throw new Error('Es un respaldo de ESTE equipo: nada que combinar.');
        }
        const fusiones = await store.todos('fusiones');
        if (fusiones.some((f) => f && f.suma === paquete.suma)) {
            throw new Error('Este respaldo ya se combinó antes (sin cambios).');
        }

        // 3. Turno local abierto que recibe las ventas.
        const turno = await store.obtener('turnos', turnoId);
        if (!turno || turno.estado !== 'abierto') {
            throw new Error('Abra un turno de caja para recibir las ventas.');
        }

        // 4. Índices locales.
        const idx = await indiceFusion(store, origen);
        const catsLocal = await store.todos('categorias');
        const prodsLocal = await store.todos('productos');
        const catPorNombre = new Map();
        for (const c of catsLocal) { const k = normNom(c.nombre); if (k && !catPorNombre.has(k)) catPorNombre.set(k, c); }
        const prodPorSku = new Map();
        const prodPorNombre = new Map();
        for (const p of prodsLocal) {
            const s = normSku(p.sku);
            if (s && !prodPorSku.has(s)) prodPorSku.set(s, p);
            const k = normNom(p.nombre);
            if (k && !prodPorNombre.has(k)) prodPorNombre.set(k, p);
        }

        const rep = {
            origen,
            turno_id: turno.id,
            categorias_creadas: 0,
            productos_creados: 0,
            recetas_degradadas: 0,
            ventas_agregadas: 0,
            ventas_omitidas: 0,
            ventas_saltadas: 0,
            movimientos_agregados: 0,
            movimientos_omitidos: 0,
            movimientos_saltados: 0,
            total_agregado: 0,
            negativos: [],
        };

        // 5. Categorías: enlazar por marca o nombre, o crear.
        const mapCat = new Map();
        for (const c of filasDe(paquete, 'categorias').sort(porIdAsc)) {
            if (!c || c.id == null) continue;
            const hit = idx.get(clave(origen, 'categorias', c.id));
            if (hit) { mapCat.set(c.id, hit.id); continue; }
            const nom = String(c.nombre == null ? '' : c.nombre).trim();
            if (!nom) continue;
            const local = catPorNombre.get(normNom(nom));
            if (local) { mapCat.set(c.id, local.id); continue; }
            const creada = await store.insertar('categorias', {
                nombre: nom,
                activo: c.activo !== false,
                fusion: marca(origen, 'categorias', c.id),
            });
            catPorNombre.set(normNom(nom), creada);
            mapCat.set(c.id, creada.id);
            rep.categorias_creadas++;
        }

        // 6. Productos: enlazar por marca, SKU o nombre; si no, crear en stock 0.
        //    Las recetas se re-enlazan en un segundo pase (los insumos pueden
        //    venir después en el archivo).
        const mapProd = new Map();
        const creados = [];
        const TIPOS_OK = ['simple', 'receta', 'insumo'];
        for (const p of filasDe(paquete, 'productos').sort(porIdAsc)) {
            if (!p || p.id == null) continue;
            const hit = idx.get(clave(origen, 'productos', p.id));
            if (hit) { mapProd.set(p.id, hit.id); continue; }
            const nom = String(p.nombre == null ? '' : p.nombre).trim();
            if (!nom) continue;
            const sku = normSku(p.sku);
            const local = (sku && prodPorSku.get(sku)) || prodPorNombre.get(normNom(nom)) || null;
            if (local) { mapProd.set(p.id, local.id); continue; }
            let tipo = TIPOS_OK.includes(p.tipo) ? p.tipo : 'simple';
            let unidad = String(p.unidad || 'U');
            if (!Unidades.existe(unidad)) unidad = 'U';
            const creado = await store.insertar('productos', {
                sku: sku || null,
                nombre: nom,
                categoria_id: mapCat.has(p.categoria_id) ? mapCat.get(p.categoria_id) : null,
                descripcion: p.descripcion != null ? String(p.descripcion) : null,
                precio_costo: num(p.precio_costo),
                precio_venta: num(p.precio_venta),
                tipo,
                unidad,
                compra_unidad: p.compra_unidad != null ? String(p.compra_unidad) : null,
                compra_factor: num(p.compra_factor) > 0 ? num(p.compra_factor) : null,
                receta: [],
                stock: 0,
                stock_minimo: Math.max(0, num(p.stock_minimo)),
                activo: p.activo !== false,
                creado_en: p.creado_en || ahoraISO(),
                fusion: marca(origen, 'productos', p.id),
            });
            if (sku) prodPorSku.set(sku, creado);
            if (!prodPorNombre.has(normNom(nom))) prodPorNombre.set(normNom(nom), creado);
            mapProd.set(p.id, creado.id);
            creados.push({ src: p, local: creado });
            rep.productos_creados++;
        }
        for (const { src, local } of creados) {
            if (src.tipo !== 'receta' || !Array.isArray(src.receta)) continue;
            const lineas = [];
            for (const l of src.receta) {
                if (!l || !mapProd.has(l.insumo_id)) continue;
                const cant = num(l.cantidad);
                if (!(cant > 0)) continue;
                lineas.push({
                    insumo_id: mapProd.get(l.insumo_id),
                    cantidad: cant,
                    unidad: l.unidad != null ? String(l.unidad) : 'U',
                });
            }
            if (!lineas.length) {
                await store.actualizar('productos', local.id, { tipo: 'simple', receta: [] });
                rep.recetas_degradadas++;
            } else {
                await store.actualizar('productos', local.id, { receta: lineas });
            }
        }

        // 7. Ventas: solo nuevas; se asignan al turno abierto con el dueño.
        const mapVenta = new Map();
        const METODOS = Ventas.METODOS || ['efectivo', 'tarjeta', 'transferencia'];
        for (const v of filasDe(paquete, 'ventas').sort(porIdAsc)) {
            if (!v || v.id == null) continue;
            if (idx.get(clave(origen, 'ventas', v.id))) { rep.ventas_omitidas++; continue; }
            if (v.estado !== 'cobrada' && v.estado !== 'cancelada') { rep.ventas_saltadas++; continue; }
            if (!Array.isArray(v.detalles) || !v.detalles.length) { rep.ventas_saltadas++; continue; }
            if (!Array.isArray(v.pagos) || !v.pagos.length) { rep.ventas_saltadas++; continue; }
            let ok = true;
            const detalles = [];
            for (const d of v.detalles) {
                if (!d || !mapProd.has(d.producto_id)) { ok = false; break; }
                if (d.tipo !== 'simple' && d.tipo !== 'receta') { ok = false; break; }
                const det = {
                    producto_id: mapProd.get(d.producto_id),
                    nombre: d.nombre != null ? String(d.nombre) : '',
                    precio_unitario: num(d.precio_unitario),
                    costo_unitario: num(d.costo_unitario),
                    cantidad: num(d.cantidad),
                    subtotal: num(d.subtotal),
                    unidad: d.unidad != null ? String(d.unidad) : 'U',
                    tipo: d.tipo,
                };
                if (d.tipo === 'receta') {
                    if (!Array.isArray(d.consumo)) { ok = false; break; }
                    det.consumo = [];
                    for (const c of d.consumo) {
                        if (!c || !mapProd.has(c.insumo_id)) { ok = false; break; }
                        det.consumo.push({
                            insumo_id: mapProd.get(c.insumo_id),
                            cantidad_base: num(c.cantidad_base),
                        });
                    }
                    if (!ok) break;
                }
                detalles.push(det);
            }
            const pagos = [];
            if (ok) {
                for (const pg of v.pagos) {
                    if (!pg || !METODOS.includes(pg.metodo)) { ok = false; break; }
                    pagos.push({ metodo: pg.metodo, monto: num(pg.monto) });
                }
            }
            if (!ok) { rep.ventas_saltadas++; continue; }
            const total = num(v.total);
            const nv = await store.insertar('ventas', {
                turno_id: turno.id,
                usuario_id: adminId,
                usuario_nombre: v.usuario_nombre != null ? String(v.usuario_nombre) : 'Vendedor',
                subtotal: num(v.subtotal),
                descuento: num(v.descuento),
                iva_pct: num(v.iva_pct),
                iva_monto: num(v.iva_monto),
                total,
                cambio: num(v.cambio),
                detalles,
                pagos,
                estado: v.estado,
                motivo_cancelacion: v.motivo_cancelacion != null ? String(v.motivo_cancelacion) : null,
                creado_en: v.creado_en || ahoraISO(),
                dia: v.dia || null,
                fusion: marca(origen, 'ventas', v.id),
            });
            mapVenta.set(v.id, nv.id);
            rep.ventas_agregadas++;
            if (v.estado === 'cobrada') rep.total_agregado = r3(rep.total_agregado + total);
        }
        rep.total_agregado = r3(rep.total_agregado);

        // 8. Movimientos: solo nuevos; el stock se recalcula contra lo local.
        const TIPOS = Inv.TIPOS || [];
        for (const m of filasDe(paquete, 'movimientos').sort(porIdAsc)) {
            if (!m || m.id == null) continue;
            if (idx.get(clave(origen, 'movimientos', m.id))) { rep.movimientos_omitidos++; continue; }
            if (!mapProd.has(m.producto_id)) { rep.movimientos_saltados++; continue; }
            if (!TIPOS.includes(m.tipo)) { rep.movimientos_saltados++; continue; }
            const cant = num(m.cantidad);
            if (!Number.isFinite(cant) || cant === 0) { rep.movimientos_saltados++; continue; }
            // Solo movimientos causados por las ventas importadas: el inventario
            // propio del vendedor (entradas, ajustes, mermas) no toca el stock local.
            if (m.referencia_id == null) { rep.movimientos_saltados++; continue; }
            if (!mapVenta.has(m.referencia_id)) { rep.movimientos_saltados++; continue; }
            const ref = mapVenta.get(m.referencia_id);
            // El motivo cita el número de venta del otro equipo: re-etiquetar.
            let motivo = m.motivo != null ? String(m.motivo) : null;
            for (const pref of ['Venta #' + m.referencia_id, 'Cancela venta #' + m.referencia_id]) {
                if (motivo && motivo.indexOf(pref) === 0) {
                    motivo = (pref[0] === 'V' ? 'Venta #' : 'Cancela venta #') + ref + motivo.slice(pref.length);
                    break;
                }
            }
            const pid = mapProd.get(m.producto_id);
            const prod = await store.obtener('productos', pid);
            if (!prod) { rep.movimientos_saltados++; continue; }
            const antes = num(prod.stock);
            const despues = r3(antes + cant);
            await store.actualizar('productos', pid, { stock: despues });
            await store.insertar('movimientos', {
                producto_id: pid,
                tipo: m.tipo,
                cantidad: cant,
                unidad: m.unidad != null ? String(m.unidad) : 'U',
                cantidad_origen: m.cantidad_origen != null ? num(m.cantidad_origen) : null,
                unidad_origen: m.unidad_origen != null ? String(m.unidad_origen) : null,
                stock_antes: antes,
                stock_despues: despues,
                motivo,
                referencia_id: ref,
                usuario_id: adminId,
                creado_en: m.creado_en || ahoraISO(),
                dia: m.dia || null,
                fusion: marca(origen, 'movimientos', m.id),
            });
            rep.movimientos_agregados++;
            if (despues < 0) rep.negativos.push({ producto: prod.nombre, stock: despues });
        }

        // 9. Registrar el paquete para que no se combine dos veces.
        await store.insertar('fusiones', {
            origen,
            exportado_en: paquete.exportado_en || null,
            suma: paquete.suma,
            turno_id: turno.id,
            usuario_id: adminId,
            ventas: rep.ventas_agregadas,
            movimientos: rep.movimientos_agregados,
            productos: rep.productos_creados,
            categorias: rep.categorias_creadas,
            total: rep.total_agregado,
            creado_en: ahoraISO(),
        });

        return rep;
    }

    const api = { puedeExportar, puedeRestaurar, puedeCombinar, filasDe, combinar };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    const scope = typeof globalThis !== 'undefined' ? globalThis : window;
    scope.CFFusion = api;
})();
