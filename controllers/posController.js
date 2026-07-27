const menuService = require('../services/menuService');
const orderService = require('../services/orderService');
const orderModel = require('../models/orderModel');
const RecetaService = require('../services/recetaService');
const logger = require('../config/logger');
const turnoService = require('../services/turnoService');
const db = require('../config/db');

/**
 * Acceso directo al POS pasándole obligatoriamente el ID del pedido previamente inicializado
 */
exports.viewPOS = async (req, res) => {
    try {
        const { id_pedido } = req.params;
        
        // Obtener los detalles actuales si la comanda ya tenía platillos guardados previamente
        const detallesActuales = await orderModel.getOrderDetails(id_pedido);
        const platillos = await menuService.getAllItems();

        res.render('pos', {
            platillos,
            id_pedido,
            detallesActuales: JSON.stringify(detallesActuales),
            user: req.user || { nombre: 'Dependiente', id: 1 },
            pageTitle: 'Orden Interactiva - Restaurante Bahía',
            view: 'pos'
        });
    } catch (error) {
        console.error('Error al inicializar el POS:', error);
        res.status(500).send('Error interno al cargar la mesa asignada.');
    }
};


exports.initOrderManual = async (req, res) => {
    try {
        const { id_mesa } = req.body;
        const userId = req.user ? req.user.id : 1;

        // Obtener turno activo
        const turnoActivo = await turnoService.obtenerTurnoActivo();

        if (!turnoActivo) {
            throw new Error('No hay un turno de servicio abierto. Abra un turno primero.');
        }

        const pedido = await orderService.getOrCreateOrderForMesa(id_mesa, userId, turnoActivo.id);

        return res.json({ 
            success: true, 
            pedidoId: pedido.id 
        });
    } catch (error) {
        console.error(error);
        return res.status(400).json({ 
            success: false, 
            message: error.message 
        });
    }
};

/**
 * Enrutador de Códigos QR (Variante 2): URL http://localhost:3000/qr/:hash
 */
exports.initOrderQR = async (req, res) => {
    try {
        const { hash } = req.params;
        const userId = req.user ? req.user.id : 1;

        const pedido = await orderService.processQRActivation(hash, userId);
        return res.redirect(`/pos/${pedido.id}`);
    } catch (error) {
        console.error('Error en activación por QR:', error);
        return res.status(400).send(`<h3>Error de Activación:</h3><p>${error.message}</p><a href="/admin/dashboard">Ir al Dashboard</a>`);
    }
};

/**
 * Guarda o modifica la comanda desde el POS
 */
exports.apiSaveOrder = async (req, res) => {
    try {
        const { id_pedido, items } = req.body;

        // Verificar stock si aplica
        if (items && items.length > 0) {
            try {
                const almacenId = 1;
                const stockVerification = await RecetaService.verificarStockParaPedido(items, almacenId);
                
                if (!stockVerification.suficiente) {
                    logger.warn(`Stock insuficiente para pedido ${id_pedido}:`, stockVerification.faltantes);
                    return res.status(400).json({
                        success: false,
                        message: 'Stock insuficiente para completar la orden',
                        faltantes: stockVerification.faltantes,
                        requiereAprobacion: false
                    });
                }
            } catch (error) {
                logger.error(`Error al verificar stock para pedido ${id_pedido}:`, error);
            }
        }

        const { financialData, insertedItems } = await orderService.syncPosOrder(id_pedido, items);

        return res.status(200).json({
            success: true,
            message: 'Ronda enviada a cocina correctamente.',
            financialData,
            insertedItems // Enviar al cliente los ítems con sus ID reales de la BD
        });
    } catch (error) {
        console.error('Error al guardar la orden en POS:', error);
        return res.status(400).json({ success: false, message: error.message });
    }
};

/**
 * Verificar stock para un platillo específico
 */
