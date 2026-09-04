// services/ventasService.js
//
// Listado profesional de Pedidos/Ventas por rango de fechas.
//
// Sustituye la antigua tabla de "órdenes en consumo" por un registro de ventas
// con filtros especializados (turno, dependiente, mesa, estado, texto libre),
// importes desglosados por moneda, desglose de ítems con sus tiempos reales de
// entrega (h:m:s), cocinero responsable, duración del servicio y exportación a
// CSV para el control contable.
//
// Los tiempos por ítem dependen de la migración
// scripts/migracion_tiempos_detalles_pedido.sql. Si todavía no está aplicada el
// servicio lo detecta (ver services/itemTiemposService.js) y devuelve el
// listado completo sin la columna de tiempos, avisando a la vista.
'use strict';

const db = require('../config/db');
const itemTiempos = require('./itemTiemposService');

const FECHA_OK = /^\d{4}-\d{2}-\d{2}$/;

// Estados de pago de `pedidos.estado_pago` + el estado de la orden cancelada.
const ETIQUETAS_ESTADO = {
    abiertas: 'En consumo (abiertas)',
    pendiente: 'Pendiente de pago',
    pagado: 'Cobradas',
    cortesia: 'Cortesía / consumo interno',
    facturado: 'Facturadas (cuenta por cobrar)',
    pendiente_pago: 'Vale pendiente de pago',
    cancelado: 'Anuladas'
};

const CLASES_ESTADO = {
    abiertas: 'text-bg-warning text-dark',
    pendiente: 'text-bg-warning text-dark',
    pagado: 'text-bg-success',
    cortesia: 'text-bg-info text-dark',
    facturado: 'text-bg-primary',
    pendiente_pago: 'text-bg-secondary',
    cancelado: 'text-bg-danger'
};

const ETIQUETAS_ITEM = {
    en_espera: 'En espera',
    en_cocina: 'En cocina',
    en_bar: 'En bar',
    en_preparacion: 'En preparación',
    listo: 'Listo',
    entregado: 'Entregado',
    cancelado: 'Cancelado'
};

const ETIQUETAS_METODO_PAGO = {
    efectivo: 'Efectivo',
    tarjeta: 'Tarjeta',
    transferencia: 'Transferencia',
    factura: 'Factura',
    pendiente: 'Pendiente'
};

// ---------------------------------------------------------------------------
// Formato
// ---------------------------------------------------------------------------

const num = (v, dec = 2) => {
    const n = Number(v);
    return Number.isFinite(n) ? Number(n.toFixed(dec)) : 0;
};

/** Convierte a Date algo que viene de mysql2 (Date) o un string ISO/'YYYY-MM-DD HH:mm:ss'. */
function aFecha(valor) {
    if (!valor) return null;
    if (valor instanceof Date) return Number.isNaN(valor.getTime()) ? null : valor;
    const d = new Date(String(valor).replace(' ', 'T'));
    return Number.isNaN(d.getTime()) ? null : d;
}

const dos = n => String(n).padStart(2, '0');

/** Duración en segundos → 'h:mm:ss' (formato exigido por el negocio). */
function formatearDuracion(segundos) {
    // Number(null) === 0: hay que descartarlo explícitamente o un pedido sin
    // datos saldría con una duración falsa de 0:00:00.
    if (segundos === null || segundos === undefined || segundos === '') return null;
    const s = Number(segundos);
    if (!Number.isFinite(s) || s < 0) return null;
    const total = Math.round(s);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const seg = total % 60;
    return `${h}:${dos(m)}:${dos(seg)}`;
}

function formatearHora(valor) {
    const d = aFecha(valor);
    return d ? `${dos(d.getHours())}:${dos(d.getMinutes())}:${dos(d.getSeconds())}` : null;
}

function formatearFecha(valor) {
    const d = aFecha(valor);
    return d ? `${dos(d.getDate())}/${dos(d.getMonth() + 1)}/${d.getFullYear()}` : null;
}

function formatearFechaHora(valor) {
    const d = aFecha(valor);
    return d ? `${formatearFecha(d)} ${dos(d.getHours())}:${dos(d.getMinutes())}` : null;
}

/** Fecha local en ISO (yyyy-mm-dd): el día del negocio, no el de UTC. */
function fechaLocalISO(fecha = new Date()) {
    return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;
}

function nombreUsuario(nombre, apellidos) {
    const completo = [nombre, apellidos].filter(Boolean).map(v => String(v).trim()).join(' ');
    return completo || null;
}

