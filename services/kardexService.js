// services/kardexService.js
// Tarjeta de kardex de inventario: el libro mayor físico-financiero de cada
// producto. Reconstruye la historia de entradas y salidas a partir de
// movimientos_inventario, calcula el saldo corrido (cantidad y valor) y
// permite exportarla a CSV para el control contable externo.
'use strict';

const db = require('../config/db');

// Movimientos que SUMAN existencia (entradas) y que RESTAN (salidas).
// CONTEO_FISICO es informativo: no altera el saldo corrido.
const TIPOS_ENTRADA = [
    'AJUSTE_POSITIVO', 'COMPRA', 'RECEPCION', 'TRANSFERENCIA_ENTRADA',
    'PRODUCCION_ENTRADA', 'DEVOLUCION_CLIENTE'
];
const TIPOS_SALIDA = [
    'VENTA', 'CONSUMO_RECETA', 'MERMA', 'AJUSTE_NEGATIVO',
    'DEVOLUCION_PROVEEDOR', 'PRODUCCION_SALIDA', 'TRANSFERENCIA_SALIDA'
];

const ETIQUETAS_MOVIMIENTO = {
    'CONSUMO_RECETA': 'Consumo por venta',
    'VENTA': 'Venta directa',
    'MERMA': 'Merma',
    'AJUSTE_NEGATIVO': 'Salida/Ajuste negativo',
    'AJUSTE_POSITIVO': 'Entrada/Ajuste positivo',
    'TRANSFERENCIA_ENTRADA': 'Transferencia (entrada)',
    'TRANSFERENCIA_SALIDA': 'Transferencia (salida)',
    'COMPRA': 'Compra',
    'RECEPCION': 'Recepción',
    'PRODUCCION_ENTRADA': 'Producción (entrada)',
    'PRODUCCION_SALIDA': 'Producción (salida)',
    'DEVOLUCION_PROVEEDOR': 'Devolución a proveedor',
    'DEVOLUCION_CLIENTE': 'Devolución de cliente',
    'CONTEO_FISICO': 'Conteo físico'
};

const FECHA_OK = /^\d{4}-\d{2}-\d{2}$/;

const num = (v, dec = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? Number(n.toFixed(dec)) : 0;
};

/**
 * Normaliza los filtros de la vista (fechas, almacén y tipo) a valores
 * seguros. Por defecto: últimos 30 días.
 */
function normalizarFiltros(query = {}) {
    const hoy = new Date();
    const iso = d => d.toISOString().slice(0, 10);
    const hace30 = new Date(hoy.getTime() - 30 * 24 * 60 * 60 * 1000);

    let desde = String(query.desde || '').trim();
    let hasta = String(query.hasta || '').trim();
    if (!FECHA_OK.test(desde)) desde = iso(hace30);
    if (!FECHA_OK.test(hasta)) hasta = iso(hoy);
    if (desde > hasta) [desde, hasta] = [hasta, desde];

    const almacen_id = Number.parseInt(query.almacen_id, 10) || null;

    // Tipo: 'todos' | 'entradas' | 'salidas' | un tipo concreto del catálogo
    let tipo = String(query.tipo || 'todos').trim();
    const tiposValidos = new Set(['todos', 'entradas', 'salidas', ...Object.keys(ETIQUETAS_MOVIMIENTO)]);
    if (!tiposValidos.has(tipo)) tipo = 'todos';

    return { desde, hasta, almacen_id, tipo };
}

/** Condición SQL del filtro de tipo sobre un alias de tabla. */
function condicionTipo(tipo, alias = 'mi') {
    if (tipo === 'entradas') {
        const lista = TIPOS_ENTRADA.map(t => `'${t}'`).join(', ');
        return ` AND ${alias}.tipo_movimiento IN (${lista})`;
    }
    if (tipo === 'salidas') {
        const lista = TIPOS_SALIDA.map(t => `'${t}'`).join(', ');
        return ` AND ${alias}.tipo_movimiento IN (${lista})`;
    }
    if (tipo !== 'todos' && ETIQUETAS_MOVIMIENTO[tipo]) {
        return ` AND ${alias}.tipo_movimiento = '${tipo}'`;
    }
    return '';
}

/** Valor económico de un movimiento (costo_total registrado o reconstruido). */
const VALOR_MOV = 'COALESCE(NULLIF(mi.costo_total, 0), mi.cantidad * mi.costo_unitario, 0)';

/** Signo de un tipo de movimiento: +1 entrada, -1 salida, 0 informativo. */
function signoDe(tipo) {
    if (TIPOS_ENTRADA.includes(tipo)) return 1;
    if (TIPOS_SALIDA.includes(tipo)) return -1;
    return 0;
}

/**
 * Listado de productos con su stock/valor actual y el resumen de
 * movimientos del período (entradas y salidas). Base del índice del kardex.
 */
