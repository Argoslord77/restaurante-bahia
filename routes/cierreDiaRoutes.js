// Rutas de Cierre del Día
const express = require('express');
const router = express.Router();
const cierreDiaController = require('../controllers/cierreDiaController');
// Importamos ambos guardianes
const { ensureAuthenticated, checkRole } = require('../middlewares/auth');
router.get('/cierre-dia', ensureAuthenticated, checkRole(['superadministrador', 'administrador', 'cajero', 'economico']), cierreDiaController.renderCierreDia);
router.get('/cierre-dia/ticket', ensureAuthenticated, checkRole(['superadministrador', 'administrador', 'cajero', 'economico']), cierreDiaController.renderCierreTicket);
router.get('/cierre-dia/exportar', ensureAuthenticated, checkRole(['superadministrador', 'administrador', 'cajero', 'economico']), cierreDiaController.exportarCierre);
router.get('/cierre-dia/pdf', ensureAuthenticated, checkRole(['superadministrador', 'administrador', 'cajero', 'economico']), cierreDiaController.exportarCierrePDF);
// Ticket en solitario de una orden individual (desde Cierre del Día).
// Distinto de la pre-cuenta del POS: regresa al Cierre del Día, no al POS.
router.get('/cierre-dia/ticket-pedido/:id_pedido', ensureAuthenticated, checkRole(['superadministrador', 'administrador', 'cajero', 'economico']), cierreDiaController.viewTicketPedido);
router.post('/cierre-dia/liquidar-cuenta/:id_pedido', ensureAuthenticated, checkRole(['superadministrador', 'administrador', 'cajero']), cierreDiaController.liquidarCuenta);
// routes/cierreDiaRoutes.js
router.get(
    '/cierres-historico', 
    ensureAuthenticated, 
    checkRole(['superadministrador', 'administrador', 'cajero', 'economico']), 
    cierreDiaController.renderHistorialCierres
);

router.get(
    '/cierres-historico/exportar',
    ensureAuthenticated,
    checkRole(['superadministrador', 'administrador', 'cajero', 'economico']),
    cierreDiaController.exportarHistorico
);
router.get(
    '/cierres-historico/pdf',
    ensureAuthenticated,
    checkRole(['superadministrador', 'administrador', 'cajero', 'economico']),
    cierreDiaController.exportarHistoricoPDF
);

router.get(
    '/api/cierres-historico/:id', 
    ensureAuthenticated, 
    checkRole(['superadministrador', 'administrador', 'cajero', 'economico']), 
    cierreDiaController.apiObtenerDetalleCierre
);


module.exports = router;