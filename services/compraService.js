// services/compraService.js
// V13 (C1): historial de compras — cada lote recibido es una compra.
// Solo lectura: las compras se registran desde Entradas de almacén.
const db = require('../config/db');

const FECHA_OK = /^\d{4}-\d{2}-\d{2}$/;

function mapearCompra(f) {
    const cantidad = Number(f.cantidad_inicial || 0);
    const costo = Number(f.costo_unitario || 0);
    return {
        loteId: f.lote_id,
        lote: f.numero_lote,
        fecha: f.fecha_ingreso,
        productoId: f.producto_id,
        producto: f.producto_nombre,
        codigoProducto: f.producto_codigo,
        unidad: f.unidad || '',
        almacen: f.almacen_nombre,
        proveedorId: f.proveedor_id,
        proveedor: f.proveedor_nombre,
        cantidad,
        costoUnitario: costo,
        monto: Number((cantidad * costo).toFixed(2))
    };
}

const compraService = {

    historial: async ({ proveedorId = null, productoId = null, desde = null, hasta = null, limite = 100 } = {}) => {
        const filtros = [];
        const params = [];
        if (proveedorId) { filtros.push('l.proveedor_id = ?'); params.push(Number(proveedorId)); }
        if (productoId) { filtros.push('l.producto_id = ?'); params.push(Number(productoId)); }
        if (desde && FECHA_OK.test(desde)) { filtros.push('l.fecha_ingreso >= ?'); params.push(desde); }
        if (hasta && FECHA_OK.test(hasta)) { filtros.push('l.fecha_ingreso <= ?'); params.push(hasta); }
        const tope = Math.min(500, Math.max(1, Number(limite) || 100));
        const [filas] = await db.query(`
            SELECT l.id AS lote_id, l.numero_lote, l.fecha_ingreso, l.producto_id,
                   l.cantidad_inicial, l.costo_unitario, l.proveedor_id,
                   p.nombre AS producto_nombre, p.codigo AS producto_codigo,
                   um.abreviatura AS unidad, a.nombre AS almacen_nombre,
                   pr.nombre_comercial AS proveedor_nombre
            FROM lotes l
            INNER JOIN productos p ON l.producto_id = p.id
            INNER JOIN almacenes a ON l.almacen_id = a.id
            LEFT JOIN unidades_medida um ON um.id = p.unidad_inventario_id
            LEFT JOIN proveedores pr ON pr.id = l.proveedor_id
            ${filtros.length ? `WHERE ${filtros.join(' AND ')}` : ''}
            ORDER BY l.fecha_ingreso DESC, l.id DESC
            LIMIT ${tope}
        `, params);
        const compras = filas.map(mapearCompra);
        return {
            compras,
            totales: {
                movimientos: compras.length,
                monto: Number(compras.reduce((acc, c) => acc + c.monto, 0).toFixed(2))
            }
        };
    },

    resumenProveedor: async (proveedorId) => {
        const [tot] = await db.query(`
            SELECT COUNT(l.id) AS movimientos,
                   COALESCE(SUM(l.cantidad_inicial * l.costo_unitario), 0) AS monto,
                   MAX(l.fecha_ingreso) AS ultima_compra,
                   COUNT(DISTINCT l.producto_id) AS productos
            FROM lotes l
            WHERE l.proveedor_id = ?
        `, [proveedorId]);
        const [top] = await db.query(`
            SELECT l.producto_id, MAX(p.nombre) AS producto,
                   MAX(um.abreviatura) AS unidad,
                   COUNT(l.id) AS movimientos,
                   COALESCE(SUM(l.cantidad_inicial), 0) AS cantidad,
                   COALESCE(SUM(l.cantidad_inicial * l.costo_unitario), 0) AS monto,
                   MAX(l.fecha_ingreso) AS ultima_compra
            FROM lotes l
            INNER JOIN productos p ON l.producto_id = p.id
            LEFT JOIN unidades_medida um ON um.id = p.unidad_inventario_id
            WHERE l.proveedor_id = ?
            GROUP BY l.producto_id
            ORDER BY monto DESC
            LIMIT 10
        `, [proveedorId]);
        return {
            movimientos: Number(tot[0].movimientos || 0),
            monto: Number(tot[0].monto || 0),
            ultimaCompra: tot[0].ultima_compra || null,
            productos: Number(tot[0].productos || 0),
            topProductos: top.map((f) => ({
                productoId: f.producto_id,
                producto: f.producto,
                unidad: f.unidad || '',
                movimientos: Number(f.movimientos),
                cantidad: Number(f.cantidad),
                monto: Number(f.monto),
                ultimaCompra: f.ultima_compra
            }))
        };
    }
};

module.exports = compraService;
