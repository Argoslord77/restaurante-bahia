// services/licencia/licenciaService.js
// Orquestación del sistema de licencias.
//
// Modelo de amenazas y respuesta
// ------------------------------
//   Amenaza                                     Defensa
//   ─────────────────────────────────────────── ────────────────────────────────
//   Falsificar una licencia                     Firma Ed25519; la instalación
//                                               solo tiene la clave pública.
//   Atrasar el reloj del sistema                Trinquete monótono alimentado
//                                               por los datos del negocio.
//   Copiar el proyecto a otro equipo            Huella ponderada del hardware.
//   Copiar proyecto + base de datos             La huella sigue sin coincidir.
//   Restaurar una copia antigua de la BD        Estado replicado en un archivo
//                                               al margen de la base; se toma
//                                               el máximo de ambos.
//   Borrar el archivo de estado                 La base conserva el estado.
//   Borrar ambos                                Los datos del negocio (ventas,
//                                               cierres, auditoría) siguen
//                                               demostrando el tiempo pasado.
//   Editar el estado por SQL                    Cada fila va sellada con HMAC.
//
// Lo que este sistema NO puede hacer
// ----------------------------------
// El código se ejecuta en un equipo que controla el cliente. Quien tenga
// conocimientos y acceso de administrador puede editar los archivos y eliminar
// las comprobaciones. Ningún sistema de licencia del lado del cliente evita
// eso. El objetivo realista es que copiar la instalación o manipular la hora
// no funcione, y que cualquier intento quede registrado.
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const db = require('../../config/db');
const logger = require('../../config/logger');
const Firma = require('./firma');
const Huella = require('./huella');
const Reloj = require('./reloj');

const RAIZ = path.join(__dirname, '..', '..');
const RUTA_LICENCIA = process.env.LICENCIA_ARCHIVO || path.join(RAIZ, 'licencia', 'licencia.lic');
const RUTA_ESTADO = process.env.LICENCIA_ESTADO || path.join(RAIZ, 'licencia', 'estado.dat');
const RUTA_CLAVE_PUBLICA = path.join(RAIZ, 'config', 'licencia.pub');

const ESTADOS = Object.freeze({
    // El proveedor todavía no ha desplegado la clave pública: el sistema de
    // licencias está dormido y NO restringe nada. Es el estado de una
    // instalación recién actualizada, y evita que un despliegue rutinario deje
    // el restaurante bloqueado a los pocos días sin que nadie lo esperase.
    NO_CONFIGURADA: 'NO_CONFIGURADA',
    SIN_LICENCIA: 'SIN_LICENCIA',
    ACTIVA: 'ACTIVA',
    GRACIA: 'GRACIA',
    BLOQUEADA: 'BLOQUEADA'
});

// Cuánto se tolera funcionar tras detectar un problema antes de bloquear.
const GRACIA_POR_DEFECTO_DIAS = 7;

let cache = null;
let cacheHasta = 0;
const CACHE_MS = 60 * 1000;

// ── Utilidades ─────────────────────────────────────────────────────────────

function leerClavePublica() {
    try {
        return fs.readFileSync(RUTA_CLAVE_PUBLICA, 'utf8');
    } catch (_) {
        return null;
    }
}

/**
 * Clave del sello HMAC del estado. Se deriva de la instalación para que el
 * sello de un equipo no valga en otro. Está en el código, así que no detiene a
 * quien lo lea: sirve para que editar la tabla con un cliente SQL quede en
 * evidencia, que es el escenario realista.
 */
function claveSello(instalacionUuid) {
    return crypto.createHash('sha256')
        .update(`bahia|sello-estado|${instalacionUuid || 'sin-instalacion'}`)
        .digest('hex');
}

function camposSellables(estado) {
    return {
        instalacion_uuid: estado.instalacion_uuid,
        licencia_id: estado.licencia_id || null,
        trinquete_ms: Number(estado.trinquete_ms) || 0,
        dias_consumidos: Number(estado.dias_consumidos) || 0,
        ultimo_dia: estado.ultimo_dia || null,
        secuencia: Number(estado.secuencia) || 0,
        cadena: estado.cadena || null
    };
}

function sellar(estado) {
    return Firma.sello(camposSellables(estado), claveSello(estado.instalacion_uuid));
}

function selloValido(estado) {
    if (!estado || !estado.sello) return false;
    return estado.sello === sellar(estado);
}

// ── Estado replicado: base de datos + archivo ──────────────────────────────

async function leerEstadoBD() {
    try {
        const [filas] = await db.query('SELECT * FROM licencia_estado WHERE id = 1 LIMIT 1');
        return filas[0] || null;
    } catch (_) {
        return null;
    }
}

