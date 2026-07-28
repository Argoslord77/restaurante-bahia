const db = require('../config/db');
const STATUS = require('../config/orderStatus');

class OrderModel {
    /**
     * Obtiene el pedido activo 'pendiente' o 'preparando' de una mesa
     * @param {Number} id_mesa 
     */
    async getActiveOrderByMesa(id_mesa) {
        const [rows] = await db.query(`
            SELECT id, id_mesa, cliente_nombre, comensales, estado_pedido, estado_pago, subtotal, total, id_usuario_mesero
            FROM pedidos
            WHERE id_mesa = ? AND estado_pedido IN ('pendiente', 'preparando', 'listo')
            LIMIT 1
        `, [id_mesa]);
        return rows[0] || null;
    }

    /**
     * Crea un pedido inicial vacío asignado a una mesa
     */
    async createEmptyOrder(id_mesa, id_usuario_mesero, turno_servicio_id) {
        const [result] = await db.query(`
            INSERT INTO pedidos (id_mesa, id_usuario_mesero, turno_servicio_id, estado_pedido, estado_pago)
            VALUES (?, ?, ?, 'pendiente', 'pendiente')
        `, [id_mesa, id_usuario_mesero, turno_servicio_id]);
        return result.insertId;
    }

    /**
     * Busca una mesa por su hash de auto_activación
     */
    async getMesaByHash(hash) {
        const [rows] = await db.query(`
            SELECT m.* FROM mesas m
            INNER JOIN auto_creacion_orden aco ON m.auto_hash = aco.auto_hash
            WHERE aco.auto_hash = ?
            LIMIT 1
        `, [hash]);
        return rows[0] || null;
    }

    /**
     * Obtiene los detalles/renglones actuales de un pedido
     */
    async getOrderDetails(id_pedido) {
        const [rows] = await db.query(`
            SELECT dp.*, pm.nombre, pm.precio 
            FROM detalles_pedido dp
            INNER JOIN platillos_menu pm ON dp.id_platillo = pm.id
            WHERE dp.id_pedido = ?
        `, [id_pedido]);
        return rows;
    }

    /**
     * Agrega una nueva ronda de platillos al pedido sin borrar el histórico previo
     * Y REACTIVA la comanda a 'pendiente' para que reaparezca en los monitores de producción.
     */
    async appendOrderItems(id_pedido, items) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const insertedItems = [];

            // 1. Inserción de cada ítem de la ronda actual
            const insertQuery = `
                INSERT INTO detalles_pedido (id_pedido, id_platillo, cantidad, precio_unitario, notas_especiales, estado_item)
                VALUES (?, ?, ?, ?, ?, ?)
            `;

            for (const item of items) {
                const [res] = await connection.query(insertQuery, [
                    id_pedido,
                    item.id,
                    item.cantidad,
                    item.precio,
                    item.notas || null,
                    item.estado_preparacion || 'en_cocina'
                ]);

                insertedItems.push({
                    id_detalle: res.insertId,
                    id_platillo: item.id,
                    nombre: item.nombre,
                    precio: item.precio,
                    cantidad: item.cantidad,
                    estado: item.estado_preparacion || 'en_cocina',
                    notas: item.notas || ''
                });
            }

            // 2. Recalcular el subtotal total del pedido (histórico + nueva ronda)
            const [sumRows] = await connection.query(`
                SELECT SUM(cantidad * precio_unitario) AS subtotal_acumulado
                FROM detalles_pedido
                WHERE id_pedido = ?
            `, [id_pedido]);

            const subtotal = parseFloat(sumRows[0].subtotal_acumulado || 0);
            const impuesto = subtotal * 0.10;
            const total = subtotal + impuesto;

            // 3. ACTUALIZACIÓN CLAVE: 
            // Forzar estado_pedido = 'pendiente' (STATUS.PEDIDO.PENDIENTE)
            // para reactivar la comanda en los monitores de cocina y bar
            await connection.query(`
                UPDATE pedidos 
                SET subtotal = ?, 
                    impuesto = ?, 
                    total = ?, 
                    estado_pedido = ? 
                WHERE id = ?
            `, [subtotal, impuesto, total, STATUS.PEDIDO.PENDIENTE || 'pendiente', id_pedido]);

            await connection.commit();

            return {
                financialData: { subtotal, impuesto, total },
                insertedItems
            };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Obtiene los detalles de un pedido que están en estado 'listo'
     */
    async getItemsListosByPedido(id_pedido) {
        const query = `
            SELECT 
                dp.id AS id_detalle,
                dp.id_pedido,
                dp.id_platillo,
                p.nombre AS nombre_platillo,
                dp.cantidad,
                dp.estado_item AS estado
            FROM detalles_pedido dp
            JOIN platillos_menu p ON dp.id_platillo = p.id
            WHERE dp.id_pedido = ? AND dp.estado_item = 'listo'
        `;
        const [rows] = await db.query(query, [id_pedido]);
        return rows;
    }

    /**
     * Actualiza el estado de un renglón/detalle específico de una comanda.
     * @param {number|string} idDetalle - ID del renglón en la tabla `detalle_pedidos`.
     * @param {string} nuevoEstado - Nuevo estado ('pendiente', 'en_preparacion', 'listo', 'entregado', 'cancelado').
     * @returns {Promise<boolean>} Retorna true si la actualización afectó al menos una fila.
     */
    async updateItemStatus(idDetalle, nuevoEstado) {
      const query = `
        UPDATE detalles_pedido 
        SET estado_item = ? 
        WHERE id = ?
      `;

      try {
        const [result] = await db.execute(query, [nuevoEstado, idDetalle]);
        return result.affectedRows > 0;
      } catch (error) {
        console.error('Error en orderModel.updateItemStatus:', error);
        throw error;
      }
    }
}

module.exports = new OrderModel();