// ---------------------------------------------------------------------------
// Filtros
// ---------------------------------------------------------------------------

/**
 * Normaliza los filtros de la vista. Por defecto: el día de hoy.
 */
function normalizarFiltros(query = {}) {
    const hoy = new Date();

    let desde = String(query.desde || '').trim();
    let hasta = String(query.hasta || '').trim();
    if (!FECHA_OK.test(desde)) desde = fechaLocalISO(hoy);
    if (!FECHA_OK.test(hasta)) hasta = fechaLocalISO(hoy);
    if (desde > hasta) [desde, hasta] = [hasta, desde];

    // Cota de seguridad: un rango desmesurado tumbaría la consulta.
    const msRango = new Date(`${hasta}T23:59:59`) - new Date(`${desde}T00:00:00`);
    if (msRango > 366 * 24 * 60 * 60 * 1000) {
        const limite = new Date(new Date(`${hasta}T00:00:00`).getTime() - 366 * 24 * 60 * 60 * 1000);
        desde = fechaLocalISO(limite);
    }

    const entero = v => {
        const n = Number.parseInt(v, 10);
        return Number.isFinite(n) && n > 0 ? n : null;
    };

    let estado = String(query.estado || 'todas').trim().toLowerCase();
    if (!['todas', ...Object.keys(ETIQUETAS_ESTADO)].includes(estado)) estado = 'todas';

    return {
        desde,
        hasta,
        turno_id: entero(query.turno_id),
        mesero_id: entero(query.mesero_id),
        mesa_id: entero(query.mesa_id),
        estado,
        q: String(query.q || '').trim().slice(0, 60)
    };
}

/**
 * Condición WHERE común a todas las consultas (alias `p` = pedidos, `m` = mesas).
 */
function construirWhere(filtros = {}) {
    const sql = [];
    const params = [];

    sql.push('p.creado_en BETWEEN ? AND ?');
    params.push(`${filtros.desde} 00:00:00`, `${filtros.hasta} 23:59:59`);

    if (filtros.turno_id) {
        sql.push('p.turno_servicio_id = ?');
        params.push(filtros.turno_id);
    }
    if (filtros.mesero_id) {
        sql.push('p.id_usuario_mesero = ?');
        params.push(filtros.mesero_id);
    }
    if (filtros.mesa_id) {
        sql.push('p.id_mesa = ?');
        params.push(filtros.mesa_id);
    }

    switch (filtros.estado) {
        case 'abiertas':
            sql.push('p.fecha_cierre IS NULL');
            sql.push("p.estado_pedido <> 'cancelado'");
            break;
        case 'cancelado':
            sql.push("p.estado_pedido = 'cancelado'");
            break;
        case 'todas':
            break;
        default:
            sql.push('p.estado_pago = ?');
            params.push(filtros.estado);
            break;
    }

    if (filtros.q) {
        sql.push('(m.numero LIKE ? OR p.cliente_nombre LIKE ? OR p.id = ? OR CAST(p.id AS CHAR) LIKE ?)');
        const like = `%${filtros.q}%`;
        const idNumerico = /^\d+$/.test(filtros.q) ? Number(filtros.q) : 0;
        params.push(like, like, idNumerico, like);
    }

    return { sql: sql.join(' AND '), params };
}

// ---------------------------------------------------------------------------
// Consultas de apoyo
// ---------------------------------------------------------------------------

const JOIN_BASE = `
    FROM pedidos p
    LEFT JOIN mesas m ON m.id = p.id_mesa
    LEFT JOIN ubicacion_mesa um ON um.id = m.ubicacion_id
    LEFT JOIN usuarios u ON u.id = p.id_usuario_mesero
    LEFT JOIN usuarios cj ON cj.id = p.id_usuario_cajero
    LEFT JOIN turnos_servicio t ON t.id = p.turno_servicio_id`;

