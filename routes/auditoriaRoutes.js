// routes/auditoriaRoutes.js
const express = require('express');
const router = express.Router();
const auditoriaController = require('../controllers/auditoriaController');
const { ensureAuthenticated, checkRole } = require('../middlewares/auth');

const soloAdministradores = ['superadministrador', 'administrador'];

// Consulta del registro
router.get('/auditoria', ensureAuthenticated, checkRole(soloAdministradores), auditoriaController.viewAuditoria);
router.get('/api/auditoria', ensureAuthenticated, checkRole(soloAdministradores), auditoriaController.apiAuditoria);

// Exportación a CSV (queda registrada como operación crítica)
router.get('/auditoria/exportar', ensureAuthenticated, checkRole(soloAdministradores), auditoriaController.exportarAuditoria);

// Baliza de impresión enviada por el navegador desde las vistas imprimibles.
// Accesible a cualquier usuario autenticado, porque quien imprime una
// pre-cuenta es el dependiente, no un administrador.
router.post('/api/auditoria/impresion', ensureAuthenticated, auditoriaController.registrarImpresion);

// Purga según política de retención: solo superadministrador
router.post('/auditoria/purgar', ensureAuthenticated, checkRole(['superadministrador']), auditoriaController.purgarAuditoria);

module.exports = router;
