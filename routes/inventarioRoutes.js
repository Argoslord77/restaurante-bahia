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

// Endpoint API que el Frontend consultará asíncronamente vía fetch()
router.get('/inventario/api/stock/:almacenId', 
    ensureAuthenticated, 
    checkRole(['superadministrador', 'administrador', 'almacenero']), 
    inventarioController.getStockByAlmacenApi
);

module.exports = router;