const db = require('../config/db');

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
    async createEmptyOrder(id_mesa, id_usuario_mesero) {
        const [result] = await db.query(`
            INSERT INTO pedidos (id_mesa, id_usuario_mesero, estado_pedido, estado_pago)
            VALUES (?, ?, 'pendiente', 'no pagado')
        `, [id_mesa, id_usuario_mesero]);
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
     * Sincroniza y actualiza de forma atómica los platillos de una orden (Sobrescribe/Modifica)
     */
    async updateOrderItems(id_pedido, items, financialData) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // 1. Limpiar los detalles anteriores para re-escribir la comanda actualizada
            await connection.query(`DELETE FROM detalles_pedido WHERE id_pedido = ?`, [id_pedido]);

            // 2. Insertar los nuevos items
            const detailQuery = `
                INSERT INTO detalles_pedido (id_pedido, id_platillo, cantidad, precio_unitario, notas_especiales)
                VALUES (?, ?, ?, ?, ?)
            `;
            for (const item of items) {
                await connection.query(detailQuery, [
                    id_pedido,
                    item.id,
                    item.cantidad,
                    item.precio,
                    item.notas || null
                ]);
            }

            // 3. Actualizar totales financieros en la cabecera del pedido
            await connection.query(`
                UPDATE pedidos 
                SET subtotal = ?, impuesto = ?, total = ?
                WHERE id = ?
            `, [financialData.subtotal, financialData.impuesto, financialData.total, id_pedido]);

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
}

module.exports = new OrderModel();