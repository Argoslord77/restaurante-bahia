const express = require('express');
const router = express.Router();
const pedidoController = require('../controllers/pedidoController');
// Importamos ambos guardianes
const { ensureAuthenticated, checkRole } = require('../middlewares/auth');
const { pedidoValidationRules, handleValidationErrors } = require('../middlewares/validator');
const { asegurarTurnoActivo } = require('../middlewares/verificarTurno');

// Rutas de renderizado administrativo
router.get('/pedidos', ensureAuthenticated, checkRole(['superadministrador', 'administrador', 'cajero']), pedidoController.listarPedidos);

// Exportar a CSV el reporte de Pedidos / Ventas con los filtros aplicados
router.get('/pedidos/exportar', ensureAuthenticated, checkRole(['superadministrador', 'administrador', 'cajero']), pedidoController.exportarPedidosCSV);

router.get('/pedido/:id', ensureAuthenticated, checkRole(['superadministrador', 'administrador', 'cajero']), pedidoController.obtenerDetallePedido);

// Rutas de acciones operativas
router.post('/pedido/nuevo', asegurarTurnoActivo, pedidoValidationRules.create, handleValidationErrors, ensureAuthenticated, checkRole(['superadministrador', 'administrador']), pedidoController.crearPedido);
router.post('/pedido/:id/cerrar', asegurarTurnoActivo, pedidoValidationRules.cerrarCuenta, handleValidationErrors, ensureAuthenticated, checkRole(['superadministrador', 'administrador', 'cajero']), pedidoController.cerrarCuenta);

// NUEVA RUTA: Cancelación selectiva por ítems y auditoría de inventario
router.post('/pedido/:id/cancelar-parcial-o-total', asegurarTurnoActivo, pedidoValidationRules.cancelar, handleValidationErrors, ensureAuthenticated, checkRole(['superadministrador', 'administrador', 'cajero']), pedidoController.cancelarServicio);

// Ahora recibe un lote completo de productos de la orden
router.post('/pedido/:id/enviar-orden', asegurarTurnoActivo, pedidoValidationRules.enviarOrden, handleValidationErrors, pedidoController.enviarOrden);

module.exports = router;