// routes/cuentaRoutes.js
// V12 (C3): cuentas abiertas — trasladar, unir y dividir (caja/encargados).
const express = require('express');
const router = express.Router();
const { ensureAuthenticated, checkRole } = require('../middlewares/auth');
const cuentaController = require('../controllers/cuentaController');

const puedeOperar = checkRole(['superadministrador', 'administrador', 'capitan', 'cajero']);

router.get('/cuentas', ensureAuthenticated, puedeOperar, cuentaController.renderCuentas);
router.get('/cuentas/:id', ensureAuthenticated, puedeOperar, cuentaController.detalle);
router.post('/cuentas/:id/trasladar', ensureAuthenticated, puedeOperar, cuentaController.trasladar);
router.post('/cuentas/:id/unir', ensureAuthenticated, puedeOperar, cuentaController.unir);
router.post('/cuentas/:id/dividir', ensureAuthenticated, puedeOperar, cuentaController.dividir);

module.exports = router;
