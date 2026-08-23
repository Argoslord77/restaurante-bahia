// models/orderModel.js
const db = require('../config/db');
const STATUS = require('../config/orderStatus');

class OrderModel {
    async getActiveOrderByMesa(id_mesa) {
        const [rows] = await db.query(`
            SELECT id, id_mesa, cliente_nombre, comensales, estado_pedido, estado_pago, subtotal, total, id_usuario_mesero
            FROM pedidos
            WHERE id_mesa = ? AND estado_pedido IN ('pendiente', 'preparando', 'listo')
            LIMIT 1
        `, [id_mesa]);
        return rows[0] || null;
    }

    async createEmptyOrder(id_mesa, id_usuario_mesero, turno_servicio_id) {
        const [result] = await db.query(`
            INSERT INTO pedidos (id_mesa, id_usuario_mesero, turno_servicio_id, estado_pedido, estado_pago)
            VALUES (?, ?, ?, 'pendiente', 'pendiente')
        `, [id_mesa, id_usuario_mesero, turno_servicio_id]);
        return result.insertId;
    }

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
     * Obtiene los detalles/renglones actuales de un pedido (Distingue platillos_menu vs platillos_dia)
     */
    async getOrderDetails(id_pedido) {
        const [rows] = await db.query(`
            SELECT 
                dp.id AS id_detalle,
                dp.id_pedido,
                dp.id_platillo,
                dp.es_platillo_dia,
                dp.cantidad,
                dp.precio_unitario AS precio,
                dp.notas_especiales AS notas,
                dp.estado_item AS estado,
                CASE 
                    WHEN dp.es_platillo_dia = 1 THEN COALESCE(pd.nombre, pm.nombre, 'Platillo del Día')
                    ELSE COALESCE(pm.nombre, pd.nombre, 'Producto')
                END AS nombre
            FROM detalles_pedido dp
            LEFT JOIN platillos_menu pm ON dp.id_platillo = pm.id AND dp.es_platillo_dia = 0
            LEFT JOIN platillos_dia pd ON dp.id_platillo = pd.id AND dp.es_platillo_dia = 1
            WHERE dp.id_pedido = ?
            ORDER BY dp.id ASC
        `, [id_pedido]);
        return rows;
    }

    /**
     * Inserta la ronda actual y actualiza el pedido a 'pendiente' para monitores de cocina/bar
     */
    async appendOrderItems(id_pedido, items) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            const insertedItems = [];

            const insertQuery = `
                INSERT INTO detalles_pedido (
                    id_pedido, id_platillo, es_platillo_dia, cantidad, precio_unitario, notas_especiales, estado_item
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `;

            for (const item of items) {
                const esDia = (item.es_platillo_dia === true || item.es_platillo_dia === 1 || item.es_platillo_dia === '1') ? 1 : 0;
                
                const [res] = await connection.query(insertQuery, [
                    id_pedido,
                    item.id,
                    esDia,
                    item.cantidad,
                    item.precio,
                    item.notas || null,
                    item.estado_preparacion || 'en_cocina'
                ]);

                insertedItems.push({
                    id_detalle: res.insertId,
                    id_platillo: item.id,
                    es_platillo_dia: esDia,
                    nombre: item.nombre,
                    precio: item.precio,
                    cantidad: item.cantidad,
                    estado: item.estado_preparacion || 'en_cocina',
                    notas: item.notas || ''
                });
            }

            const [sumRows] = await connection.query(`
                SELECT SUM(cantidad * precio_unitario) AS subtotal_acumulado
                FROM detalles_pedido
                WHERE id_pedido = ? AND estado_item != 'cancelado'
            `, [id_pedido]);

            const subtotal = parseFloat(sumRows[0].subtotal_acumulado || 0);
            const impuesto = subtotal * 0.10;
            const total = subtotal + impuesto;

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

    async getItemsListosByPedido(id_pedido) {
        const query = `
            SELECT 
                dp.id AS id_detalle,
                dp.id_pedido,
                dp.id_platillo,
                dp.es_platillo_dia,
                CASE 
                    WHEN dp.es_platillo_dia = 1 THEN COALESCE(pd.nombre, p.nombre, 'Platillo del Día')
                    ELSE COALESCE(p.nombre, pd.nombre, 'Producto')
                END AS nombre_platillo,
                dp.cantidad,
                dp.estado_item AS estado
            FROM detalles_pedido dp
            LEFT JOIN platillos_menu p ON dp.id_platillo = p.id AND dp.es_platillo_dia = 0
            LEFT JOIN platillos_dia pd ON dp.id_platillo = pd.id AND dp.es_platillo_dia = 1
            WHERE dp.id_pedido = ? AND dp.estado_item = 'listo'
        `;
        const [rows] = await db.query(query, [id_pedido]);
        return rows;
    }

    async updateItemStatus(idDetalle, nuevoEstado) {
        const query = `UPDATE detalles_pedido SET estado_item = ? WHERE id = ?`;
        const [result] = await db.execute(query, [nuevoEstado, idDetalle]);
        return result.affectedRows > 0;
    }
}

module.exports = new OrderModel();