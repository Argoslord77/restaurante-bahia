// routes/recetaRoutes.js - Rutas para gestión de recetas / fichas técnicas
const express = require('express');
const router = express.Router();
const recetaController = require('../controllers/recetaController');
const { ensureAuthenticated, checkRole } = require('../middlewares/auth');
const { recetaValidationRules, handleValidationErrors } = require('../middlewares/validator');

const checkAccess = checkRole(['superadministrador', 'administrador', 'jefe-cocina', 'almacenero', 'dependiente', 'cocinero']);
const checkAdmin = checkRole(['superadministrador', 'administrador', 'jefe-cocina']);

// Vista principal de recetas
router.get('/recetas', 
    ensureAuthenticated, 
    checkAdmin, 
    recetaController.viewRecetas
);

// Vista para configurar receta (ingredientes/detalles) de una ficha maestro específica
router.get('/recetas/configurar/:platilloId',
    ensureAuthenticated,
    checkAdmin,
    recetaController.viewConfigurarReceta
);

// API: Obtener ingredientes de una receta por su receta_id (platilloId)
router.get('/api/recetas/platillo/:platilloId',
    ensureAuthenticated,
    checkAccess,
    recetaController.getIngredientesByPlatillo
);

// API: Verificar disponibilidad de código de receta de forma asíncrona
router.get('/api/recetas/check-codigo',
    ensureAuthenticated,
    checkAccess,
    recetaController.checkCodigo
);

// API: Crear nueva cabecera de receta (Ficha Técnica Maestro)
router.post('/api/recetas',
    ensureAuthenticated,
    checkAdmin,
    (recetaValidationRules && recetaValidationRules.create) ? recetaValidationRules.create : (req, res, next) => next(),
    handleValidationErrors,
    recetaController.createReceta
);

// API: Actualizar cabecera de receta
router.put('/api/recetas/:id',
    ensureAuthenticated,
    checkAdmin,
    (recetaValidationRules && recetaValidationRules.update) ? recetaValidationRules.update : (req, res, next) => next(),
    handleValidationErrors,
    recetaController.updateReceta
);

// API: Eliminar receta DEFINITIVAMENTE de la base de datos (Hard Delete)
router.delete('/api/recetas/:id',
    ensureAuthenticated,
    checkAdmin,
    recetaController.deleteReceta
);

// Ruta POST alternativa para compatibilidad
router.post('/api/recetas/:id/eliminar',
    ensureAuthenticated,
    checkAdmin,
    recetaController.deleteReceta
);

// API: Verificar stock crítico en un almacén antes de confirmar la comanda/pedido
router.post('/api/recetas/verificar-stock',
    ensureAuthenticated,
    checkAccess,
    (recetaValidationRules && recetaValidationRules.verificarStock) ? recetaValidationRules.verificarStock : (req, res, next) => next(),
    handleValidationErrors,
    recetaController.verificarStock
);

// API: Obtener recetas afectadas que consumen un producto/insumo específico
router.get('/api/recetas/producto/:productoId',
    ensureAuthenticated,
    checkAccess,
    recetaController.getPlatillosByProducto
);

// API: Cambiar estado activo/inactivo (Desactivación / Activación lógica)
router.patch('/api/recetas/:id/estado',
    ensureAuthenticated,
    checkAdmin,
    recetaController.toggleEstadoReceta
);

router.post('/api/recetas/:id/estado',
    ensureAuthenticated,
    checkAdmin,
    recetaController.toggleEstadoReceta
);

// API: Eliminar ingrediente individual de una receta
router.delete('/api/recetas/detalles/:detalleId',
    ensureAuthenticated,
    checkAdmin,
    recetaController.deleteIngrediente
);

// API: Agregar ingrediente individual a una receta
router.post('/api/recetas/detalles',
    ensureAuthenticated,
    checkAdmin,
    recetaController.addIngrediente
);

module.exports = router;