/** Opciones de los selectores de filtro (turnos, dependientes y mesas del período). */
async function obtenerOpcionesDeFiltro(filtros = {}, connection = db) {
    const { sql, params } = construirWhere(normalizarFiltros(filtros));

    const [turnos] = await connection.query(`
        SELECT t.id, t.fecha_apertura, t.fecha_cierre, t.estado
        FROM turnos_servicio t
        WHERE EXISTS (SELECT 1 FROM pedidos p WHERE p.turno_servicio_id = t.id AND ${sql})
        ORDER BY t.fecha_apertura DESC
    `, params).catch(() => [[]]);

    const [meseros] = await connection.query(`
        SELECT DISTINCT u.id, u.nombre, u.apellidos, u.rol
        FROM usuarios u
        WHERE u.activo = 1
          AND EXISTS (SELECT 1 FROM pedidos p WHERE p.id_usuario_mesero = u.id)
        ORDER BY u.nombre ASC
    `, []).catch(() => [[]]);

    const [mesas] = await connection.query(`
        SELECT m.id, m.numero, COALESCE(um.nombre, m.ubicacion) AS ubicacion
        FROM mesas m
        LEFT JOIN ubicacion_mesa um ON um.id = m.ubicacion_id
        ORDER BY CAST(REGEXP_REPLACE(m.numero, '[^0-9]', '') AS UNSIGNED) ASC, m.numero ASC
    `).catch(() => [[]]);

    return { turnos: turnos || [], meseros: meseros || [], mesas: mesas || [] };
}

/** Totales del período (no solo de la página visible). */
async function obtenerTotales(filtros, connection = db) {
    const { sql, params } = construirWhere(filtros);

    const [resumen] = await connection.query(`
        SELECT COUNT(*) AS pedidos,
               COALESCE(SUM(p.total), 0) AS importe,
               COALESCE(SUM(p.subtotal), 0) AS subtotal,
               COALESCE(SUM(p.descuento), 0) AS descuentos,
               COALESCE(SUM(p.propina), 0) AS propinas,
               SUM(CASE WHEN p.fecha_cierre IS NULL AND p.estado_pedido <> 'cancelado' THEN 1 ELSE 0 END) AS abiertas,
               SUM(CASE WHEN p.estado_pago = 'pagado' THEN 1 ELSE 0 END) AS cobradas,
               SUM(CASE WHEN p.estado_pago IN ('cortesia', 'facturado', 'pendiente_pago') THEN 1 ELSE 0 END) AS otras,
               SUM(CASE WHEN p.estado_pedido = 'cancelado' THEN 1 ELSE 0 END) AS anuladas,
               AVG(CASE WHEN p.fecha_cierre IS NOT NULL
                        THEN TIMESTAMPDIFF(SECOND, p.creado_en, p.fecha_cierre) END) AS duracion_media_seg
        ${JOIN_BASE}
        WHERE ${sql}
    `, params);

    const [monedas] = await connection.query(`
        SELECT COALESCE(mo.codigo, 'CUP') AS codigo,
               COALESCE(mo.simbolo, '$') AS simbolo,
               COALESCE(mo.nombre, '') AS nombre,
               SUM(pp.monto_moneda_origen) AS monto_origen,
               SUM(pp.monto_equivalente_local) AS monto_local,
               COUNT(*) AS pagos
        FROM pagos_pedido pp
        INNER JOIN pedidos p ON p.id = pp.pedido_id
        LEFT JOIN mesas m ON m.id = p.id_mesa
        LEFT JOIN monedas mo ON mo.id = pp.moneda_id
        WHERE ${sql}
        GROUP BY codigo, simbolo, nombre
        ORDER BY (codigo = 'CUP') DESC, monto_local DESC
    `, params).catch(() => [[]]);

    const [items] = await connection.query(`
        SELECT COUNT(*) AS total,
               SUM(CASE WHEN dp.estado_item = 'entregado' THEN 1 ELSE 0 END) AS entregados,
               SUM(CASE WHEN dp.estado_item = 'cancelado' THEN 1 ELSE 0 END) AS cancelados
        FROM detalles_pedido dp
        INNER JOIN pedidos p ON p.id = dp.id_pedido
        LEFT JOIN mesas m ON m.id = p.id_mesa
        WHERE ${sql}
    `, params).catch(() => [[{}]]);

    const r = (resumen && resumen[0]) || {};
    const i = (items && items[0]) || {};

    return {
        pedidos: Number(r.pedidos || 0),
        importe: num(r.importe),
        subtotal: num(r.subtotal),
        descuentos: num(r.descuentos),
        propinas: num(r.propinas),
        abiertas: Number(r.abiertas || 0),
        cobradas: Number(r.cobradas || 0),
        otras: Number(r.otras || 0),
        anuladas: Number(r.anuladas || 0),
        duracion_media_seg: r.duracion_media_seg != null ? Number(r.duracion_media_seg) : null,
        duracion_media: formatearDuracion(r.duracion_media_seg),
        items_total: Number(i.total || 0),
        items_entregados: Number(i.entregados || 0),
        items_cancelados: Number(i.cancelados || 0),
        por_moneda: (monedas || []).map(mo => ({
            codigo: mo.codigo,
            simbolo: mo.simbolo,
            nombre: mo.nombre,
            monto_origen: num(mo.monto_origen),
            monto_local: num(mo.monto_local),
            pagos: Number(mo.pagos || 0)
        }))
    };
}

