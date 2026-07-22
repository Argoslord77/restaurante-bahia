const express = require('express');
const router = express.Router();
const posController = require('../controllers/posController');
const dashboardDependienteController = require('../controllers/dashboardDependienteController');
const { ensureAuthenticated, checkRole } = require('../middlewares/auth'); // Ajusta la ruta según tu proyecto
const { posValidationRules, handleValidationErrors } = require('../middlewares/validator');
const { asegurarTurnoActivo } = require('../middlewares/verificarTurno');
const monitorController = require('../controllers/monitorController');
const STATUS = require('../config/orderStatus');

// ========================================================
// RUTAS DEL DASHBOARD DEL DEPENDIENTE
// ========================================================
// Vista principal para gestionar y auditar el salón
router.get('/dependiente/dashboard', ensureAuthenticated, checkRole(['superadministrador', 'administrador','dependiente', 'capitan']), dashboardDependienteController.viewDependienteDashboard);


// ========================================================
// RUTAS OPERACIONALES DEL CIRCUITO POS
// ========================================================
// Variante 1: Inicialización manual de orden desde el Dashboard
router.post('/pos/init-manual', ensureAuthenticated, checkRole(['superadministrador', 'administrador','dependiente', 'capitan']), asegurarTurnoActivo, posValidationRules.initOrderManual, handleValidationErrors, ensureAuthenticated, posController.initOrderManual);

// Variante 2: Entrada automática por lectura de Código QR físico
router.get('/qr/:hash', ensureAuthenticated, posController.initOrderQR);

// Interfaz fija del punto de venta acoplada al pedido en curso
router.get('/pos/:id_pedido', ensureAuthenticated, checkRole(['superadministrador', 'administrador','dependiente', 'capitan']), asegurarTurnoActivo, posController.viewPOS);


// ========================================================
// ENDPOINTS ASÍNCRONOS (API)
// ========================================================
// Guardado y modificación transaccional de los platillos desde la comanda
router.post('/api/pos/save', ensureAuthenticated, checkRole(['superadministrador', 'administrador','dependiente', 'capitan']), asegurarTurnoActivo, posValidationRules.saveOrder, handleValidationErrors, ensureAuthenticated, posController.apiSaveOrder);

// Verificar stock para un platillo específico
router.get('/api/pos/verify-stock', ensureAuthenticated, checkRole(['superadministrador', 'administrador','dependiente', 'capitan']), asegurarTurnoActivo, posController.apiVerifyStock);

// Vista de producción (ej: /monitor/cocina o /monitor/bar)
router.get('/monitor/:area', ensureAuthenticated, asegurarTurnoActivo, checkRole(['superadministrador', 'administrador','jefe-cocina', 'bartender', 'cocinero', 'ayudante-cocina','luncher','porcionador']), monitorController.viewMonitor);

// Endpoint API para la actualización de estados desde la interfaz
router.post('/api/monitor/cambiar-estado', ensureAuthenticated, asegurarTurnoActivo, checkRole(['superadministrador', 'administrador','jefe-cocina', 'bartender', 'cocinero']), monitorController.apiActualizarEstadoItem);

// POST /api/pos/item-listo/:id_detalle
router.post('api/pos/item-listo/:id_detalle', async (req, res) => {
    try {
        const { id_detalle } = req.params;

        // Cambiar estado a STATUS.ITEM.LISTO ('listo') usando la máquina de estados
        await pedidoService.cambiarEstadoItem(id_detalle, STATUS.ITEM.LISTO);

        return res.json({
            success: true,
            message: 'Platillo/bebida marcado como listo correctamente.'
        });
    } catch (error) {
        logger.error(`Error al marcar ítem ${req.params.id_detalle} como listo:`, error);
        return res.status(400).json({
            success: false,
            message: error.message || 'No se pudo actualizar el estado del producto.'
        });
    }
});

module.exports = router;