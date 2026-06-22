const express = require('express');
const router = express.Router();
const entradasController = require('../controllers/entradasController');
// Importamos ambos guardianes
const { ensureAuthenticated, checkRole } = require('../middlewares/auth');

// Asegúrate de incluir tus middlewares de autenticación de sesión si los tienes
router.get('/almacenes/inventario/entradas', ensureAuthenticated, checkRole(['superadministrador', 'administrador', 'almacenero']), entradasController.getEntradasPage);
router.post('/almacenes/inventario/entradas/registrar', ensureAuthenticated, checkRole(['superadministrador', 'administrador', 'almacenero']), entradasController.procesarEntradaDirecta);

module.exports = router;