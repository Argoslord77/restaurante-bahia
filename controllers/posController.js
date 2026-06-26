const menuService = require('../services/menuService');
const orderService = require('../services/orderService');
const orderModel = require('../models/orderModel');
const RecetaService = require('../services/recetaService');
const logger = require('../config/logger');

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

/**
 * Endpoint del Dashboard (Variante 1): Crear o recuperar orden y redirigir
 */
exports.initOrderManual = async (req, res) => {
    try {
        const { id_mesa } = req.body;
        const userId = req.user ? req.user.id : 1;
        
        const pedido = await orderService.getOrCreateOrderForMesa(id_mesa, userId);
        return res.redirect(`/pos/${pedido.id}`);
    } catch (error) {
        console.error('Error en initOrderManual:', error);
        req.flash('error_msg', error.message);
        return res.redirect('/dependiente/dashboard');
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

        // Verificar stock de ingredientes antes de guardar la orden
        if (items && items.length > 0) {
            try {
                // Usar almacén principal (id=1) - configurable según necesidades
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
                
                logger.info(`Stock verificado exitosamente para pedido ${id_pedido}`);
            } catch (error) {
                logger.error(`Error al verificar stock para pedido ${id_pedido}:`, error);
                // No fallar el guardado por error en verificación de stock, pero loggear
                // Esto permite que el sistema siga funcionando si hay un error en el servicio de recetas
            }
        }

        const financialData = await orderService.syncPosOrder(id_pedido, items);

        return res.status(200).json({
            success: true,
            message: 'Orden sincronizada y guardada con éxito.',
            financialData
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