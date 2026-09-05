// config/auditoriaCatalogo.js
// Catálogo semántico de auditoría.
//
// Traduce cada petición HTTP (método + ruta) a un evento con sentido de
// negocio: qué entidad se tocó, qué operación se hizo, de qué categoría es y
// con qué criticidad debe quedar registrada.
//
// Añadir un módulo nuevo al sistema es añadir una regla aquí: el middleware
// global se encarga del resto sin tocar ningún controlador.
'use strict';

// ── Categorías de auditoría ────────────────────────────────────────────────
const CATEGORIAS = {
    AUTENTICACION: 'AUTENTICACION', // Entradas y salidas del sistema
    LECTURA:       'LECTURA',       // Consulta / visualización de información
    ESCRITURA:     'ESCRITURA',     // Altas, modificaciones y bajas
    IMPRESION:     'IMPRESION',     // Tickets, pre-cuentas, informes impresos
    CIERRE:        'CIERRE',        // Cierres de cuenta, turno y día
    EXPORTACION:   'EXPORTACION',   // Descarga de datos fuera del sistema
    SEGURIDAD:     'SEGURIDAD',     // Credenciales, permisos y accesos denegados
    SISTEMA:       'SISTEMA'        // Respaldos, restauraciones, configuración
};

// ── Criticidad ─────────────────────────────────────────────────────────────
const SEVERIDADES = {
    INFO:    'INFO',    // Actividad ordinaria
    AVISO:   'AVISO',   // Merece atención si se revisa el historial
    CRITICO: 'CRITICO'  // Debe revisarse siempre (dinero, permisos, borrados)
};

// Verbos por defecto según el método HTTP
const VERBOS = {
    GET:    'Consultar',
    POST:   'Registrar',
    PUT:    'Actualizar',
    PATCH:  'Actualizar',
    DELETE: 'Eliminar'
};

/**
 * Reglas específicas. Se evalúan EN ORDEN y gana la primera que coincide,
 * así que van de lo más concreto a lo más genérico.
 *
 * Campos admitidos:
 *   patron     RegExp contra la ruta (sin query string)
 *   metodos    Métodos a los que aplica. Omitir = todos.
 *   entidad    Nombre legible de la entidad afectada
 *   modulo     Agrupación funcional para los informes
 *   accion     Texto fijo de la acción. Si se omite, se compone verbo + entidad
 *   categoria  Una de CATEGORIAS. Si se omite, se deduce del método
 *   severidad  Una de SEVERIDADES. Si se omite, se deduce del método
 *   agregarSegundos  Ventana de agrupación para endpoints de sondeo (ver
 *                    middlewares/auditoria.js). Evita que el refresco
 *                    automático de los monitores ahogue el historial.
 */
