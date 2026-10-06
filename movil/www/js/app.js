// movil/www/js/app.js — Arranque, login con PIN y pantalla base (Fase 1).
// Las pantallas de venta/inventario/caja llegan en la Fase 2 sobre este cimiento.
(function () {
    'use strict';

    const $ = id => document.getElementById(id);
    const esc = s => String(s === null || s === undefined ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    let store = null;
    let sesion = null;

    function pantalla(html) { $('pantalla').innerHTML = html; }
    function aviso(tipo, texto) {
        return `<div class="aviso ${tipo === 'ok' ? 'aviso-ok' : 'aviso-error'}">${esc(texto)}</div>`;
    }

    async function boot() {
        try {
            store = CFStore.crear(CFStorage.elegir());
            const r = await store.init();
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

    // ── Primer arranque: crear administrador ──
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

    // ── Login con PIN ──
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
            b.textContent = t === 'Borrar' ? '⌫' : t;
            if (t === 'Borrar' || t === 'Entrar') b.className = 'funcion';
            b.addEventListener('click', async () => {
                if (t === 'Borrar') pin = pin.slice(0, -1);
                else if (t === 'Entrar') {
                    const u = await CFUsers.verificar(store, $('l-usuario').value, pin);
                    if (!u) { pin = ''; return verLogin(usuarios, aviso('error', 'PIN incorrecto.')); }
                    sesion = u;
                    return verInicio();
                }
                else if (pin.length < 6) pin += t;
                $('l-pin').textContent = '•'.repeat(Math.max(pin.length, 1)) + '•••'.slice(0, Math.max(0, 3 - pin.length));
                if (!pin.length) $('l-pin').textContent = '••••';
            });
            teclas.appendChild(b);
        });
    }

    // ── Inicio (base; la venta llega en Fase 2) ──
    async function verInicio() {
        const n = {};
        for (const c of CFBackup.COLECCIONES) n[c] = (await store.todos(c)).length;
        pantalla(`<div class="encabezado"><h1>Hola, ${esc(sesion.nombre)}</h1>
            <button class="btn btn-claro btn-chico" id="i-salir">Salir</button></div>
            <div class="tarjeta"><h3>Este equipo</h3>
            <div class="ayuda">Instalación</div><div class="mono">${esc(store.instalacion())}</div>
            <div class="ayuda">Almacén: ${esc(store.backendNombre)} · Productos: ${n.productos} · Ventas: ${n.ventas}</div></div>
            <div class="tarjeta"><h3>Respaldo</h3>
            <button class="btn btn-primario btn-bloque" id="i-respaldo">Generar y compartir respaldo</button>
            <div class="ayuda">Se guarda un JSON que puede enviarse por WhatsApp o correo.</div>
            <div id="i-msg"></div></div>`);
        $('i-salir').addEventListener('click', async () => {
            sesion = null;
            verLogin((await CFUsers.listar(store)).filter(u => u.activo));
        });
        $('i-respaldo').addEventListener('click', async () => {
            try {
                const paquete = await CFBackup.generar(store);
                const texto = JSON.stringify(paquete, null, 2);
                const como = await CFBackup.compartir(texto, CFBackup.nombreArchivo());
                $('i-msg').innerHTML = aviso('ok', como === 'share' ? 'Respaldo listo para enviar.' : 'Respaldo descargado.');
            } catch (e) { $('i-msg').innerHTML = aviso('error', e.message); }
        });
    }

    document.addEventListener('DOMContentLoaded', boot);
})();