function leerEstadoArchivo() {
    try {
        return JSON.parse(fs.readFileSync(RUTA_ESTADO, 'utf8'));
    } catch (_) {
        return null;
    }
}

function escribirEstadoArchivo(estado) {
    try {
        fs.mkdirSync(path.dirname(RUTA_ESTADO), { recursive: true });
        fs.writeFileSync(RUTA_ESTADO, JSON.stringify(estado, null, 2), { mode: 0o600 });
        return true;
    } catch (error) {
        logger.warn(`[Licencia] No se pudo escribir el estado en disco: ${error.message}`);
        return false;
    }
}

/**
 * Combina las dos copias del estado quedándose SIEMPRE con lo más avanzado.
 *
 * Es la defensa contra restaurar una copia de seguridad antigua de la base de
 * datos para recuperar días de licencia: el archivo de estado, que vive fuera
 * de la base, conserva el contador real.
 */
function fusionarEstados(estadoBD, estadoArchivo) {
    const candidatos = [estadoBD, estadoArchivo].filter(Boolean);
    if (!candidatos.length) return null;

    const base = candidatos.find(e => selloValido(e)) || candidatos[0];
    const fusionado = { ...base };
    const sospechas = [];

    for (const e of candidatos) {
        if (!selloValido(e)) {
            sospechas.push(e === estadoBD ? 'sello_bd_invalido' : 'sello_archivo_invalido');
            continue;
        }
        if (Number(e.trinquete_ms) > Number(fusionado.trinquete_ms || 0)) fusionado.trinquete_ms = e.trinquete_ms;
        if (Number(e.dias_consumidos) > Number(fusionado.dias_consumidos || 0)) fusionado.dias_consumidos = e.dias_consumidos;
        if (Number(e.secuencia) > Number(fusionado.secuencia || 0)) fusionado.secuencia = e.secuencia;
        if (e.ultimo_dia && (!fusionado.ultimo_dia || e.ultimo_dia > fusionado.ultimo_dia)) fusionado.ultimo_dia = e.ultimo_dia;
    }

    // Discrepancia entre las dos copias: alguien tocó una de ellas
    if (estadoBD && estadoArchivo && selloValido(estadoBD) && selloValido(estadoArchivo)) {
        const dif = Math.abs(Number(estadoBD.secuencia || 0) - Number(estadoArchivo.secuencia || 0));
        if (dif > 1) sospechas.push(`desfase_secuencia:${dif}`);
        if (Number(estadoBD.dias_consumidos || 0) < Number(estadoArchivo.dias_consumidos || 0)) {
            sospechas.push('bd_retrocedio_dias');
        }
        if (Number(estadoBD.trinquete_ms || 0) < Number(estadoArchivo.trinquete_ms || 0) - Reloj.TOLERANCIA_MS) {
            sospechas.push('bd_retrocedio_tiempo');
        }
    }

    fusionado.sospechas = sospechas;
    return fusionado;
}

async function guardarEstado(estado) {
    estado.sello = sellar(estado);
    const fila = camposSellables(estado);

    try {
        await db.query(`
            INSERT INTO licencia_estado
                (id, instalacion_uuid, licencia_id, trinquete_ms, dias_consumidos,
                 ultimo_dia, secuencia, cadena, estado, gracia_desde_ms, sello)
            VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                licencia_id = VALUES(licencia_id),
                trinquete_ms = VALUES(trinquete_ms),
                dias_consumidos = VALUES(dias_consumidos),
                ultimo_dia = VALUES(ultimo_dia),
                secuencia = VALUES(secuencia),
                cadena = VALUES(cadena),
                estado = VALUES(estado),
                gracia_desde_ms = VALUES(gracia_desde_ms),
                sello = VALUES(sello)`,
            [fila.instalacion_uuid, fila.licencia_id, fila.trinquete_ms, fila.dias_consumidos,
             fila.ultimo_dia, fila.secuencia, fila.cadena, estado.estado || null,
             estado.gracia_desde_ms || null, estado.sello]);
    } catch (error) {
        logger.warn(`[Licencia] No se pudo guardar el estado en la base: ${error.message}`);
    }

    escribirEstadoArchivo({ ...fila, estado: estado.estado || null,
                            gracia_desde_ms: estado.gracia_desde_ms || null, sello: estado.sello });
    return estado;
}

async function registrarEvento(tipo, detalle = {}, gravedad = 'INFO') {
    try {
        await db.query(
            'INSERT INTO licencia_eventos (tipo, gravedad, detalle) VALUES (?, ?, ?)',
            [String(tipo).slice(0, 60), gravedad, JSON.stringify(detalle).slice(0, 4000)]);
    } catch (_) { /* nunca debe interrumpir el servicio */ }
}

