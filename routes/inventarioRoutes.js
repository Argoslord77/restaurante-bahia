// routes/inventarioRoutes.js
const express = require('express');
const router = express.Router();
const inventarioController = require('../controllers/inventarioController');
const { ensureAuthenticated, checkRole } = require('../middlewares/auth');

// Vista física
router.get('/inventario/stock', 
    ensureAuthenticated, 
    checkRole(['superadministrador', 'administrador', 'almacenero']), 
    inventarioController.viewStockGeneral
);

// Reporte de valorización de inventario (Σ cantidad × costo por almacén/lote)
router.get(
    '/inventario/valorizacion',
    ensureAuthenticated,
    checkRole(['superadministrador', 'administrador', 'almacenero', 'economico']),
    inventarioController.renderValorizacion
);

// Exportaciones del reporte de valorización (mismos datos, mismos roles)
router.get(
    '/inventario/valorizacion/exportar',
    ensureAuthenticated,
    checkRole(['superadministrador', 'administrador', 'almacenero', 'economico']),
    inventarioController.exportarValorizacion
);
router.get(
    '/inventario/valorizacion/pdf',
    ensureAuthenticated,
    checkRole(['superadministrador', 'administrador', 'almacenero', 'economico']),
    inventarioController.exportarValorizacionPDF
);

// Endpoint API que el Frontend consultará asíncronamente vía fetch()
router.get('/inventario/api/stock/:almacenId', 
    ensureAuthenticated, 
    checkRole(['superadministrador', 'administrador', 'almacenero']), 
    inventarioController.getStockByAlmacenApi
);

module.exports = router;