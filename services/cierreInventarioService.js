// services/cierreInventarioService.js
// Movimiento de INVENTARIO por turno de servicio para la vista de Caja /
// Cierre del Día: resume qué entró y qué salió del almacén según la venta,
// mermas, ajustes, transferencias y compras del período del turno.
'use strict';

const db = require('../config/db');
const KardexService = require('./kardexService');

const { TIPOS_ENTRADA, TIPOS_SALIDA, ETIQUETAS_MOVIMIENTO } = KardexService;

// Agrupaciones funcionales del movimiento de inventario (para tarjetas).
const GRUPOS = {
    ventas: ['VENTA', 'CONSUMO_RECETA'],
    mermas: ['MERMA'],
    ajustes: ['AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO'],
    transferencias: ['TRANSFERENCIA_ENTRADA', 'TRANSFERENCIA_SALIDA'],
    compras: ['COMPRA', 'RECEPCION'],
    produccion: ['PRODUCCION_ENTRADA', 'PRODUCCION_SALIDA'],
    devoluciones: ['DEVOLUCION_PROVEEDOR', 'DEVOLUCION_CLIENTE']
};

const num = (v, dec = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? Number(n.toFixed(dec)) : 0;
};

const resumenVacio = () => ({
    turno: null,
    resumen: {
        totalMovimientos: 0,
        totalProductos: 0,
        entradasCantidad: 0,
        entradasValor: 0,
        salidasCantidad: 0,
        salidasValor: 0,
        netoCantidad: 0,
        netoValor: 0,
        ventasCantidad: 0,
        ventasValor: 0,
        mermasCantidad: 0,
        mermasValor: 0,
        ajustesCantidad: 0,
        ajustesValor: 0,
        transferenciasCantidad: 0,
        transferenciasValor: 0
    },
    porTipo: [],
    porProducto: [],
    almacenes: []
});

/** Suma cantidad/valor/movimientos de un subconjunto de filas. */
function sumar(filas, tipos = null) {
    const filtradas = tipos ? filas.filter(f => tipos.includes(f.tipo_movimiento)) : filas;
    return filtradas.reduce((acc, f) => {
        acc.cantidad += num(f.cantidad, 6);
        acc.valor += num(f.valor, 2);
        acc.movimientos += num(f.movimientos, 0);
        return acc;
    }, { cantidad: 0, valor: 0, movimientos: 0 });
}

/**
 * Resumen del movimiento de inventario del turno:
 *  - resumen: totales por grupo funcional (ventas, mermas, ajustes…)
 *  - porTipo: desglose por tipo_movimiento
 *  - porProducto: neto por producto (entradas/salidas en unidad de inventario)
 *  - almacenes: catálogo de almacenes con movimientos en el período
 */