/** Encabezado del listado: filas de pedidos del período (paginadas). */
async function obtenerFilas(filtros, { pagina = 1, porPagina = 25 } = {}, connection = db) {
    const { sql, params } = construirWhere(filtros);
    const offset = (Math.max(1, pagina) - 1) * porPagina;

    const [total] = await connection.query(`
        SELECT COUNT(*) AS total
        ${JOIN_BASE}
        WHERE ${sql}
    `, params);

    const [filas] = await connection.query(`
        SELECT p.id, p.cliente_nombre, p.comensales, p.estado_pedido, p.estado_pago,
               p.subtotal, p.descuento, p.impuesto, p.total, p.propina,
               p.creado_en, p.fecha_precuenta, p.impresiones_precuenta, p.fecha_cierre,
               TIMESTAMPDIFF(SECOND, p.creado_en, COALESCE(p.fecha_cierre, NOW())) AS duracion_seg,
               m.id AS mesa_id, m.numero AS mesa_numero,
               COALESCE(um.nombre, m.ubicacion) AS mesa_ubicacion,
               u.id AS mesero_id, u.nombre AS mesero_nombre, u.apellidos AS mesero_apellidos, u.rol AS mesero_rol,
               cj.id AS cajero_id, cj.nombre AS cajero_nombre, cj.apellidos AS cajero_apellidos,
               t.id AS turno_id, t.fecha_apertura AS turno_apertura,
               t.fecha_cierre AS turno_cierre, t.estado AS turno_estado
        ${JOIN_BASE}
        WHERE ${sql}
        ORDER BY p.creado_en DESC, p.id DESC
        LIMIT ? OFFSET ?
    `, [...params, porPagina, offset]);

    return { filas: filas || [], total: Number((total && total[0] && total[0].total) || 0) };
}

// ---------------------------------------------------------------------------
// Detalle de ítems, pagos y modificadores (una consulta por bloque)
// ---------------------------------------------------------------------------

const SELECT_ITEMS_BASE = `
    SELECT dp.id AS detalle_id, dp.id_pedido, dp.id_platillo, dp.es_platillo_dia,
           dp.cantidad, dp.precio_unitario, dp.estado_item, dp.notas_especiales,
           COALESCE(pd.nombre, pm.nombre, CONCAT('Platillo #', dp.id_platillo)) AS nombre,
           COALESCE(pd.tipo, cp.tipo) AS tipo, cp.nombre AS categoria`;

const SELECT_ITEMS_TIEMPOS = `,
           dp.creado_en, dp.enviado_en, dp.area_preparacion, dp.listo_en,
           dp.entregado_en, dp.cancelado_en,
           CONCAT_WS(' ', pc.nombre, pc.apellidos) AS cocinero,
           CONCAT_WS(' ', ue.nombre, ue.apellidos) AS entregado_por`;

const FROM_ITEMS_BASE = `
    FROM detalles_pedido dp
    LEFT JOIN platillos_menu pm ON pm.id = dp.id_platillo AND (dp.es_platillo_dia = 0 OR dp.es_platillo_dia IS NULL)
    LEFT JOIN platillos_dia pd ON pd.id = dp.id_platillo AND dp.es_platillo_dia = 1
    LEFT JOIN categorias_platillos cp ON cp.id = pm.categoria`;

const FROM_ITEMS_TIEMPOS = `
    LEFT JOIN usuarios pc ON pc.id = dp.id_usuario_preparacion
    LEFT JOIN usuarios ue ON ue.id = dp.id_usuario_entrega`;

/**
 * Ítems de un conjunto de pedidos, con tiempos de entrega calculados.
 * Si la migración de tiempos no está aplicada, reintenta sin esas columnas.
 */
