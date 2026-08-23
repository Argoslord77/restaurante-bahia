const db = require('../config/db');
const RecetaService = require('./recetaService');
const logger = require('../config/logger');
const orderEngine = require('./orderEngineService');
const PedidoModel = require('../models/pedidoModel');
const STATUS = require('../config/orderStatus');

const pedidoService = { 

    // Agrega producto a un pedido
    agregarProducto: async (
        idPedido,
        idPlatillo,
        cantidad = 1,
        notas = null
    ) => {

        const pedido = await PedidoModel.getById(idPedido);

        if (!pedido)
            throw new Error('Pedido inexistente');

        if (!orderEngine.canEditOrder(pedido.estado_pedido)) {
            throw new Error('El pedido no admite modificaciones.');
        }

        await db.query(
            `INSERT INTO detalles_pedido
            (id_pedido, id_platillo, cantidad, notas_especiales, estado_item)
            VALUES (?, ?, ?, ?, ?)`,
            [idPedido, idPlatillo, cantidad, notas, STATUS.ITEM.EN_ESPERA]
        );

        return true;
    },

    // Cambia el estado de un pedido
    cambiarEstadoPedido: async (idPedido, nuevoEstado) => {
        const pedido = await PedidoModel.getById(idPedido);
        if (!pedido) {
            throw new Error('Pedido no encontrado.');
        }

        orderEngine.validateOrderStatus(pedido.estado_pedido, nuevoEstado);
        return await PedidoModel.updateEstadoPedido(idPedido, nuevoEstado);
    },

    // Cambia el estado de un item
    cambiarEstadoItem: async (idDetalle, nuevoEstado) => {
        const item = await PedidoModel.getDetalleById(idDetalle);
        if (!item) {
            throw new Error('Detalle no encontrado.');
        }

        orderEngine.validateItemStatus(item.estado_item, nuevoEstado);
        return await PedidoModel.updateEstadoItem(idDetalle, nuevoEstado);
    },

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

        // Agregamos la lógica para traer los modificadores por cada detalle
        for (let item of detalles) {
            const [mods] = await db.query(
                `SELECT mm.nombre, mm.tipo 
                 FROM detalles_pedido_modificadores dpm
                 INNER JOIN modificadores_menu mm ON dpm.modificador_id = mm.id
                 WHERE dpm.detalle_pedido_id = ?`,
                [item.id_detalle]
            );
            item.modificadores = mods; // Esto inyecta el array en el objeto para la vista
        }

        const pedido = pedidoRow[0];
        pedido.detalles = detalles;
        return pedido;
    },

    // Iniciar el servicio e indicar que la mesa está ocupada
    crearNuevoPedido: async (id_mesa, id_usuario_mesero, turno_servicio_id) => {
        if (!id_usuario_mesero) {
            throw new Error('Se requiere un usuario mesero válido (sesión activa) para abrir la mesa.');
        }
        if (!turno_servicio_id) {
            throw new Error('No hay un turno de servicio activo para asociar el pedido.');
        }

        const connection = await db.getConnection();
        const [mesa] = await connection.query(`SELECT estado FROM mesas WHERE id=?`, [id_mesa]);

        if (mesa.length === 0) throw new Error('Mesa inexistente');
        if (mesa[0].estado !== STATUS.MESA.LIBRE) throw new Error('La mesa ya posee un pedido activo.');

        try {
            await connection.beginTransaction();
            // FIX: se usa PedidoModel.create(), que ya insertaba correctamente
            // (id_mesa, id_usuario_mesero, turno_servicio_id, creado_en) según el
            // esquema real de la tabla `pedidos`. El INSERT manual anterior usaba
            // una columna 'fecha_apertura' inexistente y omitía dos campos NOT NULL.
            const nuevoId = await PedidoModel.create(id_mesa, id_usuario_mesero, turno_servicio_id, connection);
            await PedidoModel.actualizarEstadoMesa(id_mesa, STATUS.MESA.OCUPADA, connection);
            await connection.commit();
            return nuevoId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    // Procesa el bloque completo de la orden usando el modelo actualizado para modificadores
    adicionarOrdenLote: async (id_pedido, items, externalConn = null) => {
        // items espera una estructura: { id_platillo, cantidad, modificadores: [] }
        for (const item of items) {
            await PedidoModel.addDetailWithModifiers(
                id_pedido,
                item.id_platillo,
                item.cantidad,
                item.modificadores || [],
                externalConn || db
            );
        }
        return true;
    },

    // Cierre estándar de cuenta con descuento de inventario
    procesarCierreFinanciero: async (id_pedido, id_usuario_cajero) => {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const [pedido] = await connection.query("SELECT id_mesa FROM pedidos WHERE id = ?", [id_pedido]);
            if (pedido.length === 0) throw new Error('Pedido no encontrado');

            const [detalles] = await connection.query(
                `SELECT id_platillo, cantidad FROM detalles_pedido 
                 WHERE id_pedido = ? AND estado_item != 'cancelado'`, [id_pedido]
            );

            if (detalles.length > 0) {
                try {
                    await RecetaService.descontarStockPedido(detalles, 1, id_pedido, id_usuario_cajero);
                    logger.info(`Stock descontado para pedido ${id_pedido}`);
                } catch (error) {
                    logger.error(`Error al descontar stock para pedido ${id_pedido}:`, error);
                }
            }

            await connection.query(
                `UPDATE pedidos SET fecha_cierre = NOW(), id_usuario_cajero = ? WHERE id = ?`, 
                [id_usuario_cajero, id_pedido]
            );

            await connection.query("UPDATE mesas SET estado = ? WHERE id = ?", [STATUS.MESA.DESOCUPANDOSE, pedido[0].id_mesa]);
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
                        await connection.query(`UPDATE detalles_pedido SET estado_item = 'cancelado', afecta_inventario = 0 WHERE id = ?`, [item.id_detalle]);
                        await connection.query(`UPDATE inventario SET stock = stock + ? WHERE id_platillo = ?`, [actualItem.cantidad, actualItem.id_platillo]);
                    } else {
                        await connection.query(`UPDATE detalles_pedido SET estado_item = 'cancelado', afecta_inventario = 1 WHERE id = ?`, [item.id_detalle]);
                        await connection.query(`INSERT INTO mermas_auditoria (id_pedido, id_platillo, cantidad, motivo, id_usuario, fecha_registro) VALUES (?, ?, ?, ?, ?, NOW())`,
                            [id_pedido, actualItem.id_platillo, actualItem.cantidad, motivo, id_usuario]
                        );
                    }
                }
            }

            const [restantes] = await connection.query(`SELECT COUNT(*) as activos FROM detalles_pedido WHERE id_pedido = ? AND estado_item != 'cancelado'`, [id_pedido]);

            if (restantes[0].activos === 0) {
                await connection.query(`UPDATE pedidos SET fecha_cierre = NOW(), id_usuario_cajero = ? WHERE id = ?`, [id_usuario, id_pedido]);
                await connection.query("UPDATE mesas SET estado = ? WHERE id = ?", [STATUS.MESA.DESOCUPANDOSE, id_mesa]);
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