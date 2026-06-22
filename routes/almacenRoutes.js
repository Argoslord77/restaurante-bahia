const express = require('express');
const router = express.Router();
const almacenController = require('../controllers/almacenController');
const inventarioController = require('../controllers/inventarioController');
// Importamos ambos guardianes
const { ensureAuthenticated, checkRole } = require('../middlewares/auth');

// Rutas de Vistas e interacciones CRUD
router.get('/almacenes', ensureAuthenticated, checkRole(['superadministrador', 'administrador', 'almacenero']), almacenController.viewAlmacenes);
router.get('/almacen/:id', ensureAuthenticated, checkRole(['superadministrador', 'administrador', 'almacenero']), almacenController.getAlmacen);
router.post('/almacenes/add', ensureAuthenticated, checkRole(['superadministrador', 'administrador']), almacenController.addAlmacen);
router.put('/almacen/edit/:id', ensureAuthenticated, checkRole(['superadministrador', 'administrador']), almacenController.editAlmacen);
router.delete('/almacen/delete/:id', ensureAuthenticated, checkRole(['superadministrador', 'administrador']), almacenController.deleteAlmacen);
router.get('/inventario/stock', ensureAuthenticated, checkRole(['superadministrador', 'administrador', 'almacenero']), inventarioController.renderStockPanel);

module.exports = router;