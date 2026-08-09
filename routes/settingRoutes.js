const express = require('express');
const router = express.Router();
const settingController = require('../controllers/settingController');

// Vista General de Ajustes
router.get('/configuracion', settingController.viewSettings);
router.post('/configuracion/guardar', settingController.updateSettings);

// API CRUD Categorías de Platillos (Menú)
router.get('/api/categorias-platillos', settingController.getCategoriasPlatillos);
router.post('/api/categorias-platillos/guardar', settingController.saveCategoriaPlatillo);
router.patch('/api/categorias-platillos/:id/estado', settingController.toggleCategoriaPlatillo);
router.delete('/api/categorias-platillos/:id', settingController.deleteCategoriaPlatillo);

module.exports = router;