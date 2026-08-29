// middlewares/auditoria.js
// Middleware global de auditoría.
//
// Registra TODA operación de usuario sobre la aplicación: consultas y
// visualizaciones, altas, modificaciones, bajas, impresiones y cierres.
// Se apoya en config/auditoriaCatalogo.js para dar sentido de negocio a cada
// petición, de modo que añadir un módulo nuevo no obliga a tocar controladores.
//
// Tres garantías de diseño:
//   1. Nunca bloquea ni retrasa la respuesta: se registra tras enviarla.
//   2. Nunca tumba la aplicación: cualquier fallo se degrada a un aviso en log.
//   3. Nunca ahoga la tabla: los sondeos de las vistas (polling) quedan fuera
//      del registro y los refrescos automáticos se marcan con ?autorefresco=1.
'use strict';

const AuditLogService = require('../services/auditLogService');
const Catalogo = require('../config/auditoriaCatalogo');
const logger = require('../config/logger');

// Parámetros de nombre habituales de los que se puede extraer el identificador
// de la entidad afectada, en orden de preferencia.
const PARAMS_ID = [
    'id', 'id_pedido', 'idPedido', 'id_detalle', 'idMesa', 'id_mesa',
    'platilloId', 'productoId', 'detalleId', 'usuarioId', 'almacenId', 'hash', 'area'
];

// ── Agrupación de sondeos ──────────────────────────────────────────────────
// Los monitores de cocina y el POS refrescan por AJAX cada pocos segundos. Sin
// control, un solo turno generaría decenas de miles de filas y enterraría la
// actividad real. Para esas rutas se registra la primera petición de la ventana
// y se cuentan las siguientes, que se reflejan en el campo `repeticiones`.
const ventanas = new Map(); // clave -> { hasta, contador, asientoId }
const LIMITE_VENTANAS = 5000;
const BARRIDO_MS = 60000;

/**
 * Consolida en la base de datos el recuento de una ventana que ya se cerró.
 * Sin esto, las peticiones suprimidas se perderían si el usuario deja de
 * sondear y la ventana nunca se reabre (por ejemplo, al cerrar el monitor).
 */
function volcarRecuento(ventana) {
    if (!ventana || ventana.contador <= 0) return;
    const total = ventana.contador + 1; // la que abrió la ventana + las agrupadas
    Promise.resolve(ventana.asientoId)
        .then(id => AuditLogService.actualizarRepeticiones(id, total))
        .catch(() => { /* la auditoría nunca interrumpe el servicio */ });
    ventana.contador = 0;
}

// Barrido periódico: cierra las ventanas caducadas aunque no lleguen más
// peticiones. unref() evita que este temporizador mantenga vivo el proceso.
const temporizadorBarrido = setInterval(() => {
    const ahora = Date.now();
    for (const [clave, ventana] of ventanas) {
        if (ventana.hasta <= ahora) {
            volcarRecuento(ventana);
            ventanas.delete(clave);
        }
    }
}, BARRIDO_MS);
if (temporizadorBarrido.unref) temporizadorBarrido.unref();

// El estado forma parte de la clave a propósito: así un sondeo que empieza a
// fallar (200 -> 403) abre una ventana nueva y se registra al instante, en vez
// de quedar oculto tras la agrupación del caso correcto.
function claveAgregacion(usuarioId, metodo, ruta, estado) {
    return `${usuarioId || 'anon'}|${metodo}|${ruta}|${estado}`;
}

/**
 * Decide si una petición agrupable debe registrarse ahora.
 * @returns {{registrar: boolean, repeticiones: number}}
 */
function evaluarAgregacion(clave, segundos) {
    const ahora = Date.now();
    const ventana = ventanas.get(clave);

    if (!ventana || ventana.hasta <= ahora) {
        // La ventana anterior se cierra: se consolida su recuento en su asiento
        if (ventana) volcarRecuento(ventana);

        const nueva = { hasta: ahora + segundos * 1000, contador: 0, asientoId: null };
        ventanas.set(clave, nueva);

        // Poda sencilla para que el mapa no crezca sin control
        if (ventanas.size > LIMITE_VENTANAS) {
            for (const [k, v] of ventanas) {
                if (v.hasta <= ahora) { volcarRecuento(v); ventanas.delete(k); }
            }
        }
        return { registrar: true, ventana: nueva };
    }

    ventana.contador += 1;
    return { registrar: false, ventana };
}