// ── Licencia ───────────────────────────────────────────────────────────────

/** Lee y verifica criptográficamente el archivo de licencia. */
function leerLicencia() {
    const clavePublica = leerClavePublica();
    if (!clavePublica) return { valida: false, motivo: 'SIN_CLAVE_PUBLICA' };

    let contenido;
    try {
        contenido = JSON.parse(fs.readFileSync(RUTA_LICENCIA, 'utf8'));
    } catch (_) {
        return { valida: false, motivo: 'SIN_ARCHIVO' };
    }

    if (!contenido || !contenido.datos || !contenido.firma) {
        return { valida: false, motivo: 'FORMATO_INVALIDO' };
    }
    if (!Firma.verificar(contenido.datos, contenido.firma, clavePublica)) {
        return { valida: false, motivo: 'FIRMA_INVALIDA' };
    }
    return { valida: true, datos: contenido.datos };
}

/** Identificador que el cliente dicta al proveedor para pedir su licencia. */
function codigoDeInstalacion(instalacionUuid, huellaResumen) {
    return Firma.codigoCorto(`${instalacionUuid}|${huellaResumen}`, 20);
}

// ── Evaluación completa ────────────────────────────────────────────────────

/**
 * Evalúa el estado de la licencia. Es la única función que debe usar el resto
 * de la aplicación.
 *
 * @param {object} opciones { forzar: ignora la caché, consultarRed: sincroniza hora }
 */
