const express = require('express');
const router = express.Router();
const posController = require('../controllers/posController');
const dashboardDependienteController = require('../controllers/dashboardDependienteController');
const { ensureAuthenticated } = require('../middlewares/auth'); // Ajusta la ruta según tu proyecto
const { posValidationRules, handleValidationErrors } = require('../middlewares/validator');

// ========================================================
// RUTAS DEL DASHBOARD DEL DEPENDIENTE
// ========================================================
// Vista principal para gestionar y auditar el salón
router.get('/dependiente/dashboard', ensureAuthenticated, dashboardDependienteController.viewDependienteDashboard);


// ========================================================
// RUTAS OPERACIONALES DEL CIRCUITO POS
// ========================================================
// Variante 1: Inicialización manual de orden desde el Dashboard
router.post('/pos/init-manual', posValidationRules.initOrderManual, handleValidationErrors, ensureAuthenticated, posController.initOrderManual);

// Variante 2: Entrada automática por lectura de Código QR físico
router.get('/qr/:hash', ensureAuthenticated, posController.initOrderQR);

// Interfaz fija del punto de venta acoplada al pedido en curso
router.get('/pos/:id_pedido', ensureAuthenticated, posController.viewPOS);


// ========================================================
// ENDPOINTS ASÍNCRONOS (API)
// ========================================================
// Guardado y modificación transaccional de los platillos desde la comanda
router.post('/api/pos/save', posValidationRules.saveOrder, handleValidationErrors, ensureAuthenticated, posController.apiSaveOrder);

module.exports = router;