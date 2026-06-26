// models/transferenciaModel.js - Modelo para gestión de transferencias entre almacenes
const db = require('../config/db');

const Transferencia = {
    // Obtener todas las transferencias
    getAll: async () => {
        const query = `
            SELECT 
                t.*,
                ao.nombre AS almacen_origen_nombre,
                ad.nombre AS almacen_destino_nombre,
                p.nombre AS producto_nombre,
                p.codigo AS producto_codigo,
                u_solicitante.nombre AS solicitante_nombre,
                u_aprobador.nombre AS aprobador_nombre
            FROM transferencias t
            INNER JOIN almacenes ao ON t.almacen_origen_id = ao.id
            INNER JOIN almacenes ad ON t.almacen_destino_id = ad.id
            INNER JOIN productos p ON t.producto_id = p.id
            LEFT JOIN usuarios u_solicitante ON t.solicitante_id = u_solicitante.id
            LEFT JOIN usuarios u_aprobador ON t.aprobador_id = u_aprobador.id
            ORDER BY t.fecha_solicitud DESC
        `;
        const [rows] = await db.query(query);
        return rows;
    },

    // Obtener transferencias por estado
    getByEstado: async (estado) => {
        const query = `
            SELECT 
                t.*,
                ao.nombre AS almacen_origen_nombre,
                ad.nombre AS almacen_destino_nombre,
                p.nombre AS producto_nombre,
                p.codigo AS producto_codigo,
                u_solicitante.nombre AS solicitante_nombre,
                u_aprobador.nombre AS aprobador_nombre
            FROM transferencias t
            INNER JOIN almacenes ao ON t.almacen_origen_id = ao.id
            INNER JOIN almacenes ad ON t.almacen_destino_id = ad.id
            INNER JOIN productos p ON t.producto_id = p.id
            LEFT JOIN usuarios u_solicitante ON t.solicitante_id = u_solicitante.id
            LEFT JOIN usuarios u_aprobador ON t.aprobador_id = u_aprobador.id
            WHERE t.estado = ?
            ORDER BY t.fecha_solicitud DESC
        `;
        const [rows] = await db.query(query, [estado]);
        return rows;
    },

    // Obtener transferencia por ID
    getById: async (id) => {
        const query = `
            SELECT 
                t.*,
                ao.nombre AS almacen_origen_nombre,
                ad.nombre AS almacen_destino_nombre,
                p.nombre AS producto_nombre,
                p.codigo AS producto_codigo,
                u_solicitante.nombre AS solicitante_nombre,
                u_aprobador.nombre AS aprobador_nombre
            FROM transferencias t
            INNER JOIN almacenes ao ON t.almacen_origen_id = ao.id
            INNER JOIN almacenes ad ON t.almacen_destino_id = ad.id
            INNER JOIN productos p ON t.producto_id = p.id
            LEFT JOIN usuarios u_solicitante ON t.solicitante_id = u_solicitante.id
            LEFT JOIN usuarios u_aprobador ON t.aprobador_id = u_aprobador.id
            WHERE t.id = ?
        `;
        const [rows] = await db.query(query, [id]);
        return rows[0];
    },

    // Crear nueva transferencia
    create: async (transferenciaData) => {
        const query = `
            INSERT INTO transferencias 
            (almacen_origen_id, almacen_destino_id, producto_id, cantidad, estado, 
             solicitante_id, motivo, notas, fecha_solicitud)
            VALUES (?, ?, ?, ?, 'pendiente', ?, ?, ?, NOW())
        `;
        const [result] = await db.query(query, [
            transferenciaData.almacen_origen_id,
            transferenciaData.almacen_destino_id,
            transferenciaData.producto_id,
            transferenciaData.cantidad,
            transferenciaData.solicitante_id,
            transferenciaData.motivo || null,
            transferenciaData.notas || null
        ]);
        return result.insertId;
    },

    // Actualizar estado de transferencia
    updateEstado: async (id, estado, aprobadorId = null) => {
        let query, params;
        
        if (estado === 'aprobada') {
            query = `
                UPDATE transferencias 
                SET estado = ?, aprobador_id = ?, fecha_aprobacion = NOW()
                WHERE id = ?
            `;
            params = [estado, aprobadorId, id];
        } else if (estado === 'completada') {
            query = `
                UPDATE transferencias 
                SET estado = ?, fecha_completado = NOW()
                WHERE id = ?
            `;
            params = [estado, id];
        } else {
            query = `
                UPDATE transferencias 
                SET estado = ?, aprobador_id = NULL, fecha_aprobacion = NULL
                WHERE id = ?
            `;
            params = [estado, id];
        }
        
        await db.query(query, params);
    },

    // Verificar stock disponible en almacén origen
    verificarStockOrigen: async (almacenId, productoId, cantidad) => {
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

    // Obtener lotes disponibles en almacén origen (ordenados por vencimiento)
    obtenerLotesOrigen: async (almacenId, productoId) => {
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

    // Obtener transferencias por almacén (origen o destino)
    getByAlmacen: async (almacenId, tipo = 'todos') => {
        let whereClause = '';
        let params = [almacenId];
        
        if (tipo === 'origen') {
            whereClause = 'WHERE t.almacen_origen_id = ?';
        } else if (tipo === 'destino') {
            whereClause = 'WHERE t.almacen_destino_id = ?';
        } else {
            whereClause = 'WHERE t.almacen_origen_id = ? OR t.almacen_destino_id = ?';
            params.push(almacenId);
        }

        const query = `
            SELECT 
                t.*,
                ao.nombre AS almacen_origen_nombre,
                ad.nombre AS almacen_destino_nombre,
                p.nombre AS producto_nombre,
                p.codigo AS producto_codigo,
                u_solicitante.nombre AS solicitante_nombre,
                u_aprobador.nombre AS aprobador_nombre
            FROM transferencias t
            INNER JOIN almacenes ao ON t.almacen_origen_id = ao.id
            INNER JOIN almacenes ad ON t.almacen_destino_id = ad.id
            INNER JOIN productos p ON t.producto_id = p.id
            LEFT JOIN usuarios u_solicitante ON t.solicitante_id = u_solicitante.id
            LEFT JOIN usuarios u_aprobador ON t.aprobador_id = u_aprobador.id
            ${whereClause}
            ORDER BY t.fecha_solicitud DESC
        `;
        const [rows] = await db.query(query, params);
        return rows;
    }
};

module.exports = Transferencia;
