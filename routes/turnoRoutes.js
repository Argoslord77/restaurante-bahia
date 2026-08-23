const express = require('express');
const router = express.Router();
// Importa tu controlador de turnos (asegúrate de que la ruta sea correcta en tu estructura)
const turnoController = require('../controllers/turnoController');
// Importamos ambos guardianes
const { ensureAuthenticated, checkRole } = require('../middlewares/auth');
/**
 * ==========================================
 * RUTAS DE RENDERIZADO Y VISTAS
 * ==========================================
 */

// Vista principal de control de turnos, arqueo e historial
router.get('/turnos-servicio', ensureAuthenticated, checkRole(['superadministrador', 'administrador', 'cajero']), turnoController.renderTurnos);


/**
 * ==========================================
 * RUTAS DEL ENFOQUE HÍBRIDO (APERTURA Y CIERRE)
 * ==========================================
 */

// 1. Apertura de Turno Operativo y Caja Inicial
// Recibe: { monto_apertura, observaciones } vía JSON (fetch)
router.post('/turno/apertura', ensureAuthenticated, checkRole(['superadministrador', 'administrador']), turnoController.abrirTurno);

// 2. Arqueo de Caja y Cierre Financiero Definitivo
// Recibe: { monto_cierre_real, observaciones_cierre } vía JSON (fetch)
router.post('/turno/cierre', ensureAuthenticated, checkRole(['superadministrador', 'administrador']), turnoController.cerrarTurno);


/**
 * ==========================================
 * RUTAS COMPLEMENTARIAS (Opcionales para el flujo completo)
 * ==========================================
 */

// Obtener el estado del turno actual en formato JSON (Útil para validaciones en el frontend de ordenes/ventas)
router.get('/turno/estado-actual', ensureAuthenticated, checkRole(['superadministrador', 'administrador', 'cajero']), turnoController.obtenerEstadoTurno);

module.exports = router;