// routes/reporteRoutes.js
// Centro de reportes y kardex: punto de entrada al control físico y
// financiero del negocio.
const express = require('express');
const router = express.Router();
const { ensureAuthenticated, checkRole } = require('../middlewares/auth');
const reportesController = require('../controllers/reportesController');
const kardexController = require('../controllers/kardexController');
const { requiereEmpresa } = require('../middlewares/licenciaPlan');

// Perfiles con acceso a la información de control (mismo criterio que
// fichas de costo y valorización).
const puedeVer = checkRole(['superadministrador', 'administrador', 'almacenero', 'jefe-cocina', 'economico']);

// ── Kardex de inventario ────────────────────────────────────────────────
router.get('/kardex', ensureAuthenticated, puedeVer, kardexController.viewKardex);
router.get('/kardex/exportar', ensureAuthenticated, puedeVer, kardexController.exportarKardex);

// ── Centro de reportes (hub) ────────────────────────────────────────────
router.get('/reportes', ensureAuthenticated, puedeVer, reportesController.viewHub);

// ── Reportes nuevos ─────────────────────────────────────────────────────
router.get('/reportes/salud-inventario', ensureAuthenticated, puedeVer, reportesController.viewSaludInventario);
router.get('/reportes/margen-platillos', ensureAuthenticated, puedeVer, reportesController.viewMargenPlatillos);
router.get('/reportes/explosion-recetas', ensureAuthenticated, puedeVer, reportesController.viewExplosionRecetas);
router.get('/reportes/ventas-mesero', ensureAuthenticated, puedeVer, reportesController.viewVentasMesero);
router.get('/reportes/consumo-insumos', ensureAuthenticated, puedeVer, reportesController.viewConsumoInsumos);
router.get('/reportes/ventas-horas', ensureAuthenticated, puedeVer, reportesController.viewVentasHoras);
router.get('/reportes/turno-inventario', ensureAuthenticated, puedeVer, requiereEmpresa, reportesController.viewTurnoInventario);

// ── Exportaciones a CSV (Excel) ─────────────────────────────────────────
router.get('/reportes/salud-inventario/exportar', ensureAuthenticated, puedeVer, reportesController.exportarSaludInventario);
router.get('/reportes/margen-platillos/exportar', ensureAuthenticated, puedeVer, reportesController.exportarMargenPlatillos);
router.get('/reportes/explosion-recetas/exportar', ensureAuthenticated, puedeVer, reportesController.exportarExplosionRecetas);
router.get('/reportes/ventas-mesero/exportar', ensureAuthenticated, puedeVer, reportesController.exportarVentasMesero);
router.get('/reportes/consumo-insumos/exportar', ensureAuthenticated, puedeVer, reportesController.exportarConsumoInsumos);
router.get('/reportes/ventas-horas/exportar', ensureAuthenticated, puedeVer, reportesController.exportarVentasHoras);

module.exports = router;
