const express = require('express');
const router = express.Router();
const pedidoController = require('../controllers/pedidoController');
// Importamos ambos guardianes
const { ensureAuthenticated, checkRole } = require('../middlewares/auth');
const { pedidoValidationRules, handleValidationErrors } = require('../middlewares/validator');

// Rutas de renderizado administrativo
router.get('/pedidos', ensureAuthenticated, checkRole(['superadministrador', 'administrador', 'cajero']), pedidoController.listarPedidos);
router.get('/pedido/:id', ensureAuthenticated, checkRole(['superadministrador', 'administrador', 'cajero']), pedidoController.obtenerDetallePedido);

// Rutas de acciones operativas
router.post('/pedido/nuevo', pedidoValidationRules.create, handleValidationErrors, ensureAuthenticated, checkRole(['superadministrador', 'administrador']), pedidoController.crearPedido);
router.post('/pedido/:id/cerrar', pedidoValidationRules.cerrarCuenta, handleValidationErrors, ensureAuthenticated, checkRole(['superadministrador', 'administrador', 'cajero']), pedidoController.cerrarCuenta);

// NUEVA RUTA: Cancelación selectiva por ítems y auditoría de inventario
router.post('/pedido/:id/cancelar-parcial-o-total', pedidoValidationRules.cancelar, handleValidationErrors, ensureAuthenticated, checkRole(['superadministrador', 'administrador', 'cajero']), pedidoController.cancelarServicio);

// Ahora recibe un lote completo de productos de la orden
router.post('/pedido/:id/enviar-orden', pedidoValidationRules.enviarOrden, handleValidationErrors, pedidoController.enviarOrden);

module.exports = router;