async function listarProductos(filtros, { pagina = 1, porPagina = 50 } = {}) {
    const { desde, hasta, almacen_id, tipo } = filtros;
    const offset = (Math.max(1, pagina) - 1) * porPagina;

    const where = ['p.activo = 1'];
    const paramsWhere = [];
    if (filtros.q) {
        where.push('(p.nombre LIKE ? OR p.codigo LIKE ?)');
        const like = `%${filtros.q}%`;
        paramsWhere.push(like, like);
    }

    const filtroLote = almacen_id ? ' AND l.almacen_id = ?' : '';
    const paramsLote = almacen_id ? [almacen_id] : [];

    const [productos] = await db.query(`
        SELECT p.id, p.codigo, p.nombre, p.stock_minimo, p.costo_promedio,
               MAX(um.abreviatura) AS unidad,
               COALESCE(SUM(l.cantidad_actual), 0) AS stock_actual,
               COALESCE(SUM(l.cantidad_actual * l.costo_unitario), 0) AS valor_stock
        FROM productos p
        LEFT JOIN unidades_medida um ON um.id = p.unidad_inventario_id
        LEFT JOIN lotes l ON l.producto_id = p.id
            AND l.cantidad_actual > 0 AND l.estado = 'ACTIVO'${filtroLote}
        WHERE ${where.join(' AND ')}
        GROUP BY p.id, p.codigo, p.nombre, p.stock_minimo, p.costo_promedio
        ORDER BY p.nombre ASC
        LIMIT ? OFFSET ?
    `, [...paramsWhere, ...paramsLote, porPagina, offset]);

    const [total] = await db.query(`
        SELECT COUNT(*) AS n FROM (
            SELECT p.id
            FROM productos p
            LEFT JOIN lotes l ON l.producto_id = p.id
                AND l.cantidad_actual > 0 AND l.estado = 'ACTIVO'${filtroLote}
            WHERE ${where.join(' AND ')}
            GROUP BY p.id
        ) t
    `, [...paramsWhere, ...paramsLote]);

    // Movimientos agregados del período (por producto y tipo)
    const condMov = ['mi.fecha_movimiento >= ?', 'mi.fecha_movimiento < DATE_ADD(?, INTERVAL 1 DAY)'];
    const paramsMov = [desde, hasta];
    if (almacen_id) { condMov.push('mi.almacen_id = ?'); paramsMov.push(almacen_id); }
    const sqlTipo = condicionTipo(tipo);

    const [movs] = await db.query(`
        SELECT mi.producto_id, mi.tipo_movimiento,
               SUM(mi.cantidad) AS cantidad,
               SUM(${VALOR_MOV}) AS valor
        FROM movimientos_inventario mi
        WHERE ${condMov.join(' AND ')}${sqlTipo}
        GROUP BY mi.producto_id, mi.tipo_movimiento
    `, paramsMov);

    const porProducto = new Map();
    for (const m of movs) {
        const signo = signoDe(m.tipo_movimiento);
        if (signo === 0) continue;
        const fila = porProducto.get(m.producto_id)
            || { entradas: 0, salidas: 0, valor_entradas: 0, valor_salidas: 0 };
        if (signo > 0) {
            fila.entradas += Number(m.cantidad || 0);
            fila.valor_entradas += Number(m.valor || 0);
        } else {
            fila.salidas += Number(m.cantidad || 0);
            fila.valor_salidas += Number(m.valor || 0);
        }
        porProducto.set(m.producto_id, fila);
    }

    const lista = productos.map(p => {
        const resumen = porProducto.get(p.id) || {};
        return {
            id: p.id,
            codigo: p.codigo,
            nombre: p.nombre,
            unidad: p.unidad || '',
            stock_minimo: num(p.stock_minimo, 3),
            stock_actual: num(p.stock_actual, 3),
            valor_stock: num(p.valor_stock, 2),
            entradas: num(resumen.entradas, 3),
            salidas: num(resumen.salidas, 3),
            valor_entradas: num(resumen.valor_entradas, 2),
            valor_salidas: num(resumen.valor_salidas, 2)
        };
    });

    return {
        productos: lista,
        total: total && total[0] ? Number(total[0].n || 0) : lista.length,
        pagina: Math.max(1, pagina),
        porPagina
    };
}

/**
 * Tarjeta de kardex de un producto: saldo inicial, movimientos del período
 * con saldo corrido (cantidad y valor) y totales. El saldo final calculado
 * se contrasta con la existencia real (lotes) para detectar descuadres.
 */
