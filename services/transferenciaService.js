// services/transferenciaService.js
const db = require('../config/db');
const UnidadMedidaService = require('./unidadMedidaService');

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

                // La cantidad solicitada puede venir en una unidad distinta a
                // la canónica. Una transferencia no puede continuar usando una
                // cifra sin convertir: se exige entrada registrada y factor.
                const [productoRows] = await conn.query(`
                    SELECT p.unidad_inventario_id
                    FROM productos p
                    WHERE p.id = ? AND p.activo = 1
                    LIMIT 1
                `, [detalle.producto_id]);
                if (!productoRows.length) throw new Error('El producto de la transferencia no existe o está inactivo.');

                const unidadInventarioId = productoRows[0].unidad_inventario_id;
                const convInfo = await UnidadMedidaService.validarProductoParaConversion(
                    detalle.producto_id,
                    detalle.unidad_medida_id,
                    unidadInventarioId
                );
                cantidadPendiente *= convInfo.factor;

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
                    const stockAnteriorOrigen = parseFloat(lote.cantidad_actual);
                    const stockNuevoOrigen = stockAnteriorOrigen - cantidadADescontar;
                    const costoUnitarioT = parseFloat(lote.costo_unitario || 0);
                    const documentoTrf = `TRF-${String(id_transferencia).padStart(6, '0')}`;

                    await conn.query(
                        "UPDATE lotes SET cantidad_actual = cantidad_actual - ? WHERE id = ?",
                        [cantidadADescontar, lote.id]
                    );

                    // Kardex: salida del almacén origen
                    await conn.query(
                        `INSERT INTO movimientos_inventario
                         (producto_id, almacen_id, lote_id, tipo_movimiento, referencia_tipo, referencia_id,
                          cantidad, costo_unitario, costo_total, stock_anterior, stock_nuevo,
                          usuario_id, documento_numero, observaciones)
                         VALUES (?, ?, ?, 'TRANSFERENCIA_SALIDA', 'transferencia', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [detalle.producto_id, transferencia.almacen_origen_id, lote.id, id_transferencia,
                         cantidadADescontar, costoUnitarioT, costoUnitarioT * cantidadADescontar,
                         stockAnteriorOrigen, stockNuevoOrigen, usuario_id, documentoTrf,
                         `Transferencia ${documentoTrf} hacia almacén destino`]
                    );

                    // Raíz del lote (sin sufijos -TRn de transferencias previas) para que
                    // los retornos acumulen SIEMPRE en la fila base del almacén destino y
                    // no se formen cadenas "…-TR2-TR1-TR2".
                    const raizLote = lote.numero_lote.replace(/(-TR\d+)+$/, '');
                    const numeroDestino = `${raizLote}-TR${transferencia.almacen_destino_id}`;

                    const [lotesDestino] = await conn.query(
                        `SELECT id, numero_lote, cantidad_actual FROM lotes
                         WHERE almacen_id = ? AND producto_id = ? AND numero_lote IN (?, ?)`,
                        [transferencia.almacen_destino_id, detalle.producto_id, raizLote, numeroDestino]
                    );

                    // Se prefiere la fila con el número base (p. ej. si el lote "volvió" a
                    // este almacén); si no, la derivada (transferencias anteriores al destino).
                    const filaDestino =
                        lotesDestino.find(f => f.numero_lote === raizLote) ||
                        lotesDestino.find(f => f.numero_lote === numeroDestino);

                    if (filaDestino) {
                        await conn.query(
                            "UPDATE lotes SET cantidad_actual = cantidad_actual + ? WHERE id = ?",
                            [cantidadADescontar, filaDestino.id]
                        );
                        await conn.query(
                            `INSERT INTO movimientos_inventario
                             (producto_id, almacen_id, lote_id, tipo_movimiento, referencia_tipo, referencia_id,
                              cantidad, costo_unitario, costo_total, stock_anterior, stock_nuevo,
                              usuario_id, documento_numero, observaciones)
                             VALUES (?, ?, ?, 'TRANSFERENCIA_ENTRADA', 'transferencia', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            [detalle.producto_id, transferencia.almacen_destino_id, filaDestino.id, id_transferencia,
                             cantidadADescontar, costoUnitarioT, costoUnitarioT * cantidadADescontar,
                             parseFloat(filaDestino.cantidad_actual), parseFloat(filaDestino.cantidad_actual) + cantidadADescontar,
                             usuario_id, documentoTrf, `Transferencia ${documentoTrf} desde almacén origen`]
                        );
                    } else {
                        // ¿Existe ya el número base en OTRO almacén? Si es así, insertar con
                        // el número derivado para no violar uk_lote_producto (bug anterior:
                        // "Duplicate entry '<producto>-<LOTE>' for key 'uk_lote_producto'").
                        const [baseOcupado] = await conn.query(
                            "SELECT id FROM lotes WHERE producto_id = ? AND numero_lote = ? LIMIT 1",
                            [detalle.producto_id, raizLote]
                        );
                        const numeroParaInsertar = baseOcupado.length > 0 ? numeroDestino : raizLote;

                        const [insDestino] = await conn.query(
                            `INSERT INTO lotes (
                                producto_id, almacen_id, numero_lote, fecha_ingreso, fecha_vencimiento,
                                cantidad_inicial, cantidad_actual, costo_unitario, unidad_medida_id,
                                cantidad_ingresada, estado, created_at
                             ) VALUES (?, ?, ?, CURDATE(), ?, ?, ?, ?, ?, ?, 'ACTIVO', NOW())`,
                            [
                                detalle.producto_id,
                                transferencia.almacen_destino_id,
                                numeroParaInsertar,
                                lote.fecha_vencimiento,
                                cantidadADescontar,
                                cantidadADescontar,
                                lote.costo_unitario,
                                unidadInventarioId,
                                cantidadADescontar
                            ]
                        );

                        // Kardex: entrada en el almacén destino (lote nuevo, stock 0 → cantidad)
                        await conn.query(
                            `INSERT INTO movimientos_inventario
                             (producto_id, almacen_id, lote_id, tipo_movimiento, referencia_tipo, referencia_id,
                              cantidad, costo_unitario, costo_total, stock_anterior, stock_nuevo,
                              usuario_id, documento_numero, observaciones)
                             VALUES (?, ?, ?, 'TRANSFERENCIA_ENTRADA', 'transferencia', ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
                            [detalle.producto_id, transferencia.almacen_destino_id, insDestino.insertId, id_transferencia,
                             cantidadADescontar, costoUnitarioT, costoUnitarioT * cantidadADescontar,
                             cantidadADescontar, usuario_id, documentoTrf,
                             `Transferencia ${documentoTrf} desde almacén origen`]
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