async function obtenerItemsDePedidos(idPedidos, connection = db) {
    const ids = (idPedidos || []).map(Number).filter(n => Number.isFinite(n) && n > 0);
    if (!ids.length) return new Map();

    const marcas = ids.map(() => '?').join(', ');
    const correr = async (conTiempos) => connection.query(`
        ${SELECT_ITEMS_BASE}${conTiempos ? SELECT_ITEMS_TIEMPOS : ''}
        ${FROM_ITEMS_BASE}${conTiempos ? FROM_ITEMS_TIEMPOS : ''}
        WHERE dp.id_pedido IN (${marcas})
        ORDER BY dp.id ASC
    `, ids);

    let rows;
    let conTiempos = itemTiempos.tiemposDisponibles();
    try {
        [rows] = await correr(conTiempos);
    } catch (err) {
        if (!/Unknown column|ER_BAD_FIELD_ERROR/i.test(String(err && err.message)) || !conTiempos) throw err;
        itemTiempos.marcarSinTiempos();
        conTiempos = false;
        [rows] = await correr(false);
    }

    const porPedido = new Map();
    for (const fila of rows || []) {
        if (!porPedido.has(fila.id_pedido)) porPedido.set(fila.id_pedido, []);
        porPedido.get(fila.id_pedido).push(fila);
    }
    return porPedido;
}

async function obtenerPagosDePedidos(idPedidos, connection = db) {
    const ids = (idPedidos || []).map(Number).filter(n => Number.isFinite(n) && n > 0);
    if (!ids.length) return new Map();

    const [rows] = await connection.query(`
        SELECT pp.pedido_id, pp.metodo_pago, pp.monto_moneda_origen, pp.monto_equivalente_local,
               pp.factor_cambio_aplicado, pp.referencia_transaccion, pp.creado_en,
               COALESCE(mo.codigo, 'CUP') AS moneda_codigo,
               COALESCE(mo.simbolo, '$') AS moneda_simbolo,
               COALESCE(mo.nombre, '') AS moneda_nombre
        FROM pagos_pedido pp
        LEFT JOIN monedas mo ON mo.id = pp.moneda_id
        WHERE pp.pedido_id IN (${ids.map(() => '?').join(', ')})
        ORDER BY pp.id ASC
    `, ids).catch(() => [[]]);

    const porPedido = new Map();
    for (const fila of rows || []) {
        if (!porPedido.has(fila.pedido_id)) porPedido.set(fila.pedido_id, []);
        porPedido.get(fila.pedido_id).push(fila);
    }
    return porPedido;
}

async function obtenerModificadoresDeItems(idDetalles, connection = db) {
    const ids = (idDetalles || []).map(Number).filter(n => Number.isFinite(n) && n > 0);
    if (!ids.length) return new Map();

    const [rows] = await connection.query(`
        SELECT dpm.detalle_pedido_id, mm.nombre, mm.tipo, dpm.precio_cobrado
        FROM detalles_pedido_modificadores dpm
        INNER JOIN modificadores_menu mm ON mm.id = dpm.modificador_id
        WHERE dpm.detalle_pedido_id IN (${ids.map(() => '?').join(', ')})
        ORDER BY dpm.id ASC
    `, ids).catch(() => [[]]);

    const porDetalle = new Map();
    for (const fila of rows || []) {
        if (!porDetalle.has(fila.detalle_pedido_id)) porDetalle.set(fila.detalle_pedido_id, []);
        porDetalle.get(fila.detalle_pedido_id).push(fila);
    }
    return porDetalle;
}

// ---------------------------------------------------------------------------
// Ensamblado
// ---------------------------------------------------------------------------

/** Tiempo real de entrega del ítem (envío a producción → entrega al cliente). */
function tiempoEntregaItem(item) {
    const inicio = aFecha(item.enviado_en) || aFecha(item.creado_en);
    const fin = aFecha(item.entregado_en) || aFecha(item.listo_en);
    if (!inicio || !fin) return null;
    const segundos = Math.round((fin.getTime() - inicio.getTime()) / 1000);
    return segundos >= 0 ? segundos : null;
}

