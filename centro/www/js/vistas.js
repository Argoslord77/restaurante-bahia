// centro/www/js/vistas.js — Buscar, comparar, publicar, directorio y ajustes.
(function () {
    'use strict';

    const $ = id => document.getElementById(id);
    const G = n => globalThis[n];
    const I = n => G('CFIconos').icono(n);
    const esc = s => String(s === null || s === undefined ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const pudeVer = (sesion, roles) => roles.includes(sesion.rol);
    function vista(html) { $('vista').innerHTML = html; }
    function aviso(tipo, texto) {
        return `<div class="aviso ${tipo === 'ok' ? 'aviso-ok' : 'aviso-error'}">${texto}</div>`;
    }
    function vistaBindIr(ctx) {
        document.querySelectorAll('#vista [data-ir]').forEach(b =>
            b.addEventListener('click', () => ctx.ir(b.getAttribute('data-ir'), {})));
    }
    function dinero(n, moneda) {
        return `${(Number(n) || 0).toFixed(2)} ${esc(moneda || 'CUP')}`;
    }
    function fechaCorta(iso) {
        try {
            const d = new Date(iso);
            return d.toLocaleDateString('es', { day: '2-digit', month: 'short' }) + ' ' +
                d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
        } catch (_) { return ''; }
    }

    // Intenta en línea; si no hay red ni servidor, usa la copia local.
    async function buscarHibrido(store, q) {
        try {
            const api = await G('CFAPI').desdeAjustes(store);
            const j = await api.buscar(q);
            return { filas: j.productos, fuente: 'linea', version: j.version };
        } catch (e) {
            if (e && e.code === 'RED') {
                const filas = await G('CFSnapshot').buscar(store, q);
                const est = await G('CFSnapshot').estado(store);
                return { filas, fuente: 'local', version: est ? est.version : null, guardado: est && est.guardado_en };
            }
            throw e;
        }
    }

    async function preciosHibrido(store, codigo) {
        try {
            const api = await G('CFAPI').desdeAjustes(store);
            const j = await api.precios(codigo);
            return { filas: j.ofertas, nombre: j.nombre, fuente: 'linea' };
        } catch (e) {
            if (e && e.code === 'RED') {
                const filas = await G('CFSnapshot').precios(store, codigo);
                return { filas, nombre: filas.length ? filas[0].nombre : null, fuente: 'local' };
            }
            throw e;
        }
    }

    function insigniaFuente(fuente, extra) {
        return fuente === 'linea'
            ? '<span class="insignia insignia-ok">EN LÍNEA</span>'
            : `<span class="insignia">OFFLINE · copia ${esc(extra || '')}</span>`;
    }

    // ── Inicio / Buscar ──
    async function inicio(ctx) {
        const { store, sesion } = ctx;
        const est = await G('CFSnapshot').estado(store);
        vista(`<div class="encabezado"><h1>¿Quién lo tiene?</h1></div>
        <div class="tarjeta"><div id="b-msg"></div>
            <div class="campo"><label>Producto o código</label>
                <input id="b-q" maxlength="60" placeholder="Ej. refresco, R1…"></div>
            <button class="btn btn-primario btn-bloque" id="b-ir">Buscar</button>
            <div class="ayuda">${est ? `Copia local: v${est.version} · ${est.productos} productos (${fechaCorta(est.guardado_en)}).` : 'Sin copia local: configure el servidor en Ajustes.'}</div></div>
        <div id="b-res"></div>`);
        const correr = async () => {
            const q = $('b-q').value.trim();
            if (!q) { $('b-msg').innerHTML = aviso('error', 'Escriba qué buscar.'); return; }
            $('b-msg').innerHTML = '';
            $('b-res').innerHTML = '<p class="suave">Buscando…</p>';
            try {
                const r = await buscarHibrido(store, q);
                $('b-res').innerHTML = `<div class="tarjeta"><h3>Resultados ${insigniaFuente(r.fuente, fechaCorta(r.guardado))}</h3>` +
                    (r.filas.length ? r.filas.map(p => `
                        <div class="fila">
                            <div><strong>${esc(p.nombre)}</strong> <span class="mono">${esc(p.codigo)}</span><br>
                            <span class="suave">${esc(p.negocio || '')}</span></div>
                            <div class="derecha"><strong>${dinero(p.precio, p.moneda)}</strong><br>
                            <button class="btn btn-claro btn-ch" data-cmp="${esc(p.codigo)}">Comparar</button></div>
                        </div>`).join('') : '<p class="suave">Nadie lo tiene publicado.</p>') + '</div>';
                document.querySelectorAll('#b-res [data-cmp]').forEach(b =>
                    b.addEventListener('click', () => ctx.ir('comparar', { codigo: b.getAttribute('data-cmp') })));
            } catch (e) { $('b-res').innerHTML = ''; $('b-msg').innerHTML = aviso('error', e.message); }
        };
        $('b-ir').addEventListener('click', correr);
        $('b-q').addEventListener('keydown', e => { if (e.key === 'Enter') correr(); });
    }

    // ── Comparar ──
    async function comparar(ctx, params) {
        const { store } = ctx;
        vista(`<div class="encabezado"><h1>Comparar precios</h1></div>
        <div class="tarjeta"><div id="c-msg"></div>
            <div class="campo"><label>Código exacto</label>
                <input id="c-cod" maxlength="40" placeholder="Ej. R1" value="${esc((params && params.codigo) || '')}"></div>
            <button class="btn btn-primario btn-bloque" id="c-ir">Comparar</button></div>
        <div id="c-res"></div>`);
        const correr = async () => {
            const cod = $('c-cod').value.trim();
            if (!cod) { $('c-msg').innerHTML = aviso('error', 'Escriba el código.'); return; }
            $('c-msg').innerHTML = '';
            $('c-res').innerHTML = '<p class="suave">Comparando…</p>';
            try {
                const r = await preciosHibrido(store, cod);
                $('c-res').innerHTML = `<div class="tarjeta"><h3>${esc(r.nombre || cod)} ${insigniaFuente(r.fuente)}</h3>` +
                    (r.filas.length ? `<table class="tabla"><tr><th>#</th><th>Negocio</th><th class="derecha">Precio</th></tr>` +
                        r.filas.map((o, i) => `<tr class="${i === 0 ? 'mejor' : ''}"><td>${i + 1}</td><td>${esc(o.negocio || '')}</td><td class="derecha"><strong>${dinero(o.precio, o.moneda)}</strong></td></tr>`).join('') +
                        '</table>' : '<p class="suave">Sin ofertas para ese código.</p>') + '</div>';
            } catch (e) { $('c-res').innerHTML = ''; $('c-msg').innerHTML = aviso('error', e.message); }
        };
        $('c-ir').addEventListener('click', correr);
        if ((params && params.codigo)) correr();
    }

    // ── Publicar (admin) ──
    const CAT_COL = 'centro_catalogo';

    async function publicar(ctx) {
        const { store, sesion } = ctx;
        if (!pudeVer(sesion, ['administrador'])) { ctx.ir('inicio', {}); return; }
        const base = await G('CFAjustes').get(store, 'centro_base', '');
        const negId = await G('CFAjustes').get(store, 'centro_negocio_id', '');
        vista(`<div class="encabezado"><h1>Publicar</h1></div>
        <div class="tarjeta"><h3>Mi negocio</h3><div id="p-msg"></div>
            ${negId ? `<p>Negocio registrado: <strong class="mono">${esc(negId)}</strong></p>` : `
            <div class="campo"><label>Nombre del negocio</label><input id="p-nom" maxlength="120"></div>
            <div class="campo"><label>Contacto (opcional)</label><input id="p-con" maxlength="160" placeholder="Teléfono, dirección…"></div>
            <button class="btn btn-claro btn-bloque" id="p-reg">Registrar negocio</button>
            <div class="ayuda">El registro genera su clave privada y la guarda en este equipo.</div>`}
        </div>
        <div class="tarjeta"><h3>Mi catálogo</h3>
            <div class="campo"><label>Código</label><input id="p-cod" maxlength="40" placeholder="Ej. R1"></div>
            <div class="campo"><label>Nombre</label><input id="p-pro" maxlength="160"></div>
            <div class="campo"><label>Precio</label><input id="p-pre" inputmode="decimal" placeholder="0.00"></div>
            <button class="btn btn-claro btn-bloque" id="p-add">Agregar</button></div>
        <div class="tarjeta"><h3>Productos (<span id="p-n">0</span>)</h3><div id="p-lista"></div>
            <button class="btn btn-primario btn-bloque" id="p-push">Publicar catálogo</button>
            <div class="ayuda">Publicar reemplaza su catálogo en el servidor con esta lista.</div></div>`);
        if (!base) $('p-msg').innerHTML = aviso('error', 'Falta la dirección del servidor (Ajustes).');

        async function pintarLista() {
            const filas = await store.todos(CAT_COL);
            $('p-n').textContent = filas.length;
            $('p-lista').innerHTML = filas.length ? filas.map(f => `
                <div class="fila"><div><strong>${esc(f.nombre)}</strong> <span class="mono">${esc(f.codigo)}</span></div>
                <div class="derecha"><strong>${dinero(f.precio, f.moneda)}</strong>
                <button class="btn btn-claro btn-ch" data-del="${f.id}">Quitar</button></div></div>`).join('')
                : '<p class="suave">Vacío.</p>';
            document.querySelectorAll('#p-lista [data-del]').forEach(b =>
                b.addEventListener('click', async () => {
                    await store.eliminar(CAT_COL, Number(b.getAttribute('data-del')));
                    pintarLista();
                }));
        }
        await pintarLista();

        if ($('p-reg')) $('p-reg').addEventListener('click', async () => {
            try {
                const api = await G('CFAPI').desdeAjustes(store);
                const j = await api.registrarNegocio($('p-nom').value.trim(), $('p-con').value.trim());
                await G('CFAjustes').set(store, 'centro_negocio_id', j.negocio.id);
                await G('CFAjustes').set(store, 'centro_key', j.negocio.api_key);
                $('p-msg').innerHTML = aviso('ok', `Registrado como ${j.negocio.id}. Su clave quedó guardada en este equipo.`);
                setTimeout(() => ctx.ir('publicar', {}), 1200);
            } catch (e) { $('p-msg').innerHTML = aviso('error', e.message); }
        });
        $('p-add').addEventListener('click', async () => {
            try {
                const codigo = $('p-cod').value.trim();
                const nombre = $('p-pro').value.trim();
                const precio = Number($('p-pre').value);
                if (!codigo) throw new Error('Falta el código.');
                if (!nombre) throw new Error('Falta el nombre.');
                if (!Number.isFinite(precio) || precio < 0) throw new Error('Precio no válido.');
                const filas = await store.todos(CAT_COL);
                if (filas.some(f => f.codigo === codigo)) throw new Error('Ese código ya está en la lista.');
                await store.insertar(CAT_COL, { codigo, nombre, precio: Math.round(precio * 100) / 100, moneda: 'CUP' });
                $('p-cod').value = ''; $('p-pro').value = ''; $('p-pre').value = '';
                pintarLista();
            } catch (e) { $('p-msg').innerHTML = aviso('error', e.message); }
        });
        $('p-push').addEventListener('click', async () => {
            try {
                const id = await G('CFAjustes').get(store, 'centro_negocio_id', '');
                if (!id) throw new Error('Registre su negocio primero.');
                const filas = await store.todos(CAT_COL);
                if (!filas.length) throw new Error('El catálogo está vacío.');
                const api = await G('CFAPI').desdeAjustes(store);
                const j = await api.publicar(id, filas.map(f => ({ codigo: f.codigo, nombre: f.nombre, precio: f.precio, moneda: f.moneda })));
                $('p-msg').innerHTML = aviso('ok', `Publicados ${j.guardados} productos (v${j.version}).`);
                window.scrollTo(0, 0);
            } catch (e) { $('p-msg').innerHTML = aviso('error', e.message); }
        });
    }

    // ── Negocios (directorio) ──
    async function negocios(ctx) {
        const { store } = ctx;
        vista(`<div class="encabezado"><h1>Negocios</h1></div><div class="tarjeta" id="n-lista"><p class="suave">Cargando…</p></div>`);
        try {
            let filas, fuente;
            try {
                const api = await G('CFAPI').desdeAjustes(store);
                filas = (await api.negocios()).negocios;
                fuente = 'linea';
            } catch (e) {
                if (!e || e.code !== 'RED') throw e;
                filas = await G('CFSnapshot').negocios(store);
                fuente = 'local';
            }
            $('n-lista').innerHTML = `<h3>Directorio ${insigniaFuente(fuente)}</h3>` +
                (filas.length ? filas.map(n => `
                    <div class="fila"><div><strong>${esc(n.nombre)}</strong><br>
                    <span class="suave">${esc(n.contacto || 'sin contacto')} · ${n.n_productos} productos</span></div></div>`).join('')
                    : '<p class="suave">Sin negocios.</p>');
        } catch (e) { $('n-lista').innerHTML = aviso('error', e.message); }
    }

    // ── Ajustes (admin) ──
    async function ajustes(ctx) {
        const { store, sesion } = ctx;
        if (!pudeVer(sesion, ['administrador'])) { ctx.ir('inicio', {}); return; }
        const a = await G('CFAjustes').todos(store);
        const est = await G('CFSnapshot').estado(store);
        vista(`<div class="encabezado"><h1>Ajustes</h1></div>
        <div class="tarjeta"><div id="a-msg"></div>
            <div class="campo"><label>Nombre en cabecera</label><input id="a-neg" maxlength="120" value="${esc(a.negocio_nombre || '')}"></div>
            <div class="campo"><label>Servidor del centro</label><input id="a-base" maxlength="160" placeholder="http://192.168.1.10:3101" value="${esc(a.centro_base || '')}"></div>
            <button class="btn btn-claro btn-bloque" id="a-save">Guardar</button></div>
        <div class="tarjeta"><h3>Sincronizar</h3>
            <div class="ayuda">Copia local: ${est ? `v${est.version} · ${est.productos} productos (${fechaCorta(est.guardado_en)})` : 'ninguna'}.</div>
            <div class="grupo-btn"><button class="btn btn-claro" style="flex:1" id="a-probar">Probar conexión</button>
            <button class="btn btn-primario" style="flex:1" id="a-sync">Descargar copia</button></div></div>
        <div class="tarjeta"><h3>Apariencia</h3>
            <div class="grupo-btn" id="a-tema">
                <button class="btn btn-claro" style="flex:1" data-tema="onix">${I('luna')} Ónix</button>
                <button class="btn btn-claro" style="flex:1" data-tema="blanco">${I('sol')} Blanco</button>
            </div></div>`);
        $('a-save').addEventListener('click', async () => {
            try {
                await G('CFAjustes').set(store, 'negocio_nombre', $('a-neg').value.trim());
                await G('CFAjustes').set(store, 'centro_base', $('a-base').value.trim());
                $('a-msg').innerHTML = aviso('ok', 'Guardado.');
            } catch (e) { $('a-msg').innerHTML = aviso('error', e.message); }
        });
        $('a-probar').addEventListener('click', async () => {
            try {
                const api = await G('CFAPI').desdeAjustes(store);
                const j = await api.salud();
                $('a-msg').innerHTML = aviso('ok', `Servidor OK · v${j.version} · ${j.negocios} negocios.`);
            } catch (e) { $('a-msg').innerHTML = aviso('error', e.message); }
        });
        $('a-sync').addEventListener('click', async () => {
            try {
                const api = await G('CFAPI').desdeAjustes(store);
                const r = await G('CFSnapshot').guardar(store, await api.snapshot());
                $('a-msg').innerHTML = aviso('ok', `Copia descargada: v${r.version} · ${r.productos} productos.`);
            } catch (e) { $('a-msg').innerHTML = aviso('error', e.message); }
        });
        const temaBtns = Array.from(document.querySelectorAll('#a-tema [data-tema]'));
        const pintarTema = activo => temaBtns.forEach(b =>
            b.classList.toggle('btn-primario', b.getAttribute('data-tema') === activo));
        pintarTema(await G('CFTema').leer(store));
        temaBtns.forEach(b => b.addEventListener('click', async () => {
            pintarTema(await G('CFTema').alternar(store, document, b.getAttribute('data-tema')));
        }));
    }

    // ── Usuarios (admin, compacta) ──
    async function usuarios(ctx) {
        const { store, sesion } = ctx;
        if (!pudeVer(sesion, ['administrador'])) { ctx.ir('inicio', {}); return; }
        vista(`<div class="encabezado"><h1>Usuarios</h1></div>
        <div class="tarjeta"><div id="u-msg"></div>
            <div class="campo"><label>Nombre</label><input id="u-nom" maxlength="120"></div>
            <div class="campo"><label>PIN (4 a 6 dígitos)</label><input id="u-pin" type="password" inputmode="numeric" maxlength="6"></div>
            <div class="campo"><label>Rol</label><select id="u-rol"><option value="vendedor">vendedor</option><option value="cajero">cajero</option><option value="administrador">administrador</option></select></div>
            <button class="btn btn-claro btn-bloque" id="u-add">Crear usuario</button></div>
        <div class="tarjeta"><div id="u-lista"></div></div>`);
        async function pintar() {
            const filas = await G('CFUsers').listar(store);
            $('u-lista').innerHTML = filas.map(u => `
                <div class="fila"><div><strong>${esc(u.nombre)}</strong><br>
                <span class="suave">${esc(u.rol)}${u.activo ? '' : ' · inactivo'}</span></div>
                <div class="derecha">${u.id === sesion.id ? '' : `<button class="btn btn-claro btn-ch" data-act="${u.id}" data-v="${u.activo ? 0 : 1}">${u.activo ? 'Desactivar' : 'Activar'}</button>`}</div></div>`).join('');
            document.querySelectorAll('#u-lista [data-act]').forEach(b =>
                b.addEventListener('click', async () => {
                    try {
                        await G('CFUsers').cambiarActivo(store, Number(b.getAttribute('data-act')), b.getAttribute('data-v') === '1', { actorId: sesion.id });
                        pintar();
                    } catch (e) { $('u-msg').innerHTML = aviso('error', e.message); }
                }));
        }
        await pintar();
        $('u-add').addEventListener('click', async () => {
            try {
                await G('CFUsers').crear(store, { nombre: $('u-nom').value, pin: $('u-pin').value, rol: $('u-rol').value });
                $('u-nom').value = ''; $('u-pin').value = '';
                pintar();
            } catch (e) { $('u-msg').innerHTML = aviso('error', e.message); }
        });
    }

    // ── Licencia (admin, compacta) ──
    async function licencia(ctx) {
        const { store, sesion } = ctx;
        if (!pudeVer(sesion, ['administrador'])) { ctx.ir('inicio', {}); return; }
        const e = await G('CFLicencia').evaluar(store, { forzar: true });
        vista(`<div class="encabezado"><h1>Licencia</h1></div>
        <div class="tarjeta"><div id="l-msg"></div>
            <p>Estado: <strong>${esc(e.estado)}</strong> · ${e.operativa ? 'operativa' : 'BLOQUEADA'}</p>
            ${(e.problemas || []).map(x => aviso('error', `[${esc(x.codigo)}] ${esc(x.mensaje)}`)).join('')}
            <div class="campo"><label>Instalar licencia (código del proveedor)</label>
                <textarea id="l-cod" rows="4" placeholder="Pegue el código…"></textarea></div>
            <button class="btn btn-primario btn-bloque" id="l-ok">Instalar</button></div>`);
        $('l-ok').addEventListener('click', async () => {
            try {
                await G('CFLicencia').instalar(store, $('l-cod').value);
                $('l-msg').innerHTML = aviso('ok', 'Licencia instalada.');
            } catch (err) { $('l-msg').innerHTML = aviso('error', err.message); }
        });
    }

    // ── Más ──
    async function mas(ctx) {
        const { sesion } = ctx;
        const admin = pudeVer(sesion, ['administrador']);
        const item = (v, t) => `<button class="menu-tile tile-${v}" data-ir="${v}"><span class="tile-ic">${I(v === 'negocios' ? 'productos' : v)}</span><span class="tile-nombre">${t}</span></button>`;
        vista(`<div class="encabezado"><h1>Más</h1></div>
        <div class="menu-rejilla">
            ${item('negocios', 'Negocios')}
            ${admin ? item('ajustes', 'Ajustes') : ''}
            ${admin ? item('usuarios', 'Usuarios') : ''}
            ${admin ? item('licencia', 'Licencia') : ''}
        </div>
        <div class="tarjeta"><button class="btn btn-claro btn-bloque" id="m-salir">Cerrar sesión</button></div>`);
        vistaBindIr(ctx);
        $('m-salir').addEventListener('click', () => ctx.salir());
    }

    // ── Bloqueo ──
    async function bloqueo(ctx) {
        const e = await G('CFLicencia').evaluar(ctx.store, {});
        vista(`<div class="tarjeta"><div class="centrado"><h1 class="con-icono">${I('candado')}Licencia no válida</h1>
            <p>Puede consultar, pero no publicar ni cambiar ajustes.</p></div>
            ${(e.problemas || []).map(x => aviso('error', `[${esc(x.codigo)}] ${esc(x.mensaje)}`)).join('')}
            <div class="grupo-btn">${pudeVer(ctx.sesion, ['administrador']) ? '<button class="btn btn-primario" data-ir="licencia">Ver licencia</button>' : ''}</div></div>`);
        vistaBindIr(ctx);
    }

    globalThis.CFVistas = { inicio, comparar, publicar, negocios, ajustes, usuarios, licencia, mas, bloqueo };
})();
