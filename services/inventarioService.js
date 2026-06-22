const db = require('../config/db'); // Tu conexión/pool de MySQL (usando promesas)

class InventarioService {
    /**
     * Registra de forma atómica cualquier movimiento de inventario,
     * actualizando stocks generales y por lotes según el tipo.
     */
    static async registrarMovimiento({
        producto_id,
        almacen_id,
        lote_id = null,
        tipo_movimiento,
        referencia_tipo = null,
        referencia_id = null,
        cantidad, // Siempre positiva en la entrada del método
        costo_unitario = 0,
        observaciones = null,
        usuario_id,
        documento_numero,
        connection = null
    }) {
        // Permitir usar una conexión existente (para transacciones complejas) o crear una nueva
        const conn = connection || await db.getConnection();
        if (!connection) await conn.beginTransaction();

        try {
            // 1. Determinar el impacto en el stock según el tipo de movimiento
            const movimientosSuma = [
                'COMPRA', 'RECEPCION', 'TRANSFERENCIA_ENTRADA', 
                'PRODUCCION_ENTRADA', 'AJUSTE_POSITIVO', 'DEVOLUCION_CLIENTE'
            ];
            const movimientosResta = [
                'TRANSFERENCIA_SALIDA', 'VENTA', 'CONSUMO_RECETA', 
                'PRODUCCION_SALIDA', 'MERMA', 'AJUSTE_NEGATIVO', 'DEVOLUCION_PROVEEDOR'
            ];

            let factor = 0;
            if (movimientosSuma.includes(tipo_movimiento)) factor = 1;
            else if (movimientosResta.includes(tipo_movimiento)) factor = -1;
            else throw new Error(`Tipo de movimiento no parametrizado: ${tipo_movimiento}`);

            const cantidadImpacto = cantidad * factor;
            const costo_total = cantidad * costo_unitario;

            // 2. Obtener y actualizar Stock General (`inventario`) utilizando Bloqueo de Fila (FOR UPDATE)
            const [invRows] = await conn.query(
                `SELECT stock_actual FROM inventario WHERE producto_id = ? AND almacen_id = ? FOR UPDATE`,
                [producto_id, almacen_id]
            );

            let stock_anterior = 0;
            if (invRows.length > 0) {
                stock_anterior = parseFloat(invRows[0].stock_actual);
                await conn.query(
                    `UPDATE inventario 
                     SET stock_actual = stock_actual + ?, ultimo_movimiento = NOW(), version_row = version_row + 1 
                     WHERE producto_id = ? AND almacen_id = ?`,
                    [cantidadImpacto, producto_id, almacen_id]
                );
            } else {
                // Si no existe el registro de inventario para ese almacén, se crea uno nuevo
                if (factor === -1) throw new Error('No hay stock inicial disponible para realizar una salida.');
                await conn.query(
                    `INSERT INTO inventario (producto_id, almacen_id, stock_actual, stock_reservado, ultimo_movimiento) 
                     VALUES (?, ?, ?, 0, NOW())`,
                    [producto_id, almacen_id, cantidadImpacto]
                );
            }
            const stock_nuevo = stock_anterior + cantidadImpacto;

            if (stock_nuevo < 0) {
                throw new Error(`Operación inválida: El stock resultante quedaría en negativo (${stock_nuevo})`);
            }

            // 3. Gestionar stocks específicos por Lote (`inventario_lotes` y `lotes`) si se provee uno
            if (lote_id) {
                // Verificar/Actualizar la tabla puente `inventario_lotes`
                const [loteInvRows] = await conn.query(
                    `SELECT stock_actual FROM inventario_lotes WHERE producto_id = ? AND almacen_id = ? AND lote_id = ? FOR UPDATE`,
                    [producto_id, almacen_id, lote_id]
                );

                if (loteInvRows.length > 0) {
                    await conn.query(
                        `UPDATE inventario_lotes SET stock_actual = stock_actual + ? 
                         WHERE producto_id = ? AND almacen_id = ? AND lote_id = ?`,
                        [cantidadImpacto, producto_id, almacen_id, lote_id]
                    );
                } else {
                    if (factor === -1) throw new Error('No existe stock del lote especificado en este almacén.');
                    await conn.query(
                        `INSERT INTO inventario_lotes (producto_id, almacen_id, lote_id, stock_actual, costo_unitario) 
                         VALUES (?, ?, ?, ?, ?)`,
                        [producto_id, almacen_id, lote_id, cantidadImpacto, costo_unitario]
                    );
                }

                // Actualizar la tabla maestra de `lotes` (cantidad_actual)
                await conn.query(
                    `UPDATE lotes SET cantidad_actual = cantidad_actual + ? WHERE id = ?`,
                    [cantidadImpacto, lote_id]
                );
            }

            // 4. Registrar la traza histórica en `movimientos_inventario`
            const [movResult] = await conn.query(
                `INSERT INTO movimientos_inventario 
                (fecha_movimiento, producto_id, almacen_id, lote_id, tipo_movimiento, referencia_tipo, referencia_id, cantidad, costo_unitario, costo_total, stock_anterior, stock_nuevo, observaciones, usuario_id, documento_numero) 
                VALUES (NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [producto_id, almacen_id, lote_id, tipo_movimiento, referencia_tipo, referencia_id, cantidad, costo_unitario, costo_total, stock_anterior, stock_nuevo, observaciones, usuario_id, documento_numero]
            );

            if (!connection) await conn.commit();
            return { success: true, movimiento_id: movResult.insertId, stock_nuevo };

        } catch (error) {
            if (!connection) await conn.rollback();
            throw error;
        } finally {
            if (!connection) conn.release();
        }
    }
}

module.exports = InventarioService;