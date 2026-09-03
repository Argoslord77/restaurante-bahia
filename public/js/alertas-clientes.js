// ============================================================================
// alertas-clientes.js
// Módulo compartido de alertas de salón: llamadas de servicio, solicitudes de
// cierre de cuenta y pre-pedidos enviados por los clientes desde su menú QR.
//
// Lo consumen el Panel de Servicio (dependiente) y el POS: quien esté
// operando cualquiera de las dos pantallas recibe las alertas, sin duplicados
// y sin perder ninguna.
//
// Arquitectura
// ------------
// · El estado real vive en la base de datos (pre_pedidos y
//   notificaciones_mesero con leido = 0): si el navegador se cierra o
//   navega, la alerta sobrevive y se vuelve a mostrar.
// · El cliente mantiene una COLA FIFO: los modales se muestran de uno en
//   uno, en orden de llegada, aunque el sondeo traiga varias alertas juntas.
// · Deduplicación estable por ID (no por conteo): cada alerta se marca como
//   vista en sessionStorage cuando el usuario actúa sobre ella. Las claves
//   antiguas se derivaban de la CANTIDAD de ítems del pre-pedido, lo que
//   silenciaba alertas nuevas cuando el conteo coincidía.
// · Sondeo cada 4 s con fetch a /pos/alertas-pendientes, solo con la
//   pestaña visible. La ruta está excluida del registro de auditoría.
// ============================================================================
(function () {
    'use strict';

    if (window.AlertasClientes) return; // idempotente

    const URL_SONDEO = '/pos/alertas-pendientes';
    const INTERVALO_MS = 4000;
    const CLAVE_VISTAS = 'bahia_alertas_vistas_v1';
    const MAX_VISTAS = 300;

    // ── Registro de vistas (sessionStorage: sobrevive navegaciones internas) ──
    function cargarVistas() {
        try { return new Set(JSON.parse(sessionStorage.getItem(CLAVE_VISTAS) || '[]')); }
        catch (_) { return new Set([]); }
    }
    const vistas = cargarVistas();
    function marcarVista(clave) {
        vistas.add(clave);
        try {
            const lista = [...vistas];
            sessionStorage.setItem(CLAVE_VISTAS, JSON.stringify(lista.slice(-MAX_VISTAS)));
        } catch (_) { /* almacenamiento lleno o bloqueado: la cola en memoria sigue */ }
    }

    // ── Cola FIFO de alertas ──────────────────────────────────────────────────
    const cola = [];
    let procesando = false;
    let claveEnPantalla = null;

    function encolar(alerta) {
        if (vistas.has(alerta.clave)) return;
        if (claveEnPantalla === alerta.clave) return;
        if (cola.some(a => a.clave === alerta.clave)) return;
        cola.push(alerta);
        procesarCola();
    }

    async function procesarCola() {
        if (procesando) return;
        procesando = true;
        while (cola.length) {
            const alerta = cola.shift();
            claveEnPantalla = alerta.clave;
            reproducirSonido();
            try { await alerta.mostrar(); } catch (_) { /* nunca romper el ciclo */ }
            marcarVista(alerta.clave);
            claveEnPantalla = null;
        }
        procesando = false;
    }

    // ── Sonido ────────────────────────────────────────────────────────────────
    let audio = null;
    function reproducirSonido() {
        try {
            audio = audio || document.getElementById('audioAlertaCliente') || new Audio('/sounds/alert-notification.mp3');
            audio.currentTime = 0;
            const p = audio.play();
            if (p && p.catch) p.catch(() => { /* bloqueado hasta interacción */ });
        } catch (_) { /* silencio */ }
    }

    // ── Utilidades ────────────────────────────────────────────────────────────
    const esc = (t) => String(t == null ? '' : t)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    function haceCuanto(fecha) {
        const ms = Date.now() - new Date(fecha).getTime();
        if (!Number.isFinite(ms) || ms < 0) return '';
        const min = Math.floor(ms / 60000);
        if (min < 1) return 'hace instantes';
        if (min === 1) return 'hace 1 minuto';
        if (min < 60) return `hace ${min} minutos`;
        const h = Math.floor(min / 60);
        return h === 1 ? 'hace 1 hora' : `hace ${h} horas`;
    }

    const fmt = (v) => '$' + Number(v || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // ── Hoja de estilo (inyectada una sola vez) ───────────────────────────────
    function inyectarCSS() {
        if (document.getElementById('bahia-alertas-css')) return;
        const css = `
        .bahia-alerta { border-radius: 16px !important; border: 1px solid #e2e8f0 !important;
            box-shadow: 0 24px 48px -16px rgba(15, 23, 42, .35) !important; padding: 1.35rem 1.35rem 1.15rem !important; }
        .bahia-alerta .swal2-title { padding: 0; font-size: 1.18rem; font-weight: 800; color: #0f172a; text-align: left; }
        .bahia-alerta .swal2-html-container { margin: 0 !important; padding: 0 !important; text-align: left; }
        .bahia-alerta-kicker { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
        .bahia-alerta-chip { width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0;
            display: inline-flex; align-items: center; justify-content: center; font-size: 15px;
            background: #f1f5f9; color: #0f172a; }
        .bahia-alerta-kicker small { font-size: .66rem; font-weight: 800; letter-spacing: .1em;
            text-transform: uppercase; color: #64748b; line-height: 1.25; }
        .bahia-alerta-kicker small em { display: block; font-style: normal; font-weight: 600;
            letter-spacing: 0; text-transform: none; color: #94a3b8; font-size: .74rem; }
        .bahia-alerta-items { border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;
            margin-top: 12px; max-height: 240px; overflow-y: auto; }
        .bahia-alerta-item { display: flex; align-items: flex-start; gap: 10px; padding: 9px 12px; background: #fff; }
        .bahia-alerta-item:nth-child(even) { background: #f8fafc; }
        .bahia-alerta-item + .bahia-alerta-item { border-top: 1px solid #f1f5f9; }
        .bahia-cantidad { min-width: 28px; height: 28px; border-radius: 9px; background: #0f172a; color: #fff;
            font-weight: 800; font-size: .78rem; display: inline-flex; align-items: center; justify-content: center;
            flex-shrink: 0; font-variant-numeric: tabular-nums; }
        .bahia-alerta-item-cuerpo { flex: 1 1 auto; min-width: 0; }
        .bahia-alerta-nombre { font-weight: 700; color: #1e293b; font-size: .88rem; line-height: 1.25;
            overflow-wrap: anywhere; }
        .bahia-alerta-nota { display: inline-block; font-size: .72rem; color: #b45309; background: #fffbeb;
            border: 1px solid #fde68a; border-radius: 6px; padding: 2px 7px; margin-top: 4px; line-height: 1.35; }
        .bahia-alerta-precio { margin-left: auto; font-weight: 700; color: #334155; font-size: .85rem;
            font-variant-numeric: tabular-nums; padding-top: 3px; flex-shrink: 0; }
        .bahia-alerta-total { display: flex; justify-content: space-between; align-items: center;
            margin-top: 10px; padding: 9px 12px; background: #f8fafc; border: 1px dashed #cbd5e1;
            border-radius: 10px; font-size: .72rem; color: #64748b; font-weight: 800;
            text-transform: uppercase; letter-spacing: .06em; }
        .bahia-alerta-total strong { color: #0f172a; font-size: .98rem; font-variant-numeric: tabular-nums;
            letter-spacing: 0; }
        .bahia-alerta-aviso { margin-top: 10px; font-size: .72rem; color: #94a3b8; display: flex;
            align-items: center; gap: 6px; }
        .swal2-container .bahia-btn-primario { background: #0f172a !important; color: #fff !important;
            border-radius: 10px !important; font-weight: 700 !important; padding: 10px 20px !important;
            font-size: .84rem !important; border: none !important; }
        .swal2-container .bahia-btn-primario:focus { box-shadow: 0 0 0 3px rgba(15, 23, 42, .25) !important; }
        .swal2-container .bahia-btn-peligro { background: #fff !important; color: #e11d48 !important;
            border: 1.5px solid #fecdd3 !important; border-radius: 10px !important; font-weight: 700 !important;
            padding: 10px 16px !important; font-size: .84rem !important; }
        .swal2-container .bahia-btn-peligro:hover { background: #fef2f2 !important; }
        .swal2-container .bahia-btn-neutro { background: #f1f5f9 !important; color: #475569 !important;
            border: none !important; border-radius: 10px !important; font-weight: 700 !important;
            padding: 10px 16px !important; font-size: .84rem !important; }
        .swal2-container .bahia-btn-neutro:hover { background: #e2e8f0 !important; }
        @media (max-width: 480px) {
            .bahia-alerta { padding: 1.05rem 1rem 1rem !important; }
            .swal2-container .bahia-btn-primario, .swal2-container .bahia-btn-peligro,
            .swal2-container .bahia-btn-neutro { padding: 12px 14px !important; }
        }`;
        const estilo = document.createElement('style');
        estilo.id = 'bahia-alertas-css';
        estilo.textContent = css;
        document.head.appendChild(estilo);
    }

    // ── Alerta: llamada de servicio / solicitud de cierre ────────────────────
    function alertaNotificacion(notif) {
        const esCierre = notif.tipo === 'SOLICITUD_CIERRE';
        const nombreMesa = notif.nombre_mesa || notif.numero || notif.mesa || 'N/A';
        const icono = esCierre ? 'fa-file-invoice-dollar' : 'fa-bell';
        const etiqueta = esCierre ? 'Solicitud de cuenta' : 'Llamada de servicio';

        return {
            clave: `notif:${notif.id}`,
            mostrar: async () => {
                await Swal.fire({
                    customClass: {
                        popup: 'bahia-alerta',
                        confirmButton: 'bahia-btn-primario'
                    },
                    buttonsStyling: false,
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                    html: `
                        <div class="bahia-alerta-cuerpo">
                            <div class="bahia-alerta-kicker">
                                <span class="bahia-alerta-chip"><i class="fa-solid ${icono}"></i></span>
                                <small>${esc(etiqueta)}<em>Mesa ${esc(nombreMesa)} · ${esc(haceCuanto(notif.creado_en))}</em></small>
                            </div>
                            <p style="margin: 4px 0 0; font-size: .92rem; color: #334155; line-height: 1.5;">
                                ${esc(notif.mensaje || (esCierre ? 'El cliente solicita la cuenta.' : 'El cliente solicita atención.'))}
                            </p>
                        </div>`,
                    confirmButtonText: 'Marcar atendida',
                    didOpen: () => { const b = Swal.getConfirmButton(); if (b) b.focus(); }
                }).then(async (r) => {
                    if (r.isConfirmed) {
                        try { await fetch(`/pos/notificaciones/${notif.id}/leer`, { method: 'POST' }); } catch (_) {}
                    }
                });
            }
        };
    }

    // ── Alerta: pre-pedido agrupado por mesa ──────────────────────────────────
    function alertaPrePedido(grupo) {
        const idsOrdenados = grupo.items.map(i => i.id).sort((a, b) => a - b);
        const filas = grupo.items.map(i => `
            <div class="bahia-alerta-item">
                <span class="bahia-cantidad">${parseInt(i.cantidad, 10) || 1}×</span>
                <span class="bahia-alerta-item-cuerpo">
                    <span class="bahia-alerta-nombre">${esc(i.platillo)}</span>
                    ${i.notas_especiales ? `<span class="bahia-alerta-nota"><i class="fa-regular fa-comment-dots"></i> ${esc(i.notas_especiales)}</span>` : ''}
                </span>
                <span class="bahia-alerta-precio">${fmt(i.precio)}</span>
            </div>`).join('');

        const totalEstimado = grupo.items.reduce((s, i) => s + (parseFloat(i.precio) || 0) * (parseInt(i.cantidad, 10) || 1), 0);
        const creado = grupo.items.reduce((a, b) => (new Date(b.creado_en) > new Date(a.creado_en) ? b : a), grupo.items[0]);

        return {
            clave: `pre:${grupo.idMesa}:${idsOrdenados.join('-')}`,
            mostrar: async () => {
                const resultado = await Swal.fire({
                    customClass: {
                        popup: 'bahia-alerta',
                        confirmButton: 'bahia-btn-primario',
                        denyButton: 'bahia-btn-peligro',
                        cancelButton: 'bahia-btn-neutro'
                    },
                    buttonsStyling: false,
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                    showDenyButton: true,
                    showCancelButton: true,
                    html: `
                        <div class="bahia-alerta-cuerpo">
                            <div class="bahia-alerta-kicker">
                                <span class="bahia-alerta-chip"><i class="fa-solid fa-concierge-bell"></i></span>
                                <small>Pre-pedido nuevo<em>Mesa ${esc(grupo.numeroMesa)} · ${esc(haceCuanto(creado.creado_en))}</em></small>
                            </div>
                            <div class="bahia-alerta-items">${filas}</div>
                            <div class="bahia-alerta-total">
                                <span>Total estimado · ${grupo.items.length} línea${grupo.items.length === 1 ? '' : 's'}</span>
                                <strong>${fmt(totalEstimado)}</strong>
                            </div>
                            <div class="bahia-alerta-aviso">
                                <i class="fa-solid fa-circle-info"></i>
                                <span>El total es referencial: los descuentos y ajustes se aplican al cargar la orden al POS.</span>
                            </div>
                        </div>`,
                    confirmButtonText: 'Cargar al POS',
                    denyButtonText: 'Descartar',
                    cancelButtonText: 'Atender luego',
                    didOpen: () => { const b = Swal.getConfirmButton(); if (b) b.focus(); }
                });

                if (resultado.isConfirmed) {
                    const itemsPrePedido = grupo.items.map(item => ({
                        id: item.id_platillo,
                        nombre: item.platillo,
                        precio: parseFloat(item.precio),
                        cantidad: parseInt(item.cantidad, 10) || 1,
                        es_platillo_dia: item.es_platillo_dia === true || item.es_platillo_dia === 1 || item.es_platillo_dia === '1',
                        notas: item.notas_especiales || ''
                    }));
                    marcarVista(`pre:${grupo.idMesa}:${idsOrdenados.join('-')}`);
                    window.location.href = `/pos/mesa/${grupo.idMesa}?cargarPrePedido=${encodeURIComponent(JSON.stringify(itemsPrePedido))}`;
                } else if (resultado.isDenied) {
                    // Descartar solo las líneas mostradas: si llegó algo nuevo
                    // mientras se leía la alerta, esa alerta seguirá viva.
                    try {
                        await Promise.all(grupo.items.map(i =>
                            fetch(`/pos/pre-pedidos/${i.id}`, { method: 'DELETE' }).catch(() => {})
                        ));
                    } catch (_) {}
                }
                // Cancelar ("Atender luego"): queda vista por ahora; si el
                // cliente agrega más líneas, la alerta regresa con ids nuevos.
            }
        };
    }

    // ── Sondeo ────────────────────────────────────────────────────────────────
    let sondeando = false;
    async function sondear() {
        if (sondeando || document.visibilityState !== 'visible') return;
        sondeando = true;
        try {
            const response = await fetch(URL_SONDEO, { headers: { 'Accept': 'application/json' } });
            if (!response.ok) return;
            const data = await response.json();
            if (!data.success || !data.alertas) return;

            const { notificaciones = [], prePedidos = [] } = data.alertas;

            for (const notif of notificaciones) encolar(alertaNotificacion(notif));

            if (prePedidos.length) {
                const porMesa = new Map();
                for (const item of prePedidos) {
                    if (!porMesa.has(item.id_mesa)) {
                        porMesa.set(item.id_mesa, { idMesa: item.id_mesa, numeroMesa: item.numero, items: [] });
                    }
                    porMesa.get(item.id_mesa).items.push(item);
                }
                for (const grupo of porMesa.values()) encolar(alertaPrePedido(grupo));
            }
        } catch (_) { /* sin conexión: se reintenta en el próximo ciclo */ }
        finally { sondeando = false; }
    }

    // ── API pública ───────────────────────────────────────────────────────────
    window.AlertasClientes = {
        init() {
            inyectarCSS();
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') sondear();
            });
            sondear();
            setInterval(sondear, INTERVALO_MS);
        }
    };
})();
