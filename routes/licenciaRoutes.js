// routes/licenciaRoutes.js
const express = require('express');
const router = express.Router();
const licenciaController = require('../controllers/licenciaController');
const { ensureAuthenticated, checkRole } = require('../middlewares/auth');

const soloAdmin = ['superadministrador', 'administrador'];

router.get('/licencia', ensureAuthenticated, checkRole(soloAdmin), licenciaController.viewLicencia);
router.get('/licencia/solicitud', ensureAuthenticated, checkRole(soloAdmin), licenciaController.descargarSolicitud);
router.post('/licencia/instalar', ensureAuthenticated, checkRole(['superadministrador']), licenciaController.instalarLicencia);
router.get('/api/licencia/estado', ensureAuthenticated, checkRole(soloAdmin), licenciaController.apiEstado);

module.exports = router;