async function obtenerTarjeta(productoId, filtros) {
    const { desde, hasta, almacen_id, tipo } = filtros;
    const id = Number.parseInt(productoId, 10);
    if (!id || !Number.isFinite(id)) {
        const err = new Error('Producto no válido'); err.status = 400; throw err;
    }

    // 1) Datos del producto + existencia real actual
    const [productos] = await db.query(`
        SELECT p.id, p.codigo, p.nombre, p.stock_minimo, p.costo_promedio,
               MAX(um.abreviatura) AS unidad,
               COALESCE(SUM(l.cantidad_actual), 0) AS stock_actual,
               COALESCE(SUM(l.cantidad_actual * l.costo_unitario), 0) AS valor_stock
        FROM productos p
        LEFT JOIN unidades_medida um ON um.id = p.unidad_inventario_id
        LEFT JOIN lotes l ON l.producto_id = p.id AND l.cantidad_actual > 0
        WHERE p.id = ?
        GROUP BY p.id, p.codigo, p.nombre, p.stock_minimo, p.costo_promedio
    `, [id]);

    if (!productos || !productos.length) {
        const err = new Error('Producto no encontrado'); err.status = 404; throw err;
    }
    const producto = productos[0];

    // 2) Saldo inicial: movimientos anteriores al período
    const condInicial = ['mi.producto_id = ?', 'mi.fecha_movimiento < ?'];
    const paramsInicial = [id, desde];
    if (almacen_id) { condInicial.push('mi.almacen_id = ?'); paramsInicial.push(almacen_id); }

    const [iniciales] = await db.query(`
        SELECT mi.tipo_movimiento, SUM(mi.cantidad) AS cantidad, SUM(${VALOR_MOV}) AS valor
        FROM movimientos_inventario mi
        WHERE ${condInicial.join(' AND ')}
        GROUP BY mi.tipo_movimiento
    `, paramsInicial);

    let saldoCantidad = 0, saldoValor = 0;
    for (const m of iniciales) {
        const signo = signoDe(m.tipo_movimiento);
        saldoCantidad += signo * Number(m.cantidad || 0);
        saldoValor += signo * Number(m.valor || 0);
    }
    const saldoInicial = { cantidad: num(saldoCantidad, 3), valor: num(saldoValor, 2) };

    // 3) Movimientos del período
    const condMov = ['mi.producto_id = ?', 'mi.fecha_movimiento >= ?', 'mi.fecha_movimiento < DATE_ADD(?, INTERVAL 1 DAY)'];
    const paramsMov = [id, desde, hasta];
    if (almacen_id) { condMov.push('mi.almacen_id = ?'); paramsMov.push(almacen_id); }
    const sqlTipo = condicionTipo(tipo);

    const [movs] = await db.query(`
        SELECT mi.id, mi.fecha_movimiento, mi.tipo_movimiento, mi.documento_numero,
               mi.referencia_tipo, mi.referencia_id, mi.cantidad, mi.costo_unitario,
               mi.costo_total, mi.stock_anterior, mi.stock_nuevo, mi.observaciones,
               a.nombre AS almacen, l.numero_lote, u.nombre AS usuario
        FROM movimientos_inventario mi
        LEFT JOIN almacenes a ON a.id = mi.almacen_id
        LEFT JOIN lotes l ON l.id = mi.lote_id
        LEFT JOIN usuarios u ON u.id = mi.usuario_id
        WHERE ${condMov.join(' AND ')}${sqlTipo}
        ORDER BY mi.fecha_movimiento ASC, mi.id ASC
        LIMIT 1000
    `, paramsMov);

    // 4) Saldo corrido
    let cant = saldoInicial.cantidad, valor = saldoInicial.valor;
    let totEntradasC = 0, totEntradasV = 0, totSalidasC = 0, totSalidasV = 0;

    const movimientos = movs.map(m => {
        const esEntrada = TIPOS_ENTRADA.includes(m.tipo_movimiento);
        const esSalida = TIPOS_SALIDA.includes(m.tipo_movimiento);
        const cantidad = Number(m.cantidad || 0);
        const valorMov = Number(m.costo_total || 0) || cantidad * Number(m.costo_unitario || 0);
        const signo = esEntrada ? 1 : (esSalida ? -1 : 0);

        cant += signo * cantidad;
        valor += signo * valorMov;
        if (esEntrada) { totEntradasC += cantidad; totEntradasV += valorMov; }
        if (esSalida) { totSalidasC += cantidad; totSalidasV += valorMov; }

        return {
            id: m.id,
            fecha: m.fecha_movimiento,
            tipo: m.tipo_movimiento,
            etiqueta: ETIQUETAS_MOVIMIENTO[m.tipo_movimiento] || m.tipo_movimiento,
            documento: m.documento_numero || '',
            lote: m.numero_lote || '',
            almacen: m.almacen || '',
            usuario: m.usuario || 'Sistema',
            observaciones: m.observaciones || '',
            entrada_cantidad: esEntrada ? num(cantidad, 3) : null,
            entrada_costo: esEntrada ? num(Number(m.costo_unitario || 0), 4) : null,
            entrada_valor: esEntrada ? num(valorMov, 2) : null,
            salida_cantidad: esSalida ? num(cantidad, 3) : null,
            salida_costo: esSalida ? num(Number(m.costo_unitario || 0), 4) : null,
            salida_valor: esSalida ? num(valorMov, 2) : null,
            saldo_cantidad: num(cant, 3),
            saldo_valor: num(valor, 2)
        };
    });

    const stockActual = num(producto.stock_actual, 3);
    return {
        producto: {
            id: producto.id,
            codigo: producto.codigo,
            nombre: producto.nombre,
            unidad: producto.unidad || '',
            stock_minimo: num(producto.stock_minimo, 3),
            stock_actual: stockActual,
            valor_stock: num(producto.valor_stock, 2),
            costo_promedio: num(producto.costo_promedio, 4)
        },
        filtros: { desde, hasta, almacen_id, tipo },
        saldoInicial,
        movimientos,
        totales: {
            entradas_cantidad: num(totEntradasC, 3),
            entradas_valor: num(totEntradasV, 2),
            salidas_cantidad: num(totSalidasC, 3),
            salidas_valor: num(totSalidasV, 2),
            saldo_cantidad: num(cant, 3),
            saldo_valor: num(valor, 2)
        },
        // Descuadre entre el saldo que dicta el kardex y la existencia real
        // (lotes). Si difiere, el historial está incompleto o hubo ajustes
        // directos sobre lotes: hay que investigar.
        descuadre: num(cant - stockActual, 3)
    };
}

