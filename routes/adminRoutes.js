const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const tableController = require('../controllers/tableController');
const menuController = require('../controllers/menuController');
const dashboardController = require('../controllers/dashboardController');
const path = require('path');
const multer = require('multer');
const { menuValidationRules, mesaValidationRules, handleValidationErrors } = require('../middlewares/validator');

// Configuración de almacenamiento de Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/'); // Asegúrate de que esta carpeta exista en tu proyecto
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Importamos ambos guardianes
const { ensureAuthenticated, checkRole } = require('../middlewares/auth');

// URL Real: GET http://localhost:3000/admin/dashboard
router.get('/dashboard', ensureAuthenticated, checkRole(['superadministrador', 'administrador']), dashboardController.index);

// ==========================================
// MÓDULO: GESTIÓN DE MESAS
// ==========================================

// Vista principal de las mesas
router.get('/mesas', ensureAuthenticated, checkRole(['superadministrador', 'administrador', 'dependiente']), tableController.listTables);

// Acciones CRUD de mesas (Restringido solo a administradores)
router.post('/mesas/crear', mesaValidationRules.create, handleValidationErrors, ensureAuthenticated, checkRole(['superadministrador', 'administrador']), tableController.createTable);
router.post('/mesas/editar/:id', mesaValidationRules.update, handleValidationErrors, ensureAuthenticated, checkRole(['superadministrador', 'administrador']), tableController.updateTable);
router.delete('/mesas/eliminar/:id', ensureAuthenticated, checkRole(['superadministrador', 'administrador']), tableController.deleteTable);

// ==========================================
// MÓDULO: GESTIÓN DE PLATILLOS / MENÚ
// ==========================================

// Vista principal del menú (Listar todos los platillos)
router.get('/menu', ensureAuthenticated, checkRole(['superadministrador', 'administrador']), menuController.listMenu);

// Acciones CRUD de Platillos
router.post('/menu/crear', upload.single('foto'), menuValidationRules.create, handleValidationErrors, ensureAuthenticated, checkRole(['superadministrador', 'administrador']), menuController.createDish);
router.post('/menu/editar/:id', upload.single('foto'), menuValidationRules.update, handleValidationErrors, ensureAuthenticated, checkRole(['superadministrador', 'administrador']), menuController.updateDish);
router.post('/menu/eliminar/:id', menuValidationRules.delete, handleValidationErrors, ensureAuthenticated, checkRole(['superadministrador', 'administrador']), menuController.deleteDish);

// Nueva acción para guardar la distribución por lote (Permite Capitán)
router.post('/mesas/distribucion', ensureAuthenticated, checkRole(['superadministrador', 'administrador', 'capitan']), tableController.saveDistribution);

module.exports = router;