async function evaluar(opciones = {}) {
    if (!opciones.forzar && cache && Date.now() < cacheHasta) return cache;

    const problemas = [];
    const avisos = [];

    // 1. Estado persistido (base de datos + archivo)
    const estadoBD = await leerEstadoBD();
    const estadoArchivo = leerEstadoArchivo();
    let estado = fusionarEstados(estadoBD, estadoArchivo);

    if (estado && estado.sospechas && estado.sospechas.length) {
        for (const s of estado.sospechas) {
            problemas.push({ codigo: s, mensaje: descripcionSospecha(s) });
        }
    }

    // 2. Primera ejecución: se crea la identidad de la instalación
    const huellaActual = Huella.actual();
    if (!estado || !estado.instalacion_uuid) {
        estado = {
            instalacion_uuid: crypto.randomUUID(),
            licencia_id: null,
            trinquete_ms: Date.now(),
            dias_consumidos: 0,
            ultimo_dia: null,
            secuencia: 0,
            cadena: crypto.randomBytes(16).toString('hex')
        };
        await guardarEstado(estado);
        await registrarEvento('INSTALACION_CREADA', { instalacion: estado.instalacion_uuid });
    }

    // 3. Tiempo de confianza (trinquete)
    const tiempo = await Reloj.resolver(db, estado.trinquete_ms, { consultarRed: opciones.consultarRed });
    if (tiempo.reloj_manipulado) {
        problemas.push({
            codigo: 'RELOJ_ATRASADO',
            mensaje: `El reloj del equipo va ${tiempo.retraso_horas} h por detrás del tiempo ya registrado por el propio sistema.`
        });
        await registrarEvento('RELOJ_ATRASADO',
            { retraso_horas: tiempo.retraso_horas, fuente: tiempo.fuente }, 'CRITICO');
    }

    // 4. Contador de días de uso: solo suma días naturales distintos
    const diaHoy = Reloj.claveDia(tiempo.ms);
    let diasConsumidos = Number(estado.dias_consumidos) || 0;
    if (estado.ultimo_dia !== diaHoy) {
        // Solo avanza si el día es POSTERIOR al último visto
        if (!estado.ultimo_dia || diaHoy > estado.ultimo_dia) {
            diasConsumidos += 1;
            estado.ultimo_dia = diaHoy;
        }
    }

    // 5. Licencia
    //
    // Si no hay clave pública, el sistema de licencias está DORMIDO: se sigue
    // alimentando el trinquete de tiempo (para que el historial ya esté ahí el
    // día que se active), pero no se restringe absolutamente nada.
    const hayClavePublica = Boolean(leerClavePublica());
    if (!hayClavePublica) {
        const nuevoEstadoLibre = {
            ...estado,
            trinquete_ms: Math.max(Number(estado.trinquete_ms) || 0, tiempo.ms),
            dias_consumidos: diasConsumidos,
            secuencia: Number(estado.secuencia || 0) + 1,
            cadena: crypto.createHash('sha256')
                .update(`${estado.cadena || ''}|${Number(estado.secuencia || 0) + 1}|${tiempo.ms}`).digest('hex'),
            estado: ESTADOS.NO_CONFIGURADA,
            gracia_desde_ms: null
        };
        await guardarEstado(nuevoEstadoLibre);

        const libre = {
            estado: ESTADOS.NO_CONFIGURADA,
            operativa: true,
            bloqueada: false,
            problemas: [],
            avisos: [{
                codigo: 'LICENCIAS_NO_CONFIGURADAS',
                mensaje: 'El sistema de licencias no está activado en esta instalación: falta config/licencia.pub. No se aplica ninguna restricción.'
            }],
            licencia: null,
            instalacion: {
                uuid: nuevoEstadoLibre.instalacion_uuid,
                codigo: codigoDeInstalacion(nuevoEstadoLibre.instalacion_uuid, huellaActual.resumen),
                huella_resumen: huellaActual.resumen.slice(0, 16)
            },
            tiempo: {
                confiable: new Date(tiempo.ms).toISOString(), fuente: tiempo.fuente,
                sistema: new Date(tiempo.sistema_ms).toISOString(),
                reloj_manipulado: tiempo.reloj_manipulado, retraso_horas: tiempo.retraso_horas
            },
            uso: {
                dias_consumidos: diasConsumidos, dias_contratados: null,
                ultimo_dia: nuevoEstadoLibre.ultimo_dia, secuencia: nuevoEstadoLibre.secuencia
            },
            gracia: null
        };
        cache = libre;
        cacheHasta = Date.now() + CACHE_MS;
        return libre;
    }

    const licencia = leerLicencia();
    let datos = null;
    let estadoFinal = ESTADOS.SIN_LICENCIA;

    if (!licencia.valida) {
        problemas.push({ codigo: licencia.motivo, mensaje: descripcionMotivo(licencia.motivo) });
    } else {
        datos = licencia.datos;

        // 5.a Vinculación a esta instalación concreta
        if (datos.instalacion && datos.instalacion !== estado.instalacion_uuid) {
            problemas.push({
                codigo: 'INSTALACION_DISTINTA',
                mensaje: 'La licencia fue emitida para otra instalación. Copiar los archivos a otro equipo o base de datos no la traslada.'
            });
        }

        // 5.b Huella del equipo
        if (datos.huella) {
            const cmp = Huella.comparar(datos.huella, datos.huella.umbral || Huella.UMBRAL_POR_DEFECTO, huellaActual);
            if (!cmp.coincide) {
                problemas.push({
                    codigo: 'EQUIPO_DISTINTO',
                    mensaje: `El equipo no coincide con el autorizado (${cmp.puntuacion}% de coincidencia, se exige ${cmp.umbral}%). Componentes distintos: ${cmp.divergentes.join(', ') || 'todos'}.`
                });
            } else if (cmp.divergentes.length) {
                avisos.push({
                    codigo: 'HARDWARE_CAMBIADO',
                    mensaje: `Se detectaron cambios de hardware (${cmp.divergentes.join(', ')}), dentro de lo tolerado (${cmp.puntuacion}%).`
                });
            }
        }

        // 5.c Caducidad por fecha, medida con el tiempo de confianza
        if (datos.expira_en) {
            const expiraMs = new Date(datos.expira_en).getTime();
            if (tiempo.ms > expiraMs) {
                problemas.push({
                    codigo: 'CADUCADA',
                    mensaje: `La licencia caducó el ${new Date(expiraMs).toLocaleDateString('es-ES')}.`
                });
            } else {
                const diasRestantes = Math.ceil((expiraMs - tiempo.ms) / 86400000);
                if (diasRestantes <= 15) {
                    avisos.push({ codigo: 'POR_CADUCAR', mensaje: `La licencia caduca en ${diasRestantes} día(s).` });
                }
            }
        }

        // 5.d Caducidad por días de uso consumidos
        if (datos.dias_uso && diasConsumidos > Number(datos.dias_uso)) {
            problemas.push({
                codigo: 'DIAS_AGOTADOS',
                mensaje: `Se agotaron los ${datos.dias_uso} días de uso contratados (consumidos: ${diasConsumidos}).`
            });
        }
    }

    // 6. Cadena de arranques: detecta ejecuciones en paralelo o retrocesos
    const secuencia = Number(estado.secuencia || 0) + 1;
    const cadena = crypto.createHash('sha256')
        .update(`${estado.cadena || ''}|${secuencia}|${tiempo.ms}`)
        .digest('hex');

    // 7. Estado resultante y periodo de gracia
    const graciaDias = datos && datos.gracia_dias !== undefined ? Number(datos.gracia_dias) : GRACIA_POR_DEFECTO_DIAS;
    let graciaDesde = estado.gracia_desde_ms || null;

    if (problemas.length === 0) {
        estadoFinal = ESTADOS.ACTIVA;
        graciaDesde = null;
    } else if (graciaDias > 0) {
        if (!graciaDesde) {
            graciaDesde = tiempo.ms;
            await registrarEvento('GRACIA_INICIADA', { problemas: problemas.map(p => p.codigo) }, 'CRITICO');
        }
        const diasEnGracia = (tiempo.ms - graciaDesde) / 86400000;
        estadoFinal = diasEnGracia <= graciaDias ? ESTADOS.GRACIA : ESTADOS.BLOQUEADA;
    } else {
        estadoFinal = ESTADOS.BLOQUEADA;
    }

    // 8. Persistir el avance del trinquete
    const nuevoEstado = {
        ...estado,
        trinquete_ms: Math.max(Number(estado.trinquete_ms) || 0, tiempo.ms),
        dias_consumidos: diasConsumidos,
        secuencia,
        cadena,
        estado: estadoFinal,
        gracia_desde_ms: graciaDesde
    };
    await guardarEstado(nuevoEstado);

    const resultado = {
        estado: estadoFinal,
        operativa: estadoFinal === ESTADOS.ACTIVA || estadoFinal === ESTADOS.GRACIA,
        bloqueada: estadoFinal === ESTADOS.BLOQUEADA,
        problemas,
        avisos,
        licencia: datos ? {
            id: datos.id, cliente: datos.cliente, plan: datos.plan,
            emitida_en: datos.emitida_en, expira_en: datos.expira_en,
            dias_uso: datos.dias_uso || null, funciones: datos.funciones || []
        } : null,
        instalacion: {
            uuid: nuevoEstado.instalacion_uuid,
            codigo: codigoDeInstalacion(nuevoEstado.instalacion_uuid, huellaActual.resumen),
            huella_resumen: huellaActual.resumen.slice(0, 16)
        },
        tiempo: {
            confiable: new Date(tiempo.ms).toISOString(),
            fuente: tiempo.fuente,
            sistema: new Date(tiempo.sistema_ms).toISOString(),
            reloj_manipulado: tiempo.reloj_manipulado,
            retraso_horas: tiempo.retraso_horas
        },
        uso: {
            dias_consumidos: diasConsumidos,
            dias_contratados: datos && datos.dias_uso ? Number(datos.dias_uso) : null,
            ultimo_dia: nuevoEstado.ultimo_dia,
            secuencia
        },
        gracia: graciaDesde ? {
            desde: new Date(graciaDesde).toISOString(),
            dias_totales: graciaDias,
            dias_restantes: Math.max(0, Math.ceil(graciaDias - (tiempo.ms - graciaDesde) / 86400000))
        } : null
    };

    cache = resultado;
    cacheHasta = Date.now() + CACHE_MS;
    return resultado;
}

