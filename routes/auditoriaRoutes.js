// routes/auditoriaRoutes.js
const express = require('express');
const router = express.Router();
const auditoriaController = require('../controllers/auditoriaController');
const { ensureAuthenticated, checkRole } = require('../middlewares/auth');

const soloAdministradores = ['superadministrador', 'administrador'];

router.get('/auditoria', ensureAuthenticated, checkRole(soloAdministradores), auditoriaController.viewAuditoria);
router.get('/api/auditoria', ensureAuthenticated, checkRole(soloAdministradores), auditoriaController.apiAuditoria);

module.exports = router;