// ── Extracción de datos de la petición ─────────────────────────────────────

/** Identidad del usuario, ya venga de Passport o de la sesión. */
function extraerUsuario(req) {
    const u = req.user || (req.session && req.session.user) || null;
    if (!u) return { id: null, nombre: null, rol: null };
    const nombre = [u.nombre, u.apellidos].filter(Boolean).join(' ').trim();
    return {
        id: u.id || null,
        nombre: nombre || u.usuario || u.email || null,
        rol: u.rol || null
    };
}

/** Identificador de la entidad afectada, a partir de los parámetros de ruta. */
function extraerEntidadId(req) {
    const params = req.params || {};
    for (const clave of PARAMS_ID) {
        if (params[clave] !== undefined && params[clave] !== null && params[clave] !== '') {
            return String(params[clave]).slice(0, 100);
        }
    }
    // Último recurso: un id numérico al final de la ruta
    const coincidencia = String(req.originalUrl || '').split('?')[0].match(/\/(\d+)$/);
    return coincidencia ? coincidencia[1] : null;
}

/** IP real del cliente, teniendo en cuenta un posible proxy inverso. */
function extraerIp(req) {
    const reenviada = req.headers['x-forwarded-for'];
    if (reenviada) return String(reenviada).split(',')[0].trim();
    return req.ip || (req.connection && req.connection.remoteAddress) || null;
}

/**
 * Carga útil de la operación. El cuerpo se guarda solo en escrituras: en las
 * consultas basta con los filtros aplicados, y así se evita duplicar
 * información sin valor. El saneado de claves sensibles lo hace el servicio.
 */
function construirDatos(req, descriptor, extra = {}) {
    const datos = { ...extra };

    const query = req.query && Object.keys(req.query).length ? req.query : null;
    if (query) datos.parametros_consulta = query;

    const esEscritura = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
    if (esEscritura && req.body && Object.keys(req.body).length) {
        datos.cuerpo = req.body;
    }

    if (req.params && Object.keys(req.params).length) {
        datos.parametros_ruta = req.params;
    }

    if (descriptor.generica) {
        datos.aviso_catalogo = 'Ruta sin regla específica en config/auditoriaCatalogo.js';
    }

    return Object.keys(datos).length ? datos : null;
}

/**
 * Patrón de la ruta cuando Express lo conoce (por ejemplo `/pos/cobrar/:id`),
 * lo que permite agrupar en los informes sin que los identificadores dispersen
 * los resultados.
 */
function extraerRutaPatron(req) {
    if (req.route && req.route.path) {
        const base = req.baseUrl || '';
        const path = req.route.path === '/' ? '' : req.route.path;
        return `${base}${path}` || '/';
    }
    return String(req.originalUrl || req.url || '/').split('?')[0];
}

// ── Middleware ─────────────────────────────────────────────────────────────

/**
 * @param {object} opciones
 * @param {boolean} opciones.registrarAnonimos  Auditar peticiones sin sesión
 *        iniciada (por defecto sí: los accesos denegados son relevantes).
 */
