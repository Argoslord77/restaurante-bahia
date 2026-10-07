// movil/www/js/app.js — Arranque, login con PIN y navegación (Fase 2).
(function () {
    'use strict';

    const $ = id => document.getElementById(id);
    const esc = s => String(s === null || s === undefined ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    let store = null;
    let sesion = null;
    let ruta = { vista: 'inicio', params: {} };

    function pantalla(html) { $('pantalla').innerHTML = html; }
    function aviso(tipo, texto) {
        return `<div class="aviso ${tipo === 'ok' ? 'aviso-ok' : 'aviso-error'}">${esc(texto)}</div>`;
    }

    async function boot() {
        try {
            store = CFStore.crear(CFStorage.elegir());
            const r = await store.init();
            await CFAjustes.asegurar(store);
            console.log('[CajaFácil] almacén:', store.backendNombre, '| instalación:', r.instalacion);
            const usuarios = await CFUsers.listar(store);
            if (!usuarios.length) return verCrearAdmin();
            verLogin(usuarios.filter(u => u.activo));
        } catch (e) {
            console.error(e);
            pantalla(`<div class="tarjeta"><h1>CajaFácil</h1>
                ${aviso('error', e.code === 'SELLO_INVALIDO'
                    ? 'Los datos fueron modificados fuera de la app y no se puede continuar. Restaure un respaldo.'
                    : 'No se pudo abrir el almacén de datos: ' + e.message)}
                <button class="btn btn-claro btn-bloque" onclick="location.reload()">Reintentar</button></div>`);
        }
    }

    function verCrearAdmin(msg) {
        pantalla(`<div class="tarjeta"><div class="centro">
            <img class="movil-logo" src="img/logo-login.png" alt="CajaFácil">
            <h1>Bienvenido a CajaFácil</h1>
            <p>Cree el usuario administrador del equipo.</p></div>
            ${msg || ''}
            <div class="campo"><label>Nombre</label><input id="a-nombre" maxlength="120" placeholder="Ej. María"></div>
            <div class="campo"><label>PIN (4 a 6 dígitos)</label>
                <input id="a-pin" type="password" inputmode="numeric" maxlength="6" placeholder="••••"></div>
            <button class="btn btn-primario btn-bloque" id="a-ok">Crear administrador</button></div>`);
        $('a-ok').addEventListener('click', async () => {
            try {
                await CFUsers.crear(store, { nombre: $('a-nombre').value, pin: $('a-pin').value, rol: 'administrador' });
                verLogin(await CFUsers.listar(store));
            } catch (e) { verCrearAdmin(aviso('error', e.message)); }
        });
    }

    function verLogin(usuarios, msg) {
        if (!usuarios.length) return verCrearAdmin();
        let pin = '';
        const opciones = usuarios.map(u => `<option value="${u.id}">${esc(u.nombre)} (${esc(u.rol)})</option>`).join('');
        pantalla(`<div class="tarjeta"><div class="centro">
            <img class="movil-logo" src="img/logo-login.png" alt="CajaFácil"></div>
            ${msg || ''}
            <div class="campo"><label>Usuario</label><select id="l-usuario">${opciones}</select></div>
            <div class="pin-pantalla" id="l-pin">••••</div>
            <div class="pin-teclado" id="l-teclas"></div></div>`);
        const teclas = $('l-teclas');
        ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'Borrar', '0', 'Entrar'].forEach(t => {
            const b = document.createElement('button');
            b.type = 'button';
            if (t === 'Borrar') b.innerHTML = CFIconos.icono('borrar');
            else b.textContent = t;
            if (t === 'Borrar' || t === 'Entrar') b.className = 'funcion';
            b.addEventListener('click', async () => {
                if (t === 'Borrar') pin = pin.slice(0, -1);
                else if (t === 'Entrar') {
                    const u = await CFUsers.verificar(store, $('l-usuario').value, pin);
                    if (!u) { pin = ''; return verLogin(usuarios, aviso('error', 'PIN incorrecto.')); }
                    sesion = u;
                    return entrar();
                }
                else if (pin.length < 6) pin += t;
                $('l-pin').textContent = pin.length ? '•'.repeat(pin.length) : '••••';
            });
            teclas.appendChild(b);
        });
    }

    // ── Cáscara con navegación inferior ──
    function entrar() {
        pantalla('<header id="cabecera"></header><div id="aviso-lic"></div><div id="vista"></div><nav id="barnav" class="barnav"></nav>');
        ir('inicio', {});
    }

    // Cabecera Ónix: avatar del negocio + turno. Best-effort: si algo falla, se oculta.
    async function pintarCabecera() {
        const caja = $('cabecera');
        if (!caja || !sesion) return;
        try {
            const a = await CFAjustes.todos(store);
            const turno = await CFCaja.abierto(store);
            const nombre = (a.negocio_nombre || 'Mi Negocio').trim();
            const ini = nombre.split(/\s+/).slice(0, 2).map(w => (w[0] || '').toUpperCase()).join('') || 'CF';
            const sub = turno
                ? `<span class="livedot"></span>Turno #${turno.id} abierto · ${esc(sesion.nombre)}`
                : `${esc(sesion.nombre)} · ${esc(sesion.rol)}`;
            caja.innerHTML = `<div class="cabecera"><div class="cab-avatar">${esc(ini)}</div>
                <div><div class="cab-nombre">${esc(nombre)}</div><div class="cab-sub">${sub}</div></div></div>`;
        } catch (_) { caja.innerHTML = ''; }
    }

    function itemsNav() {
        const items = [
            { v: 'inicio', icono: 'inicio', etiqueta: 'Inicio', roles: ['administrador', 'cajero', 'vendedor'] },
            { v: 'pos', icono: 'vender', etiqueta: 'Vender', roles: ['administrador', 'cajero', 'vendedor'] },
            { v: 'ventas', icono: 'ventas', etiqueta: 'Ventas', roles: ['administrador', 'cajero', 'vendedor'] },
            { v: 'caja', icono: 'caja', etiqueta: 'Caja', roles: ['administrador', 'cajero'] },
            { v: 'mas', icono: 'mas', etiqueta: 'Más', roles: ['administrador', 'cajero', 'vendedor'] }
        ];
        return items.filter(i => i.roles.includes(sesion.rol));
    }

    function pintarNav() {
        $('barnav').innerHTML = itemsNav().map(i =>
            `<button data-nav="${i.v}" class="${ruta.vista === i.v ? 'activo' : ''}">${CFIconos.icono(i.icono)}<small>${i.etiqueta}</small></button>`).join('');
        document.querySelectorAll('#barnav [data-nav]').forEach(b =>
            b.addEventListener('click', () => ir(b.getAttribute('data-nav'), {})));
    }

    const PERMITIDAS_BLOQ = ['inicio', 'licencia', 'ticket', 'caja'];

    async function ir(vista, params) {
        let lic = null;
        try { lic = await CFLicencia.evaluar(store); }
        catch (e) {
            console.error(e);
            lic = { operativa: true, estado: 'ERROR', problemas: [], avisos: [], gracia: null };
        }
        if (!lic.operativa && !PERMITIDAS_BLOQ.includes(vista)) vista = 'bloqueo';
        ruta = { vista, params: params || {} };
        pintarNav();
        pintarAvisoLic(lic);
        pintarCabecera();
        window.scrollTo(0, 0);
        const fn = CFVistas[vista] || CFVistas.inicio;
        fn(ctx(lic), ruta.params).catch(e => {
            console.error(e);
            $('vista').innerHTML = `<div class="tarjeta">${aviso('error', e.message)}
                <button class="btn btn-claro" onclick="document.querySelector('[data-nav=inicio]').click()">Ir al inicio</button></div>`;
        });
    }

    function pintarAvisoLic(lic) {
        const caja = $('aviso-lic');
        if (!caja) return;
        if (lic.estado === 'GRACIA' && (sesion.rol === 'administrador' || sesion.rol === 'cajero')) {
            caja.innerHTML = `<div class="lic-banner gracia">${CFIconos.icono('alerta')}<span><strong>Licencia en gracia</strong>${lic.gracia ? ` — quedan ${lic.gracia.dias_restantes} días` : ''}.</span><a href="#" id="al-ir">Regularizar →</a></div>`;
            $('al-ir').addEventListener('click', ev => { ev.preventDefault(); ir('licencia', {}); });
        } else if (lic.estado === 'NO_CONFIGURADA' && sesion.rol === 'administrador') {
            caja.innerHTML = `<div class="lic-banner alerta">${CFIconos.icono('licencia')}<span>Licencias sin activar: no se aplica restricción.</span><a href="#" id="al-ir">Activar →</a></div>`;
            $('al-ir').addEventListener('click', ev => { ev.preventDefault(); ir('licencia', {}); });
        } else caja.innerHTML = '';
    }

    function ctx(lic) {
        return {
            store, sesion, ir, lic: lic || null,
            salir: () => {
                sesion = null;
                CFUsers.listar(store).then(us => verLogin(us.filter(u => u.activo)));
            }
        };
    }

    document.addEventListener('DOMContentLoaded', boot);
})();
