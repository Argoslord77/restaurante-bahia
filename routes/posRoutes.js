const express = require('express');
const router = express.Router();
const posController = require('../controllers/posController');
const dashboardDependienteController = require('../controllers/dashboardDependienteController');
const { ensureAuthenticated, checkRole } = require('../middlewares/auth'); // Ajusta la ruta según tu proyecto
const { posValidationRules, handleValidationErrors } = require('../middlewares/validator');
const { asegurarTurnoActivo } = require('../middlewares/verificarTurno');
const monitorController = require('../controllers/monitorController');
const turnoController = require('../controllers/turnoController');

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

// ========================================================
// ENDPOINTS ASÍNCRONOS (API)
// ========================================================
// Guardado y modificación transaccional de los platillos desde la comanda
router.post('/api/pos/save', ensureAuthenticated, checkRole(['superadministrador', 'administrador','dependiente', 'capitan']), asegurarTurnoActivo, posValidationRules.saveOrder, handleValidationErrors, ensureAuthenticated, posController.apiSaveOrder);

// Verificar stock para un platillo específico
router.get('/api/pos/verify-stock', ensureAuthenticated, checkRole(['superadministrador', 'administrador','dependiente', 'capitan']), asegurarTurnoActivo, posController.apiVerifyStock);

// Consulta asíncrona de comandas según el área (utilizada por el refresco AJAX/Fetch del monitor)
router.get('/api/monitor/comandas', ensureAuthenticated, asegurarTurnoActivo, checkRole(['superadministrador', 'administrador', 'jefe-cocina', 'bartender', 'cocinero', 'ayudante-cocina', 'luncher', 'porcionador']), monitorController.getComandasAPI);

// Vista de producción (ej: /monitor/cocina o /monitor/bar)
router.get('/monitor/:area', ensureAuthenticated, asegurarTurnoActivo, checkRole(['superadministrador', 'administrador','jefe-cocina', 'bartender', 'cocinero', 'ayudante-cocina','luncher','porcionador']), monitorController.viewMonitor);

// Endpoint API para la actualización de estados desde la interfaz de cocina/bar
router.post('/api/monitor/cambiar-estado', ensureAuthenticated, asegurarTurnoActivo, checkRole(['superadministrador', 'administrador','jefe-cocina', 'bartender', 'cocinero']), monitorController.apiActualizarEstadoItem);

// Endpoint API para la actualización de estados desde la interfaz POS (dependiente)
router.post('/api/pos/item-estado', ensureAuthenticated, asegurarTurnoActivo, checkRole(['dependiente', 'capitan', 'administrador', 'superadministrador']), posController.apiActualizarEstadoItem);

// Endpoint API para cancelar un ítem desde el POS (dependiente)
router.put('/pos/cancelar-item/:id_detalle', ensureAuthenticated, asegurarTurnoActivo, checkRole(['dependiente', 'capitan', 'administrador', 'superadministrador']), posController.apiCancelarItem);

// Endpoint de polling para consultar ítems en estado 'listo' de un pedido
router.get('/api/pos/items-listos/:id_pedido', posController.getItemsListos);

// Obtener monedas y tasas vigentes del turno activo para el modal de cobro POS
router.get('/api/pos/monedas-turno-activo', ensureAuthenticated, checkRole(['superadministrador', 'administrador', 'cajero', 'dependiente']), turnoController.obtenerMonedasTurnoActivo);

router.get('/pos/alertas-pendientes', asegurarTurnoActivo, posController.obtenerAlertasPendientes);

router.post('/pos/notificaciones/:id/leer', asegurarTurnoActivo, posController.marcarNotificacionLeida);

router.delete('/pos/pre-pedidos/:id', asegurarTurnoActivo, posController.eliminarPrePedido);

router.get('/mesas/:idMesa/pre-pedidos', asegurarTurnoActivo, posController.obtenerPrePedidosMesa);

router.delete('/mesas/:idMesa/pre-pedidos', asegurarTurnoActivo, posController.limpiarPrePedidosMesa);

// ========================================================
// VISTA PREVIA E IMPRESIÓN DE PRE-CUENTA
// ========================================================
// Renderiza el ticket optimizado para impresora térmica de 48mm
router.get('/pos/precuenta/:id_pedido', ensureAuthenticated, checkRole(['superadministrador', 'administrador', 'dependiente', 'capitan']), asegurarTurnoActivo, posController.viewPrecuenta);

// Endpoint API para el cobro de una orden
router.post('/pos/cobrar/:id_pedido', ensureAuthenticated, asegurarTurnoActivo, checkRole(['capitan', 'superadministrador', 'administrador', 'cajero', 'dependiente']), posController.procesarCobroAvanzado);

// Interfaz fija del punto de venta acoplada al pedido en curso
router.get('/pos/:id_pedido', ensureAuthenticated, checkRole(['superadministrador', 'administrador','dependiente', 'capitan']), asegurarTurnoActivo, posController.viewPOS);

module.exports = router;