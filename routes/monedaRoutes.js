// routes/monedas.js
const express = require('express');
const router = express.Router();
const monedaController = require('../controllers/monedaController');
// Importa tus middlewares de autenticación/roles según corresponda
const { ensureAuthenticated, checkRole } = require('../middlewares/auth');

// --- RUTA HTML ---
// Vista principal de administración de monedas
router.get('/monedas', ensureAuthenticated, checkRole(['superadministrador', 'administrador']), monedaController.renderMonedas);

// --- API REST ENDPOINTS ---
// Obtener listado JSON (útil para dinámicos en el POS)
router.get('/api/monedas', ensureAuthenticated, checkRole(['superadministrador', 'administrador']), monedaController.obtenerMonedasAPI);

// Crear nueva moneda
router.post('/api/crear-moneda', ensureAuthenticated, checkRole(['superadministrador', 'administrador']), monedaController.crearMoneda);

// Actualizar moneda existente
router.put('/api/act-moneda/:id', ensureAuthenticated, checkRole(['superadministrador', 'administrador']), monedaController.actualizarMoneda);

// Establecer moneda como base del sistema (CUP, USD, etc.)
router.patch('/api/moneda/:id/establecer-base', ensureAuthenticated, checkRole(['superadministrador', 'administrador']), monedaController.establecerMonedaBase);

// Baja lógica o reactivación (activo: true/false)
router.patch('/api/moneda/:id/estado', ensureAuthenticated, checkRole(['superadministrador', 'administrador']), monedaController.cambiarEstado);

module.exports = router;