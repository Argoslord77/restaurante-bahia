// routes/recetaRoutes.js - Rutas para gestión de recetas / fichas técnicas
const express = require('express');
const router = express.Router();
const recetaController = require('../controllers/recetaController');
const { ensureAuthenticated, checkRole } = require('../middlewares/auth');
const { recetaValidationRules, handleValidationErrors } = require('../middlewares/validator');

// Vista principal de recetas
router.get('/recetas', 
    ensureAuthenticated, 
    checkRole(['superadministrador', 'administrador']), 
    recetaController.viewRecetas
);

// Vista para configurar receta (ingredientes/detalles) de una ficha maestro específica
// NOTA: platilloId mapea internamente al ID del Maestro de Recetas
router.get('/recetas/configurar/:platilloId',
    ensureAuthenticated,
    checkRole(['superadministrador', 'administrador']),
    recetaController.viewConfigurarReceta
);

// API: Obtener ingredientes de una receta por su receta_id (platilloId)
router.get('/api/recetas/platillo/:platilloId',
    ensureAuthenticated,
    checkRole(['superadministrador', 'administrador', 'almacenero']),
    recetaController.getIngredientesByPlatillo
);

// API: Crear nueva cabecera de receta (Ficha Técnica Maestro)
router.post('/api/recetas',
    ensureAuthenticated,
    checkRole(['superadministrador', 'administrador']),
    recetaValidationRules.create, // <-- ¡Atención! Asegúrate de actualizar este validador
    handleValidationErrors,
    recetaController.createReceta
);

// API: Actualizar cabecera de receta
router.put('/api/recetas/:id',
    ensureAuthenticated,
    checkRole(['superadministrador', 'administrador']),
    recetaValidationRules.update, // <-- ¡Atención! Asegúrate de actualizar este validador
    handleValidationErrors,
    recetaController.updateReceta
);

// API: Eliminar receta (Baja lógica del sistema)
router.delete('/api/recetas/:id',
    ensureAuthenticated,
    checkRole(['superadministrador', 'administrador']),
    recetaController.deleteReceta
);

// API: Verificar stock crítico en un almacén antes de confirmar la comanda/pedido
router.post('/api/recetas/verificar-stock',
    ensureAuthenticated,
    checkRole(['superadministrador', 'administrador', 'dependiente']),
    recetaValidationRules.verificarStock,
    handleValidationErrors,
    recetaController.verificarStock
);

// API: Obtener recetas afectadas que consumen un producto/insumo específico
router.get('/api/recetas/producto/:productoId',
    ensureAuthenticated,
    checkRole(['superadministrador', 'administrador', 'almacenero']),
    recetaController.getPlatillosByProducto
);

// API: Cambiar estado activo/inactivo
router.patch('/api/recetas/:id/estado',
    ensureAuthenticated,
    checkRole(['superadministrador', 'administrador']),
    recetaController.toggleEstadoReceta
);
module.exports = router;