function auditoriaGlobal(opciones = {}) {
    const registrarAnonimos = opciones.registrarAnonimos !== false;

    return function middlewareAuditoria(req, res, next) {
        const rutaReal = String(req.originalUrl || req.url || '/').split('?')[0];

        // Recursos estáticos y ruido del navegador quedan fuera
        if (Catalogo.estaExcluida(rutaReal)) return next();

        // Sondeos GET de las vistas (polling de alertas, ítems listos,
        // comandas del monitor, estado del turno, métricas): no son
        // actividad del usuario, la vista pregunta "¿hay algo nuevo?".
        if (Catalogo.esSondeoExcluido(req.method, rutaReal)) return next();

        // Refrescos automáticos de las vistas (?autorefresco=1): la propia
        // vista se re-renderiza periódicamente para mantenerse al día. La
        // marca los distingue de la navegación real del usuario, que sí
        // se audita.
        const queryParams = req.query || {};
        if (queryParams.autorefresco === '1' || queryParams.autorefresco === 'true') return next();

        const descriptor = Catalogo.describir(req.method, rutaReal);

        // Rutas que se auditan de forma explícita en su propio controlador
        // (login, logout, confirmación de impresión) para no duplicar el asiento
        if (descriptor.omitirEnMiddleware) return next();

        const inicio = process.hrtime.bigint();
        let yaRegistrado = false;

        const finalizar = () => {
            if (yaRegistrado) return;
            yaRegistrado = true;

            try {
                const usuario = extraerUsuario(req);
                if (!usuario.id && !registrarAnonimos) return;

                const estado = res.statusCode;
                const exitosa = estado < 400;

                // Un acceso rechazado siempre es material de seguridad
                let categoria = descriptor.categoria;
                let severidad = descriptor.severidad;
                let accion = descriptor.accion;
                if (estado === 401 || estado === 403) {
                    categoria = Catalogo.CATEGORIAS.SEGURIDAD;
                    severidad = Catalogo.SEVERIDADES.CRITICO;
                    accion = `Acceso denegado · ${descriptor.accion}`;
                } else if (estado >= 500) {
                    severidad = Catalogo.SEVERIDADES.CRITICO;
                    accion = `Error del servidor · ${descriptor.accion}`;
                }

                const rutaPatron = extraerRutaPatron(req);
                let ventanaActiva = null;

                // Agrupación de endpoints de sondeo. Se aplica también a las
                // respuestas de error: un monitor que refresca sin turno abierto
                // devuelve el mismo fallo cada pocos segundos, y sin agrupar
                // sería la principal fuente de ruido del historial. Al incluir
                // el estado en la clave, el primer fallo se registra de
                // inmediato y los siguientes se cuentan.
                if (descriptor.agregarSegundos > 0) {
                    const clave = claveAgregacion(usuario.id, req.method, rutaPatron, estado);
                    const decision = evaluarAgregacion(clave, descriptor.agregarSegundos);
                    if (!decision.registrar) return;
                    ventanaActiva = decision.ventana;
                }

                const duracion = Number(process.hrtime.bigint() - inicio) / 1e6;

                const extra = {};
                if (ventanaActiva) {
                    extra.nota_agrupacion =
                        `Endpoint de sondeo: este asiento representa todas las peticiones ` +
                        `equivalentes de una ventana de ${descriptor.agregarSegundos}s. ` +
                        `El campo "repeticiones" indica cuántas fueron.`;
                }

                // No se espera al INSERT: la respuesta ya salió
                const promesaAsiento = AuditLogService.registrar({
                    usuario_id: usuario.id,
                    usuario_nombre: usuario.nombre,
                    usuario_rol: usuario.rol,
                    metodo_http: req.method,
                    ruta: rutaPatron,
                    url: req.originalUrl,
                    accion,
                    entidad: descriptor.entidad,
                    entidad_id: extraerEntidadId(req),
                    modulo: descriptor.modulo,
                    categoria,
                    severidad,
                    estado_http: estado,
                    operacion_exitosa: exitosa,
                    ip_origen: extraerIp(req),
                    user_agent: req.headers['user-agent'] || null,
                    sesion_id: req.sessionID || null,
                    repeticiones: 1,
                    datos_operacion: construirDatos(req, descriptor, extra),
                    duracion_ms: duracion
                }).catch(error => {
                    logger.warn(`[Auditoria] Fallo al registrar ${req.method} ${rutaReal}: ${error.message}`);
                    return null;
                });

                // El asiento que abre una ventana de agrupación guarda su id:
                // al cerrarse la ventana se le consolidará el recuento total.
                if (ventanaActiva) ventanaActiva.asientoId = promesaAsiento;
            } catch (error) {
                // La auditoría jamás debe afectar al servicio
                logger.warn(`[Auditoria] Error inesperado en el middleware: ${error.message}`);
            }
        };

        res.on('finish', finalizar);
        res.on('close', finalizar); // Conexiones abortadas por el cliente

        next();
    };
}

/** Consolida ahora todos los recuentos pendientes (apagado ordenado y pruebas). */
async function volcarPendientes() {
    const ahora = Date.now();
    for (const [clave, ventana] of ventanas) {
        volcarRecuento(ventana);
        if (ventana.hasta <= ahora) ventanas.delete(clave);
    }
}

module.exports = {
    auditoriaGlobal,
    volcarPendientes,
    // Exportados para las pruebas
    _internos: { evaluarAgregacion, volcarRecuento, extraerUsuario, extraerEntidadId,
                 extraerIp, construirDatos, ventanas }
};
