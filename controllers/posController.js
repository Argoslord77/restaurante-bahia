const menuService = require('../services/menuService');
const orderService = require('../services/orderService');
const orderModel = require('../models/orderModel');
const RecetaService = require('../services/recetaService');
const logger = require('../config/logger');
const turnoService = require('../services/turnoService');
const db = require('../config/db');
const STATUS = require('../config/orderStatus');

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
 * API para cancelar un ítem de la comanda en el POS
 * Permite la cancelación siempre que su estado sea 'en_cocina', 'en_bar' o 'listo'.
 */
exports.apiCancelarItem = async (req, res) => {
    try {
        const { id_detalle } = req.params;
        const { motivo } = req.body;

        if (!id_detalle) {
            return res.status(400).json({ 
                success: false, 
                message: 'El ID del detalle del pedido es requerido.' 
            });
        }

        // 1. Ajuste de columnas: id y notas_especiales
        const [filas] = await db.query(
            'SELECT id, id_pedido, estado_item, notas_especiales FROM detalles_pedido WHERE id = ?',
            [id_detalle]
        );

        if (!filas || filas.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'El ítem solicitado no existe.' 
            });
        }

        const detalle = filas[0];
        const estadosPermitidos = [STATUS.ITEM.EN_COCINA, STATUS.ITEM.EN_BAR, STATUS.ITEM.LISTO];

        if (!estadosPermitidos.includes(detalle.estado_item)) {
            return res.status(400).json({
                success: false,
                message: `No se puede cancelar el producto en su estado actual ('${detalle.estado_item}').`
            });
        }

        // 2. Concatenación usando notas_especiales
        const motivoTexto = motivo && motivo.trim() ? motivo.trim() : 'Sin motivo especificado';
        const notaActualizada = detalle.notas_especiales 
            ? `${detalle.notas_especiales} | CANCELADO: ${motivoTexto}`
            : `CANCELADO: ${motivoTexto}`;

        // 3. UPDATE apuntando a `id` y `notas_especiales`
        await db.query(
            `UPDATE detalles_pedido 
             SET estado_item = ?, 
                 notas_especiales = ? 
             WHERE id = ?`,
            [STATUS.ITEM.CANCELADO, notaActualizada, id_detalle]
        );

        return res.json({
            success: true,
            message: 'El producto fue cancelado correctamente.'
        });

    } catch (error) {
        console.error('Error al cancelar el ítem del pedido:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor al procesar la cancelación del producto.'
        });
    }
};

/**
 * Para imprimir/visualizar la precuenta de pedido desde la terminal POS
 */