async function resumenMovimientosTurno(turnoId) {
    const [turnos] = await db.query(
        'SELECT id, fecha_apertura, fecha_cierre FROM turnos_servicio WHERE id = ? LIMIT 1',
        [turnoId]
    );
    const turno = turnos[0];
    if (!turno) return resumenVacio();

    const hasta = turno.fecha_cierre || new Date();

    const [filas] = await db.query(`
        SELECT mi.tipo_movimiento,
               mi.producto_id,
               p.codigo AS producto_codigo,
               p.nombre AS producto_nombre,
               ui.abreviatura AS unidad_abrev,
               ui.nombre AS unidad_nombre,
               a.id AS almacen_id,
               a.nombre AS almacen_nombre,
               SUM(mi.cantidad) AS cantidad,
               SUM(mi.costo_total) AS valor,
               COUNT(mi.id) AS movimientos
        FROM movimientos_inventario mi
        INNER JOIN productos p ON p.id = mi.producto_id
        LEFT JOIN unidades_medida ui ON ui.id = p.unidad_inventario_id
        INNER JOIN almacenes a ON a.id = mi.almacen_id
        WHERE mi.fecha_movimiento >= ?
          AND mi.fecha_movimiento < DATE_ADD(?, INTERVAL 1 SECOND)
        GROUP BY mi.tipo_movimiento, mi.producto_id, mi.almacen_id
        ORDER BY p.nombre ASC, mi.tipo_movimiento ASC
    `, [turno.fecha_apertura, hasta]);

    const porTipo = [];
    const mapaTipo = new Map();
    for (const f of filas) {
        if (!mapaTipo.has(f.tipo_movimiento)) {
            const item = {
                tipo: f.tipo_movimiento,
                etiqueta: ETIQUETAS_MOVIMIENTO[f.tipo_movimiento] || f.tipo_movimiento,
                es_entrada: TIPOS_ENTRADA.includes(f.tipo_movimiento),
                es_salida: TIPOS_SALIDA.includes(f.tipo_movimiento),
                cantidad: 0,
                valor: 0,
                movimientos: 0
            };
            mapaTipo.set(f.tipo_movimiento, item);
            porTipo.push(item);
        }
        const item = mapaTipo.get(f.tipo_movimiento);
        item.cantidad = num(item.cantidad + num(f.cantidad, 6), 6);
        item.valor = num(item.valor + num(f.valor, 2), 2);
        item.movimientos = num(item.movimientos + num(f.movimientos, 0), 0);
    }
    porTipo.sort((a, b) => (b.es_entrada - a.es_entrada) || b.valor - a.valor);

    // Por producto (agregando todas las filas del producto en el período)
    const porProducto = [];
    const mapaProducto = new Map();
    for (const f of filas) {
        const key = String(f.producto_id);
        if (!mapaProducto.has(key)) {
            const item = {
                producto_id: f.producto_id,
                codigo: f.producto_codigo,
                nombre: f.producto_nombre,
                unidad: f.unidad_nombre || f.unidad_abrev || '',
                almacenes: new Set(),
                entradasCantidad: 0,
                entradasValor: 0,
                salidasCantidad: 0,
                salidasValor: 0,
                movimientos: 0
            };
            mapaProducto.set(key, item);
            porProducto.push(item);
        }
        const item = mapaProducto.get(key);
        if (f.almacen_nombre) item.almacenes.add(f.almacen_nombre);
        item.movimientos = num(item.movimientos + num(f.movimientos, 0), 0);
        if (TIPOS_ENTRADA.includes(f.tipo_movimiento)) {
            item.entradasCantidad = num(item.entradasCantidad + num(f.cantidad, 6), 6);
            item.entradasValor = num(item.entradasValor + num(f.valor, 2), 2);
        } else if (TIPOS_SALIDA.includes(f.tipo_movimiento)) {
            item.salidasCantidad = num(item.salidasCantidad + num(f.cantidad, 6), 6);
            item.salidasValor = num(item.salidasValor + num(f.valor, 2), 2);
        }
    }
    porProducto.forEach(item => {
        item.netoCantidad = num(item.entradasCantidad - item.salidasCantidad, 6);
        item.netoValor = num(item.entradasValor - item.salidasValor, 2);
        item.almacenes = Array.from(item.almacenes).join(', ');
    });
    porProducto.sort((a, b) => (Math.abs(b.netoValor) - Math.abs(a.netoValor)) || a.nombre.localeCompare(b.nombre, 'es'));

    const entradas = sumar(filas, TIPOS_ENTRADA);
    const salidas = sumar(filas, TIPOS_SALIDA);
    const ventas = sumar(filas, GRUPOS.ventas);
    const mermas = sumar(filas, GRUPOS.mermas);
    const ajustes = sumar(filas, GRUPOS.ajustes);
    const transferencias = sumar(filas, GRUPOS.transferencias);

    const almacenesSet = new Set(filas.map(f => f.almacen_nombre).filter(Boolean));

    return {
        turno: {
            id: turno.id,
            fecha_apertura: turno.fecha_apertura,
            fecha_cierre: turno.fecha_cierre || hasta
        },
        resumen: {
            totalMovimientos: num(sumar(filas).movimientos, 0),
            totalProductos: porProducto.length,
            entradasCantidad: entradas.cantidad,
            entradasValor: entradas.valor,
            salidasCantidad: salidas.cantidad,
            salidasValor: salidas.valor,
            netoCantidad: num(entradas.cantidad - salidas.cantidad, 6),
            netoValor: num(entradas.valor - salidas.valor, 2),
            ventasCantidad: ventas.cantidad,
            ventasValor: ventas.valor,
            mermasCantidad: mermas.cantidad,
            mermasValor: mermas.valor,
            ajustesCantidad: ajustes.cantidad,
            ajustesValor: ajustes.valor,
            transferenciasCantidad: transferencias.cantidad,
            transferenciasValor: transferencias.valor
        },
        porTipo,
        porProducto,
        almacenes: Array.from(almacenesSet).sort((a, b) => a.localeCompare(b, 'es'))
    };
}

/** CSV (separador ';' + BOM UTF-8) del movimiento de inventario del turno. */
function movimientosTurnoACSV(data) {
    const csvNum = (v) => String(num(v, 6)).replace('.', ',');
    const filas = [];
    const { turno, resumen, porTipo, porProducto } = data;

    filas.push(`Movimiento de Inventario del Turno #${turno ? turno.id : '-'}`);
    filas.push(`Apertura;${turno ? new Date(turno.fecha_apertura).toLocaleString('es-ES') : ''}`);
    filas.push(`Cierre;${turno && turno.fecha_cierre ? new Date(turno.fecha_cierre).toLocaleString('es-ES') : ''}`);
    filas.push('');
    filas.push('RESUMEN POR TIPO DE MOVIMIENTO');
    filas.push('Tipo;Entrada/Salida;Movimientos;Cantidad;Valor (CUP)');
    porTipo.forEach(t => {
        filas.push([
            t.etiqueta,
            t.es_entrada ? 'ENTRADA' : (t.es_salida ? 'SALIDA' : 'INFO'),
            t.movimientos,
            csvNum(t.cantidad),
            csvNum(t.valor)
        ].join(';'));
    });
    filas.push('');
    filas.push('TOTALES');
    filas.push(`Entradas;${csvNum(resumen.entradasCantidad)};${csvNum(resumen.entradasValor)}`);
    filas.push(`Salidas;${csvNum(resumen.salidasCantidad)};${csvNum(resumen.salidasValor)}`);
    filas.push(`Neto;${csvNum(resumen.netoCantidad)};${csvNum(resumen.netoValor)}`);
    filas.push('');
    filas.push('DETALLE POR PRODUCTO');
    filas.push('Código;Producto;Almacén;Unidad;Movimientos;Entradas;Entradas (valor);Salidas;Salidas (valor);Neto;Neto (valor)');
    porProducto.forEach(p => {
        filas.push([
            p.codigo || '',
            p.nombre,
            p.almacenes,
            p.unidad,
            p.movimientos,
            csvNum(p.entradasCantidad),
            csvNum(p.entradasValor),
            csvNum(p.salidasCantidad),
            csvNum(p.salidasValor),
            csvNum(p.netoCantidad),
            csvNum(p.netoValor)
        ].join(';'));
    });

    return { csv: '\uFEFF' + filas.join('\r\n') + '\r\n', filas: porProducto.length };
}

module.exports = {
    resumenMovimientosTurno,
    movimientosTurnoACSV,
    GRUPOS
};