function enriquecerItem(item, modificadores = []) {
    const segundos = tiempoEntregaItem(item);
    const cantidad = Number(item.cantidad) || 0;
    const precio = num(item.precio_unitario);
    return {
        detalle_id: item.detalle_id,
        id_pedido: item.id_pedido,
        nombre: item.nombre,
        categoria: item.categoria || (item.tipo ? String(item.tipo) : null),
        tipo: item.tipo || null,
        cantidad,
        precio_unitario: precio,
        importe: num(cantidad * precio),
        estado_item: item.estado_item,
        estado_etiqueta: ETIQUETAS_ITEM[item.estado_item] || item.estado_item,
        area_preparacion: item.area_preparacion || null,
        creado_en: item.creado_en || null,
        enviado_en: item.enviado_en || null,
        listo_en: item.listo_en || null,
        entregado_en: item.entregado_en || null,
        cancelado_en: item.cancelado_en || null,
        alta: formatearHora(item.creado_en),
        envio: formatearHora(item.enviado_en),
        listo: formatearHora(item.listo_en),
        entrega: formatearHora(item.entregado_en),
        tiempo_entrega_seg: segundos,
        tiempo_entrega: formatearDuracion(segundos),
        cocinero: item.cocinero || null,
        entregado_por: item.entregado_por || null,
        notas_especiales: item.notas_especiales || null,
        modificadores: (modificadores || []).map(mo => ({
            nombre: mo.nombre,
            tipo: mo.tipo || null,
            precio_cobrado: num(mo.precio_cobrado)
        })),
        es_platillo_dia: Number(item.es_platillo_dia) === 1
    };
}

function enriquecerPago(pago) {
    return {
        metodo_pago: pago.metodo_pago,
        metodo_etiqueta: ETIQUETAS_METODO_PAGO[pago.metodo_pago] || pago.metodo_pago,
        moneda_codigo: pago.moneda_codigo,
        moneda_simbolo: pago.moneda_simbolo,
        moneda_nombre: pago.moneda_nombre || null,
        monto_moneda_origen: num(pago.monto_moneda_origen),
        monto_equivalente_local: num(pago.monto_equivalente_local),
        factor_cambio_aplicado: num(pago.factor_cambio_aplicado, 4),
        referencia_transaccion: pago.referencia_transaccion || null,
        fecha: formatearFechaHora(pago.creado_en)
    };
}

/** Texto compacto del desglose por moneda: "9 000,00 CUP · 5,00 USD". */
function resumenMonedas(pagos) {
    const agrupado = new Map();
    for (const pago of pagos || []) {
        const clave = pago.moneda_codigo;
        if (!agrupado.has(clave)) {
            agrupado.set(clave, { codigo: clave, simbolo: pago.moneda_simbolo, monto_origen: 0, monto_local: 0 });
        }
        const g = agrupado.get(clave);
        g.monto_origen = num(g.monto_origen + pago.monto_moneda_origen);
        g.monto_local = num(g.monto_local + pago.monto_equivalente_local);
    }
    return Array.from(agrupado.values());
}

function etiquetaTurno(fila) {
    if (!fila.turno_id) return null;
    const apertura = formatearFechaHora(fila.turno_apertura);
    const cierre = formatearFechaHora(fila.turno_cierre);
    return `Turno #${fila.turno_id} · ${apertura || '—'}${cierre ? ` → ${cierre}` : ' → abierto'}`;
}

/**
 * Listado completo del período: filas enriquecidas + totales + paginación.
 */
