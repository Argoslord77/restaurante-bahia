// routes/reservaRoutes.js
// V12 (C2): reservas de mesa. Ver: personal de sala; operar: encargados.
const express = require('express');
const router = express.Router();
const { ensureAuthenticated, checkRole } = require('../middlewares/auth');
const reservaController = require('../controllers/reservaController');

const puedeVer = checkRole(['superadministrador', 'administrador', 'capitan', 'cajero', 'dependiente']);
const puedeOperar = checkRole(['superadministrador', 'administrador', 'capitan', 'cajero']);

router.get('/reservas', ensureAuthenticated, puedeVer, reservaController.renderReservas);
router.get('/reservas/rango', ensureAuthenticated, puedeVer, reservaController.listarRango);
router.post('/reservas', ensureAuthenticated, puedeOperar, reservaController.crear);
router.post('/reservas/:id/llegada', ensureAuthenticated, puedeOperar, reservaController.llegada);
router.post('/reservas/:id/cancelar', ensureAuthenticated, puedeOperar, reservaController.cancelar);
router.post('/reservas/:id/no-show', ensureAuthenticated, puedeOperar, reservaController.noShow);

module.exports = router;
