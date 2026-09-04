// routes/salidaManualRoutes.js - Rutas para gestión de salidas manuales de inventario
const express = require('express');
const router = express.Router();
const salidaManualController = require('../controllers/salidaManualController');
const { ensureAuthenticated, checkRole } = require('../middlewares/auth');
const { salidaManualValidationRules, handleValidationErrors } = require('../middlewares/validator');

// Vista principal de salidas manuales
router.get('/salidas-manuales', 
    ensureAuthenticated, 
    checkRole(['superadministrador', 'administrador', 'almacenero']), 
    salidaManualController.viewSalidasManuales
);

// Exportar a CSV el listado con los filtros del panel aplicados
router.get('/salidas-manuales/exportar',
    ensureAuthenticated,
    checkRole(['superadministrador', 'administrador', 'almacenero']),
    salidaManualController.exportarSalidasCSV
);

// API: Registrar nueva salida manual
router.post('/api/salidas-manuales',
    ensureAuthenticated,
    checkRole(['superadministrador', 'administrador', 'almacenero']),
    salidaManualValidationRules.create,
    handleValidationErrors,
    salidaManualController.createSalida
);

// API: Obtener salida por ID
router.get('/api/salidas-manuales/:id',
    ensureAuthenticated,
    checkRole(['superadministrador', 'administrador', 'almacenero']),
    salidaManualController.getSalida
);

// API: Obtener resumen por tipo
router.get('/api/salidas-manuales/resumen',
    ensureAuthenticated,
    checkRole(['superadministrador', 'administrador', 'almacenero']),
    salidaManualController.getResumen
);

// API: Obtener salidas por período
router.get('/api/salidas-manuales/periodo',
    ensureAuthenticated,
    checkRole(['superadministrador', 'administrador', 'almacenero']),
    salidaManualController.getSalidasPorPeriodo
);

module.exports = router;