function descripcionMotivo(codigo) {
    return ({
        SIN_ARCHIVO: 'No se encontró el archivo de licencia.',
        SIN_CLAVE_PUBLICA: 'Falta la clave pública de verificación en config/licencia.pub.',
        FORMATO_INVALIDO: 'El archivo de licencia no tiene el formato esperado.',
        FIRMA_INVALIDA: 'La firma de la licencia no es válida: el archivo fue alterado o no lo emitió el proveedor.'
    })[codigo] || 'La licencia no es válida.';
}

function descripcionSospecha(codigo) {
    return ({
        sello_bd_invalido: 'El estado guardado en la base de datos fue modificado manualmente.',
        sello_archivo_invalido: 'El archivo de estado de la licencia fue modificado manualmente.',
        bd_retrocedio_dias: 'La base de datos muestra menos días de uso que el archivo de estado: se restauró una copia anterior.',
        bd_retrocedio_tiempo: 'La base de datos muestra una fecha anterior a la ya registrada: se restauró una copia anterior.'
    })[codigo] || (codigo.startsWith('desfase_secuencia')
        ? 'Las dos copias del estado no coinciden: puede haber otra instancia ejecutándose con los mismos archivos.'
        : 'Se detectó una inconsistencia en el estado de la licencia.');
}

/** Invalida la caché (tras activar una licencia nueva). */
function invalidarCache() { cache = null; cacheHasta = 0; }

module.exports = {
    ESTADOS,
    evaluar,
    invalidarCache,
    leerLicencia,
    codigoDeInstalacion,
    registrarEvento,
    RUTA_LICENCIA,
    RUTA_ESTADO,
    RUTA_CLAVE_PUBLICA
};