exports.viewPrecuenta = async (req, res) => {
    try {
        const id_pedido = req.params.id_pedido;
        
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
            WHERE dp.id_pedido = ? AND dp.estado_item != ?
        `, [id_pedido, STATUS.ITEM.CANCELADO]);

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
 * Procesa el cobro multimoneda/mixto de un pedido en una sola transacción SQL.
 * Registra el excedente pagado como propina en la tabla 'pedidos'.
 */
exports.procesarCobro = async (req, res) => {
    const { id_pedido } = req.params;
    const { pagos, es_cortesia } = req.body; 
    
    const id_cajero = req.session?.user?.id || req.user?.id;

    if (!id_pedido) {
        return res.status(400).json({ success: false, message: 'ID de pedido no proporcionado.' });
    }

    if (!id_cajero) {
        return res.status(401).json({ success: false, message: 'Sesión inválida. No se detectó cajero.' });
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Obtener pedido y bloquear fila para la transacción
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

        // -------------------------------------------------------------------------
        // RECALCULO DIRECTO DESDE BASE DE DATOS (EXCLUYENDO CANCELADOS)
        // Evita inflar la cuenta si existían ítems anulados o discrepancias de total.
        // -------------------------------------------------------------------------
        const [filasSubtotal] = await connection.query(`
            SELECT COALESCE(SUM(cantidad * precio_unitario), 0) AS total_real
            FROM detalles_pedido
            WHERE id_pedido = ? AND estado_item != ?
        `, [id_pedido, STATUS.ITEM.CANCELADO]);

        const totalPagar = parseFloat(filasSubtotal[0].total_real);

        let nuevo_estado_pago = 'pagado';
        let propina = 0;

        if (es_cortesia) {
            nuevo_estado_pago = 'cortesia';
        } else {
            if (!pagos || !Array.isArray(pagos) || pagos.length === 0) {
                await connection.rollback();
                return res.status(400).json({ success: false, message: 'Debe proporcionar al menos un método de pago.' });
            }

            // Validar que la suma equivalente cubra el total real a pagar
            const totalRecibidoLocal = pagos.reduce((sum, p) => sum + parseFloat(p.monto_equivalente_local || 0), 0);
            
            if (totalRecibidoLocal < totalPagar - 0.01) { // margen de centavos por redondeo
                await connection.rollback();
                return res.status(400).json({ 
                    success: false, 
                    message: `El monto abonado ($${totalRecibidoLocal.toFixed(2)}) es inferior al total requerido ($${totalPagar.toFixed(2)}).` 
                });
            }

            // Calcular el excedente de pago y asignarlo como propina
            propina = totalRecibidoLocal - totalPagar;

            // 2. Registrar cada abono en la tabla 'pagos_pedido'
            for (const pago of pagos) {
                await connection.query(`
                    INSERT INTO pagos_pedido 
                    (pedido_id, metodo_pago, moneda_id, factor_cambio_aplicado, monto_moneda_origen, monto_equivalente_local, referencia_transaccion)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [
                    id_pedido,
                    pago.metodo_pago,
                    pago.moneda_id || null,
                    pago.factor_cambio_aplicado || 1.0000,
                    pago.monto_moneda_origen,
                    pago.monto_equivalente_local,
                    pago.referencia_transaccion || null
                ]);
            }
        }

        // 3. Actualizar la tabla 'pedidos' con el total real neto, estado de pago, propina y fecha de cierre
        await connection.query(`
            UPDATE pedidos 
            SET total = ?,
                subtotal = ?,
                estado_pedido = ?,
                estado_pago = ?,
                propina = ?,
                id_usuario_cajero = ?,
                fecha_cierre = NOW()
            WHERE id = ?
        `, [totalPagar, totalPagar, STATUS.PEDIDO.ENTREGADO, nuevo_estado_pago, propina, id_cajero, id_pedido]);

        // 4. Liberar la mesa asignada
        if (pedido.id_mesa) {
            await connection.query(`
                UPDATE mesas 
                SET estado = ? 
                WHERE id = ?
            `, [STATUS.MESA.LIBRE, pedido.id_mesa]);
        }

        await connection.commit();

        return res.json({
            success: true,
            message: nuevo_estado_pago === 'cortesia' 
                ? 'Orden cerrada como cortesía.' 
                : 'Cobro multimoneda procesado con éxito.',
            total_cobrado: totalPagar,
            propina_registrada: propina
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error durante la transacción de cobro mixto:', error);
        return res.status(500).json({ success: false, message: 'Error en el servidor al ejecutar el cobro.' });
    } finally {
        connection.release();
    }
};

/**
 * Obtiene la lista de monedas congeladas y sus tasas asociadas al turno activo actual.
 */
exports.obtenerMonedasTurnoActivo = async (req, res) => {
    try {
        const [monedas] = await db.query(`
            SELECT 
                tm.moneda_id,
                m.codigo,
                m.nombre,
                m.simbolo,
                tm.factor_cambio
            FROM turnos_monedas tm
            INNER JOIN monedas m ON tm.moneda_id = m.id
            INNER JOIN turnos_servicio t ON tm.turno_id = t.id
            WHERE t.estado = 'abierto'
        `);

        return res.json({
            success: true,
            monedas: monedas
        });
    } catch (error) {
        console.error('Error al consultar monedas del turno activo:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'No se pudieron consultar las monedas del turno.' 
        });
    }
};