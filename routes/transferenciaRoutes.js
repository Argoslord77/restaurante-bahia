// routes/transferenciaRoutes.js - Rutas para gestión de transferencias entre almacenes
const express = require('express');
const router = express.Router();
const transferenciaController = require('../controllers/transferenciaController');
const { ensureAuthenticated, checkRole } = require('../middlewares/auth');
const { transferenciaValidationRules, handleValidationErrors } = require('../middlewares/validator');
const { asegurarTurnoActivo } = require('../middlewares/verificarTurno');

// Vista principal de transferencias
router.get('/transferencias', 
    ensureAuthenticated, 
    checkRole(['superadministrador', 'administrador', 'almacenero']), 
    transferenciaController.viewTransferencias
);

// API: Crear nueva solicitud de transferencia (Pendiente)
router.post('/api/transferencias',
    asegurarTurnoActivo,
    ensureAuthenticated,
    checkRole(['superadministrador', 'administrador', 'almacenero']),
    transferenciaController.createSolicitud
);

// API: Aprobar transferencia (Pasa a Aprobada)
router.put('/api/transferencias/:id/aprobar',
    asegurarTurnoActivo,
    ensureAuthenticated,
    checkRole(['superadministrador', 'administrador']),
    transferenciaController.aprobarTransferencia
);

// API: Rechazar transferencia (Pasa a Rechazada)
router.put('/api/transferencias/:id/rechazar',
    asegurarTurnoActivo,
    ensureAuthenticated,
    checkRole(['superadministrador', 'administrador']),
    transferenciaController.rechazarTransferencia
);

// API: Completar transferencia (Afecta stock físico en lotes)
router.put('/api/transferencias/:id/completar',
    asegurarTurnoActivo,
    ensureAuthenticated,
    checkRole(['superadministrador', 'administrador', 'almacenero']),
    transferenciaController.completarTransferencia
);

// API: Obtener transferencia detallada por ID
router.get('/api/transferencias/:id',
    ensureAuthenticated,
    checkRole(['superadministrador', 'administrador', 'almacenero']),
    transferenciaController.getTransferencia
);

module.exports = router;