/** Formatea un número para CSV con separador decimal coma (Excel es-ES). */
const csvNum = (v, dec = 2) => Number(v || 0).toFixed(dec).replace('.', ',');

/**
 * Exporta la tarjeta de kardex a CSV (separador ';' + BOM UTF-8), listo
 * para abrir en Excel.
 */
function tarjetaACSV(tarjeta) {
    const p = tarjeta.producto;
    const filas = [];
    filas.push(`Kardex de inventario - ${p.codigo || p.id} - ${p.nombre}${p.unidad ? ` (${p.unidad})` : ''}`);
    filas.push(`Periodo;${tarjeta.filtros.desde};a;${tarjeta.filtros.hasta}`);
    filas.push('');
    filas.push('Fecha;Tipo;Documento;Lote;Almacén;Usuario;Entrada cant;Entrada c.u.;Entrada valor;Salida cant;Salida c.u.;Salida valor;Saldo cant;Saldo valor;Observaciones');
    filas.push(`(Saldo inicial);;;;;;;;;;;;${csvNum(tarjeta.saldoInicial.cantidad, 3)};${csvNum(tarjeta.saldoInicial.valor)};`);

    for (const m of tarjeta.movimientos) {
        const fecha = m.fecha instanceof Date
            ? m.fecha.toISOString().slice(0, 16).replace('T', ' ')
            : String(m.fecha || '').slice(0, 16);
        filas.push([
            fecha,
            m.etiqueta,
            m.documento,
            m.lote,
            m.almacen,
            m.usuario,
            m.entrada_cantidad != null ? csvNum(m.entrada_cantidad, 3) : '',
            m.entrada_costo != null ? csvNum(m.entrada_costo, 4) : '',
            m.entrada_valor != null ? csvNum(m.entrada_valor) : '',
            m.salida_cantidad != null ? csvNum(m.salida_cantidad, 3) : '',
            m.salida_costo != null ? csvNum(m.salida_costo, 4) : '',
            m.salida_valor != null ? csvNum(m.salida_valor) : '',
            csvNum(m.saldo_cantidad, 3),
            csvNum(m.saldo_valor),
            String(m.observaciones || '').replace(/[;\r\n]+/g, ' ')
        ].join(';'));
    }

    const t = tarjeta.totales;
    filas.push(`TOTALES;;;;;${csvNum(t.entradas_cantidad, 3)};;${csvNum(t.entradas_valor)};${csvNum(t.salidas_cantidad, 3)};;${csvNum(t.salidas_valor)};${csvNum(t.saldo_cantidad, 3)};${csvNum(t.saldo_valor)};`);
    filas.push(`Existencia actual (lotes);${csvNum(p.stock_actual, 3)};Valor a costo de lote;${csvNum(p.valor_stock)}`);
    filas.push(`Descuadre kardex vs lotes;${csvNum(tarjeta.descuadre, 3)}`);

    return { csv: '\uFEFF' + filas.join('\r\n') + '\r\n', filas: tarjeta.movimientos.length };
}

module.exports = {
    TIPOS_ENTRADA,
    TIPOS_SALIDA,
    ETIQUETAS_MOVIMIENTO,
    normalizarFiltros,
    listarProductos,
    obtenerTarjeta,
    tarjetaACSV
};
