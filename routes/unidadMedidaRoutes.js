// routes/unidadMedidaRoutes.js
const express = require('express');
const router = express.Router();
const umController = require('../controllers/unidadMedidaController');
const { ensureAuthenticated, checkRole } = require('../middlewares/auth');

const admin = ['superadministrador', 'administrador'];

router.get('/unidades-medida', ensureAuthenticated, checkRole([...admin, 'almacenero']), umController.viewUnidades);

router.get('/api/unidades-medida', ensureAuthenticated, checkRole([...admin, 'almacenero']), umController.apiListarUnidades);
router.get('/api/unidades-medida/convertir', ensureAuthenticated, checkRole([...admin, 'almacenero']), umController.apiConvertir);
router.post('/api/unidades-medida', ensureAuthenticated, checkRole(admin), umController.apiCrearUnidad);
router.put('/api/unidades-medida/:id', ensureAuthenticated, checkRole(admin), umController.apiActualizarUnidad);
router.delete('/api/unidades-medida/:id', ensureAuthenticated, checkRole(admin), umController.apiEliminarUnidad);

router.get('/api/conversiones-unidades', ensureAuthenticated, checkRole([...admin, 'almacenero']), umController.apiListarConversiones);
router.post('/api/conversiones-unidades', ensureAuthenticated, checkRole(admin), umController.apiCrearConversion);
router.put('/api/conversiones-unidades/:id', ensureAuthenticated, checkRole(admin), umController.apiActualizarConversion);
router.delete('/api/conversiones-unidades/:id', ensureAuthenticated, checkRole(admin), umController.apiEliminarConversion);

module.exports = router;
