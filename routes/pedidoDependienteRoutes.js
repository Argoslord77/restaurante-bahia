const express = require('express');
const router = express.Router();
const pedidoController = require('../controllers/pedidoController');

// Vista principal de pedidos para el dependiente (Listado de mesas ocupadas/activas)
router.get('/', pedidoController.listarPedidos);

// Obtener detalle de un pedido específico para edición o consulta
router.get('/detalle/:id', pedidoController.obtenerDetallePedido);

// Iniciar un nuevo pedido desde una mesa libre
router.post('/crear', pedidoController.crearPedido);

// Enviar orden de productos (platillos + modificadores) a cocina
// Recibe: { items: [ { id_platillo, cantidad, modificadores: [] }, ... ] }
router.post('/enviar/:id', pedidoController.enviarOrden);

// Realizar el cierre financiero de la cuenta del cliente
router.post('/cerrar/:id', pedidoController.cerrarCuenta);

// Cancelar ítems o servicios (con control de stock/mermas)
router.post('/cancelar/:id', pedidoController.cancelarServicio);

module.exports = router;