exports.apiVerifyStock = async (req, res) => {
    try {
        const { id_platillo, cantidad } = req.query;
        
        if (!id_platillo) {
            return res.status(400).json({ success: false, message: 'ID de platillo requerido' });
        }

        const cantidadSolicitada = parseInt(cantidad) || 1;
        const almacenId = 1; // Almacén principal configurable

        const items = [{ id_platillo: parseInt(id_platillo), cantidad: cantidadSolicitada }];
        const stockVerification = await RecetaService.verificarStockParaPedido(items, almacenId);

        return res.status(200).json({
            success: true,
            suficiente: stockVerification.suficiente,
            faltantes: stockVerification.faltantes || []
        });
    } catch (error) {
        logger.error('Error al verificar stock de platillo:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Obtiene los items listos en los pedidos activos
 */
exports.obtenerItemsListosPedido = async (req, res) => {
    try {
        const { id_pedido } = req.params;
        const [rows] = await db.query(
            `SELECT dp.id AS id_detalle, dp.estado_item, pl.nombre AS nombre_platillo
             FROM detalles_pedido dp
             INNER JOIN platillos_menu pl ON dp.id_platillo = pl.id
             WHERE dp.id_pedido = ? AND dp.estado_item = ?`,
            [id_pedido, STATUS.ITEM.LISTO]
        );

        return res.json({
            success: true,
            itemsListos: rows
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Obtiene la lista de platillos con estado 'listo' para un pedido específico
 */
exports.getItemsListos = async (req, res) => {
    try {
        const { id_pedido } = req.params;

        if (!id_pedido) {
            return res.status(400).json({
                success: false,
                message: 'El identificador del pedido es requerido.'
            });
        }

        const itemsListos = await orderModel.getItemsListosByPedido(id_pedido);

        return res.json({
            success: true,
            itemsListos
        });
    } catch (error) {
        console.error('Error al obtener ítems listos:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno al consultar los ítems listos.',
            error: error.message
        });
    }
};

/**
 * API para actualizar el estado de un detalle de pedido desde la terminal POS
 */
exports.apiActualizarEstadoItem = async (req, res) => {
    try {
        const { id_detalle, nuevo_estado } = req.body;

        if (!id_detalle || !nuevo_estado) {
            return res.status(400).json({ 
                success: false, 
                message: 'El id_detalle y el nuevo_estado son requeridos.' 
            });
        }

        const resultado = await orderModel.updateItemStatus(id_detalle, nuevo_estado);

        if (resultado.notFound) {
            return res.status(404).json({ 
                success: false, 
                message: 'Ítem no encontrado.' 
            });
        }

        return res.status(200).json({
            success: true,
            message: `El producto ha sido actualizado a: ${nuevo_estado}.`
        });
    } catch (error) {
        console.error('Error al actualizar estado del ítem desde el POS:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor al actualizar el estado del producto.' 
        });
    }
};

/**
 * Para imprimir/visualizar la precuenta de pedido desde la terminal POS
 */
exports.viewPrecuenta = async (req, res) => {
    try {
        const id_pedido = req.params.id_pedido;
        
        // Log de depuración para verificar el ID recibido en la consola del servidor
        console.log("ID de pedido recibido en backend:", id_pedido);

        if (!id_pedido || id_pedido === 'undefined') {
            return res.status(400).send('Error: ID de pedido no válido o no enviado.');
        }

        // Consulta del pedido, mesa (m.numero) y usuario que atendió
        const [pedido] = await db.query(`
            SELECT p.id, m.numero AS nombre_mesa, CONCAT(u.nombre, ' ', u.apellidos) AS atendio
            FROM pedidos p
            LEFT JOIN mesas m ON p.id_mesa = m.id
            LEFT JOIN usuarios u ON p.id_usuario_mesero = u.id
            WHERE p.id = ?
        `, [id_pedido]);

        if (!pedido || pedido.length === 0) {
            return res.status(404).send('Pedido no encontrado');
        }

        // Consulta de ítems consumidos
        const [detalles] = await db.query(`
            SELECT dp.cantidad, pm.nombre, dp.precio_unitario AS precio
            FROM detalles_pedido dp
            INNER JOIN platillos_menu pm ON dp.id_platillo = pm.id
            WHERE dp.id_pedido = ? AND dp.estado_item != 'cancelado'
        `, [id_pedido]);

        res.render('precuenta', {
            id_pedido: pedido[0].id,
            nombre_mesa: pedido[0].nombre_mesa,
            atendio: pedido[0].atendio,
            detalles: detalles
        });
    } catch (error) {
        console.error('Error al generar la precuenta:', error);
        res.status(500).send('Error al generar la precuenta');
    }
};

/**
 * Procesa el cobro de una orden POS alineado con el esquema real de pedidos
 */
exports.procesarCobro = async (req, res) => {
    const { id_pedido } = req.params;
    const { metodo_pago, monto_recibido, es_cortesia } = req.body;
    
    // Obtenemos el ID del cajero desde la sesión actual del usuario
    const id_cajero = req.session?.user?.id || req.user?.id;

    if (!id_pedido) {
        return res.status(400).json({ success: false, message: 'ID de pedido no proporcionado.' });
    }

    if (!id_cajero) {
        return res.status(401).json({ success: false, message: 'Sesión invalida. No se detectó cajero.' });
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Obtener los datos actuales del pedido
        const [filas] = await connection.query(`
            SELECT id, id_mesa, total, estado_pago 
            FROM pedidos 
            WHERE id = ? FOR UPDATE
        `, [id_pedido]);

        if (!filas || filas.length === 0) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'El pedido no existe.' });
        }

        const pedido = filas[0];

        if (pedido.estado_pago === 'pagado' || pedido.estado_pago === 'cortesia') {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Este pedido ya fue cobrado o cerrado.' });
        }

        let nuevo_estado_pago = 'pagado';
        let cambio = 0;
        const totalPagar = parseFloat(pedido.total);

        // 2. Control de cortesía o pago normal
        if (es_cortesia) {
            nuevo_estado_pago = 'cortesia';
        } else {
            if (metodo_pago === 'efectivo') {
                const recibido = parseFloat(monto_recibido);
                if (isNaN(recibido) || recibido < totalPagar) {
                    await connection.rollback();
                    return res.status(400).json({ success: false, message: 'Monto recibido insuficiente.' });
                }
                cambio = recibido - totalPagar;
            }
        }

        // 3. Actualizar la tabla 'pedidos' según su esquema exacto
        await connection.query(`
            UPDATE pedidos 
            SET estado_pedido = 'entregado',
                estado_pago = ?,
                id_usuario_cajero = ?,
                fecha_cierre = NOW()
            WHERE id = ?
        `, [nuevo_estado_pago, id_cajero, id_pedido]);

        // 4. Registrar la transacción en 'pagos_pedidos'
        if (nuevo_estado_pago === 'pagado') {
            await connection.query(`
                INSERT INTO pagos_pedidos 
                (id_pedido, metodo_pago, monto_recibido, monto_pagado, cambio_entregado)
                VALUES (?, ?, ?, ?, ?)
            `, [
                id_pedido, 
                metodo_pago, 
                metodo_pago === 'efectivo' ? monto_recibido : totalPagar, 
                totalPagar, 
                cambio
            ]);
        }

        // 5. Liberar la mesa
        if (pedido.id_mesa) {
            await connection.query(`
                UPDATE mesas 
                SET estado = 'disponible' 
                WHERE id = ?
            `, [pedido.id_mesa]);
        }

        await connection.commit();

        return res.json({
            success: true,
            message: nuevo_estado_pago === 'cortesia' ? 'Orden cerrada como cortesía.' : 'Cobro procesado correctamente.',
            detalles: {
                total: totalPagar,
                monto_recibido: metodo_pago === 'efectivo' ? parseFloat(monto_recibido) : totalPagar,
                cambio: cambio,
                estado_pago: nuevo_estado_pago
            }
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error durante la transacción de cobro:', error);
        return res.status(500).json({ success: false, message: 'Error en el servidor al ejecutar el cobro.' });
    } finally {
        connection.release();
    }
};
 