// routes/reporteRoutes.js
// Centro de reportes y kardex: punto de entrada al control físico y
// financiero del negocio.
const express = require('express');
const router = express.Router();
const { ensureAuthenticated, checkRole } = require('../middlewares/auth');
const reportesController = require('../controllers/reportesController');
const kardexController = require('../controllers/kardexController');

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
router.get('/reportes/ventas-turno', ensureAuthenticated, puedeVer, reportesController.viewVentasTurno);
router.get('/reportes/propinas', ensureAuthenticated, puedeVer, reportesController.viewPropinas);
router.get('/reportes/sugerido-compra', ensureAuthenticated, puedeVer, reportesController.viewSugerido);

// ── Exportaciones a CSV (Excel) ─────────────────────────────────────────
router.get('/reportes/salud-inventario/exportar', ensureAuthenticated, puedeVer, reportesController.exportarSaludInventario);
router.get('/reportes/margen-platillos/exportar', ensureAuthenticated, puedeVer, reportesController.exportarMargenPlatillos);
router.get('/reportes/explosion-recetas/exportar', ensureAuthenticated, puedeVer, reportesController.exportarExplosionRecetas);
router.get('/reportes/ventas-mesero/exportar', ensureAuthenticated, puedeVer, reportesController.exportarVentasMesero);
router.get('/reportes/consumo-insumos/exportar', ensureAuthenticated, puedeVer, reportesController.exportarConsumoInsumos);
router.get('/reportes/ventas-horas/exportar', ensureAuthenticated, puedeVer, reportesController.exportarVentasHoras);
router.get('/reportes/ventas-turno/exportar', ensureAuthenticated, puedeVer, reportesController.exportarVentasTurno);
router.get('/reportes/propinas/exportar', ensureAuthenticated, puedeVer, reportesController.exportarPropinas);
router.get('/reportes/sugerido-compra/exportar', ensureAuthenticated, puedeVer, reportesController.exportarSugerido);

// ── Exportaciones a PDF (gemelas del CSV) ───────────────────────────────
router.get('/kardex/pdf', ensureAuthenticated, puedeVer, kardexController.exportarKardexPDF);
router.get('/reportes/salud-inventario/pdf', ensureAuthenticated, puedeVer, reportesController.exportarSaludInventarioPDF);
router.get('/reportes/margen-platillos/pdf', ensureAuthenticated, puedeVer, reportesController.exportarMargenPlatillosPDF);
router.get('/reportes/explosion-recetas/pdf', ensureAuthenticated, puedeVer, reportesController.exportarExplosionRecetasPDF);
router.get('/reportes/ventas-mesero/pdf', ensureAuthenticated, puedeVer, reportesController.exportarVentasMeseroPDF);
router.get('/reportes/consumo-insumos/pdf', ensureAuthenticated, puedeVer, reportesController.exportarConsumoInsumosPDF);
router.get('/reportes/ventas-horas/pdf', ensureAuthenticated, puedeVer, reportesController.exportarVentasHorasPDF);
router.get('/reportes/ventas-turno/pdf', ensureAuthenticated, puedeVer, reportesController.exportarVentasTurnoPDF);
router.get('/reportes/propinas/pdf', ensureAuthenticated, puedeVer, reportesController.exportarPropinasPDF);
router.get('/reportes/sugerido-compra/pdf', ensureAuthenticated, puedeVer, reportesController.exportarSugeridoPDF);

module.exports = router;
