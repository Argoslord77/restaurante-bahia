// models/salidaManualModel.js - Modelo para gestión de salidas manuales de inventario
const db = require('../config/db');

const SalidaManual = {
    // Obtener todas las salidas manuales
    getAll: async () => {
        const query = `
            SELECT 
                sm.*,
                a.nombre AS almacen_nombre,
                p.nombre AS producto_nombre,
                p.codigo AS producto_codigo,
                u.nombre AS usuario_nombre
            FROM salidas_manuales sm
            INNER JOIN almacenes a ON sm.almacen_id = a.id
            INNER JOIN productos p ON sm.producto_id = p.id
            LEFT JOIN usuarios u ON sm.usuario_id = u.id
            ORDER BY sm.fecha_registro DESC
        `;
        const [rows] = await db.query(query);
        return rows;
    },

    // Obtener salidas por tipo
    getByTipo: async (tipo) => {
        const query = `
            SELECT 
                sm.*,
                a.nombre AS almacen_nombre,
                p.nombre AS producto_nombre,
                p.codigo AS producto_codigo,
                u.nombre AS usuario_nombre
            FROM salidas_manuales sm
            INNER JOIN almacenes a ON sm.almacen_id = a.id
            INNER JOIN productos p ON sm.producto_id = p.id
            LEFT JOIN usuarios u ON sm.usuario_id = u.id
            WHERE sm.tipo = ?
            ORDER BY sm.fecha_registro DESC
        `;
        const [rows] = await db.query(query, [tipo]);
        return rows;
    },

    // Obtener salidas por almacén
    getByAlmacen: async (almacenId) => {
        const query = `
            SELECT 
                sm.*,
                a.nombre AS almacen_nombre,
                p.nombre AS producto_nombre,
                p.codigo AS producto_codigo,
                u.nombre AS usuario_nombre
            FROM salidas_manuales sm
            INNER JOIN almacenes a ON sm.almacen_id = a.id
            INNER JOIN productos p ON sm.producto_id = p.id
            LEFT JOIN usuarios u ON sm.usuario_id = u.id
            WHERE sm.almacen_id = ?
            ORDER BY sm.fecha_registro DESC
        `;
        const [rows] = await db.query(query, [almacenId]);
        return rows;
    },

    // Obtener salida por ID
    getById: async (id) => {
        const query = `
            SELECT 
                sm.*,
                a.nombre AS almacen_nombre,
                p.nombre AS producto_nombre,
                p.codigo AS producto_codigo,
                u.nombre AS usuario_nombre
            FROM salidas_manuales sm
            INNER JOIN almacenes a ON sm.almacen_id = a.id
            INNER JOIN productos p ON sm.producto_id = p.id
            LEFT JOIN usuarios u ON sm.usuario_id = u.id
            WHERE sm.id = ?
        `;
        const [rows] = await db.query(query, [id]);
        return rows[0];
    },

    // Crear nueva salida manual
    create: async (salidaData) => {
        const query = `
            INSERT INTO salidas_manuales 
            (almacen_id, producto_id, cantidad, tipo, motivo, notas, usuario_id, fecha_registro)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        `;
        const [result] = await db.query(query, [
            salidaData.almacen_id,
            salidaData.producto_id,
            salidaData.cantidad,
            salidaData.tipo,
            salidaData.motivo || null,
            salidaData.notas || null,
            salidaData.usuario_id
        ]);
        return result.insertId;
    },

    // Verificar stock disponible en almacén
    verificarStock: async (almacenId, productoId, cantidad) => {
        const query = `
            SELECT COALESCE(SUM(l.cantidad_actual), 0) AS stock_disponible
            FROM lotes l
            WHERE l.producto_id = ? 
            AND l.almacen_id = ? 
            AND l.cantidad_actual > 0
        `;
        const [rows] = await db.query(query, [productoId, almacenId]);
        return rows[0].stock_disponible >= cantidad;
    },

    // Obtener lotes disponibles en almacén (ordenados por vencimiento)
    obtenerLotes: async (almacenId, productoId) => {
        const query = `
            SELECT id, cantidad_actual, fecha_vencimiento
            FROM lotes
            WHERE producto_id = ? 
            AND almacen_id = ? 
            AND cantidad_actual > 0
            ORDER BY 
                CASE WHEN fecha_vencimiento IS NOT NULL THEN fecha_vencimiento ELSE '9999-12-31' END ASC,
                id ASC
        `;
        const [rows] = await db.query(query, [productoId, almacenId]);
        return rows;
    },

    // Obtener resumen por tipo
    getResumenPorTipo: async (fechaInicio = null, fechaFin = null) => {
        let query = `
            SELECT 
                tipo,
                COUNT(*) as total_salidas,
                SUM(cantidad) as total_cantidad
            FROM salidas_manuales
        `;
        let params = [];

        if (fechaInicio && fechaFin) {
            query += ` WHERE fecha_registro BETWEEN ? AND ?`;
            params.push(fechaInicio, fechaFin);
        }

        query += ` GROUP BY tipo ORDER BY total_cantidad DESC`;

        const [rows] = await db.query(query, params);
        return rows;
    },

    // Obtener salidas por período
    getByPeriodo: async (fechaInicio, fechaFin) => {
        const query = `
            SELECT 
                sm.*,
                a.nombre AS almacen_nombre,
                p.nombre AS producto_nombre,
                p.codigo AS producto_codigo,
                u.nombre AS usuario_nombre
            FROM salidas_manuales sm
            INNER JOIN almacenes a ON sm.almacen_id = a.id
            INNER JOIN productos p ON sm.producto_id = p.id
            LEFT JOIN usuarios u ON sm.usuario_id = u.id
            WHERE sm.fecha_registro BETWEEN ? AND ?
            ORDER BY sm.fecha_registro DESC
        `;
        const [rows] = await db.query(query, [fechaInicio, fechaFin]);
        return rows;
    }
};

module.exports = SalidaManual;
