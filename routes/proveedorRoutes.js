// routes/proveedorRoutes.js
// V13 (C1): catálogo de proveedores e historial de compras.
const express = require('express');
const router = express.Router();
const { ensureAuthenticated, checkRole } = require('../middlewares/auth');
const proveedorController = require('../controllers/proveedorController');

const puedeOperar = checkRole(['superadministrador', 'administrador', 'almacenero']);

router.get('/proveedores', ensureAuthenticated, puedeOperar, proveedorController.renderProveedores);
router.post('/proveedores', ensureAuthenticated, puedeOperar, proveedorController.crear);
router.get('/proveedores/:id', ensureAuthenticated, puedeOperar, proveedorController.renderDetalle);
router.post('/proveedores/:id', ensureAuthenticated, puedeOperar, proveedorController.actualizar);
router.post('/proveedores/:id/estado', ensureAuthenticated, puedeOperar, proveedorController.cambiarEstado);

module.exports = router;
