const db = require('../config/db');

const pedidoService = {
    // Obtener pedidos en consumo
    obtenerTodosActivos: async () => {
        const [rows] = await db.query(
            `SELECT p.*, m.numero AS numero_mesa, u.nombre AS mesero 
             FROM pedidos p
             INNER JOIN mesas m ON p.id_mesa = m.id
             LEFT JOIN usuarios u ON p.id_usuario_mesero = u.id
             WHERE p.fecha_cierre IS NULL`
        );
        return rows;
    },

    // Extracción de detalles mapeando los identificadores de la orden
    obtenerPorId: async (id) => {
        const [pedidoRow] = await db.query(
            `SELECT p.*, m.numero AS numero_mesa, u.nombre AS mesero 
             FROM pedidos p
             INNER JOIN mesas m ON p.id_mesa = m.id
             LEFT JOIN usuarios u ON p.id_usuario_mesero = u.id
             WHERE p.id = ?`, [id]
        );
        
        if (pedidoRow.length === 0) return null;

        const [detalles] = await db.query(
            `SELECT dp.id AS id_detalle, dp.id_pedido, dp.id_platillo, dp.cantidad, dp.estado_item, dp.afecta_inventario,
                    pl.nombre AS nombre_platillo 
             FROM detalles_pedido dp
             INNER JOIN platillos_menu pl ON dp.id_platillo = pl.id
             WHERE dp.id_pedido = ?`, [id]
        );

        const pedido = pedidoRow[0];
        pedido.detalles = detalles;
        return pedido;
    },

    // Iniciar el servicio e indicar que la mesa está ocupada
    crearNuevoPedido: async (id_mesa) => {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            
            const [result] = await connection.query(
                "INSERT INTO pedidos (id_mesa, fecha_apertura) VALUES (?, NOW())", [id_mesa]
            );
            const nuevoId = result.insertId;

            await connection.query(
                "UPDATE mesas SET estado = 'en_consumo' WHERE id = ?", [id_mesa]
            );

            await connection.commit();
            return nuevoId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    // Procesa el bloque completo de la orden de forma atómica
    adicionarOrdenLote: async (id_pedido, items) => {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            for (const item of items) {
                await connection.query(
                    `INSERT INTO detalles_pedido (id_pedido, id_platillo, cantidad, estado_item) 
                     VALUES (?, ?, ?, 'en_espera')`,
                    [id_pedido, item.id_platillo, item.cantidad]
                );
            }

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    // Cierre estándar de cuenta
    procesarCierreFinanciero: async (id_pedido, id_usuario_cajero) => {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const [pedido] = await connection.query("SELECT id_mesa FROM pedidos WHERE id = ?", [id_pedido]);
            if (pedido.length === 0) throw new Error('Pedido no encontrado');

            await connection.query(
                `UPDATE pedidos 
                 SET fecha_cierre = NOW(), id_usuario_cajero = ? 
                 WHERE id = ?`, [id_usuario_cajero, id_pedido]
            );

            await connection.query(
                "UPDATE mesas SET estado = 'desocupando' WHERE id = ?", [pedido[0].id_mesa]
            );

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    // Control centralizado de cancelaciones y alteración de stocks
    procesarCancelacionFlujo: async (id_pedido, productosAfectados, motivo, id_usuario) => {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const [pedidoRows] = await connection.query("SELECT id_mesa FROM pedidos WHERE id = ?", [id_pedido]);
            if (pedidoRows.length === 0) throw new Error('Pedido no encontrado.');
            const id_mesa = pedidoRows[0].id_mesa;

            for (const item of productosAfectados) {
                const [detalleRows] = await connection.query(
                    'SELECT id_platillo, cantidad FROM detalles_pedido WHERE id = ?', [item.id_detalle]
                );
                
                if (detalleRows.length > 0) {
                    const actualItem = detalleRows[0];

                    if (item.accion === 'reingresar') {
                        await connection.query(
                            `UPDATE detalles_pedido 
                             SET estado_item = 'cancelado', afecta_inventario = 0 
                             WHERE id = ?`, [item.id_detalle]
                        );
                        
                        await connection.query(
                            `UPDATE inventario SET stock = stock + ? WHERE id_platillo = ?`,
                            [actualItem.cantidad, actualItem.id_platillo]
                        );
                    } else {
                        await connection.query(
                            `UPDATE detalles_pedido 
                             SET estado_item = 'cancelado', afecta_inventario = 1 
                             WHERE id = ?`, [item.id_detalle]
                        );
                        
                        await connection.query(
                            `INSERT INTO mermas_auditoria (id_pedido, id_platillo, cantidad, motivo, id_usuario, fecha_registro) 
                             VALUES (?, ?, ?, ?, ?, NOW())`,
                            [id_pedido, actualItem.id_platillo, actualItem.cantidad, motivo, id_usuario]
                        );
                    }
                }
            }

            const [restantes] = await connection.query(
                `SELECT COUNT(*) as activos FROM detalles_pedido 
                 WHERE id_pedido = ? AND estado_item != 'cancelado'`, [id_pedido]
            );

            // Si todos los ítems de la mesa fueron cancelados, cerramos el pedido por completo
            if (restantes[0].activos === 0) {
                await connection.query(
                    `UPDATE pedidos SET fecha_cierre = NOW(), id_usuario_cajero = ? WHERE id = ?`,
                    [id_usuario, id_pedido]
                );

                await connection.query(
                    "UPDATE mesas SET estado = 'desocupando' WHERE id = ?", [id_mesa]
                );
            }

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
};

module.exports = pedidoService;