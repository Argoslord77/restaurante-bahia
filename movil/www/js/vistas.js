// movil/www/js/vistas.js — Pantallas de la app (Fase 2).
// Vistas.inicio/pos/caja/ventas/ticket/productos/productoForm/kardex/
// inventario/reportes/ajustes/usuarios/mas/respaldo
(function (root, factory) {
    const mod = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = mod;
    else root.CFVistas = mod;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const $ = id => document.getElementById(id);
    const esc = s => String(s === null || s === undefined ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const fmt = n => '$' + (Number(n) || 0).toFixed(2);
    const fechaCorta = iso => { try { return new Date(iso).toLocaleString('es'); } catch (_) { return iso || ''; } };
    const hoyDIA = () => {
        const f = new Date(), p = n => String(n).padStart(2, '0');
        return `${f.getFullYear()}-${p(f.getMonth() + 1)}-${p(f.getDate())}`;
    };
    const G = n => globalThis[n];
    const I = n => G('CFIconos').icono(n);

    function vista(html) { $('vista').innerHTML = html; }
    function aviso(tipo, texto) {
        return `<div class="aviso ${tipo === 'ok' ? 'aviso-ok' : 'aviso-error'}">${texto}</div>`;
    }
    const pudeVer = (sesion, roles) => roles.includes(sesion.rol);

    // ── Inicio ──
    async function inicio(ctx, params) {
        const { store, sesion, ir } = ctx;
        const turno = await G('CFCaja').abierto(store);
        const hoy = hoyDIA();
        const lista = await G('CFVentas').listar(store, { desde: hoy, hasta: hoy });
        const bajo = await G('CFInventario').stockBajo(store);
        const bloqueada = !!(ctx.lic && ctx.lic.bloqueada);
        vista(`
        <div class="encabezado"><h1>Hola, ${esc(sesion.nombre)}</h1>
            <button class="btn btn-claro btn-chico" id="i-salir">${I('salir')}Salir</button></div>
        ${params && params.msg ? aviso(params.msg.tipo, esc(params.msg.texto)) : ''}
        <div class="rejilla c2">
            <div class="kpi"><div class="etiqueta">Caja</div>
                <div class="valor ${turno ? 'verde' : 'rojo'}">${turno ? 'Abierta' : 'Cerrada'}</div></div>
            <div class="kpi"><div class="etiqueta">Ventas hoy</div>
                <div class="valor">${lista.totales.n} · ${fmt(lista.totales.total)}</div></div>
        </div>
        ${bloqueada
        ? `<div class="tarjeta"><h3 class="con-icono">${I('candado')}Licencia bloqueada</h3><p>No se puede vender ni abrir trabajo nuevo.</p>
            <div class="grupo-btn"><button class="btn btn-primario" data-ir="licencia">Ver licencia</button></div></div>`
        : `<div class="tarjeta"><h3>Acciones</h3><div class="grupo-btn">
            <button class="btn btn-primario" data-ir="pos">Vender</button>
            ${pudeVer(sesion, ['administrador', 'cajero']) ? '<button class="btn btn-claro" data-ir="caja">Caja</button>' : ''}
            <button class="btn btn-claro" data-ir="ventas">Ventas</button>
            <button class="btn btn-claro" data-ir="mas">Más</button>
        </div></div>`}
        ${bajo.length ? `<div class="tarjeta"><h3>Stock bajo (${bajo.length})</h3>
            ${bajo.slice(0, 5).map(p => `<div>• ${esc(p.nombre)}: <strong>${p.stock}</strong></div>`).join('')}</div>` : ''}`);
        $('i-salir').addEventListener('click', () => ctx.salir());
        vistaBindIr(ctx);
    }

    function vistaBindIr(ctx) {
        document.querySelectorAll('#vista [data-ir]').forEach(b =>
            b.addEventListener('click', () => ctx.ir(b.getAttribute('data-ir'))));
    }

    // ── POS ──
    let carrito = [];
    async function pos(ctx) {
        const { store, sesion, ir } = ctx;
        const turno = await G('CFCaja').abierto(store);
        if (!turno) {
            vista(`<div class="encabezado"><h1>Vender</h1></div><div class="tarjeta">
                <p>La caja está cerrada: no se puede vender.</p>
                ${pudeVer(sesion, ['administrador', 'cajero'])
                    ? '<button class="btn btn-primario" data-ir="caja">Abrir caja</button>'
                    : '<p>Pida al cajero o administrador que abra la caja.</p>'}</div>`);
            vistaBindIr(ctx);
            return;
        }
        const ivaPct = await G('CFAjustes').ivaPct(store);
        vista(`<div class="encabezado"><h1>Vender</h1><span class="insignia ins-verde">Turno #${turno.id}</span></div>
        <div class="tarjeta"><div class="campo"><label>Buscar producto</label>
            <input id="p-q" placeholder="Nombre o SKU…" autocomplete="off"></div>
            <div id="p-res" class="resultados-busqueda"></div></div>
        <div class="tarjeta"><h3>Venta actual</h3><div id="p-car"></div>
            <div class="campo"><label>Descuento ($)</label>
                <input id="p-desc" type="number" min="0" step="0.01" value="0" inputmode="decimal"></div>
            <div class="totales"><div><span>Subtotal</span><span id="p-sub">$0.00</span></div>
                <div><span>Descuento</span><span id="p-des">$0.00</span></div>
                <div><span>IVA (${ivaPct}%)</span><span id="p-iva">$0.00</span></div>
                <div class="gran"><span>Total</span><span id="p-tot">$0.00</span></div></div>
            <h3>Cobro</h3>
            <div class="fila-form c2">
                <div class="campo"><label>Efectivo</label><input id="p-efe" type="number" min="0" step="0.01" value="0" inputmode="decimal"></div>
                <div class="campo"><label>Tarjeta</label><input id="p-tar" type="number" min="0" step="0.01" value="0" inputmode="decimal"></div>
            </div>
            <div class="campo"><label>Transferencia</label><input id="p-tra" type="number" min="0" step="0.01" value="0" inputmode="decimal"></div>
            <div class="totales"><div><span>Recibido</span><span id="p-rec">$0.00</span></div>
                <div><span>Cambio</span><span id="p-cam">$0.00</span></div></div>
            <div id="p-msg"></div>
            <div class="grupo-btn"><button class="btn btn-primario btn-bloque" id="p-cobrar">Cobrar</button>
            <button class="btn btn-claro btn-bloque" id="p-limpiar">Limpiar</button></div></div>`);

        const Money = G('CFMoney');
        function totales() {
            return Money.totales(carrito.map(l => ({ precio: l.precio, cantidad: l.cantidad })),
                                 $('p-desc').value, ivaPct);
        }
        function pintar() {
            const t = totales();
            const pagado = ['p-efe', 'p-tar', 'p-tra'].reduce((a, id) => a + (Number($(id).value) || 0), 0);
            $('p-sub').textContent = fmt(t.sub);
            $('p-des').textContent = fmt(t.desc);
            $('p-iva').textContent = fmt(t.iva);
            $('p-tot').textContent = fmt(t.total);
            $('p-rec').textContent = fmt(pagado);
            $('p-cam').textContent = fmt(Money.cambio(pagado, t.total));
            const caja = $('p-car');
            caja.innerHTML = '';
            if (!carrito.length) { caja.innerHTML = '<p class="suave">Carrito vacío.</p>'; return; }
            carrito.forEach((l, i) => {
                const div = document.createElement('div');
                div.className = 'carrito-linea';
                div.innerHTML = `<div><strong></strong><br><small></small></div>
                    <div class="num"><strong></strong></div>
                    <div class="controles"><button type="button" class="cant-btn" data-a="-">−</button>
                    <span></span><button type="button" class="cant-btn" data-a="+">+</button>
                    <button type="button" class="cant-btn" data-a="x">×</button></div>`;
                div.querySelector('strong').textContent = l.nombre;
                div.querySelector('small').textContent = `${fmt(l.precio)} c/u · stock: ${l.stock}`;
                div.querySelector('.num strong').textContent = fmt(l.precio * l.cantidad);
                div.querySelector('.controles span').textContent = l.cantidad + ' pza';
                div.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
                    const a = b.getAttribute('data-a');
                    if (a === '+') { if (l.cantidad < l.stock) l.cantidad++; }
                    else if (a === '-') { l.cantidad--; if (l.cantidad <= 0) carrito.splice(i, 1); }
                    else carrito.splice(i, 1);
                    pintar();
                }));
                caja.appendChild(div);
            });
        }
        let timer = null;
        $('p-q').addEventListener('input', e => {
            clearTimeout(timer);
            timer = setTimeout(async () => {
                const res = await G('CFProductos').buscarParaVenta(store, e.target.value);
                $('p-res').innerHTML = res.length ? '' : '<p class="suave">Sin resultados.</p>';
                res.forEach(p => {
                    const b = document.createElement('button');
                    b.type = 'button'; b.className = 'producto-hit';
                    b.innerHTML = `<div><div class="nombre"></div><div class="detalle"></div></div><div class="precio"></div>`;
                    b.querySelector('.nombre').textContent = p.nombre;
                    b.querySelector('.detalle').textContent = (p.sku ? p.sku + ' · ' : '') + 'stock: ' + p.stock;
                    b.querySelector('.precio').textContent = fmt(p.precio_venta);
                    b.addEventListener('click', () => {
                        const l = carrito.find(x => x.id === p.id);
                        if (l) {
                            if (l.cantidad >= p.stock) { $('p-msg').innerHTML = aviso('error', 'Sin stock suficiente.'); return; }
                            l.cantidad++;
                        } else {
                            if (p.stock < 1) { $('p-msg').innerHTML = aviso('error', 'Sin stock.'); return; }
                            carrito.push({ id: p.id, nombre: p.nombre, precio: Number(p.precio_venta), stock: p.stock, cantidad: 1 });
                        }
                        $('p-msg').innerHTML = '';
                        pintar();
                    });
                    $('p-res').appendChild(b);
                });
            }, 200);
        });
        ['p-desc', 'p-efe', 'p-tar', 'p-tra'].forEach(id => $(id).addEventListener('input', pintar));
        $('p-limpiar').addEventListener('click', () => {
            carrito = [];
            $('p-desc').value = 0; $('p-efe').value = 0; $('p-tar').value = 0; $('p-tra').value = 0;
            $('p-msg').innerHTML = '';
            pintar();
        });
        $('p-cobrar').addEventListener('click', async ev => {
            $('p-msg').innerHTML = '';
            const t = totales();
            if (!carrito.length) { $('p-msg').innerHTML = aviso('error', 'El carrito está vacío.'); return; }
            const pagos = [
                { metodo: 'efectivo', monto: Number($('p-efe').value) || 0 },
                { metodo: 'tarjeta', monto: Number($('p-tar').value) || 0 },
                { metodo: 'transferencia', monto: Number($('p-tra').value) || 0 }
            ].filter(p => p.monto > 0);
            ev.target.disabled = true;
            try {
                const r = await G('CFVentas').crear(store, {
                    usuario_id: sesion.id, turno_id: turno.id,
                    items: carrito.map(l => ({ producto_id: l.id, cantidad: l.cantidad })),
                    descuento: t.desc, pagos
                });
                carrito = [];
                ir('ticket', { id: r.venta_id });
            } catch (e) {
                ev.target.disabled = false;
                $('p-msg').innerHTML = aviso('error', e.message);
            }
        });
        pintar();
    }

    // ── Ticket ──
    async function ticket(ctx, params) {
        const t = await G('CFReportes').ticket(ctx.store, params.id);
        if (!t) { ctx.ir('ventas'); return; }
        const v = t.venta;
        vista(`<div class="ticket">
            <h2>${esc(t.negocio)}</h2>
            <div class="centrado">Ticket de venta #${v.id}<br>${esc(fechaCorta(v.creado_en))} · ${esc(v.usuario_nombre || '')}</div>
            <div class="linea"></div>
            <table>${t.detalles.map(d => `<tr><td>${d.cantidad} × ${esc(d.nombre)}<br><small>${fmt(d.precio_unitario)} c/u</small></td>
                <td style="text-align:right;">${fmt(d.subtotal)}</td></tr>`).join('')}</table>
            <div class="linea"></div>
            <table><tr><td>Subtotal</td><td style="text-align:right;">${fmt(v.subtotal)}</td></tr>
            ${Number(v.descuento) > 0 ? `<tr><td>Descuento</td><td style="text-align:right;">−${fmt(v.descuento)}</td></tr>` : ''}
            <tr><td>IVA</td><td style="text-align:right;">${fmt(v.iva_monto)}</td></tr>
            <tr><td class="total">TOTAL</td><td style="text-align:right;" class="total">${fmt(v.total)}</td></tr></table>
            <div class="linea"></div>
            ${t.pagos.map(p => `<div>${esc(p.metodo)}: ${fmt(p.monto)}</div>`).join('')}
            ${Number(v.cambio) > 0 ? `<div><strong>Cambio: ${fmt(v.cambio)}</strong></div>` : ''}
            ${v.estado === 'cancelada' ? '<div class="centrado"><strong>*** VENTA CANCELADA ***</strong></div>' : ''}
            <div class="linea"></div><div class="centrado">${esc(t.pie)}</div></div>
        <div id="t-msg"></div>
        <div class="grupo-btn no-imprimir" style="margin-top:12px;">
            <button class="btn btn-claro" id="t-print">${I('impresora')}Imprimir</button>
            <button class="btn btn-primario" data-ir="pos">Nueva venta</button></div>`);
        vistaBindIr(ctx);
        $('t-print').addEventListener('click', async () => {
            try {
                await G('CFImpresora').imprimirTicket(ctx.store, v.id);
                $('t-msg').innerHTML = aviso('ok', 'Ticket enviado a la impresora.');
            } catch (e) {
                if (e.code === 'SIN_IMPRESORA') { ctx.ir('impresora'); return; }
                $('t-msg').innerHTML = aviso('error', e.message);
            }
        });
    }

    // ── Caja ──
    async function caja(ctx) {
        const { store, sesion, ir } = ctx;
        if (!pudeVer(sesion, ['administrador', 'cajero'])) { ir('inicio'); return; }
        const turno = await G('CFCaja').abierto(store);
        const bloqueada = !!(ctx.lic && ctx.lic.bloqueada);
        const historial = await G('CFCaja').historial(store, 10);
        if (!turno && bloqueada) {
            vista(`<div class="encabezado"><h1>Caja</h1></div><div class="tarjeta">
                <p>Licencia bloqueada: no se puede abrir caja.</p>
                <button class="btn btn-primario" data-ir="licencia">Ver licencia</button></div>`);
            vistaBindIr(ctx);
            return;
        }
        if (!turno) {
            vista(`<div class="encabezado"><h1>Caja</h1></div><div class="tarjeta">
                <h3>Abrir turno</h3><div id="c-msg"></div>
                <div class="campo"><label>Fondo inicial ($)</label>
                    <input id="c-fondo" type="number" min="0" step="0.01" value="0" inputmode="decimal"></div>
                <button class="btn btn-primario btn-bloque" id="c-abrir">Abrir caja</button></div>
                ${historialHtml(historial)}`);
            $('c-abrir').addEventListener('click', async () => {
                try {
                    await G('CFCaja').abrir(store, { usuario_id: sesion.id, fondo: $('c-fondo').value });
                    ir('pos');
                } catch (e) { $('c-msg').innerHTML = aviso('error', e.message); }
            });
            return;
        }
        const r = await G('CFCaja').resumen(store, turno.id);
        vista(`<div class="encabezado"><h1>Caja · turno #${turno.id}</h1></div>
        <div class="rejilla c2">
            <div class="kpi"><div class="etiqueta">Fondo</div><div class="valor">${fmt(r.fondo)}</div></div>
            <div class="kpi"><div class="etiqueta">Vendido</div><div class="valor verde">${fmt(r.ventas_total)} (${r.ventas_n})</div></div>
        </div>
        <div class="tarjeta"><h3>Cobrado por método</h3>
            <div class="totales"><div><span>Efectivo</span><span>${fmt(r.porMetodo.efectivo)}</span></div>
            <div><span>Tarjeta</span><span>${fmt(r.porMetodo.tarjeta)}</span></div>
            <div><span>Transferencia</span><span>${fmt(r.porMetodo.transferencia)}</span></div>
            <div class="gran"><span>Esperado en caja</span><span>${fmt(r.esperado_efectivo)}</span></div></div></div>
        <div class="tarjeta"><h3>Cerrar turno</h3><div id="c-msg"></div>
            <div class="campo"><label>Efectivo contado ($)</label>
                <input id="c-conteo" type="number" min="0" step="0.01" inputmode="decimal"></div>
            <div class="campo"><label>Nota (opcional)</label><input id="c-nota" maxlength="200"></div>
            <button class="btn btn-peligro btn-bloque" id="c-cerrar">Cerrar turno</button></div>
        ${historialHtml(historial)}`);
        $('c-cerrar').addEventListener('click', async () => {
            if (!$('c-conteo').value) { $('c-msg').innerHTML = aviso('error', 'Capture el efectivo contado.'); return; }
            if (!confirm('¿Cerrar el turno? Después no podrá vender hasta abrir otro.')) return;
            try {
                const c = await G('CFCaja').cerrar(store, {
                    turno_id: turno.id, usuario_id: sesion.id,
                    conteo_efectivo: $('c-conteo').value, nota: $('c-nota').value });
                ir('inicio', { msg: { tipo: c.diferencia === 0 ? 'ok' : 'error',
                    texto: `Turno cerrado. Diferencia: ${fmt(c.diferencia)}` } });
            } catch (e) { $('c-msg').innerHTML = aviso('error', e.message); }
        });
    }

    function historialHtml(historial) {
        return `<div class="tarjeta"><h3>Historial</h3><div class="contenedor-tabla"><table class="tabla">
            <thead><tr><th>#</th><th>Apertura</th><th class="num">Ventas</th><th class="num">Total</th><th></th></tr></thead><tbody>
            ${historial.length ? historial.map(t => `<tr><td>#${t.id}</td>
                <td>${esc(fechaCorta(t.abierto_en))}</td><td class="num">${t.ventas_n}</td>
                <td class="num">${fmt(t.ventas_total)}</td>
                <td><span class="insignia ${t.estado === 'abierto' ? 'ins-verde' : 'ins-gris'}">${t.estado}</span></td></tr>`).join('')
            : '<tr><td colspan="5">Sin turnos aún.</td></tr>'}</tbody></table></div></div>`;
    }

    // ── Ventas ──
    async function ventas(ctx, params) {
        const { store, sesion, ir } = ctx;
        const f = (params && params.f) || { desde: hoyDIA(), hasta: hoyDIA(), estado: '' };
        const r = await G('CFVentas').listar(store, f);
        const puedeCancelar = pudeVer(sesion, ['administrador', 'cajero']) && !(ctx.lic && ctx.lic.bloqueada);
        vista(`<div class="encabezado"><h1>Ventas</h1></div>
        <div class="tarjeta"><div class="fila-form c2">
            <div class="campo"><label>Desde</label><input type="date" id="v-desde" value="${esc(f.desde)}"></div>
            <div class="campo"><label>Hasta</label><input type="date" id="v-hasta" value="${esc(f.hasta)}"></div></div>
            <div class="campo"><label>Estado</label><select id="v-estado">
                <option value="" ${!f.estado ? 'selected' : ''}>Todos</option>
                <option value="cobrada" ${f.estado === 'cobrada' ? 'selected' : ''}>Cobradas</option>
                <option value="cancelada" ${f.estado === 'cancelada' ? 'selected' : ''}>Canceladas</option></select></div>
            <button class="btn btn-claro btn-bloque" id="v-filtrar">Filtrar (${r.totales.n} · ${fmt(r.totales.total)})</button>
            <button class="btn btn-claro btn-bloque" id="v-csv" style="margin-top:8px;">${I('descargar')}Exportar CSV</button></div>
        <div class="tarjeta"><div class="contenedor-tabla"><table class="tabla">
            <thead><tr><th>#</th><th>Fecha</th><th class="num">Total</th><th></th></tr></thead><tbody>
            ${r.filas.length ? r.filas.map(v => `<tr><td>#${v.id}</td><td>${esc(fechaCorta(v.creado_en))}</td>
                <td class="num"><strong>${fmt(v.total)}</strong><br>
                <span class="insignia ${v.estado === 'cobrada' ? 'ins-verde' : 'ins-roja'}">${v.estado}</span></td>
                <td><button class="btn btn-claro btn-chico" data-ticket="${v.id}">Ticket</button>
                ${v.estado === 'cobrada' && puedeCancelar ? `<button class="btn btn-peligro btn-chico" data-cancelar="${v.id}">Anular</button>` : ''}</td></tr>`).join('')
            : '<tr><td colspan="4">Sin ventas en el rango.</td></tr>'}</tbody></table></div></div>`);
        $('v-filtrar').addEventListener('click', () => ir('ventas', { f: {
            desde: $('v-desde').value || hoyDIA(), hasta: $('v-hasta').value || $('v-desde').value || hoyDIA(),
            estado: $('v-estado').value || null } }));
        $('v-csv').addEventListener('click', async () => {
            try {
                await G('CFBackup').compartir(G('CFCsv').ventas(r), G('CFCsv').nombre('ventas'));
            } catch (e) { alert(e.message); }
        });
        document.querySelectorAll('#vista [data-ticket]').forEach(b =>
            b.addEventListener('click', () => ir('ticket', { id: Number(b.getAttribute('data-ticket')) })));
        document.querySelectorAll('#vista [data-cancelar]').forEach(b =>
            b.addEventListener('click', async () => {
                const id = Number(b.getAttribute('data-cancelar'));
                if (!confirm(`¿Cancelar la venta #${id}? Se devolverá el stock.`)) return;
                const motivo = prompt('Motivo (opcional):', '');
                if (motivo === null) return;
                try {
                    await G('CFVentas').cancelar(store, { venta_id: id, usuario_id: sesion.id, motivo });
                    ir('ventas', { f });
                } catch (e) { alert(e.message); }
            }));
    }

    // ── Productos ──
    async function productos(ctx, params) {
        const { store, sesion, ir } = ctx;
        const esAdmin = pudeVer(sesion, ['administrador']);
        const q = (params && params.q) || '';
        const filas = await G('CFProductos').listar(store, { q, activos: false });
        vista(`<div class="encabezado"><h1>Productos</h1>
            ${esAdmin ? '<button class="btn btn-primario btn-chico" id="pr-nuevo">+ Nuevo</button>' : ''}</div>
        <div class="tarjeta"><div class="campo"><label>Buscar</label>
            <input id="pr-q" value="${esc(q)}" placeholder="Nombre o SKU…"></div></div>
        <div class="tarjeta"><div class="contenedor-tabla"><table class="tabla">
            <thead><tr><th>Producto</th><th class="num">Precio</th><th class="num">Stock</th><th></th></tr></thead><tbody>
            ${filas.length ? filas.map(p => `<tr><td><strong>${esc(p.nombre)}</strong><br>
                <small>${esc(p.sku || '—')} · ${esc(p.categoria_nombre || '—')}</small>
                ${p.activo ? '' : ' <span class="insignia ins-gris">inactivo</span>'}</td>
                <td class="num">${fmt(p.precio_venta)}</td>
                <td class="num"><strong class="${p.stock <= p.stock_minimo ? 'texto-mal' : ''}">${p.stock}</strong></td>
                <td><button class="btn btn-claro btn-chico" data-kardex="${p.id}">Kardex</button>
                ${esAdmin ? `<button class="btn btn-claro btn-chico" data-editar="${p.id}">Editar</button>` : ''}</td></tr>`).join('')
            : '<tr><td colspan="4">Sin productos.</td></tr>'}</tbody></table></div></div>`);
        let timer = null;
        $('pr-q').addEventListener('input', e => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                if (e.target.value !== q) ir('productos', { q: e.target.value });
            }, 400);
        });
        if (esAdmin) $('pr-nuevo').addEventListener('click', () => ir('productoForm', {}));
        document.querySelectorAll('#vista [data-kardex]').forEach(b =>
            b.addEventListener('click', () => ir('kardex', { id: Number(b.getAttribute('data-kardex')) })));
        document.querySelectorAll('#vista [data-editar]').forEach(b =>
            b.addEventListener('click', () => ir('productoForm', { id: Number(b.getAttribute('data-editar')) })));
    }

    async function productoForm(ctx, params) {
        const { store, sesion, ir } = ctx;
        if (!pudeVer(sesion, ['administrador'])) { ir('productos'); return; }
        const id = params.id ? Number(params.id) : null;
        const p = id ? await G('CFProductos').obtener(store, id) : null;
        const cats = await G('CFProductos').listarCategorias(store);
        vista(`<div class="encabezado"><h1>${p ? 'Editar producto' : 'Nuevo producto'}</h1></div>
        <div class="tarjeta"><div id="pf-msg"></div>
            <div class="campo"><label>Nombre *</label><input id="pf-nombre" value="${esc(p ? p.nombre : '')}" maxlength="150"></div>
            <div class="fila-form c2">
                <div class="campo"><label>SKU</label><input id="pf-sku" value="${esc(p && p.sku ? p.sku : '')}" maxlength="60"></div>
                <div class="campo"><label>Categoría</label><select id="pf-cat">
                    <option value="">—</option>${cats.map(c => `<option value="${c.id}" ${p && Number(p.categoria_id) === c.id ? 'selected' : ''}>${esc(c.nombre)}</option>`).join('')}</select></div></div>
            <div class="fila-form c2">
                <div class="campo"><label>Costo</label><input id="pf-costo" type="number" min="0" step="0.01" value="${p ? p.precio_costo : 0}" inputmode="decimal"></div>
                <div class="campo"><label>Venta</label><input id="pf-venta" type="number" min="0" step="0.01" value="${p ? p.precio_venta : 0}" inputmode="decimal"></div></div>
            <div class="fila-form c2">
                ${!p ? '<div class="campo"><label>Stock inicial</label><input id="pf-ini" type="number" min="0" value="0" inputmode="numeric"></div>' : ''}
                <div class="campo"><label>Stock mínimo</label><input id="pf-min" type="number" min="0" value="${p ? p.stock_minimo : 0}" inputmode="numeric"></div></div>
            <div class="grupo-btn"><button class="btn btn-primario" id="pf-ok">Guardar</button>
                <button class="btn btn-claro" data-ir="productos">Volver</button>
                ${p ? `<button class="btn ${p.activo ? 'btn-peligro' : 'btn-claro'}" id="pf-toggle">${p.activo ? 'Desactivar' : 'Activar'}</button>` : ''}</div></div>
        <div class="tarjeta"><h3>Nueva categoría</h3>
            <div class="campo"><input id="pf-catnom" placeholder="Nombre…" maxlength="100"></div>
            <button class="btn btn-claro" id="pf-catok">Crear categoría</button></div>`);
        vistaBindIr(ctx);
        $('pf-ok').addEventListener('click', async () => {
            const datos = { nombre: $('pf-nombre').value, sku: $('pf-sku').value,
                categoria_id: $('pf-cat').value || null, precio_costo: $('pf-costo').value,
                precio_venta: $('pf-venta').value, stock_minimo: $('pf-min').value };
            try {
                if (p) { await G('CFProductos').actualizar(store, p.id, datos); }
                else { datos.stock_inicial = $('pf-ini').value; await G('CFProductos').crear(store, datos, sesion.id); }
                ir('productos', {});
            } catch (e) { $('pf-msg').innerHTML = aviso('error', e.message); }
        });
        if (p) $('pf-toggle').addEventListener('click', async () => {
            await G('CFProductos').cambiarActivo(store, p.id, !p.activo);
            ir('productoForm', { id: p.id });
        });
        $('pf-catok').addEventListener('click', async () => {
            try {
                const nid = await G('CFProductos').crearCategoria(store, $('pf-catnom').value);
                ir('productoForm', { id: id || undefined });
            } catch (e) { $('pf-msg').innerHTML = aviso('error', e.message); }
        });
    }

    async function kardex(ctx, params) {
        const p = await G('CFProductos').obtener(ctx.store, params.id);
        if (!p) { ctx.ir('productos'); return; }
        const movs = await G('CFInventario').kardex(ctx.store, params.id);
        vista(`<div class="encabezado"><h1>Kardex</h1><button class="btn btn-claro btn-chico" data-ir="productos">Volver</button></div>
        <div class="kpi"><div class="etiqueta">${esc(p.nombre)} · stock actual</div><div class="valor">${p.stock}</div></div>
        <div class="tarjeta"><div class="contenedor-tabla"><table class="tabla">
            <thead><tr><th>Fecha</th><th>Tipo</th><th class="num">Cant.</th><th class="num">Quedó</th></tr></thead><tbody>
            ${movs.length ? movs.map(m => `<tr><td>${esc(fechaCorta(m.creado_en))}</td>
                <td><span class="insignia ${m.cantidad >= 0 ? 'ins-verde' : 'ins-roja'}">${esc(m.tipo)}</span><br><small>${esc(m.motivo || '')}</small></td>
                <td class="num">${m.cantidad > 0 ? '+' : ''}${m.cantidad}</td><td class="num">${m.stock_despues}</td></tr>`).join('')
            : '<tr><td colspan="4">Sin movimientos.</td></tr>'}</tbody></table></div></div>`);
        vistaBindIr(ctx);
    }

    // ── Inventario ──
    async function inventario(ctx) {
        const { store, sesion } = ctx;
        const esAdmin = pudeVer(sesion, ['administrador']);
        const movs = await G('CFInventario').recientes(store, 30);
        const bajo = await G('CFInventario').stockBajo(store);
        const prods = await G('CFProductos').listar(store, { activos: false });
        vista(`<div class="encabezado"><h1>Inventario</h1></div>
        ${esAdmin ? `<div class="tarjeta"><h3>Entrada / salida</h3><div id="in-msg"></div>
            <div class="campo"><label>Producto</label><select id="in-prod">
                ${prods.map(p => `<option value="${p.id}">${esc(p.nombre)} (${p.stock})</option>`).join('')}</select></div>
            <div class="fila-form c2">
                <div class="campo"><label>Tipo</label><select id="in-tipo"><option value="entrada">Entrada</option><option value="salida">Salida</option></select></div>
                <div class="campo"><label>Cantidad</label><input id="in-cant" type="number" min="1" value="1" inputmode="numeric"></div></div>
            <div class="campo"><label>Motivo</label><input id="in-mot" maxlength="150" placeholder="Ej. compra a proveedor"></div>
            <button class="btn btn-primario btn-bloque" id="in-ok">Guardar movimiento</button></div>` : ''}
        <div class="tarjeta"><h3>Stock bajo (${bajo.length})</h3>
            ${bajo.length ? bajo.map(p => `<div>• ${esc(p.nombre)}: <strong>${p.stock}</strong> (mín. ${p.stock_minimo})</div>`).join('') : '<p>Todo en niveles normales.</p>'}</div>
        <div class="tarjeta"><h3>Recientes</h3><div class="contenedor-tabla"><table class="tabla">
            <thead><tr><th>Fecha</th><th>Producto</th><th>Tipo</th><th class="num">Cant.</th></tr></thead><tbody>
            ${movs.length ? movs.map(m => `<tr><td>${esc(fechaCorta(m.creado_en))}</td><td>${esc(m.producto_nombre)}</td>
                <td><span class="insignia ${m.cantidad >= 0 ? 'ins-verde' : 'ins-roja'}">${esc(m.tipo)}</span></td>
                <td class="num">${m.cantidad > 0 ? '+' : ''}${m.cantidad}</td></tr>`).join('')
            : '<tr><td colspan="4">Sin movimientos.</td></tr>'}</tbody></table></div></div>`);
        if (esAdmin) $('in-ok').addEventListener('click', async () => {
            try {
                await G('CFInventario').registrar(store, {
                    producto_id: $('in-prod').value, tipo: $('in-tipo').value,
                    cantidad: $('in-cant').value, motivo: $('in-mot').value || null, usuario_id: sesion.id });
                ctx.ir('inventario');
            } catch (e) { $('in-msg').innerHTML = aviso('error', e.message); }
        });
    }

    // ── Reportes ──
    async function reportes(ctx, params) {
        const { store, sesion, ir } = ctx;
        if (!pudeVer(sesion, ['administrador', 'cajero'])) { ir('inicio'); return; }
        const tab = (params && params.tab) || 'dia';
        const f = (params && params.f) || { desde: hoyDIA(), hasta: hoyDIA() };
        const tabs = `<div class="grupo-btn" style="margin-bottom:12px;">
            <button class="btn ${tab === 'dia' ? 'btn-primario' : 'btn-claro'} btn-chico" data-tab="dia">Por día</button>
            <button class="btn ${tab === 'mas' ? 'btn-primario' : 'btn-claro'} btn-chico" data-tab="mas">Más vendidos</button>
            <button class="btn ${tab === 'inv' ? 'btn-primario' : 'btn-claro'} btn-chico" data-tab="inv">Valorizado</button>
            <button class="btn btn-claro btn-chico" id="r-csv">${I('descargar')}CSV</button></div>`;
        if (tab === 'inv') {
            const r = await G('CFInventario').valorizado(store);
            vista(`<div class="encabezado"><h1>Reportes</h1></div><div class="tarjeta">${tabs}</div>
            <div class="rejilla c2"><div class="kpi"><div class="etiqueta">A costo</div><div class="valor">${fmt(r.totales.costo)}</div></div>
            <div class="kpi"><div class="etiqueta">A venta</div><div class="valor verde">${fmt(r.totales.venta)}</div></div></div>
            <div class="tarjeta"><div class="contenedor-tabla"><table class="tabla">
                <thead><tr><th>Producto</th><th class="num">Stock</th><th class="num">V. costo</th><th class="num">V. venta</th></tr></thead><tbody>
                ${r.filas.map(p => `<tr><td>${esc(p.nombre)}</td><td class="num">${p.stock}</td>
                    <td class="num">${fmt(p.valor_costo)}</td><td class="num">${fmt(p.valor_venta)}</td></tr>`).join('')}
                </tbody></table></div></div>`);
        } else if (tab === 'mas') {
            const r = await G('CFReportes').masVendidos(store, { ...f, limite: 15 });
            vista(`<div class="encabezado"><h1>Reportes</h1></div><div class="tarjeta">${tabs}${filtrosFechas(f)}</div>
            <div class="tarjeta"><div class="contenedor-tabla"><table class="tabla">
                <thead><tr><th>#</th><th>Producto</th><th class="num">Pzas</th><th class="num">Monto</th></tr></thead><tbody>
                ${r.filas.length ? r.filas.map((x, i) => `<tr><td>${i + 1}</td><td>${esc(x.nombre)}</td>
                    <td class="num">${x.cantidad}</td><td class="num">${fmt(x.importe)}</td></tr>`).join('')
                : '<tr><td colspan="4">Sin ventas en el rango.</td></tr>'}</tbody></table></div></div>`);
        } else {
            const r = await G('CFReportes').ventasPorDia(store, f);
            vista(`<div class="encabezado"><h1>Reportes</h1></div><div class="tarjeta">${tabs}${filtrosFechas(f)}</div>
            <div class="tarjeta"><div class="contenedor-tabla"><table class="tabla">
                <thead><tr><th>Día</th><th class="num">Ventas</th><th class="num">Total</th><th class="num">Utilidad</th></tr></thead><tbody>
                ${r.dias.length ? r.dias.map(x => `<tr><td>${esc(x.dia)}</td><td class="num">${x.n}</td>
                    <td class="num">${fmt(x.total)}</td><td class="num">${fmt(x.utilidad)}</td></tr>`).join('')
                : '<tr><td colspan="4">Sin ventas en el rango.</td></tr>'}</tbody>
                <tfoot><tr><td>Total</td><td class="num">${r.totales.n}</td>
                    <td class="num">${fmt(r.totales.total)}</td><td class="num">${fmt(r.totales.utilidad)}</td></tr></tfoot>
                </table></div></div>`);
        }
        document.querySelectorAll('#vista [data-tab]').forEach(b =>
            b.addEventListener('click', () => ir('reportes', { tab: b.getAttribute('data-tab'), f })));
        const bf = $('r-filtrar');
        if (bf) bf.addEventListener('click', () => ir('reportes', { tab, f: {
            desde: $('r-desde').value || hoyDIA(), hasta: $('r-hasta').value || $('r-desde').value || hoyDIA() } }));
        $('r-csv').addEventListener('click', async () => {
            try {
                let texto, nombre;
                if (tab === 'inv') {
                    texto = G('CFCsv').valorizado(await G('CFInventario').valorizado(store));
                    nombre = G('CFCsv').nombre('inventario');
                } else if (tab === 'mas') {
                    texto = G('CFCsv').masVendidos(await G('CFReportes').masVendidos(store, { ...f, limite: 50 }));
                    nombre = G('CFCsv').nombre('mas-vendidos');
                } else {
                    texto = G('CFCsv').ventasPorDia(await G('CFReportes').ventasPorDia(store, f));
                    nombre = G('CFCsv').nombre('ventas-dia');
                }
                await G('CFBackup').compartir(texto, nombre);
            } catch (e) { alert(e.message); }
        });
    }

    function filtrosFechas(f) {
        return `<div class="fila-form c2">
            <div class="campo"><label>Desde</label><input type="date" id="r-desde" value="${esc(f.desde)}"></div>
            <div class="campo"><label>Hasta</label><input type="date" id="r-hasta" value="${esc(f.hasta)}"></div></div>
            <button class="btn btn-claro btn-bloque" id="r-filtrar">Filtrar</button>`;
    }

    // ── Ajustes ──
    async function ajustes(ctx) {
        const { store, sesion, ir } = ctx;
        if (!pudeVer(sesion, ['administrador'])) { ir('inicio'); return; }
        const a = await G('CFAjustes').todos(store);
        vista(`<div class="encabezado"><h1>Ajustes</h1></div>
        <div class="tarjeta"><div id="a-msg"></div>
            <div class="campo"><label>Nombre del negocio</label><input id="a-nom" value="${esc(a.negocio_nombre || '')}" maxlength="150"></div>
            <div class="campo"><label>IVA (%)</label><input id="a-iva" type="number" min="0" max="100" step="0.01" value="${esc(a.iva_pct || '16')}" inputmode="decimal"></div>
            <div class="campo"><label>Pie del ticket</label><input id="a-pie" value="${esc(a.ticket_pie || '')}" maxlength="255"></div>
            <button class="btn btn-primario btn-bloque" id="a-ok">Guardar</button></div>
        <div class="tarjeta"><h3>Datos de ejemplo</h3>
            <p class="suave">Crea 3 categorías y 8 productos con stock. Solo si el catálogo está vacío.</p>
            <button class="btn btn-claro btn-bloque" id="a-demo">Cargar datos de ejemplo</button></div>`);
        $('a-ok').addEventListener('click', async () => {
            const iva = Number($('a-iva').value);
            if (!Number.isFinite(iva) || iva < 0 || iva > 100) {
                $('a-msg').innerHTML = aviso('error', 'IVA no válido (0-100).'); return;
            }
            await G('CFAjustes').set(store, 'negocio_nombre', $('a-nom').value || 'Mi Negocio');
            await G('CFAjustes').set(store, 'iva_pct', iva.toFixed(2));
            await G('CFAjustes').set(store, 'ticket_pie', $('a-pie').value || '');
            $('a-msg').innerHTML = aviso('ok', 'Ajustes guardados.');
        });
        $('a-demo').addEventListener('click', async () => {
            if (!confirm('¿Cargar los datos de ejemplo?')) return;
            try {
                const n = await G('CFDatos').sembrar(store, sesion.id);
                $('a-msg').innerHTML = aviso('ok', `Se crearon ${n} productos de ejemplo.`);
            } catch (e) { $('a-msg').innerHTML = aviso('error', e.message); }
        });
    }

    // ── Usuarios ──
    async function usuarios(ctx) {
        const { store, sesion, ir } = ctx;
        if (!pudeVer(sesion, ['administrador'])) { ir('inicio'); return; }
        const lista = await G('CFUsers').listar(store);
        vista(`<div class="encabezado"><h1>Usuarios</h1></div>
        <div class="tarjeta"><h3>Lista</h3><div class="contenedor-tabla"><table class="tabla">
            <thead><tr><th>Nombre</th><th>Rol</th><th></th></tr></thead><tbody>
            ${lista.map(u => `<tr><td>${esc(u.nombre)} ${u.activo ? '' : '<span class="insignia ins-gris">inactivo</span>'}</td>
                <td>${esc(u.rol)}</td>
                <td><button class="btn btn-claro btn-chico" data-pin="${u.id}">PIN</button>
                ${u.id !== sesion.id ? `<button class="btn btn-claro btn-chico" data-tog="${u.id}">${u.activo ? 'Desactivar' : 'Activar'}</button>` : ''}</td></tr>`).join('')}
            </tbody></table></div></div>
        <div class="tarjeta"><h3>Nuevo usuario</h3><div id="u-msg"></div>
            <div class="campo"><label>Nombre</label><input id="u-nom" maxlength="120"></div>
            <div class="fila-form c2">
                <div class="campo"><label>PIN (4-6 dígitos)</label><input id="u-pin" type="password" inputmode="numeric" maxlength="6"></div>
                <div class="campo"><label>Rol</label><select id="u-rol">
                    <option value="vendedor">vendedor</option><option value="cajero">cajero</option>
                    <option value="administrador">administrador</option></select></div></div>
            <button class="btn btn-primario btn-bloque" id="u-ok">Crear usuario</button></div>`);
        $('u-ok').addEventListener('click', async () => {
            try {
                await G('CFUsers').crear(store, { nombre: $('u-nom').value, pin: $('u-pin').value, rol: $('u-rol').value });
                ir('usuarios');
            } catch (e) { $('u-msg').innerHTML = aviso('error', e.message); }
        });
        document.querySelectorAll('#vista [data-pin]').forEach(b =>
            b.addEventListener('click', async () => {
                const id = Number(b.getAttribute('data-pin'));
                const pin = prompt('Nuevo PIN (4-6 dígitos):', '');
                if (pin === null) return;
                try { await G('CFUsers').cambiarPin(store, id, pin); alert('PIN actualizado.'); }
                catch (e) { alert(e.message); }
            }));
        document.querySelectorAll('#vista [data-tog]').forEach(b =>
            b.addEventListener('click', async () => {
                const id = Number(b.getAttribute('data-tog'));
                const u = await store.obtener('usuarios', id);
                if (u) { await store.actualizar('usuarios', id, { activo: !u.activo }); ir('usuarios'); }
            }));
    }

    // ── Impresora ──
    async function impresora(ctx) {
        const { store, sesion, ir } = ctx;
        if (!pudeVer(sesion, ['administrador', 'cajero'])) { ir('inicio'); return; }
        const disp = G('CFImpresora').disponible();
        const defecto = await G('CFImpresora').leerDefecto(store);
        vista(`<div class="encabezado"><h1>Impresora</h1></div>
        <div class="tarjeta"><div id="im-msg"></div>
            <p>Estado: ${disp ? '<span class="insignia ins-verde">disponible</span>' : '<span class="insignia ins-gris">no disponible en este equipo</span>'}</p>
            ${defecto ? `<p>Por defecto: <strong>${esc(defecto.nombre)}</strong> <small>(${esc(defecto.transporte)} · ${esc(defecto.direccion)})</small></p>
            <div class="grupo-btn"><button class="btn btn-claro" id="im-probar">Imprimir prueba</button>
            <button class="btn btn-peligro" id="im-quitar">Quitar</button></div>`
            : '<p class="suave">Sin impresora configurada. Elija una abajo.</p>'}</div>
        ${disp ? `<div class="tarjeta"><h3>Bluetooth (emparejadas)</h3><div id="im-bt"><p>Cargando…</p></div>
            <div class="ayuda">La impresora se empareja primero en Ajustes → Bluetooth de Android.</div></div>
        <div class="tarjeta"><h3>USB (OTG)</h3><div id="im-usb"><p>Cargando…</p></div></div>
        <div class="tarjeta"><h3>WiFi / red</h3>
            <div class="fila-form c2"><div class="campo"><label>IP</label><input id="im-host" placeholder="192.168.1.50"></div>
            <div class="campo"><label>Puerto</label><input id="im-port" type="number" value="9100"></div></div>
            <button class="btn btn-claro btn-bloque" id="im-tcp">Usar esta impresora</button></div>` : ''}`);

        async function usar(dest) {
            try {
                await G('CFImpresora').pedirPermiso(dest);
                await G('CFImpresora').guardarDefecto(store, dest);
                ir('impresora');
            } catch (e) { $('im-msg').innerHTML = aviso('error', e.message); }
        }
        if (defecto) {
            $('im-probar').addEventListener('click', async () => {
                try { await G('CFImpresora').prueba(store); $('im-msg').innerHTML = aviso('ok', 'Prueba enviada.'); }
                catch (e) { $('im-msg').innerHTML = aviso('error', e.message); }
            });
            $('im-quitar').addEventListener('click', async () => {
                await G('CFImpresora').quitarDefecto(store);
                ir('impresora');
            });
        }
        if (!disp) return;
        for (const [id, transporte] of [['im-bt', 'bluetooth'], ['im-usb', 'usb']]) {
            try {
                const ds = await G('CFImpresora').listar(transporte);
                $(id).innerHTML = ds.length ? '' : '<p class="suave">Ninguna encontrada.</p>';
                ds.forEach(d => {
                    const b = document.createElement('button');
                    b.className = 'btn btn-claro btn-bloque';
                    b.style.marginBottom = '8px';
                    b.textContent = `${d.nombre} (${d.direccion})`;
                    b.addEventListener('click', () => usar(d));
                    $(id).appendChild(b);
                });
            } catch (e) { $(id).innerHTML = aviso('error', e.message); }
        }
        $('im-tcp').addEventListener('click', () => {
            const host = $('im-host').value.trim();
            if (!host) { $('im-msg').innerHTML = aviso('error', 'Capture la IP.'); return; }
            usar({ transporte: 'tcp', direccion: `${host}:${$('im-port').value || 9100}`, nombre: host });
        });
    }

    // ── Licencia ──
    async function licencia(ctx) {
        const { store, sesion, ir } = ctx;
        if (!pudeVer(sesion, ['administrador', 'cajero'])) { ir('inicio'); return; }
        const L = G('CFLicencia');
        const e = await L.evaluar(store, { forzar: true });
        const evs = (await store.todos('licencia_eventos')).sort((a, b) => b.id - a.id).slice(0, 40);
        const clase = e.estado === 'ACTIVA' ? 'ins-verde' : e.estado === 'GRACIA' ? 'ins-ambar'
            : e.estado === 'NO_CONFIGURADA' ? 'ins-azul' : 'ins-roja';
        vista(`<div class="encabezado"><h1>Licencia</h1><span class="insignia ${clase}">${esc(e.estado.replace('_', ' '))}</span></div>
        ${e.licencia ? `<div class="tarjeta"><strong>${esc(e.licencia.cliente)}</strong> · ${esc(e.licencia.plan)} · <span class="mono">${esc(e.licencia.id)}</span>
        ${e.licencia.expira_en ? ` · caduca ${esc(new Date(e.licencia.expira_en).toLocaleDateString('es'))}` : ' · <span class="insignia ins-verde">perpetua</span>'}</div>`
        : '<div class="tarjeta"><p style="margin:0;">Sin licencia instalada.</p></div>'}
        ${e.gracia ? `<div class="aviso aviso-error"><strong>Gracia: quedan ${e.gracia.dias_restantes} de ${e.gracia.dias_totales} días.</strong><br>Al agotarse solo se podrá cerrar el turno.</div>` : ''}
        ${e.problemas.map(x => `<div class="aviso aviso-error"><span class="mono">[${esc(x.codigo)}]</span> ${esc(x.mensaje)}</div>`).join('')}
        ${e.avisos.map(x => `<div class="aviso-alerta"><span class="mono">[${esc(x.codigo)}]</span> ${esc(x.mensaje)}</div>`).join('')}
        <div class="tarjeta"><h3>Este equipo</h3><div class="ayuda">Código (dictable por teléfono)</div>
            <div class="codigo">${esc(e.instalacion.codigo)}</div>
            <div class="ayuda">Instalación</div><div class="mono">${esc(e.instalacion.uuid)}</div>
            <div class="grupo-btn" style="margin-top:8px;"><button class="btn btn-claro" id="li-sol">Descargar solicitud</button></div></div>
        <div class="tarjeta"><h3>Tiempo y uso</h3>
            <div class="totales"><div><span>Verificado</span><span>${esc(fechaCorta(e.tiempo.confiable))}</span></div>
            <div><span>Reloj equipo</span><span>${esc(fechaCorta(e.tiempo.sistema))}</span></div>
            <div><span>Días de uso</span><span>${e.uso.dias_consumidos}${e.uso.dias_contratados ? ' / ' + e.uso.dias_contratados : ''}</span></div>
            <div><span>Arranques</span><span>${e.uso.secuencia}</span></div></div></div>
        <div class="tarjeta"><h3>Clave pública</h3><div class="ayuda">Una sola vez (la entrega el proveedor).</div>
            <div class="campo"><textarea id="li-pub" rows="3" class="mono" style="font-size:.7rem;" placeholder="-----BEGIN PUBLIC KEY-----…"></textarea></div>
            <button class="btn btn-claro btn-bloque" id="li-pubok">Guardar clave pública</button></div>
        <div class="tarjeta"><h3>Instalar licencia</h3><div id="li-msg"></div>
            <div class="campo"><label>Pegar contenido del .lic</label>
            <textarea id="li-lic" rows="4" class="mono" style="font-size:.7rem;" placeholder='{ "datos": { … }, "firma": "…" }'></textarea></div>
            <button class="btn btn-primario btn-bloque" id="li-ok">Instalar</button>
            <div class="campo" style="margin-top:10px;"><label>O elegir archivo</label><input type="file" id="li-file" accept=".lic,.json"></div></div>
        <div class="tarjeta"><h3>Bitácora</h3><div class="contenedor-tabla"><table class="tabla">
            <thead><tr><th>Fecha</th><th>Evento</th><th></th></tr></thead><tbody>
            ${evs.length ? evs.map(x => `<tr><td>${esc(fechaCorta(x.creado_en))}</td><td class="mono">${esc(x.tipo)}</td>
            <td><span class="insignia ${x.gravedad === 'CRITICO' ? 'ins-roja' : x.gravedad === 'AVISO' ? 'ins-ambar' : 'ins-gris'}">${esc(x.gravedad)}</span></td></tr>`).join('')
            : '<tr><td colspan="3">Sin eventos.</td></tr>'}</tbody></table></div></div>`);
        $('li-sol').addEventListener('click', async () => {
            const s = await L.solicitud(store, '');
            await G('CFBackup').compartir(JSON.stringify(s, null, 2), 'solicitud-licencia-cajafacil.json');
        });
        $('li-pubok').addEventListener('click', async () => {
            try { await L.guardarPub(store, $('li-pub').value); ir('licencia'); }
            catch (e2) { $('li-msg').innerHTML = aviso('error', e2.message); }
        });
        $('li-ok').addEventListener('click', async () => {
            try { await L.instalar(store, $('li-lic').value); ir('licencia'); }
            catch (e2) { $('li-msg').innerHTML = aviso('error', e2.message); }
        });
        $('li-file').addEventListener('change', () => {
            const f = $('li-file').files[0];
            if (!f) return;
            const r = new FileReader();
            r.onload = async () => {
                try { await L.instalar(store, r.result); ir('licencia'); }
                catch (e2) { $('li-msg').innerHTML = aviso('error', e2.message); }
            };
            r.readAsText(f);
        });
    }

    // ── Bloqueo ──
    async function bloqueo(ctx) {
        const e = await G('CFLicencia').evaluar(ctx.store, {});
        const turno = await G('CFCaja').abierto(ctx.store);
        vista(`<div class="tarjeta"><div class="centrado"><h1 class="con-icono">${I('candado')}Licencia no válida</h1>
            <p>Puede cerrar el turno abierto, pero no vender ni abrir trabajo nuevo.</p></div>
            ${(e.problemas || []).map(x => `<div class="aviso aviso-error"><span class="mono">[${esc(x.codigo)}]</span> ${esc(x.mensaje)}</div>`).join('')}
            <div class="ayuda">Código de instalación</div><div class="codigo">${esc(e.instalacion.codigo)}</div>
            <div class="grupo-btn"><button class="btn btn-primario" data-ir="licencia">Ver licencia</button>
            ${turno ? '<button class="btn btn-claro" data-ir="caja">Cerrar turno</button>' : ''}</div></div>`);
        vistaBindIr(ctx);
    }

    // ── Más (menú) ──
    async function mas(ctx) {
        const { sesion } = ctx;
        const admin = pudeVer(sesion, ['administrador']);
        const cajaR = pudeVer(sesion, ['administrador', 'cajero']);
        const item = (v, t) => `<button class="menu-tile tile-${v}" data-ir="${v}"><span class="tile-ic">${I(v)}</span><span class="tile-nombre">${t}</span></button>`;
        vista(`<div class="encabezado"><h1>Más</h1></div>
        <div class="menu-rejilla">
            ${item('productos', 'Productos')}
            ${item('inventario', 'Inventario')}
            ${cajaR ? item('reportes', 'Reportes') : ''}
            ${admin ? item('ajustes', 'Ajustes') : ''}
            ${admin ? item('usuarios', 'Usuarios') : ''}
            ${cajaR ? item('impresora', 'Impresora') : ''}
            ${cajaR ? item('licencia', 'Licencia') : ''}
            ${item('respaldo', 'Respaldo')}
        </div>`);
        vistaBindIr(ctx);
    }

    // ── Respaldo ──
    async function respaldo(ctx) {
        const { store } = ctx;
        vista(`<div class="encabezado"><h1>Respaldo</h1></div>
        <div class="tarjeta"><div id="r-msg"></div>
            <button class="btn btn-primario btn-bloque" id="r-gen">Generar y compartir respaldo</button>
            <div class="ayuda">Se crea un JSON con todo: se comparte por WhatsApp, correo o descarga.</div></div>
        <div class="tarjeta"><h3>Restaurar</h3>
            <div class="campo"><label>Archivo de respaldo (.json)</label><input type="file" id="r-file" accept=".json,application/json"></div>
            <button class="btn btn-peligro btn-bloque" id="r-res">Restaurar (reemplaza todo)</button></div>`);
        $('r-gen').addEventListener('click', async () => {
            try {
                const paquete = await G('CFBackup').generar(store);
                const como = await G('CFBackup').compartir(JSON.stringify(paquete, null, 2), G('CFBackup').nombreArchivo());
                $('r-msg').innerHTML = aviso('ok', como === 'share' ? 'Respaldo listo para enviar.' : 'Respaldo descargado.');
            } catch (e) { $('r-msg').innerHTML = aviso('error', e.message); }
        });
        $('r-res').addEventListener('click', () => {
            const f = $('r-file').files[0];
            if (!f) { $('r-msg').innerHTML = aviso('error', 'Elija primero el archivo.'); return; }
            if (!confirm('¿Restaurar? Se reemplazarán TODOS los datos del equipo.')) return;
            const lector = new FileReader();
            lector.onload = async () => {
                try {
                    await G('CFBackup').restaurar(store, JSON.parse(lector.result));
                    $('r-msg').innerHTML = aviso('ok', 'Restaurado. La app se reiniciará.');
                    setTimeout(() => location.reload(), 1200);
                } catch (e) { $('r-msg').innerHTML = aviso('error', e.message); }
            };
            lector.readAsText(f);
        });
    }

    return { inicio, pos, ticket, caja, ventas, productos, productoForm, kardex,
             inventario, reportes, ajustes, usuarios, mas, respaldo, impresora, licencia, bloqueo };
});
