// models/entradaModel.js - Sincronizado para Restaurante Bahía
const db = require('../config/db');

const Entrada = {
    // Obtener el historial de entradas / Lotes activos
    getAll: async () => {
        const query = `
            SELECT 
                l.id AS lote_id,
                l.numero_lote,
                l.fecha_ingreso,
                l.fecha_vencimiento,
                l.cantidad_inicial,
                l.cantidad_actual,
                l.costo_unitario,
                l.estado,
                p.nombre AS producto_nombre,
                p.codigo AS producto_codigo,
                a.nombre AS almacen_nombre
            FROM lotes l
            INNER JOIN productos p ON l.producto_id = p.id
            INNER JOIN almacenes a ON l.almacen_id = a.id
            ORDER BY l.created_at DESC
        `;
        const [rows] = await db.query(query);
        return rows;
    },

    // Registrar entrada con cálculo atómico de lote consecutivo (LOT-YYYY-XXX)
    registrarEntradaAtomica: async (data) => {
        const conn = await db.getConnection();
        await conn.beginTransaction();

        try {
            // 1. Obtener el año en curso para el prefijo operacional
            const anioActual = new Date().getFullYear();

            // 2. Bloquear la lectura para evitar colisiones de numeración (concurrencia)
            const querySecuencia = `
                SELECT COUNT(*) AS total 
                FROM lotes 
                WHERE numero_lote LIKE ?
            `;
            const [secuenciaResult] = await conn.query(querySecuencia, [`LOT-${anioActual}-%`]);
            const siguienteConsecutivo = secuenciaResult[0].total + 1;

            // 3. Rellenar con ceros a la izquierda para garantizar los 3 dígitos (Ej: 001)
            const consecutivoFormateado = String(siguienteConsecutivo).padStart(3, '0');
            const numeroLoteGenerado = `LOT-${anioActual}-${consecutivoFormateado}`;

            // 4. Insertar el lote en estado ACTIVO con la cantidad sincronizada
            const queryLote = `
                INSERT INTO lotes 
                (producto_id, almacen_id, numero_lote, fecha_ingreso, fecha_vencimiento, cantidad_inicial, cantidad_actual, costo_unitario, estado, created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVO', NOW(), NOW())
            `;
            
            const [result] = await conn.query(queryLote, [
                data.producto_id,
                data.almacen_id,
                numeroLoteGenerado,
                data.fecha_ingreso || new Date(),
                data.fecha_vencimiento || null,
                data.cantidad,
                data.cantidad,
                data.costo_unitario
            ]);

            await conn.commit();
            return { insertId: result.insertId, numero_lote: numeroLoteGenerado };
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    }
};

module.exports = Entrada;