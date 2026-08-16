const express = require('express');
const router = express.Router();
const settingController = require('../controllers/settingController');
// Importamos ambos guardianes
const { ensureAuthenticated, checkRole } = require('../middlewares/auth');


// Vista General de Ajustes
router.get('/configuracion', ensureAuthenticated, checkRole(['superadministrador', 'administrador']), settingController.viewSettings);
router.post('/configuracion/guardar', ensureAuthenticated, checkRole(['superadministrador', 'administrador']), settingController.updateSettings);

// API CRUD Categorías de Platillos (Menú)
router.get('/api/categorias-platillos', ensureAuthenticated, checkRole(['superadministrador', 'administrador']), settingController.getCategoriasPlatillos);
router.post('/api/categorias-platillos/guardar', ensureAuthenticated, checkRole(['superadministrador', 'administrador']), settingController.saveCategoriaPlatillo);
router.patch('/api/categorias-platillos/:id/estado', ensureAuthenticated, checkRole(['superadministrador', 'administrador']), settingController.toggleCategoriaPlatillo);
router.delete('/api/categorias-platillos/:id', ensureAuthenticated, checkRole(['superadministrador', 'administrador']), settingController.deleteCategoriaPlatillo);

router.patch('/configuracion/opcion-rapida', ensureAuthenticated, checkRole(['superadministrador', 'administrador']), settingController.actualizarOpcionRapida);

module.exports = router;