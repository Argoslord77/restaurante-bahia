// centro/www/js/app.js — Arranque, login con PIN y navegación.
// Estructura heredada de CajaFácil: almacén JSON local, usuarios con PIN,
// licencia y temas Ónix/Blanco.
(function () {
    'use strict';

    const NOMBRE = 'Centro de Precios';

    const $ = id => document.getElementById(id);
    const esc = s => String(s === null || s === undefined ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    let store = null;
    let sesion = null;
    let ruta = { vista: 'inicio', params: {} };

    function pantalla(html) { $('pantalla').innerHTML = html; }
    function pieHtml() {
        return '<footer class="pie"><img src="img/argos-triangulo.png" alt="Argos-Core"><span><strong>Argos-Core</strong> © 2026</span></footer>';
    }
    function aviso(tipo, texto) {
        return `<div class="aviso ${tipo === 'ok' ? 'aviso-ok' : 'aviso-error'}">${esc(texto)}</div>`;
    }
    function marcaHtml() {
        return `<div class="centro"><img class="movil-logo" src="img/argos-triangulo.png" alt="Argos-Core" style="max-width:120px">
            <h1>${NOMBRE}</h1></div>`;
    }

    async function boot() {
        try {
            store = CFStore.crear(CFStorage.elegir());
            const r = await store.init();
            await CFAjustes.asegurar(store);
            await CFTema.sincronizar(store, document);
            console.log('[Centro] almacén:', store.backendNombre, '| instalación:', r.instalacion);
            const usuarios = await CFUsers.listar(store);
            if (!usuarios.length) return verCrearAdmin();
            verLogin(usuarios.filter(u => u.activo));
        } catch (e) {
            console.error(e);
            pantalla(`<div class="tarjeta"><h1>${NOMBRE}</h1>
                ${aviso('error', e.code === 'SELLO_INVALIDO'
                    ? 'Los datos fueron modificados fuera de la app y no se puede continuar.'
                    : 'No se pudo abrir el almacén de datos: ' + e.message)}
                <button class="btn btn-claro btn-bloque" onclick="location.reload()">Reintentar</button></div>` + pieHtml());
        }
    }

    function verCrearAdmin(msg) {
        pantalla(`<div class="tarjeta">${marcaHtml()}
            <p>Configure el usuario administrador del equipo.</p>
            ${msg || ''}
            <div class="campo"><label>Nombre</label><input id="a-nombre" maxlength="120" placeholder="Ej. María"></div>
            <div class="campo"><label>PIN (4 a 6 dígitos)</label>
                <input id="a-pin" type="password" inputmode="numeric" maxlength="6" placeholder="••••"></div>
            <button class="btn btn-primario btn-bloque" id="a-ok">Crear administrador</button></div>` + pieHtml());
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
        pantalla(`<div class="tarjeta">${marcaHtml()}
            ${msg || ''}
            <div class="campo"><label>Usuario</label><select id="l-usuario">${opciones}</select></div>
            <div class="pin-pantalla" id="l-pin">••••</div>
            <div class="pin-teclado" id="l-teclas"></div></div>` + pieHtml());
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

    function entrar() {
        pantalla('<header id="cabecera"></header><div id="aviso-lic"></div><div id="vista"></div>' + pieHtml() + '<nav id="barnav" class="barnav"></nav>');
        ir('inicio', {});
    }

    async function pintarCabecera() {
        const caja = $('cabecera');
        if (!caja || !sesion) return;
        try {
            const a = await CFAjustes.todos(store);
            const nombre = (a.negocio_nombre || NOMBRE).trim();
            const ini = nombre.split(/\s+/).slice(0, 2).map(w => (w[0] || '').toUpperCase()).join('') || 'CP';
            caja.innerHTML = `<div class="cabecera"><div class="cab-avatar">${esc(ini)}</div>
                <div><div class="cab-nombre">${esc(nombre)}</div><div class="cab-sub">${esc(sesion.nombre)} · ${esc(sesion.rol)}</div></div></div>`;
        } catch (_) { caja.innerHTML = ''; }
    }

    function itemsNav() {
        const items = [
            { v: 'inicio', icono: 'buscar', etiqueta: 'Buscar', roles: ['administrador', 'cajero', 'vendedor'] },
            { v: 'comparar', icono: 'reportes', etiqueta: 'Comparar', roles: ['administrador', 'cajero', 'vendedor'] },
            { v: 'publicar', icono: 'compartir', etiqueta: 'Publicar', roles: ['administrador'] },
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

    const PERMITIDAS_BLOQ = ['inicio', 'licencia', 'comparar'];

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
        if (lic.estado === 'GRACIA' && sesion.rol === 'administrador') {
            caja.innerHTML = `<div class="lic-banner gracia">${CFIconos.icono('alerta')}<span><strong>Licencia en gracia</strong>${lic.gracia ? ` — quedan ${lic.gracia.dias_restantes} días` : ''}.</span><a href="#" id="al-ir">Regularizar →</a></div>`;
            $('al-ir').addEventListener('click', ev => { ev.preventDefault(); ir('licencia', {}); });
        } else if (lic.estado === 'NO_CONFIGURADA' && sesion.rol === 'administrador') {
            caja.innerHTML = `<div class="lic-banner alerta">${CFIconos.icono('licencia')}<span>Licencia sin activar: no se aplica restricción.</span><a href="#" id="al-ir">Activar →</a></div>`;
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