const REGLAS = [
    // ══════════════ Autenticación ══════════════
    { patron: /^\/login$/, metodos: ['GET'], entidad: 'Sesión', modulo: 'Autenticación',
      accion: 'Ver pantalla de acceso', categoria: CATEGORIAS.AUTENTICACION, severidad: SEVERIDADES.INFO },
    // El POST /login y el /logout se registran explícitamente en authRoutes.js,
    // porque necesitan datos que el middleware global no puede ver (usuario
    // intentado en un fallo, identidad previa al cierre de sesión).
    { patron: /^\/login$/, metodos: ['POST'], entidad: 'Sesión', modulo: 'Autenticación',
      accion: 'Intento de inicio de sesión', categoria: CATEGORIAS.AUTENTICACION,
      severidad: SEVERIDADES.AVISO, omitirEnMiddleware: true },
    { patron: /^\/logout$/, entidad: 'Sesión', modulo: 'Autenticación',
      accion: 'Cierre de sesión', categoria: CATEGORIAS.AUTENTICACION,
      severidad: SEVERIDADES.INFO, omitirEnMiddleware: true },

    // ══════════════ Impresión ══════════════
    { patron: /^\/pos\/precuenta\//, entidad: 'Pre-cuenta', modulo: 'Punto de Venta',
      accion: 'Emitir pre-cuenta para impresión', categoria: CATEGORIAS.IMPRESION,
      severidad: SEVERIDADES.AVISO },
    { patron: /^\/admin\/cierre-dia\/ticket$/, entidad: 'Ticket de cierre', modulo: 'Caja',
      accion: 'Emitir ticket de cierre de día', categoria: CATEGORIAS.IMPRESION,
      severidad: SEVERIDADES.AVISO },
    { patron: /^\/admin\/api\/auditoria\/impresion$/, entidad: 'Documento', modulo: 'Auditoría',
      accion: 'Impresión confirmada por el navegador', categoria: CATEGORIAS.IMPRESION,
      severidad: SEVERIDADES.AVISO, omitirEnMiddleware: true },

    // ══════════════ Cierres de cuenta, turno y día ══════════════
    { patron: /^\/pos\/cobrar\//, metodos: ['POST'], entidad: 'Cuenta', modulo: 'Caja',
      accion: 'Cobrar y cerrar cuenta', categoria: CATEGORIAS.CIERRE, severidad: SEVERIDADES.CRITICO },
    { patron: /^\/admin\/cierre-dia\/liquidar-cuenta\//, metodos: ['POST'], entidad: 'Cuenta',
      modulo: 'Caja', accion: 'Liquidar cuenta pendiente', categoria: CATEGORIAS.CIERRE,
      severidad: SEVERIDADES.CRITICO },
    { patron: /^\/admin\/pedido\/[^/]+\/cerrar$/, entidad: 'Pedido', modulo: 'Pedidos',
      accion: 'Cerrar pedido', categoria: CATEGORIAS.CIERRE, severidad: SEVERIDADES.CRITICO },
    { patron: /^\/admin\/turno\/cierre$/, entidad: 'Turno de servicio', modulo: 'Turnos',
      accion: 'Cerrar turno de servicio', categoria: CATEGORIAS.CIERRE, severidad: SEVERIDADES.CRITICO },
    { patron: /^\/admin\/turno\/apertura$/, entidad: 'Turno de servicio', modulo: 'Turnos',
      accion: 'Abrir turno de servicio', categoria: CATEGORIAS.ESCRITURA, severidad: SEVERIDADES.AVISO },
    { patron: /^\/admin\/cierre-dia$/, metodos: ['GET'], entidad: 'Cierre de día', modulo: 'Caja',
      accion: 'Consultar cierre de día', categoria: CATEGORIAS.LECTURA, severidad: SEVERIDADES.AVISO },
    { patron: /^\/admin\/cierres-historico/, entidad: 'Cierre de día', modulo: 'Caja',
      categoria: CATEGORIAS.LECTURA, severidad: SEVERIDADES.INFO },
    { patron: /^\/cliente\/solicitar-cierre\//, entidad: 'Cuenta', modulo: 'Cliente (QR)',
      accion: 'Cliente solicita el cierre de su cuenta', categoria: CATEGORIAS.CIERRE,
      severidad: SEVERIDADES.AVISO },

    // ══════════════ Seguridad y usuarios ══════════════
    { patron: /^\/admin\/usuario\/cambiar-password$/, entidad: 'Usuario', modulo: 'Usuarios',
      accion: 'Cambio de contraseña', categoria: CATEGORIAS.SEGURIDAD, severidad: SEVERIDADES.CRITICO },
    { patron: /^\/admin\/usuarios\/eliminar\//, entidad: 'Usuario', modulo: 'Usuarios',
      accion: 'Eliminar usuario', categoria: CATEGORIAS.SEGURIDAD, severidad: SEVERIDADES.CRITICO },
    { patron: /^\/admin\/usuarios\/(crear|editar)/, entidad: 'Usuario', modulo: 'Usuarios',
      categoria: CATEGORIAS.SEGURIDAD, severidad: SEVERIDADES.CRITICO },
    { patron: /^\/admin\/usuarios/, entidad: 'Usuario', modulo: 'Usuarios' },

    // ══════════════ Respaldo y configuración del sistema ══════════════
    { patron: /^\/admin\/configuracion\/restore$/, entidad: 'Respaldo', modulo: 'Sistema',
      accion: 'Restaurar copia de seguridad', categoria: CATEGORIAS.SISTEMA, severidad: SEVERIDADES.CRITICO },
    { patron: /^\/admin\/configuracion\/backup$/, entidad: 'Respaldo', modulo: 'Sistema',
      accion: 'Generar copia de seguridad', categoria: CATEGORIAS.EXPORTACION, severidad: SEVERIDADES.CRITICO },
    { patron: /^\/admin\/(configuracion|settings)/, entidad: 'Configuración', modulo: 'Sistema',
      categoria: CATEGORIAS.SISTEMA, severidad: SEVERIDADES.AVISO },
    { patron: /^\/admin\/api\/settings/, entidad: 'Configuración', modulo: 'Sistema',
      categoria: CATEGORIAS.SISTEMA, severidad: SEVERIDADES.AVISO },

    // ══════════════ Auditoría (quién mira el registro) ══════════════
    { patron: /^\/admin\/auditoria\/exportar/, entidad: 'Registro de auditoría', modulo: 'Auditoría',
      accion: 'Exportar registro de auditoría', categoria: CATEGORIAS.EXPORTACION,
      severidad: SEVERIDADES.CRITICO },
    { patron: /^\/admin\/(api\/)?auditoria/, entidad: 'Registro de auditoría', modulo: 'Auditoría',
      accion: 'Consultar registro de auditoría', categoria: CATEGORIAS.LECTURA,
      severidad: SEVERIDADES.AVISO },

    // ══════════════ Inventario ══════════════
    { patron: /^\/admin\/(almacen|almacenes)\/entradas/, entidad: 'Entrada de mercancía',
      modulo: 'Inventario' },
    { patron: /^\/admin\/(almacen|almacenes)/, entidad: 'Almacén', modulo: 'Inventario' },
    { patron: /^\/admin\/(api\/)?transferencias/, entidad: 'Transferencia', modulo: 'Inventario',
      severidad: SEVERIDADES.AVISO },
    { patron: /^\/admin\/(api\/)?salidas-manuales/, entidad: 'Salida manual', modulo: 'Inventario',
      severidad: SEVERIDADES.AVISO },
    { patron: /^\/admin\/inventario\/valorizacion/, entidad: 'Valorización de inventario',
      modulo: 'Inventario', accion: 'Consultar valorización de inventario',
      categoria: CATEGORIAS.LECTURA, severidad: SEVERIDADES.AVISO },
    { patron: /^\/admin\/inventario/, entidad: 'Inventario', modulo: 'Inventario' },
    { patron: /^\/admin\/productos/, entidad: 'Producto', modulo: 'Inventario' },
    // ══════════════ Reportes y kardex ══════════════
    { patron: /^\/admin\/kardex\/exportar/, entidad: 'Kardex', modulo: 'Reportes',
      accion: 'Exportar kardex a CSV', categoria: CATEGORIAS.EXPORTACION,
      severidad: SEVERIDADES.AVISO },
    { patron: /^\/admin\/kardex/, entidad: 'Kardex', modulo: 'Reportes',
      accion: 'Consultar kardex de inventario', categoria: CATEGORIAS.LECTURA,
      severidad: SEVERIDADES.AVISO },
    { patron: /^\/admin\/reportes\/(margen-platillos|salud-inventario|explosion-recetas|ventas-mesero|consumo-insumos|ventas-horas|turno-inventario)\/exportar/,
      entidad: 'Reportes', modulo: 'Reportes',
      accion: 'Exportar reporte a CSV', categoria: CATEGORIAS.EXPORTACION,
      severidad: SEVERIDADES.AVISO },
    { patron: /^\/admin\/reportes\/ventas-mesero/, entidad: 'Ventas por mesero', modulo: 'Reportes',
      accion: 'Consultar ventas por mesero', categoria: CATEGORIAS.LECTURA,
      severidad: SEVERIDADES.AVISO },
    { patron: /^\/admin\/reportes\/consumo-insumos/, entidad: 'Consumo por insumo', modulo: 'Reportes',
      accion: 'Consultar consumo por insumo', categoria: CATEGORIAS.LECTURA,
      severidad: SEVERIDADES.AVISO },
    { patron: /^\/admin\/reportes\/ventas-horas/, entidad: 'Ventas por hora y día', modulo: 'Reportes',
      accion: 'Consultar ventas por hora y día', categoria: CATEGORIAS.LECTURA,
      severidad: SEVERIDADES.AVISO },
    { patron: /^\/admin\/reportes\/turno-inventario/, entidad: 'Turno: tragos, platillos e inventario', modulo: 'Reportes',
      accion: 'Consultar turno e inventario', categoria: CATEGORIAS.LECTURA,
      severidad: SEVERIDADES.AVISO },
    { patron: /^\/admin\/reportes\/explosion-recetas/, entidad: 'Explosión de recetas', modulo: 'Reportes',
      accion: 'Consultar explosión de recetas (teórico vs real)',
      categoria: CATEGORIAS.LECTURA, severidad: SEVERIDADES.AVISO },
    { patron: /^\/admin\/reportes\/margen-platillos/, entidad: 'Margen por platillo', modulo: 'Reportes',
      accion: 'Consultar margen real por platillo',
      categoria: CATEGORIAS.LECTURA, severidad: SEVERIDADES.AVISO },
    { patron: /^\/admin\/reportes\/salud-inventario/, entidad: 'Salud del inventario', modulo: 'Reportes',
      accion: 'Consultar salud del inventario',
      categoria: CATEGORIAS.LECTURA, severidad: SEVERIDADES.AVISO },
    { patron: /^\/admin\/reportes/, entidad: 'Centro de reportes', modulo: 'Reportes',
      categoria: CATEGORIAS.LECTURA },

    { patron: /^\/admin\/(api\/)?unidades-medida/, entidad: 'Unidad de medida', modulo: 'Inventario' },
    { patron: /^\/admin\/api\/conversiones-unidades/, entidad: 'Conversión de unidades',
      modulo: 'Inventario' },

    // ══════════════ Recetas y menú ══════════════
    { patron: /^\/admin\/(api\/)?recetas/, entidad: 'Receta / Ficha técnica', modulo: 'Recetas' },
    { patron: /^\/admin\/menu\/platillo-dia/, entidad: 'Platillo del día', modulo: 'Menú' },
    { patron: /^\/admin\/menu/, entidad: 'Platillo del menú', modulo: 'Menú' },
    { patron: /^\/admin\/api\/categorias-platillos/, entidad: 'Categoría de platillos', modulo: 'Menú' },

    // ══════════════ Salón y pedidos ══════════════
    { patron: /^\/admin\/mesas/, entidad: 'Mesa', modulo: 'Salón' },
    { patron: /^\/admin\/pedido/, entidad: 'Pedido', modulo: 'Pedidos' },

    // ══════════════ Punto de venta ══════════════
    { patron: /^\/api\/pos\/save$/, entidad: 'Comanda', modulo: 'Punto de Venta',
      accion: 'Enviar comanda a producción', categoria: CATEGORIAS.ESCRITURA,
      severidad: SEVERIDADES.AVISO },
    { patron: /^\/pos\/cancelar-item\//, entidad: 'Ítem de comanda', modulo: 'Punto de Venta',
      accion: 'Cancelar ítem de la comanda', categoria: CATEGORIAS.ESCRITURA,
      severidad: SEVERIDADES.CRITICO },
    // NOTA: los sondeos de /pos/alertas-pendientes, /api/pos/items-listos/:id y
    // /pos/mesas/:id/pre-pedidos (GET) NO se auditan: ver EXCLUIDAS_SONDEO.
    { patron: /^\/api\/pos\/verify-stock$/, entidad: 'Stock', modulo: 'Punto de Venta',
      accion: 'Verificar disponibilidad de insumos', categoria: CATEGORIAS.LECTURA,
      severidad: SEVERIDADES.INFO, agregarSegundos: 120 },
    { patron: /^\/pos\/(pre-pedidos|mesas)/, entidad: 'Pre-pedido', modulo: 'Punto de Venta' },
    { patron: /^\/pos\/notificaciones/, entidad: 'Notificación', modulo: 'Punto de Venta',
      severidad: SEVERIDADES.INFO, agregarSegundos: 120 },
    { patron: /^\/(api\/)?pos/, entidad: 'Punto de venta', modulo: 'Punto de Venta' },
    { patron: /^\/qr\//, entidad: 'Mesa', modulo: 'Punto de Venta',
      accion: 'Abrir pedido desde código QR', categoria: CATEGORIAS.ESCRITURA,
      severidad: SEVERIDADES.AVISO },

    // ══════════════ Monitores de producción ══════════════
    // NOTA: el refresco automático del monitor (/api/monitor/comandas) no se
    // audita: ver EXCLUIDAS_SONDEO.
    { patron: /^\/api\/monitor\/cambiar-estado$/, entidad: 'Ítem de comanda', modulo: 'Producción',
      accion: 'Cambiar estado de elaboración', categoria: CATEGORIAS.ESCRITURA,
      severidad: SEVERIDADES.INFO },
    { patron: /^\/monitor\//, entidad: 'Monitor de producción', modulo: 'Producción' },

    // ══════════════ Turnos, monedas y caja ══════════════
    // NOTA: el sondeo del estado del turno (/admin/turno/estado-actual) no se
    // audita: ver EXCLUIDAS_SONDEO.
    { patron: /^\/admin\/turnos?/, entidad: 'Turno de servicio', modulo: 'Turnos' },
    { patron: /^\/admin\/(api\/)?(monedas?|act-moneda|crear-moneda)/, entidad: 'Moneda',
      modulo: 'Caja', severidad: SEVERIDADES.AVISO },

    // ══════════════ Clientes y cuadros de mando ══════════════
    { patron: /^\/cliente\//, entidad: 'Cliente', modulo: 'Cliente (QR)' },
    // NOTA: el refresco de métricas (/admin/api/dashboard/metrics) no se
    // audita: ver EXCLUIDAS_SONDEO.
    { patron: /^\/(admin|dependiente)\/dashboard/, entidad: 'Cuadro de mando', modulo: 'Dashboard',
      accion: 'Abrir cuadro de mando', categoria: CATEGORIAS.LECTURA, severidad: SEVERIDADES.INFO }
];

// Rutas que nunca se auditan: recursos estáticos y ruido del navegador.
const EXCLUIDAS = [
    /^\/css\//, /^\/js\//, /^\/img\//, /^\/images\//, /^\/fonts\//, /^\/uploads\//,
    /^\/webfonts\//, /^\/favicon\.ico$/, /^\/favicon\.png$/, /^\/robots\.txt$/,
    /^\/manifest\.json$/, /^\/sw\.js$/, /\.(css|js|map|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|eot)$/i
];

// Sondeos GET de las vistas (polling) que tampoco se auditan. No son
// actividad del usuario: la vista pregunta cada pocos segundos "¿hay algo
// nuevo?" (alertas, ítems listos, comandas del monitor, estado del turno,
// métricas). Registrarlos — aunque fuera agrupados — solo enterraba la
// actividad real del historial. Las ESCRITURAS sobre estas mismas rutas
// (p.ej. descartar los pre-pedidos de una mesa) SÍ se auditan.
const EXCLUIDAS_SONDEO = [
    /^\/pos\/alertas-pendientes$/,          // tablero del mesero: llamadas/pre-pedidos
    /^\/api\/pos\/items-listos\//,          // POS: ¿hay ítems listos de la orden?
    /^\/pos\/mesas\/[^/]+\/pre-pedidos$/,   // POS/tablero: pre-pedidos de la mesa
    /^\/api\/monitor\/comandas$/,           // monitores de cocina/bar
    /^\/admin\/turno\/estado-actual$/,      // estado del turno de servicio
    /^\/admin\/api\/dashboard\/metrics$/    // métricas del cuadro de mando
];

/** Categoría por defecto a partir del método HTTP. */
function categoriaPorMetodo(metodo) {
    return metodo === 'GET' || metodo === 'HEAD' ? CATEGORIAS.LECTURA : CATEGORIAS.ESCRITURA;
}

/** Criticidad por defecto a partir del método HTTP. */
function severidadPorMetodo(metodo) {
    if (metodo === 'DELETE') return SEVERIDADES.CRITICO;
    if (metodo === 'GET' || metodo === 'HEAD') return SEVERIDADES.INFO;
    return SEVERIDADES.AVISO;
}

/** Verbo legible según el método y la forma de la ruta. */
function verboPorMetodo(metodo, ruta) {
    if (metodo === 'POST') {
        if (/\/(crear|add|nuevo|guardar)(\/|$)/.test(ruta)) return 'Crear';
        if (/\/(eliminar|delete|borrar)(\/|$)/.test(ruta)) return 'Eliminar';
        if (/\/(editar|edit|actualizar)(\/|$)/.test(ruta)) return 'Actualizar';
        return VERBOS.POST;
    }
    return VERBOS[metodo] || metodo;
}

/** ¿Esta ruta debe quedar fuera del registro? */
function estaExcluida(ruta) {
    return EXCLUIDAS.some(patron => patron.test(ruta));
}

/**
 * ¿Es un sondeo GET de las vistas (polling) que debe quedar fuera del
 * registro? Solo aplica a lecturas: las escrituras sobre la misma ruta
 * sí se auditan.
 */
function esSondeoExcluido(metodo, ruta) {
    const metodoNorm = String(metodo || 'GET').toUpperCase();
    if (metodoNorm !== 'GET' && metodoNorm !== 'HEAD') return false;
    return EXCLUIDAS_SONDEO.some(patron => patron.test(ruta));
}

/**
 * Traduce método + ruta al evento de auditoría correspondiente.
 * Siempre devuelve un descriptor: si ninguna regla encaja, se genera uno
 * genérico para que ninguna operación quede sin registrar.
 */
function describir(metodo, ruta) {
    const metodoNorm = String(metodo || 'GET').toUpperCase();
    const rutaLimpia = String(ruta || '/').split('?')[0];

    const regla = REGLAS.find(r =>
        r.patron.test(rutaLimpia) &&
        (!r.metodos || r.metodos.includes(metodoNorm))
    );

    if (!regla) {
        return {
            accion: `${verboPorMetodo(metodoNorm, rutaLimpia)} ${rutaLimpia}`,
            entidad: null,
            modulo: 'Otros',
            categoria: categoriaPorMetodo(metodoNorm),
            severidad: severidadPorMetodo(metodoNorm),
            agregarSegundos: 0,
            omitirEnMiddleware: false,
            generica: true
        };
    }

    return {
        accion: regla.accion || `${verboPorMetodo(metodoNorm, rutaLimpia)} ${regla.entidad || rutaLimpia}`,
        entidad: regla.entidad || null,
        modulo: regla.modulo || 'Otros',
        categoria: regla.categoria || categoriaPorMetodo(metodoNorm),
        severidad: regla.severidad || severidadPorMetodo(metodoNorm),
        agregarSegundos: regla.agregarSegundos || 0,
        omitirEnMiddleware: Boolean(regla.omitirEnMiddleware),
        generica: false
    };
}

module.exports = {
    CATEGORIAS,
    SEVERIDADES,
    REGLAS,
    EXCLUIDAS,
    EXCLUIDAS_SONDEO,
    describir,
    estaExcluida,
    esSondeoExcluido,
    categoriaPorMetodo,
    severidadPorMetodo
};
