// routes/fichaCostoRoutes.js - Módulo de ficha de costo de insumos
const express = require('express');
const router = express.Router();
const fichaCostoController = require('../controllers/fichaCostoController');
const { ensureAuthenticated, checkRole } = require('../middlewares/auth');

// Consultar el costeo: perfiles que necesitan verlo para trabajar
const puedeConsultar = checkRole(['superadministrador', 'administrador', 'almacenero', 'jefe-cocina', 'economico']);
// Modificar costos y, sobre todo, precios de carta: solo dirección
const puedeEditar = checkRole(['superadministrador', 'administrador']);

// Vistas
router.get('/fichas-costo', ensureAuthenticated, puedeConsultar, fichaCostoController.viewFichas);
router.get('/fichas-costo/rentabilidad', ensureAuthenticated, puedeConsultar, fichaCostoController.viewRentabilidad);
router.get('/fichas-costo/:productoId', ensureAuthenticated, puedeConsultar, fichaCostoController.viewFichaProducto);

// API: cálculo en vivo mientras se edita (no persiste nada)
router.post('/api/fichas-costo/previsualizar', ensureAuthenticated, puedeConsultar, fichaCostoController.apiPrevisualizar);

// API: platillos afectados por el costo de un insumo
router.get('/api/fichas-costo/:productoId/impacto', ensureAuthenticated, puedeConsultar, fichaCostoController.apiImpacto);

// API: guardar la ficha (crea versión nueva; NO toca los precios de carta)
router.post('/api/fichas-costo/:productoId', ensureAuthenticated, puedeEditar, fichaCostoController.apiGuardar);

// API: aplicar los precios de carta confirmados por el operario
router.post('/api/fichas-costo/precios/aplicar', ensureAuthenticated, puedeEditar, fichaCostoController.apiAplicarPrecios);

module.exports = router;
