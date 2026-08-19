// controllers/posController.js
const menuService = require('../services/menuService');
const orderService = require('../services/orderService');
const orderModel = require('../models/orderModel');
const RecetaService = require('../services/recetaService');
const logger = require('../config/logger');
const turnoService = require('../services/turnoService');
const platilloDiaModel = require('../models/platilloDiaModel');
const db = require('../config/db');
const STATUS = require('../config/orderStatus');

/**
 * Acceso directo al POS pasándole obligatoriamente el ID del pedido previamente inicializado
 * Carga tanto el menú regular como los Platillos y Tragos del Día del turno activo
 */
exports.viewPOS = async (req, res) => {
    try {
        const { id_pedido } = req.params;
        
        // 1. Obtener los detalles actuales si la comanda ya tenía platillos guardados previamente
        const detallesActuales = await orderModel.getOrderDetails(id_pedido);
        
        // 2. Obtener platillos regulares de 'platillos_menu'
        const platillosRegulares = await menuService.getAllItems();

        // 3. Obtener Platillos y Tragos del Día de 'platillos_dia' para el turno activo
        const turnoActivo = await turnoService.obtenerTurnoActivo();
        let platillosDia = [];
        if (turnoActivo) {
            platillosDia = await platilloDiaModel.getByTurno(turnoActivo.id);
        }

        // Formatear platillos del día para integrarlos a la cuadrícula del POS
        const platillosDiaFormateados = platillosDia.map(pd => ({
            id: pd.id,
            nombre: pd.nombre,
            descripcion: pd.descripcion,
            precio: pd.precio,
            precio_alt: pd.precio_alt,
            precio_usd: pd.precio_usd,
            foto: pd.foto,
            categoria: 'Especiales del Día',
            nombre_categoria: 'Especiales del Día',
            tipo_categoria: pd.tipo, // 'COMESTIBLES' o 'BEBIDAS'
            es_platillo_dia: true,
            disponible: 1
        }));

        // Fusión: Platillos del día al principio + Menú regular
        const todosLosPlatillos = [...platillosDiaFormateados, ...platillosRegulares];

        // Obtener el número de mesa asociado
        const [ped] = await db.query(
            'SELECT m.numero AS nombre_mesa FROM pedidos p LEFT JOIN mesas m ON p.id_mesa = m.id WHERE p.id = ?', 
            [id_pedido]
        );
        const nombreMesa = ped[0] ? `Mesa ${ped[0].nombre_mesa}` : 'Mesa Activa';

        res.render('pos', {
            platillos: todosLosPlatillos,
            id_pedido,
            nombre_mesa: nombreMesa,
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
 * Obtiene los items listos en los pedidos activos (Soporta platillos_menu y platillos_dia)
 */
exports.obtenerItemsListosPedido = async (req, res) => {
    try {
        const { id_pedido } = req.params;
        const [rows] = await db.query(
            `SELECT dp.id AS id_detalle, dp.estado_item, COALESCE(pl.nombre, pd.nombre, 'Producto') AS nombre_platillo
             FROM detalles_pedido dp
             LEFT JOIN platillos_menu pl ON dp.id_platillo = pl.id
             LEFT JOIN platillos_dia pd ON dp.id_platillo = pd.id
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
 * Para imprimir/visualizar la precuenta de pedido desde la terminal POS (Soporta platillos_menu y platillos_dia)
 */
exports.viewPrecuenta = async (req, res) => {
    try {
        const id_pedido = req.params.id_pedido;

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

        // Consulta de ítems consumidos con soporte híbrido de tablas
        const [detalles] = await db.query(`
            SELECT 
                dp.cantidad, 
                COALESCE(pm.nombre, pd.nombre, 'Producto') AS nombre, 
                dp.precio_unitario AS precio
            FROM detalles_pedido dp
            LEFT JOIN platillos_menu pm ON dp.id_platillo = pm.id
            LEFT JOIN platillos_dia pd ON dp.id_platillo = pd.id
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
 * Procesa el cobro de la orden admitiendo:
 * 1. Descuentos o Aumentos (Recargos).
 * 2. Desglose detallado de pagos multimoneda.
 * 3. Cobro por Factura (CxC / Crédito), Cortesías o Pendiente de Pago.
 * 4. Liberación garantizada de la mesa asignada.
 */
exports.procesarCobroAvanzado = async (req, res) => {
    const { id_pedido } = req.params;
    const { 
        pagos, 
        es_factura_credito, 
        es_cortesia, 
        es_pendiente_pago,
        descuento = 0,
        recargo = 0,
        motivo_ajuste = null
    } = req.body; 
    
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

        if (['pagado', 'cortesia', 'facturado', 'pendiente_pago'].includes(pedido.estado_pago)) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Este pedido ya fue cobrado o cerrado previamente.' });
        }

        // 2. Recalcular subtotal real neto directamente desde la BD (excluyendo ítems cancelados)
        const [filasSubtotal] = await connection.query(`
            SELECT COALESCE(SUM(cantidad * precio_unitario), 0) AS subtotal_real
            FROM detalles_pedido
            WHERE id_pedido = ? AND estado_item != ?
        `, [id_pedido, STATUS.ITEM.CANCELADO]);

        const subtotal = parseFloat(filasSubtotal[0].subtotal_real || 0);
        const impuesto = subtotal * 0.10; // 10% de impuesto
        
        const montoDescuento = Math.max(0, parseFloat(descuento) || 0);
        const montoRecargo = Math.max(0, parseFloat(recargo) || 0);
        
        // Total a pagar neto con impuestos, descuentos y recargos
        let totalPagar = Math.max(0, (subtotal + impuesto) - montoDescuento + montoRecargo);

        let nuevo_estado_pago = 'pagado';
        let propina = 0;
        let desgloseMonedas = {};

        // -------------------------------------------------------------------------
        // OPCIÓN A: COBRO POR FACTURA (Cuentas por Cobrar / Crédito)
        // -------------------------------------------------------------------------
        if (es_factura_credito) {
            nuevo_estado_pago = 'facturado';

            await connection.query(`
                INSERT INTO pagos_pedido 
                (pedido_id, metodo_pago, moneda_id, factor_cambio_aplicado, monto_moneda_origen, monto_equivalente_local, referencia_transaccion)
                VALUES (?, 'factura', NULL, 1.0000, ?, ?, ?)
            `, [id_pedido, totalPagar, totalPagar, `CRÉDITO / FACTURACIÓN ${motivo_ajuste ? '| ' + motivo_ajuste : ''}`]);

        } 
        // -------------------------------------------------------------------------
        // OPCIÓN B: CORTESÍA (100% Descuento)
        // -------------------------------------------------------------------------
        else if (es_cortesia) {
            nuevo_estado_pago = 'cortesia';
            totalPagar = 0;
        } 
        // -------------------------------------------------------------------------
        // OPCIÓN C: PENDIENTE DE PAGO (Cerrar orden y liberar mesa)
        // -------------------------------------------------------------------------
        else if (es_pendiente_pago) {
            nuevo_estado_pago = 'pendiente_pago';

            await connection.query(`
                INSERT INTO pagos_pedido 
                (pedido_id, metodo_pago, moneda_id, factor_cambio_aplicado, monto_moneda_origen, monto_equivalente_local, referencia_transaccion)
                VALUES (?, 'pendiente', NULL, 1.0000, ?, ?, 'PENDIENTE DE PAGO / MESA LIBERADA')
            `, [id_pedido, totalPagar, totalPagar]);
        } 
        // -------------------------------------------------------------------------
        // OPCIÓN D: PAGOS MIXTOS Y MULTIMONEDA CON DESGLOSE
        // -------------------------------------------------------------------------
        else {
            if (!pagos || !Array.isArray(pagos) || pagos.length === 0) {
                await connection.rollback();
                return res.status(400).json({ 
                    success: false, 
                    message: 'Debe proporcionar al menos un método de pago o marcar Pendiente de Pago/Cortesía/Factura.' 
                });
            }

            let totalRecibidoLocal = 0;

            for (const pago of pagos) {
                const factorCambio = parseFloat(pago.factor_cambio_aplicado || 1.0000);
                const montoOrigen = parseFloat(pago.monto_moneda_origen || 0);
                const codigoMoneda = pago.codigo_moneda || 'LOCAL';
                
                const montoLocal = pago.monto_equivalente_local 
                    ? parseFloat(pago.monto_equivalente_local) 
                    : (montoOrigen * factorCambio);

                totalRecibidoLocal += montoLocal;

                // Desglose por moneda
                if (!desgloseMonedas[codigoMoneda]) {
                    desgloseMonedas[codigoMoneda] = {
                        codigo: codigoMoneda,
                        simbolo: pago.simbolo || '$',
                        total_origen: 0,
                        total_local: 0
                    };
                }
                desgloseMonedas[codigoMoneda].total_origen += montoOrigen;
                desgloseMonedas[codigoMoneda].total_local += montoLocal;

                await connection.query(`
                    INSERT INTO pagos_pedido 
                    (pedido_id, metodo_pago, moneda_id, factor_cambio_aplicado, monto_moneda_origen, monto_equivalente_local, referencia_transaccion)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [
                    id_pedido,
                    pago.metodo_pago,
                    pago.moneda_id || null,
                    factorCambio,
                    montoOrigen,
                    montoLocal,
                    pago.referencia_transaccion || null
                ]);
            }

            // Validar margen de pago contra el total
            if (totalRecibidoLocal < totalPagar - 0.01) {
                await connection.rollback();
                return res.status(400).json({ 
                    success: false, 
                    message: `El monto abonado ($${totalRecibidoLocal.toFixed(2)}) es inferior al total requerido ($${totalPagar.toFixed(2)}).` 
                });
            }

            propina = totalRecibidoLocal - totalPagar;
        }

        // 3. Actualizar la cabecera de 'pedidos'
        await connection.query(`
            UPDATE pedidos 
            SET subtotal = ?,
                impuesto = ?,
                total = ?,
                estado_pedido = ?,
                estado_pago = ?,
                propina = ?,
                id_usuario_cajero = ?,
                fecha_cierre = NOW()
            WHERE id = ?
        `, [
            subtotal,
            impuesto,
            totalPagar, 
            STATUS.PEDIDO?.ENTREGADO || 'entregado', 
            nuevo_estado_pago, 
            propina, 
            id_cajero, 
            id_pedido
        ]);

        // 4. Liberar la mesa asignada inmediatamente y limpiar pre-pedidos huérfanos
        if (pedido.id_mesa) {
            await connection.query(`
                UPDATE mesas 
                SET estado = 'libre' 
                WHERE id = ?
            `, [pedido.id_mesa]);

            // Limpieza de pre-pedidos de la mesa
            await connection.query(`DELETE FROM pre_pedidos WHERE id_mesa = ?`, [pedido.id_mesa]);
        }

        await connection.commit();

        let mensaje = 'Cobro procesado con éxito.';
        if (nuevo_estado_pago === 'facturado') {
            mensaje = 'Orden enviada a Facturación / CxC con éxito.';
        } else if (nuevo_estado_pago === 'cortesia') {
            mensaje = 'Orden cerrada como cortesía (100% descuento).';
        } else if (nuevo_estado_pago === 'pendiente_pago') {
            mensaje = 'Orden cerrada como Pendiente de Pago. Mesa liberada con éxito.';
        }

        return res.json({
            success: true,
            message: mensaje,
            estado_pago: nuevo_estado_pago,
            subtotal,
            impuesto,
            descuento: montoDescuento,
            recargo: montoRecargo,
            total_cobrado: totalPagar,
            propina_registrada: propina,
            desglose_monedas: Object.values(desgloseMonedas)
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error durante la transacción de cobro:', error);
        return res.status(500).json({ success: false, message: 'Error en el servidor al ejecutar el cobro.' });
    } finally {
        connection.release();
    }
};

/**
 * Mantiene compatibilidad con la firma anterior apuntando al nuevo cobro avanzado
 */
exports.procesarCobro = exports.procesarCobroAvanzado;

/**
 * Obtiene la lista de monedas congeladas y sus tasas asociadas al turno activo actual.
 */
exports.obtenerMonedasTurnoActivo = async (req, res) => {
    try {
        const data = await turnoService.obtenerMonedasTurnoActivo();
        return res.json({
            success: true,
            monedas: data.monedas
        });
    } catch (error) {
        console.error('Error al consultar monedas del turno activo:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'No se pudieron consultar las monedas del turno.' 
        });
    }
};

/*
* Obtener alertas no leídas (llamadas, cierres y prepedidos)
*/
exports.obtenerAlertasPendientes = async (req, res) => {
    try {
        // 1. Notificaciones de llamada de servicio o solicitud de cierre no leídas
        const [notificaciones] = await db.query(`
            SELECT 
                n.id, 
                n.id_mesa, 
                m.numero AS numero_mesa, 
                n.tipo, 
                n.mensaje, 
                n.creado_en
            FROM notificaciones_mesero n
            JOIN mesas m ON n.id_mesa = m.id
            WHERE n.leido = 0
            ORDER BY n.creado_en ASC
        `);

        // 2. Pre-pedidos pendientes enviados por clientes (soporta platillos_menu y platillos_dia)
        const [prePedidos] = await db.query(`
            SELECT 
                pp.id, 
                pp.id_mesa, 
                m.numero AS numero_mesa, 
                COALESCE(p.nombre, pd.nombre, 'Platillo') AS platillo, 
                pp.cantidad, 
                pp.notas_especiales, 
                pp.creado_en
            FROM pre_pedidos pp
            JOIN mesas m ON pp.id_mesa = m.id
            LEFT JOIN platillos_menu p ON pp.id_platillo = p.id
            LEFT JOIN platillos_dia pd ON pp.id_platillo = pd.id
            ORDER BY pp.creado_en ASC
        `);

        return res.json({
            success: true,
            alertas: {
                notificaciones,
                prePedidos,
                total: notificaciones.length + prePedidos.length
            }
        });
    } catch (error) {
        console.error('Error al obtener alertas pendientes:', error);
        return res.status(500).json({ success: false, mensaje: 'Error interno del servidor.' });
    }
};

/*
* Marcar notificación como leída
*/ 
exports.marcarNotificacionLeida = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('UPDATE notificaciones_mesero SET leido = 1 WHERE id = ?', [id]);
        return res.json({ success: true });
    } catch (error) {
        console.error('Error al marcar notificación:', error);
        return res.status(500).json({ success: false });
    }
};

/*
* Descartar o procesar prepedido
*/ 
exports.eliminarPrePedido = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM pre_pedidos WHERE id = ?', [id]);
        return res.json({ success: true });
    } catch (error) {
        console.error('Error al eliminar pre-pedido:', error);
        return res.status(500).json({ success: false });
    }
};

// Obtener detalles completos de los pre-pedidos de una mesa específica
exports.obtenerPrePedidosMesa = async (req, res) => {
    try {
        const { idMesa } = req.params;

        const [items] = await db.query(`
            SELECT 
                pp.id AS pre_pedido_id,
                pp.id_platillo,
                COALESCE(p.nombre, pd.nombre, 'Platillo') AS nombre,
                COALESCE(p.precio, pd.precio, 0) AS precio,
                pp.cantidad,
                pp.notas_especiales
            FROM pre_pedidos pp
            JOIN mesas m ON pp.id_mesa = m.id
            LEFT JOIN platillos_menu p ON pp.id_platillo = p.id
            LEFT JOIN platillos_dia pd ON pp.id_platillo = pd.id
            WHERE pp.id_mesa = ?
            ORDER BY pp.creado_en ASC
        `, [idMesa]);

        return res.json({ success: true, items });
    } catch (error) {
        console.error('Error al obtener pre-pedidos de la mesa:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al consultar pre-pedidos.' });
    }
};

// Eliminar pre-pedidos de una mesa tras ser procesados o descartados
exports.limpiarPrePedidosMesa = async (req, res) => {
    try {
        const { idMesa } = req.params;
        await db.query('DELETE FROM pre_pedidos WHERE id_mesa = ?', [idMesa]);
        return res.json({ success: true });
    } catch (error) {
        console.error('Error al limpiar pre-pedidos de la mesa:', error);
        return res.status(500).json({ success: false, mensaje: 'Error al limpiar pre-pedidos.' });
    }
};

/*
* Pivote para la opcion de agregar pre-pedido al POS
*/
exports.abrirOObtenerPedidoMesa = async (req, res) => {
    try {
        const { idMesa } = req.params;
        const idUsuario = req.session.user ? req.session.user.id : null;

        if (!idUsuario) {
            return res.status(401).send('Sesión no válida o caducada.');
        }

        // 1. Obtener el turno de servicio activo
        const [turnos] = await db.query(`
            SELECT id FROM turnos_servicio 
            WHERE estado = 'abierto' 
            ORDER BY id DESC LIMIT 1
        `);

        if (turnos.length === 0) {
            return res.status(400).send('No hay un turno de servicio abierto actualmente.');
        }

        const turnoServicioId = turnos[0].id;

        // 2. Buscar si la mesa ya tiene un pedido activo
        const [pedidosExistentes] = await db.query(`
            SELECT id FROM pedidos 
            WHERE id_mesa = ? 
              AND estado_pago = 'pendiente' 
              AND estado_pedido NOT IN ('cancelado')
            ORDER BY id DESC LIMIT 1
        `, [idMesa]);

        let pedidoId;

        if (pedidosExistentes.length > 0) {
            pedidoId = pedidosExistentes[0].id;
        } else {
            const [resultado] = await db.query(`
                INSERT INTO pedidos (
                    id_mesa, 
                    id_usuario_mesero, 
                    turno_servicio_id, 
                    estado_pedido, 
                    estado_pago
                ) VALUES (?, ?, ?, 'pendiente', 'pendiente')
            `, [idMesa, idUsuario, turnoServicioId]);

            pedidoId = resultado.insertId;
            await db.query(`UPDATE mesas SET estado = 'ocupada' WHERE id = ?`, [idMesa]);
        }

        // 3. Reenviar los Query Parameters (donde viene cargarPrePedido)
        const queryString = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';

        return res.redirect(`/pos/${pedidoId}${queryString}`);

    } catch (error) {
        console.error('Error al abrir u obtener pedido de la mesa:', error);
        return res.status(500).send('Error al procesar la apertura de la mesa.');
    }
};