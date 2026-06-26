// routes/transferenciaRoutes.js - Rutas para gestión de transferencias entre almacenes
const express = require('express');
const router = express.Router();
const transferenciaController = require('../controllers/transferenciaController');
const { ensureAuthenticated, checkRole } = require('../middlewares/auth');
const { transferenciaValidationRules, handleValidationErrors } = require('../middlewares/validator');

// Vista principal de transferencias
router.get('/transferencias', 
    ensureAuthenticated, 
    checkRole(['superadministrador', 'administrador', 'almacenero']), 
    transferenciaController.viewTransferencias
);

// API: Crear nueva solicitud de transferencia
router.post('/api/transferencias',
    ensureAuthenticated,
    checkRole(['superadministrador', 'administrador', 'almacenero']),
    transferenciaValidationRules.create,
    handleValidationErrors,
    transferenciaController.createSolicitud
);

// API: Aprobar transferencia
router.put('/api/transferencias/:id/aprobar',
    ensureAuthenticated,
    checkRole(['superadministrador', 'administrador']),
    transferenciaController.aprobarTransferencia
);

// API: Rechazar transferencia
router.put('/api/transferencias/:id/rechazar',
    ensureAuthenticated,
    checkRole(['superadministrador', 'administrador']),
    transferenciaController.rechazarTransferencia
);

// API: Completar transferencia
router.put('/api/transferencias/:id/completar',
    ensureAuthenticated,
    checkRole(['superadministrador', 'administrador', 'almacenero']),
    transferenciaController.completarTransferencia
);

// API: Obtener transferencia por ID
router.get('/api/transferencias/:id',
    ensureAuthenticated,
    checkRole(['superadministrador', 'administrador', 'almacenero']),
    transferenciaController.getTransferencia
);

// API: Obtener transferencias por almacén
router.get('/api/transferencias/almacen/:almacenId',
    ensureAuthenticated,
    checkRole(['superadministrador', 'administrador', 'almacenero']),
    transferenciaController.getTransferenciasByAlmacen
);

module.exports = router;
