// models/transferenciaModel.js - Sincronizado al 100% con tu esquema real de restaurante_db
const db = require('../config/db');

const Transferencia = {
    // Obtener todas las transferencias
    getAll: async () => {
        const query = `
            SELECT 
                t.*,
                ao.nombre AS almacen_origen_nombre,
                ad.nombre AS almacen_destino_nombre,
                'Sistema' AS solicitante_nombre,
                'Sistema' AS aprobador_nombre,
                p.nombre AS producto_nombre,
                p.codigo AS producto_codigo,
                td.cantidad_solicitada AS cantidad,
                td.producto_id
            FROM transferencias t
            INNER JOIN almacenes ao ON t.almacen_origen_id = ao.id
            INNER JOIN almacenes ad ON t.almacen_destino_id = ad.id
            LEFT JOIN transferencias_detalle td ON t.id = td.transferencia_id
            LEFT JOIN productos p ON td.producto_id = p.id
            ORDER BY t.created_at DESC
        `;
        const [rows] = await db.query(query);
        return rows;
    },

    // Obtener una transferencia específica por su ID
    getById: async (id) => {
        const query = `
            SELECT 
                t.*,
                ao.nombre AS almacen_origen_nombre,
                ad.nombre AS almacen_destino_nombre,
                'Sistema' AS solicitante_nombre,
                'Sistema' AS aprobador_nombre,
                p.nombre AS producto_nombre,
                p.codigo AS producto_codigo,
                td.cantidad_solicitada AS cantidad,
                td.producto_id
            FROM transferencias t
            INNER JOIN almacenes ao ON t.almacen_origen_id = ao.id
            INNER JOIN almacenes ad ON t.almacen_destino_id = ad.id
            LEFT JOIN transferencias_detalle td ON t.id = td.transferencia_id
            LEFT JOIN productos p ON td.producto_id = p.id
            WHERE t.id = ?
        `;
        const [rows] = await db.query(query, [id]);
        return rows[0];
    },

    // Crear la cabecera y el detalle utilizando transacciones atómicas
    createSolicitudAtomica: async (data) => {
        const conn = await db.getConnection();
        await conn.beginTransaction();
        try {
            const codigo = `TR-${Date.now().toString().slice(-6)}`;

            // Ajustado a las columnas exactas de tu tabla 'transferencias'
            const queryCabecera = `
                INSERT INTO transferencias 
                (codigo, almacen_origen_id, almacen_destino_id, estado, observaciones, created_at, updated_at)
                VALUES (?, ?, ?, 'PENDIENTE', ?, NOW(), NOW())
            `;
            const [resCabecera] = await conn.query(queryCabecera, [
                codigo, data.almacen_origen_id, data.almacen_destino_id, data.observaciones || null
            ]);
            const transferenciaId = resCabecera.insertId;

            const [prod] = await conn.query('SELECT unidad_medida_id FROM productos WHERE id = ?', [data.producto_id]);
            const unidadMedidaId = prod.length > 0 ? prod[0].unidad_medida_id : null;

            const queryDetalle = `
                INSERT INTO transferencias_detalle 
                (transferencia_id, producto_id, cantidad_solicitada, unidad_medida_id, created_at, updated_at)
                VALUES (?, ?, ?, ?, NOW(), NOW())
            `;
            await conn.query(queryDetalle, [transferenciaId, data.producto_id, data.cantidad, unidadMedidaId]);

            await conn.commit();
            return transferenciaId;
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    },

    // Actualizar estados sin columnas de usuario inexistentes
    updateEstado: async (id, estado, aprobadorId = null) => {
        const query = `
            UPDATE transferencias 
            SET estado = ?, updated_at = NOW()
            WHERE id = ?
        `;
        await db.query(query, [estado, id]);
    },

    // Verificar si el stock acumulado de los lotes activos cubre la cantidad solicitada
    verificarStockOrigen: async (almacenId, productoId, cantidad) => {
        const query = `
            SELECT COALESCE(SUM(cantidad_actual), 0) AS disponible
            FROM lotes
            WHERE producto_id = ? AND almacen_id = ? AND estado = 'ACTIVO' AND cantidad_actual > 0
        `;
        const [rows] = await db.query(query, [productoId, almacenId]);
        return parseFloat(rows[0].disponible) >= parseFloat(cantidad);
    }
};

module.exports = Transferencia;