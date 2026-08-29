const express = require('express');
const router = express.Router();
const settingController = require('../controllers/settingController');
const backupController = require('../controllers/backupController');
const { ensureAuthenticated, checkRole } = require('../middlewares/auth');

// Vistas de configuración
router.get('/settings', ensureAuthenticated, checkRole(['superadministrador', 'administrador']), settingController.viewSettings);
router.get('/configuracion', ensureAuthenticated, checkRole(['superadministrador', 'administrador']), settingController.viewSettings);

// Salva y restauración de la base de datos (sólo administradores)
router.get('/configuracion/backup', ensureAuthenticated, checkRole(['superadministrador', 'administrador']), backupController.downloadBackup);
router.post('/configuracion/restore', ensureAuthenticated, checkRole(['superadministrador', 'administrador']), backupController.restoreUpload.single('backup'), backupController.restoreBackup);

// Guardar ajustes generales
router.post('/settings', ensureAuthenticated, checkRole(['superadministrador', 'administrador']), settingController.updateSettings);
router.post('/configuracion/guardar', ensureAuthenticated, checkRole(['superadministrador', 'administrador']), settingController.updateSettings);

// Opciones rápidas (Switches AJAX)
router.patch('/configuracion/opcion-rapida', ensureAuthenticated, checkRole(['superadministrador', 'administrador']), settingController.actualizarOpcionRapida);
router.post('/configuracion/opcion-rapida', ensureAuthenticated, checkRole(['superadministrador', 'administrador']), settingController.actualizarOpcionRapida);
router.post('/api/settings/opcion-rapida', ensureAuthenticated, checkRole(['superadministrador', 'administrador']), settingController.actualizarOpcionRapida);
router.patch('/api/settings/opcion-rapida', ensureAuthenticated, checkRole(['superadministrador', 'administrador']), settingController.actualizarOpcionRapida);

// CRUD de Categorías de Platillos (API)
router.get('/api/categorias-platillos', ensureAuthenticated, settingController.getCategoriasPlatillos);
router.post('/api/categorias-platillos/guardar', ensureAuthenticated, checkRole(['superadministrador', 'administrador']), settingController.saveCategoriaPlatillo);
router.post('/api/categorias-platillos', ensureAuthenticated, checkRole(['superadministrador', 'administrador']), settingController.saveCategoriaPlatillo);
router.patch('/api/categorias-platillos/:id/estado', ensureAuthenticated, checkRole(['superadministrador', 'administrador']), settingController.toggleCategoriaPlatillo);
router.put('/api/categorias-platillos/:id/toggle', ensureAuthenticated, checkRole(['superadministrador', 'administrador']), settingController.toggleCategoriaPlatillo);
router.delete('/api/categorias-platillos/:id', ensureAuthenticated, checkRole(['superadministrador', 'administrador']), settingController.deleteCategoriaPlatillo);

// CRUD de Áreas de Servicio / Salones (API — tabla ubicacion_mesa)
router.get('/api/ubicaciones-mesa', ensureAuthenticated, settingController.getUbicacionesMesa);
router.post('/api/ubicaciones-mesa/guardar', ensureAuthenticated, checkRole(['superadministrador', 'administrador']), settingController.saveUbicacionMesa);
router.post('/api/ubicaciones-mesa', ensureAuthenticated, checkRole(['superadministrador', 'administrador']), settingController.saveUbicacionMesa);
router.patch('/api/ubicaciones-mesa/:id/estado', ensureAuthenticated, checkRole(['superadministrador', 'administrador']), settingController.toggleUbicacionMesa);
router.put('/api/ubicaciones-mesa/:id/toggle', ensureAuthenticated, checkRole(['superadministrador', 'administrador']), settingController.toggleUbicacionMesa);
router.delete('/api/ubicaciones-mesa/:id', ensureAuthenticated, checkRole(['superadministrador', 'administrador']), settingController.deleteUbicacionMesa);

module.exports = router;