async function listarVentas(filtrosNormalizados, { pagina = 1, porPagina = 25 } = {}, connection = db) {
    const filtros = filtrosNormalizados || normalizarFiltros({});
    const { filas, total } = await obtenerFilas(filtros, { pagina, porPagina }, connection);
    const idsPedidos = filas.map(f => f.id);

    const [totales, itemsPorPedido, pagosPorPedido] = await Promise.all([
        obtenerTotales(filtros, connection),
        obtenerItemsDePedidos(idsPedidos, connection),
        obtenerPagosDePedidos(idsPedidos, connection)
    ]);

    const idDetalles = [];
    for (const lista of itemsPorPedido.values()) {
        for (const item of lista) idDetalles.push(item.detalle_id);
    }
    const modificadoresPorDetalle = await obtenerModificadoresDeItems(idDetalles, connection);

    const enriquecidas = filas.map(fila => {
        const items = (itemsPorPedido.get(fila.id) || [])
            .map(item => enriquecerItem(item, modificadoresPorDetalle.get(item.detalle_id) || []));
        const pagos = (pagosPorPedido.get(fila.id) || []).map(enriquecerPago);
        const entregados = items.filter(i => i.estado_item === 'entregado').length;
        const cancelados = items.filter(i => i.estado_item === 'cancelado').length;
        const tiempos = items.map(i => i.tiempo_entrega_seg).filter(v => v != null);
        const tiempoMedio = tiempos.length
            ? Math.round(tiempos.reduce((a, b) => a + b, 0) / tiempos.length)
            : null;

        const estadoClave = fila.estado_pedido === 'cancelado'
            ? 'cancelado'
            : (fila.fecha_cierre == null ? 'abiertas' : String(fila.estado_pago || 'pendiente'));

        return {
            id: fila.id,
            cliente_nombre: fila.cliente_nombre || null,
            comensales: Number(fila.comensales || 0),
            estado_pedido: fila.estado_pedido,
            estado_pago: fila.estado_pago,
            estado_clave: estadoClave,
            estado_etiqueta: ETIQUETAS_ESTADO[estadoClave] || fila.estado_pago,
            estado_clase: CLASES_ESTADO[estadoClave] || 'text-bg-secondary',
            abierta: fila.fecha_cierre == null,
            subtotal: num(fila.subtotal),
            descuento: num(fila.descuento),
            impuesto: num(fila.impuesto),
            total: num(fila.total),
            propina: num(fila.propina),
            apertura: fila.creado_en || null,
            apertura_fecha: formatearFecha(fila.creado_en),
            apertura_hora: formatearHora(fila.creado_en),
            cierre: fila.fecha_cierre || null,
            cierre_fecha: formatearFecha(fila.fecha_cierre),
            cierre_hora: formatearHora(fila.fecha_cierre),
            precuenta: formatearFechaHora(fila.fecha_precuenta),
            impresiones_precuenta: Number(fila.impresiones_precuenta || 0),
            duracion_seg: fila.duracion_seg != null ? Number(fila.duracion_seg) : null,
            duracion: formatearDuracion(fila.duracion_seg),
            mesa_id: fila.mesa_id,
            mesa_numero: fila.mesa_numero || `#${fila.mesa_id}`,
            mesa_ubicacion: fila.mesa_ubicacion || null,
            mesero_id: fila.mesero_id,
            mesero: nombreUsuario(fila.mesero_nombre, fila.mesero_apellidos) || 'Sin asignar',
            mesero_rol: fila.mesero_rol || null,
            cajero: nombreUsuario(fila.cajero_nombre, fila.cajero_apellidos),
            turno_id: fila.turno_id,
            turno_etiqueta: etiquetaTurno(fila),
            turno_estado: fila.turno_estado || null,
            pagos,
            monedas: resumenMonedas(pagos),
            items,
            items_total: items.length,
            items_entregados: entregados,
            items_cancelados: cancelados,
            items_pendientes: Math.max(0, items.length - entregados - cancelados),
            tiempo_medio_seg: tiempoMedio,
            tiempo_medio: formatearDuracion(tiempoMedio)
        };
    });

    return {
        filtros,
        filas: enriquecidas,
        totales,
        total,
        pagina,
        porPagina,
        paginas: Math.max(1, Math.ceil(total / porPagina)),
        tiemposDisponibles: itemTiempos.tiemposDisponibles()
    };
}

// ---------------------------------------------------------------------------
// Exportación CSV (separador ';' + BOM, como el resto del sistema)
// ---------------------------------------------------------------------------

const csvNum = (v, dec = 2) => num(v, dec).toFixed(dec).replace('.', ',');
const csvTexto = v => String(v == null ? '' : v).replace(/[;\r\n]+/g, ' ').trim();

