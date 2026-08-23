const express = require('express');
const router = express.Router();
const almacenController = require('../controllers/almacenController');
// Importamos ambos guardianes
const { ensureAuthenticated, checkRole } = require('../middlewares/auth');

// Rutas de Vistas e interacciones CRUD (Se mantienen 100% intactas)
router.get('/almacenes', ensureAuthenticated, checkRole(['superadministrador', 'administrador', 'almacenero']), almacenController.viewAlmacenes);
router.get('/almacen/:id', ensureAuthenticated, checkRole(['superadministrador', 'administrador', 'almacenero']), almacenController.getAlmacen);
router.post('/almacenes/add', ensureAuthenticated, checkRole(['superadministrador', 'administrador']), almacenController.addAlmacen);
router.put('/almacen/edit/:id', ensureAuthenticated, checkRole(['superadministrador', 'administrador']), almacenController.editAlmacen);
router.delete('/almacen/delete/:id', ensureAuthenticated, checkRole(['superadministrador', 'administrador']), almacenController.deleteAlmacen);

// Adiciones de sub-módulos (Sincronizados sin romper las llamadas anteriores)
router.get('/entradas', ensureAuthenticated, checkRole(['superadministrador', 'administrador', 'almacenero']), almacenController.getEntradasView);

module.exports = router;