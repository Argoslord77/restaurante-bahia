// Rutas de Cierre del Día
const express = require('express');
const router = express.Router();
const cierreDiaController = require('../controllers/cierreDiaController');
// Importamos ambos guardianes
const { ensureAuthenticated, checkRole } = require('../middlewares/auth');
router.get('/cierre-dia', ensureAuthenticated, checkRole(['superadministrador', 'administrador', 'cajero', 'economico']), cierreDiaController.renderCierreDia);
router.get('/cierre-dia/ticket', ensureAuthenticated, checkRole(['superadministrador', 'administrador', 'cajero', 'economico']), cierreDiaController.renderCierreTicket);
router.post('/cierre-dia/liquidar-cuenta/:id_pedido', ensureAuthenticated, checkRole(['superadministrador', 'administrador', 'cajero']), cierreDiaController.liquidarCuenta);
// routes/cierreDiaRoutes.js
router.get(
    '/cierres-historico', 
    ensureAuthenticated, 
    checkRole(['superadministrador', 'administrador', 'cajero', 'economico']), 
    cierreDiaController.renderHistorialCierres
);

router.get(
    '/api/cierres-historico/:id', 
    ensureAuthenticated, 
    checkRole(['superadministrador', 'administrador', 'cajero', 'economico']), 
    cierreDiaController.apiObtenerDetalleCierre
);


module.exports = router;