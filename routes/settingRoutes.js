// routes/settingRoutes.js
const express = require('express');
const router = express.Router();
const settingController = require('../controllers/settingController');

// Ruta para ver el panel de configuración
router.get('/configuracion', settingController.viewSettings);

// Ruta para procesar la actualización mediante AJAX
router.post('/configuracion/guardar', settingController.updateSettings);

module.exports = router;