// Hora LOCAL del negocio (toISOString desplazaría al UTC y movería las ventas
// de la madrugada al día anterior en el archivo exportado).
const csvFechaHora = v => {
    const d = aFecha(v);
    if (!d) return '';
    return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())} ` +
        `${dos(d.getHours())}:${dos(d.getMinutes())}:${dos(d.getSeconds())}`;
};

function ventasACSV(resultado, { detalle = false } = {}) {
    const filas = [];
    const f = resultado.filtros || {};
    filas.push('Pedidos y ventas - Restaurante Bahía');
    filas.push(`Periodo;${f.desde || ''};a;${f.hasta || ''}`);
    if (f.turno_id) filas.push(`Turno;${f.turno_id}`);
    if (f.mesero_id) filas.push(`Dependiente;${f.mesero_id}`);
    if (f.mesa_id) filas.push(`Mesa;${f.mesa_id}`);
    if (f.estado && f.estado !== 'todas') filas.push(`Estado;${ETIQUETAS_ESTADO[f.estado] || f.estado}`);
    if (f.q) filas.push(`Búsqueda;${f.q}`);
    filas.push('');

    if (detalle) {
        filas.push('Pedido;Mesa;Área;Dependiente;Ítem;Categoría;Cantidad;Precio unitario;Importe;Estado;Área producción;Alta;Enviado;Listo;Entregado;Tiempo entrega (h:m:s);Cocinero;Entregó;Notas;Modificadores');
        let cuenta = 0;
        for (const pedido of resultado.filas) {
            for (const item of pedido.items) {
                cuenta += 1;
                filas.push([
                    pedido.id,
                    csvTexto(pedido.mesa_numero),
                    csvTexto(pedido.mesa_ubicacion),
                    csvTexto(pedido.mesero),
                    csvTexto(item.nombre),
                    csvTexto(item.categoria),
                    item.cantidad,
                    csvNum(item.precio_unitario),
                    csvNum(item.importe),
                    csvTexto(item.estado_etiqueta),
                    csvTexto(item.area_preparacion),
                    item.alta || '',
                    item.envio || '',
                    item.listo || '',
                    item.entrega || '',
                    item.tiempo_entrega || '',
                    csvTexto(item.cocinero),
                    csvTexto(item.entregado_por),
                    csvTexto(item.notas_especiales),
                    csvTexto(item.modificadores.map(mo => mo.nombre).join(', '))
                ].join(';'));
            }
        }
        filas.push('');
        filas.push(`Ítems exportados;${cuenta}`);
        return { csv: '\uFEFF' + filas.join('\r\n') + '\r\n', filas: cuenta };
    }

    filas.push('Pedido;Apertura;Cierre;Duración servicio;Turno;Mesa;Área;Dependiente;Cajero;Comensales;Cliente;Estado;Subtotal;Descuento;Impuesto;Total;Propina;Pagos por moneda;Ítems;Entregados;Cancelados;Pendientes;Tiempo medio ítem');
    for (const pedido of resultado.filas) {
        filas.push([
            pedido.id,
            csvFechaHora(pedido.apertura),
            csvFechaHora(pedido.cierre),
            pedido.duracion || '',
            csvTexto(pedido.turno_etiqueta),
            csvTexto(pedido.mesa_numero),
            csvTexto(pedido.mesa_ubicacion),
            csvTexto(pedido.mesero),
            csvTexto(pedido.cajero),
            pedido.comensales,
            csvTexto(pedido.cliente_nombre),
            csvTexto(pedido.estado_etiqueta),
            csvNum(pedido.subtotal),
            csvNum(pedido.descuento),
            csvNum(pedido.impuesto),
            csvNum(pedido.total),
            csvNum(pedido.propina),
            csvTexto(pedido.monedas.map(mo => `${mo.monto_origen.toFixed(2)} ${mo.codigo}`).join(' / ')),
            pedido.items_total,
            pedido.items_entregados,
            pedido.items_cancelados,
            pedido.items_pendientes,
            pedido.tiempo_medio || ''
        ].join(';'));
    }

    const t = resultado.totales || {};
    filas.push('');
    filas.push(`TOTALES;${t.pedidos || 0} pedidos;;;;;;;${t.abiertas || 0} abiertas;;;${csvNum(t.subtotal)};${csvNum(t.descuentos)};;${csvNum(t.importe)};${csvNum(t.propinas)};;;;${t.items_entregados || 0};${t.items_cancelados || 0};;;${t.duracion_media || ''}`);
    for (const moneda of (t.por_moneda || [])) {
        filas.push(`Moneda ${moneda.codigo};;;${csvNum(moneda.monto_origen)};;;equivalente CUP;${csvNum(moneda.monto_local)};${moneda.pagos} pagos`);
    }

    return { csv: '\uFEFF' + filas.join('\r\n') + '\r\n', filas: resultado.filas.length };
}

module.exports = {
    ETIQUETAS_ESTADO,
    CLASES_ESTADO,
    ETIQUETAS_ITEM,
    ETIQUETAS_METODO_PAGO,
    normalizarFiltros,
    construirWhere,
    obtenerOpcionesDeFiltro,
    obtenerTotales,
    obtenerFilas,
    obtenerItemsDePedidos,
    listarVentas,
    ventasACSV,
    formatearDuracion,
    formatearHora,
    formatearFecha,
    formatearFechaHora,
    fechaLocalISO,
    tiempoEntregaItem,
    resumenMonedas
};
