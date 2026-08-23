// routes/entradaRoutes.js
const express = require('express');
const router = express.Router();
const entradaController = require('../controllers/entradaController');
const { ensureAuthenticated, checkRole } = require('../middlewares/auth');

// VISTA PRINCIPAL: Render del panel de entradas bajo la subruta de almacenes
router.get('/almacenes/entradas', ensureAuthenticated, checkRole(['superadministrador', 'administrador', 'almacenero']), entradaController.viewEntradas);

// API ENDPOINT: Procesamiento del formulario AJAX POST
router.post('/almacenes/entradas/api', ensureAuthenticated, checkRole(['superadministrador', 'administrador', 'almacenero']), entradaController.createEntrada);

module.exports = router;