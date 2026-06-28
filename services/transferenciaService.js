// services/transferenciaService.js
const db = require('../config/db');

class TransferenciaService {
    static async transferirProducto({ id_transferencia, usuario_id }) {
        const conn = await db.getConnection();
        await conn.beginTransaction();

        try {
            const [transRows] = await conn.query("SELECT * FROM transferencias WHERE id = ?", [id_transferencia]);
            if (!transRows.length) throw new Error("La transferencia especificada no existe.");
            
            const transferencia = transRows[0];
            if (transferencia.estado !== 'APROBADA') {
                throw new Error("Solo se pueden procesar transferencias en estado 'APROBADA'.");
            }

            const [detalles] = await conn.query("SELECT * FROM transferencias_detalle WHERE transferencia_id = ?", [id_transferencia]);
            if (!detalles.length) throw new Error("La transferencia no contiene productos en su detalle.");

            for (const detalle of detalles) {
                // Cambiado aquí para usar el campo correcto mapeado de la BD
                let cantidadPendiente = parseFloat(detalle.cantidad_solicitada);
                const cantidadTotalInicial = cantidadPendiente;

                const [lotesOrigen] = await conn.query(
                    `SELECT id, numero_lote, cantidad_actual, costo_unitario, fecha_vencimiento 
                     FROM lotes 
                     WHERE producto_id = ? AND almacen_id = ? AND cantidad_actual > 0 AND estado = 'ACTIVO'
                     ORDER BY CASE WHEN fecha_vencimiento IS NULL THEN 1 ELSE 0 END, fecha_vencimiento ASC, id ASC`,
                    [detalle.producto_id, transferencia.almacen_origen_id]
                );

                const stockDisponibleTotal = lotesOrigen.reduce((acc, l) => acc + parseFloat(l.cantidad_actual), 0);
                if (stockDisponibleTotal < cantidadPendiente) {
                    throw new Error(`Stock insuficiente en origen para el producto ID: ${detalle.producto_id}.`);
                }

                for (const lote of lotesOrigen) {
                    if (cantidadPendiente <= 0) break;

                    let cantidadADescontar = Math.min(parseFloat(lote.cantidad_actual), cantidadPendiente);

                    await conn.query(
                        "UPDATE lotes SET cantidad_actual = cantidad_actual - ? WHERE id = ?",
                        [cantidadADescontar, lote.id]
                    );

                    const [loteDestino] = await conn.query(
                        "SELECT id FROM lotes WHERE almacen_id = ? AND producto_id = ? AND numero_lote = ? LIMIT 1",
                        [transferencia.almacen_destino_id, detalle.producto_id, lote.numero_lote]
                    );

                    if (loteDestino.length > 0) {
                        await conn.query(
                            "UPDATE lotes SET cantidad_actual = cantidad_actual + ? WHERE id = ?",
                            [cantidadADescontar, loteDestino[0].id]
                        );
                    } else {
                        await conn.query(
                            `INSERT INTO lotes (producto_id, almacen_id, numero_lote, fecha_ingreso, fecha_vencimiento, cantidad_inicial, cantidad_actual, costo_unitario, estado, created_at) 
                             VALUES (?, ?, ?, CURDATE(), ?, ?, ?, ?, 'ACTIVO', NOW())`,
                            [detalle.producto_id, transferencia.almacen_destino_id, lote.numero_lote, lote.fecha_vencimiento, cantidadADescontar, cantidadADescontar, lote.costo_unitario]
                        );
                    }

                    cantidadPendiente -= cantidadADescontar;
                }

                // Sincronizamos las columnas de auditoría física del detalle
                await conn.query(
                    `UPDATE transferencias_detalle 
                     SET cantidad_enviada = ?, cantidad_recibida = ?, updated_at = NOW() 
                     WHERE id = ?`,
                    [cantidadTotalInicial, cantidadTotalInicial, detalle.id]
                );
            }

            await conn.query(
                "UPDATE transferencias SET estado = 'COMPLETADA', updated_at = NOW() WHERE id = ?",
                [id_transferencia]
            );

            await conn.commit();
            return { success: true, message: "Transferencia interna procesada e inventario actualizado." };

        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    }
}

module.exports = TransferenciaService;