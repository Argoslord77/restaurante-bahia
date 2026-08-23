// services/inventarioService.js - Gestión de deducciones FIFO para Restaurante Bahía
const db = require('../config/db');

const InventarioService = {
    /**
     * Descuenta del inventario los insumos correspondientes a un producto vendido explotando su receta
     * @param {number} productoVendidoId - ID del plato/bebida vendido (producto_resultante_id en la tabla recetas)
     * @param {number} cantidadVendida - Cuántas unidades de ese plato se vendieron en la comanda/factura
     * @param {number} almacenDefaultId - Almacén por defecto de donde se extraerán los insumos si no hay mapeo específico
     * @param {connection} [externalConn] - Conexión externa opcional si forma parte de otra transacción global
     */
    descontarPorReceta: async (productoVendidoId, cantidadVendida, almacenDefaultId, externalConn = null) => {
        // Usar la conexión externa (si viene de un flujo de ventas mayor) o solicitar una nueva del pool
        const conn = externalConn || await db.getConnection();
        
        // Si no es una conexión externa, iniciamos la transacción de forma aislada
        if (!externalConn) await conn.beginTransaction();

        try {
            // 1. Obtener la explosión de ingredientes a partir de la receta ACTIVA del producto resultante
            const queryReceta = `
                SELECT 
                    rd.producto_id AS insumo_id, 
                    rd.cantidad AS cantidad_receta,
                    rd.porcentaje_merma,
                    rd.unidad_medida
                FROM receta_detalles rd
                INNER JOIN recetas r ON rd.receta_id = r.id
                WHERE r.producto_resultante_id = ? AND r.activa = 1
            `;
            const [ingredientes] = await conn.query(queryReceta, [productoVendidoId]);

            // Si el producto no tiene receta activa asignada, omitimos el descuento (ej. productos directos de reventa)
            if (ingredientes.length === 0) {
                if (!externalConn) await conn.commit();
                return { success: true, message: "El producto no requiere receta para deducción automática." };
            }

            // 2. Iterar por cada insumo que compone la receta del plato
            for (const ingrediente of ingredientes) {
                const insumoId = ingrediente.insumo_id;
                const cantidadReceta = parseFloat(ingrediente.cantidad);
                const merma = parseFloat(ingrediente.porcentaje_merma || 0);

                // Calcular el factor de merma para descontar la cantidad bruta real del almacén
                // Fórmula: Cantidad Neta / (1 - % Merma)
                let cantidadUnitariaBruta = cantidadReceta;
                if (merma > 0) {
                    cantidadUnitariaBruta = cantidadReceta / (1 - (merma / 100));
                }

                // Cantidad total requerida para toda la venta de este insumo
                let cantidadNecesaria = cantidadUnitariaBruta * cantidadVendida;

                // 3. Buscar los lotes ACTIVOS de este insumo, ordenados por FIFO (más antiguo primero)
                // Bloqueamos las filas con FOR UPDATE para evitar condiciones de carrera concurrentes
                const queryLotesFIFO = `
                    SELECT id, cantidad_actual, numero_lote, costo_unitario
                    FROM lotes
                    WHERE producto_id = ? AND almacen_id = ? AND estado = 'ACTIVO' AND cantidad_actual > 0
                    ORDER BY fecha_ingreso ASC, id ASC
                    FOR UPDATE
                `;
                const [lotes] = await conn.query(queryLotesFIFO, [insumoId, almacenDefaultId]);

                // 4. Consumir los lotes de forma secuencial
                for (const lote of lotes) {
                    if (cantidadNecesaria <= 0) break; // Si ya cubrimos la necesidad, pasamos al siguiente ingrediente

                    const disponibleEnLote = parseFloat(lote.cantidad_actual);
                    let cantidadADescuentar = 0;
                    let nuevoEstadoLote = 'ACTIVO';

                    if (disponibleEnLote <= cantidadNecesaria) {
                        // El lote no alcanza o cubre exactamente: se agota por completo
                        cantidadADescuentar = disponibleEnLote;
                        cantidadNecesaria -= disponibleEnLote;
                        nuevoEstadoLote = 'AGOTADO';
                    } else {
                        // El lote tiene suficiente para cubrir todo el remanente
                        cantidadADescuentar = cantidadNecesaria;
                        cantidadNecesaria = 0;
                    }

                    // 5. Actualizar de forma atómica el lote afectado
                    const queryUpdateLote = `
                        UPDATE lotes 
                        SET 
                            cantidad_actual = cantidad_actual - ?, 
                            estado = ?,
                            updated_at = NOW()
                        WHERE id = ?
                    `;
                    await conn.query(queryUpdateLote, [cantidadADescuentar, nuevoEstadoLote, lote.id]);

                    // 6. Registrar el movimiento de salida para auditoría interna e historial de kardex
                    const queryHistorial = `
                        INSERT INTO movimientos_inventario 
                        (producto_id, almacen_id, lote_id, tipo_movimiento, cantidad, motivo, created_at)
                        VALUES (?, ?, ?, 'SALIDA', ?, 'DEDUCCIÓN AUTOMÁTICA POR RECETA / VENTA', NOW())
                    `;
                    await conn.query(queryHistorial, [insumoId, almacenDefaultId, lote.id, cantidadADescuentar]);
                }

                // 7. Salvaguarda de consistencia estricta para el Restaurante Bahía
                if (cantidadNecesaria > 0) {
                    throw new Error(`Stock insuficiente para el insumo ID ${insumoId}. Faltan ${cantidadNecesaria.toFixed(3)} unidades para procesar la comanda.`);
                }
            }

            // Si la transacción se gestionó localmente dentro del servicio, hacemos el commit definitivo
            if (!externalConn) {
                await conn.commit();
            }
            
            return { success: true, message: "Inventario reducido con éxito siguiendo la estrategia FIFO." };

        } catch (error) {
            // Si algo falla, deshacemos cualquier cambio parcial para mantener el almacén intacto
            if (!externalConn) {
                await conn.rollback();
            }
            throw error;
        } finally {
            // Liberar la conexión al pool de base de datos si se solicitó localmente
            if (!externalConn) {
                conn.release();
            }
        }
    }
};

module.exports = InventarioService;