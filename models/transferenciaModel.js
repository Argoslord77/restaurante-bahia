// models/transferenciaModel.js - Sincronizado al 100% con tu esquema real de restaurante_db
const db = require('../config/db');

const Transferencia = {
    // Obtener todas las transferencias
    getAll: async () => {
        const query = `
            SELECT 
                t.*,
                t.numero_transferencia AS codigo,
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
                t.numero_transferencia AS codigo,
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

    // models/transferenciaModel.js (Sección createSolicitudAtomica)
    createSolicitudAtomica: async (data) => {
        const conn = await db.getConnection();
        await conn.beginTransaction();
        try {
            // FIX: 'numero_transferencia' es NOT NULL + UNIQUE en la BD. Se inserta un
            // valor temporal único (basado en timestamp) para no violar la restricción,
            // y luego se reemplaza por un código legible basado en el ID real generado.
            const numeroTemporal = `TRF-TMP-${Date.now()}`;

            const queryTrans = `
                INSERT INTO transferencias 
                (numero_transferencia, almacen_origen_id, almacen_destino_id, solicitado_por, observaciones, estado, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, 'PENDIENTE', NOW(), NOW())
            `;
            
            const [resultTrans] = await conn.query(queryTrans, [
                numeroTemporal,
                data.almacen_origen_id,
                data.almacen_destino_id,
                data.solicitado_por,      // <-- ID numérico del usuario (ej: 3)
                data.observaciones || null
            ]);

            const transferenciaId = resultTrans.insertId;

            // Código final legible y único, basado en el ID autoincremental real
            const numeroTransferencia = `TRF-${String(transferenciaId).padStart(6, '0')}`;
            await conn.query(
                "UPDATE transferencias SET numero_transferencia = ? WHERE id = ?",
                [numeroTransferencia, transferenciaId]
            );

            // Insertar el detalle de productos: ahora soporta múltiples líneas por solicitud,
            // cada una con su propia unidad de medida seleccionada en el formulario
            const detalles = Array.isArray(data.detalles) ? data.detalles : [];
            if (detalles.length === 0) {
                throw new Error('La transferencia debe contener al menos un producto.');
            }

            const queryDetalle = `
                INSERT INTO transferencias_detalle 
                (transferencia_id, producto_id, cantidad_solicitada, unidad_medida_id) 
                VALUES ?
            `;
            const valoresDetalle = detalles.map(d => [
                transferenciaId,
                d.producto_id,
                d.cantidad,
                d.unidad_medida_id
            ]);
            await conn.query(queryDetalle, [valoresDetalle]);

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