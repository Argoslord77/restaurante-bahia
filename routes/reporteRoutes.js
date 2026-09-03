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

// ── Tendencias de venta ─────────────────────────────────────────────────
// Evolución en el tiempo: serie diaria/semanal, comparación contra el
// período anterior equivalente y productos a la alza/baja.
router.get('/reportes/tendencias', ensureAuthenticated, puedeVer, reportesController.viewTendencias);
router.get('/reportes/tendencias/exportar', ensureAuthenticated, puedeVer, reportesController.exportarTendencias);

// ── Ventas y movimiento de inventario del turno ─────────────────────────
// Tragos y platillos vendidos en un turno con el descuento de kardex que
// generaron; con detalle por trago/platillo. El desglose de inventario solo
// se muestra si la licencia incluye la función 'inventario'.
router.get('/reportes/ventas-turno', ensureAuthenticated, puedeVer, reportesController.viewVentasTurno);
router.get('/reportes/ventas-turno/exportar', ensureAuthenticated, puedeVer, reportesController.exportarVentasTurno);
router.get('/reportes/ventas-turno/platillo/:platilloId/exportar', ensureAuthenticated, puedeVer, reportesController.exportarVentasTurnoPlatillo);
router.get('/reportes/ventas-turno/platillo/:platilloId', ensureAuthenticated, puedeVer, reportesController.viewVentasTurnoPlatillo);

// ── Exportaciones a CSV (Excel) ─────────────────────────────────────────
router.get('/reportes/salud-inventario/exportar', ensureAuthenticated, puedeVer, reportesController.exportarSaludInventario);
router.get('/reportes/margen-platillos/exportar', ensureAuthenticated, puedeVer, reportesController.exportarMargenPlatillos);
router.get('/reportes/explosion-recetas/exportar', ensureAuthenticated, puedeVer, reportesController.exportarExplosionRecetas);
router.get('/reportes/ventas-mesero/exportar', ensureAuthenticated, puedeVer, reportesController.exportarVentasMesero);
router.get('/reportes/consumo-insumos/exportar', ensureAuthenticated, puedeVer, reportesController.exportarConsumoInsumos);
router.get('/reportes/ventas-horas/exportar', ensureAuthenticated, puedeVer, reportesController.exportarVentasHoras);

module.exports = router;
