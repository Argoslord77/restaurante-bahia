// movil/www/js/licencia.js — Licencia adaptada al teléfono.
// MISMO modelo que la web: firma Ed25519 (la app solo lleva la clave
// pública), huella del equipo, tiempo de confianza, días de uso y gracia.
// Adaptaciones: estado en ajustes sellados (un solo dispositivo, sin réplica
// SQL), huella del Android (Device) y clave/licencia instalables en pantalla.
// El proveedor emite con tools/emitir.js (misma firma, mismo formato .lic).
(function (root, factory) {
    const mod = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = mod;
    else root.CFLicencia = mod;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const ESTADOS = { NO_CONFIGURADA: 'NO_CONFIGURADA', SIN_LICENCIA: 'SIN_LICENCIA',
                      ACTIVA: 'ACTIVA', GRACIA: 'GRACIA', BLOQUEADA: 'BLOQUEADA' };
    const GRACIA_DIAS = 7;
    const TOLERANCIA_MS = 10 * 60 * 1000;
    const UMBRAL = 70;
    const CACHE_MS = 60 * 1000;
    let cache = null, cacheHasta = 0;

    function mods() {
        if (typeof module !== 'undefined' && module.exports) {
            return { Ajustes: require('./ajustes') };
        }
        return { Ajustes: globalThis.CFAjustes };
    }

    function getNacl() {
        if (typeof globalThis !== 'undefined' && globalThis.nacl && globalThis.nacl.sign) {
            return globalThis.nacl;
        }
        if (typeof require !== 'undefined') return require('tweetnacl');
        throw new Error('Sin verificador Ed25519.');
    }

    function subtle() {
        if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle) {
            return globalThis.crypto.subtle;
        }
        if (typeof require !== 'undefined') return require('crypto').webcrypto.subtle;
        throw new Error('Sin criptografía disponible.');
    }

    // ── Canónico + firma (idéntico al proveedor) ──
    function canonico(valor) {
        if (valor === null || typeof valor !== 'object') return JSON.stringify(valor);
        if (Array.isArray(valor)) return '[' + valor.map(canonico).join(',') + ']';
        const claves = Object.keys(valor).sort();
        return '{' + claves.map(k => JSON.stringify(k) + ':' + canonico(valor[k])).join(',') + '}';
    }

    function base64ToBytes(b64) {
        const limpio = String(b64).replace(/\s+/g, '');
        if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(limpio, 'base64'));
        const bin = atob(limpio);
        const out = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
        return out;
    }

    // SPKI DER de Ed25519 = prefijo fijo de 12 bytes + 32 de la clave.
    function spkiToRaw(pem) {
        const b64 = String(pem).replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
        const der = base64ToBytes(b64);
        if (der.length !== 44) return null;
        return der.slice(der.length - 32);
    }

    function verificarFirma(datos, firmaB64, pubPem) {
        try {
            const msg = new TextEncoder().encode(canonico(datos));
            const sig = base64ToBytes(firmaB64);
            const pub = spkiToRaw(pubPem);
            if (sig.length !== 64 || !pub) return false;
            return getNacl().sign.detached.verify(msg, sig, pub);
        } catch (_) { return false; }
    }

    async function sha256bytes(texto) {
        return new Uint8Array(await subtle().digest('SHA-256', new TextEncoder().encode(texto)));
    }

    async function sha256hex(texto) {
        return Array.from(await sha256bytes(texto)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async function codigoCorto(texto, longitud) {
        const ALFABETO = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
        const bytes = await sha256bytes(String(texto));
        const n = longitud || 20;
        let salida = '';
        for (let i = 0; i < n; i++) salida += ALFABETO[bytes[i] % ALFABETO.length];
        return salida.match(/.{1,5}/g).join('-');
    }

    // ── Huella del dispositivo ──
    async function huellaActual() {
        let info = {}, id = null;
        try {
            const C = (typeof window !== 'undefined' && window.Capacitor) ||
                      (typeof globalThis !== 'undefined' && globalThis.Capacitor);
            const D = C && C.Plugins && C.Plugins.Device;
            if (D) {
                try { info = await D.getInfo(); } catch (_) { info = {}; }
                try { const r = await D.getId(); id = (r && (r.identifier || r.uuid)) || null; } catch (_) { id = null; }
            }
        } catch (_) { /* navegador */ }
        const h = async v => v ? (await sha256hex(String(v))).slice(0, 32) : null;
        const componentes = {
            dispositivo: await h(id || 'navegador'),
            modelo: await h(info.model || null),
            fabricante: await h(info.manufacturer || null),
            sistema: await h((info.operatingSystem || 'web') + '|' + (info.osVersion || '')),
            plataforma: await h(info.platform || 'web')
        };
        const pesos = { dispositivo: 40, modelo: 20, fabricante: 15, sistema: 15, plataforma: 10 };
        const resumen = await sha256hex(
            Object.entries(componentes).sort().map(([k, v]) => `${k}=${v}`).join('|'));
        return { componentes, pesos, resumen };
    }

    function comparar(huellaGuardada, umbral, huellaActualH) {
        const u = umbral || UMBRAL;
        const guardados = (huellaGuardada && huellaGuardada.componentes) || {};
        const pesos = (huellaGuardada && huellaGuardada.pesos) || (huellaActualH && huellaActualH.pesos) || {};
        let puntos = 0, evaluable = 0;
        const coincidentes = [], divergentes = [], ausentes = [];
        for (const nombre of Object.keys(pesos)) {
            const esperado = guardados[nombre];
            const obtenido = huellaActualH && huellaActualH.componentes[nombre];
            if (!esperado) { ausentes.push(nombre); continue; }
            evaluable += pesos[nombre];
            if (esperado === obtenido) { puntos += pesos[nombre]; coincidentes.push(nombre); }
            else divergentes.push(nombre);
        }
        const pct = evaluable > 0 ? Math.round((puntos / evaluable) * 100) : 0;
        return { puntuacion: pct, umbral: u, coincide: pct >= u,
                 coincidentes, divergentes, ausentes, peso_evaluable: evaluable };
    }

    // ── Estado y eventos ──
    async function leerEstado(store) {
        const { Ajustes } = mods();
        return {
            trinquete: Number(await Ajustes.get(store, 'lic_trinquete', '0')) || 0,
            dias: Number(await Ajustes.get(store, 'lic_dias', '0')) || 0,
            ultimo_dia: await Ajustes.get(store, 'lic_ultimo_dia', '') || null,
            secuencia: Number(await Ajustes.get(store, 'lic_secuencia', '0')) || 0,
            cadena: await Ajustes.get(store, 'lic_cadena', '') || '',
            gracia_desde: Number(await Ajustes.get(store, 'lic_gracia_desde', '0')) || 0
        };
    }

    async function guardarEstado(store, e, estado) {
        const { Ajustes } = mods();
        await Ajustes.set(store, 'lic_trinquete', String(e.trinquete));
        await Ajustes.set(store, 'lic_dias', String(e.dias));
        await Ajustes.set(store, 'lic_ultimo_dia', e.ultimo_dia || '');
        await Ajustes.set(store, 'lic_secuencia', String(e.secuencia));
        await Ajustes.set(store, 'lic_cadena', e.cadena || '');
        await Ajustes.set(store, 'lic_gracia_desde', String(e.gracia_desde || 0));
        await Ajustes.set(store, 'lic_estado', estado);
    }

    async function registrarEvento(store, tipo, detalle, gravedad) {
        try {
            await store.insertar('licencia_eventos', {
                tipo: String(tipo).slice(0, 60), gravedad: gravedad || 'INFO',
                detalle: JSON.stringify(detalle || {}).slice(0, 2000),
                creado_en: new Date().toISOString()
            });
        } catch (_) { /* nunca interrumpe */ }
    }

    async function maxDatos(store) {
        let max = 0;
        try {
            for (const v of await store.todos('ventas')) max = Math.max(max, new Date(v.creado_en).getTime() || 0);
            for (const t of await store.todos('turnos')) {
                max = Math.max(max, new Date(t.abierto_en).getTime() || 0, new Date(t.cerrado_en).getTime() || 0);
            }
            for (const m of await store.todos('movimientos')) max = Math.max(max, new Date(m.creado_en).getTime() || 0);
        } catch (_) { /* colecciones vacías */ }
        return max;
    }

    function diaLocalDe(ms) {
        const f = new Date(ms);
        const p = n => String(n).padStart(2, '0');
        return `${f.getFullYear()}-${p(f.getMonth() + 1)}-${p(f.getDate())}`;
    }

    // ── Licencia instalada ──
    async function leerLicencia(store) {
        const { Ajustes } = mods();
        const pub = await Ajustes.get(store, 'licencia_pub', '');
        if (!pub) return { valida: false, motivo: 'SIN_CLAVE_PUBLICA' };
        const crudo = await Ajustes.get(store, 'licencia_lic', '');
        if (!crudo) return { valida: false, motivo: 'SIN_ARCHIVO' };
        let contenido;
        try { contenido = JSON.parse(crudo); }
        catch (_) { return { valida: false, motivo: 'FORMATO_INVALIDO' }; }
        if (!contenido || !contenido.datos || !contenido.firma) {
            return { valida: false, motivo: 'FORMATO_INVALIDO' };
        }
        if (!verificarFirma(contenido.datos, contenido.firma, pub)) {
            return { valida: false, motivo: 'FIRMA_INVALIDA' };
        }
        return { valida: true, datos: contenido.datos };
    }

    async function guardarPub(store, pem) {
        if (!spkiToRaw(pem)) throw new Error('No es una clave pública Ed25519 válida.');
        const { Ajustes } = mods();
        await Ajustes.set(store, 'licencia_pub', String(pem).trim());
        invalidarCache();
        return true;
    }

    async function instalar(store, texto) {
        const { Ajustes } = mods();
        const pub = await Ajustes.get(store, 'licencia_pub', '');
        if (!pub) throw new Error('Primero configure la clave pública.');
        let contenido;
        try { contenido = JSON.parse(String(texto)); }
        catch (_) { throw new Error('No es un archivo de licencia válido.'); }
        if (!contenido || !contenido.datos || !contenido.firma) {
            throw new Error('No es un archivo de licencia válido.');
        }
        if (!verificarFirma(contenido.datos, contenido.firma, pub)) {
            throw new Error('La firma no es válida (FIRMA_INVALIDA).');
        }
        await Ajustes.set(store, 'licencia_lic', JSON.stringify(contenido));
        invalidarCache();
        await registrarEvento(store, 'LICENCIA_INSTALADA',
            { id: contenido.datos.id, cliente: contenido.datos.cliente });
        return contenido.datos;
    }

    async function solicitud(store, cliente) {
        const huella = await huellaActual();
        huella.umbral = UMBRAL;
        let equipo = { plataforma: 'web' };
        try {
            const C = globalThis.Capacitor;
            const D = C && C.Plugins && C.Plugins.Device;
            if (D) { const i = await D.getInfo(); equipo = { plataforma: i.platform, modelo: i.model, so: i.operatingSystem }; }
        } catch (_) { /* navegador */ }
        return { version: 1, app: 'cajafacil-movil', cliente: cliente || '',
                 instalacion: store.instalacion(), huella,
                 generada_en: new Date().toISOString(), equipo };
    }

    // ── Evaluación ──
    function descripcionMotivo(codigo) {
        return ({ SIN_ARCHIVO: 'No hay licencia instalada.',
            SIN_CLAVE_PUBLICA: 'Falta la clave pública.',
            FORMATO_INVALIDO: 'La licencia no tiene el formato esperado.',
            FIRMA_INVALIDA: 'La firma no es válida: el archivo fue alterado o no lo emitió el proveedor.'
        })[codigo] || 'La licencia no es válida.';
    }

    async function evaluar(store, opciones) {
        opciones = opciones || {};
        if (!opciones.forzar && cache && Date.now() < cacheHasta) return cache;
        const { Ajustes } = mods();
        const problemas = [], avisos = [];
        const e = await leerEstado(store);
        const huella = await huellaActual();

        // Tiempo de confianza: máximo(sistema, trinquete, datos)
        const sistema = Date.now();
        const datos = await maxDatos(store);
        const ms = Math.max(sistema, e.trinquete, datos);
        const retraso = Math.max(0, ms - sistema);
        const manipulado = retraso > TOLERANCIA_MS;
        if (manipulado) {
            problemas.push({ codigo: 'RELOJ_ATRASADO',
                mensaje: `El reloj va ${(Math.round(retraso / 360000) / 10)} h por detrás del tiempo ya registrado.` });
            await registrarEvento(store, 'RELOJ_ATRASADO', { retraso_ms: retraso }, 'CRITICO');
        }

        // Días de uso: solo días naturales distintos y posteriores
        const diaHoy = diaLocalDe(ms);
        if (e.ultimo_dia !== diaHoy && (!e.ultimo_dia || diaHoy > e.ultimo_dia)) {
            e.dias += 1;
            e.ultimo_dia = diaHoy;
        }
        const pub = await Ajustes.get(store, 'licencia_pub', '');
        const base = {
            instalacion: {
                uuid: store.instalacion(),
                codigo: await codigoCorto(store.instalacion() + '|' + huella.resumen),
                huella_resumen: huella.resumen.slice(0, 16)
            },
            tiempo: { confiable: new Date(ms).toISOString(),
                      sistema: new Date(sistema).toISOString(),
                      reloj_manipulado: manipulado, retraso_horas: Math.round(retraso / 360000) / 10 },
            uso: null, gracia: null
        };

        // Dormido: sin clave pública no restringe nada (pero alimenta el trinquete)
        if (!pub) {
            e.trinquete = Math.max(e.trinquete, ms);
            e.secuencia += 1;
            e.cadena = await sha256hex(`${e.cadena}|${e.secuencia}|${ms}`);
            await guardarEstado(store, e, ESTADOS.NO_CONFIGURADA);
            cache = { ...base, estado: ESTADOS.NO_CONFIGURADA, operativa: true, bloqueada: false,
                      problemas: [], avisos: [{ codigo: 'LICENCIAS_NO_CONFIGURADAS',
                        mensaje: 'Sin clave pública: no se aplica ninguna restricción.' }],
                      licencia: null, uso: { dias_consumidos: e.dias, dias_contratados: null,
                                             ultimo_dia: e.ultimo_dia, secuencia: e.secuencia } };
            cacheHasta = Date.now() + CACHE_MS;
            return cache;
        }

        const lic = await leerLicencia(store);
        let datosLic = null, estadoFinal = ESTADOS.SIN_LICENCIA;
        if (!lic.valida) {
            problemas.push({ codigo: lic.motivo, mensaje: descripcionMotivo(lic.motivo) });
        } else {
            datosLic = lic.datos;
            if (datosLic.instalacion && datosLic.instalacion !== store.instalacion()) {
                problemas.push({ codigo: 'INSTALACION_DISTINTA',
                    mensaje: 'La licencia es de otra instalación: copiar los datos no la traslada.' });
            }
            if (datosLic.huella) {
                const cmp = comparar(datosLic.huella, datosLic.huella.umbral || UMBRAL, huella);
                if (!cmp.coincide) {
                    problemas.push({ codigo: 'EQUIPO_DISTINTO',
                        mensaje: `El equipo no coincide (${cmp.puntuacion}%, se exige ${cmp.umbral}%).` });
                } else if (cmp.divergentes.length) {
                    avisos.push({ codigo: 'EQUIPO_CAMBIADO',
                        mensaje: `Cambios menores (${cmp.divergentes.join(', ')}), dentro de lo tolerado.` });
                }
            }
            if (datosLic.expira_en) {
                const exp = new Date(datosLic.expira_en).getTime();
                if (ms > exp) {
                    problemas.push({ codigo: 'CADUCADA',
                        mensaje: `Caducó el ${new Date(exp).toLocaleDateString('es')}.` });
                } else {
                    const rest = Math.ceil((exp - ms) / 86400000);
                    if (rest <= 15) avisos.push({ codigo: 'POR_CADUCAR', mensaje: `Caduca en ${rest} día(s).` });
                }
            }
            if (datosLic.dias_uso && e.dias > Number(datosLic.dias_uso)) {
                problemas.push({ codigo: 'DIAS_AGOTADOS',
                    mensaje: `Se agotaron los ${datosLic.dias_uso} días contratados (van ${e.dias}).` });
            }
        }

        e.secuencia += 1;
        e.cadena = await sha256hex(`${e.cadena}|${e.secuencia}|${ms}`);
        const graciaDias = datosLic && datosLic.gracia_dias !== undefined ? Number(datosLic.gracia_dias) : GRACIA_DIAS;
        let graciaDesde = e.gracia_desde || 0;
        if (!problemas.length) { estadoFinal = ESTADOS.ACTIVA; graciaDesde = 0; }
        else if (graciaDias > 0) {
            if (!graciaDesde) {
                graciaDesde = ms;
                await registrarEvento(store, 'GRACIA_INICIADA',
                    { problemas: problemas.map(p => p.codigo) }, 'CRITICO');
            }
            estadoFinal = (ms - graciaDesde) / 86400000 <= graciaDias ? ESTADOS.GRACIA : ESTADOS.BLOQUEADA;
        } else estadoFinal = ESTADOS.BLOQUEADA;

        e.trinquete = Math.max(e.trinquete, ms);
        e.gracia_desde = graciaDesde;
        await guardarEstado(store, e, estadoFinal);

        cache = { ...base, estado: estadoFinal,
                  operativa: estadoFinal === ESTADOS.ACTIVA || estadoFinal === ESTADOS.GRACIA,
                  bloqueada: estadoFinal === ESTADOS.BLOQUEADA,
                  problemas, avisos,
                  licencia: datosLic ? { id: datosLic.id, cliente: datosLic.cliente, plan: datosLic.plan,
                    emitida_en: datosLic.emitida_en, expira_en: datosLic.expira_en,
                    dias_uso: datosLic.dias_uso || null } : null,
                  uso: { dias_consumidos: e.dias,
                         dias_contratados: datosLic && datosLic.dias_uso ? Number(datosLic.dias_uso) : null,
                         ultimo_dia: e.ultimo_dia, secuencia: e.secuencia },
                  gracia: graciaDesde ? { desde: new Date(graciaDesde).toISOString(), dias_totales: graciaDias,
                    dias_restantes: Math.max(0, Math.ceil(graciaDias - (ms - graciaDesde) / 86400000)) } : null };
        cacheHasta = Date.now() + CACHE_MS;
        return cache;
    }

    function invalidarCache() { cache = null; cacheHasta = 0; }

    return { ESTADOS, evaluar, invalidarCache, leerLicencia, guardarPub, instalar,
             solicitud, huellaActual, comparar, codigoCorto, registrarEvento,
             verificarFirma, spkiToRaw, canonico, UMBRAL };
});
