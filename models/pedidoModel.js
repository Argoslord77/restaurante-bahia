const db = require('../config/db');

class Pedido {
    static async fetchAllActive() {
        const query = `
            SELECT p.*, m.numero AS numero_mesa, u.usuario AS mesero 
            FROM pedidos p
            INNER JOIN mesas m ON p.id_mesa = m.id
            LEFT JOIN usuarios u ON p.id_usuario_mesero = u.id
            WHERE p.fecha_cierre IS NULL
            ORDER BY p.id DESC
        `;
        const [rows] = await db.query(query);
        return rows;
    }

    static async findById(id) {
        const queryPedido = `
            SELECT p.*, m.numero AS numero_mesa, u.usuario AS mesero 
            FROM pedidos p
            INNER JOIN mesas m ON p.id_mesa = m.id
            LEFT JOIN usuarios u ON p.id_usuario_mesero = u.id
            WHERE p.id = ?
        `;
        const [pedido] = await db.query(queryPedido, [id]);
        
        if (pedido.length === 0) return null;

        const queryDetalles = `
            SELECT dp.*, pm.nombre AS nombre_platillo, pm.precio AS precio_unitario
            FROM detalles_pedido dp
            INNER JOIN platillos_menu pm ON dp.id_platillo = pm.id
            WHERE dp.id_pedido = ?
        `;
        const [detalles] = await db.query(queryDetalles, [id]);
        
        pedido[0].detalles = detalles;
        return pedido[0];
    }

    // Acepta una conexión opcional para trabajar dentro de transacciones atómicas
    static async create(id_mesa, id_usuario_mesero, connection = db) {
        const [result] = await connection.query(
            'INSERT INTO pedidos (id_mesa, id_usuario_mesero, creado_en) VALUES (?, ?, NOW())',
            [id_mesa, id_usuario_mesero]
        );
        return result.insertId;
    }

    static async addDetail(id_pedido, id_platillo, cantidad, connection = db) {
        return await connection.query(
            'INSERT INTO detalles_pedido (id_pedido, id_platillo, cantidad) VALUES (?, ?, ?)',
            [id_pedido, id_platillo, cantidad]
        );
    }

    static async actualizarEstadoMesa(id_mesa, estado, connection = db) {
        return await connection.query(
            'UPDATE mesas SET estado = ? WHERE id = ?',
            [estado, id_mesa]
        );
    }

    static async cerrarPedido(id_pedido, id_cajero, connection = db) {
        return await connection.query(
            `UPDATE pedidos 
             SET fecha_cierre = NOW(), id_usuario_cajero = ? 
             WHERE id = ?`,
            [id_cajero, id_pedido]
        );
    }
}

module.exports = Pedido;