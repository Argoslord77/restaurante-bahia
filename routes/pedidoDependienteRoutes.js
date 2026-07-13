const express = require('express');
const router = express.Router();
const pedidoController = require('../controllers/pedidoController');
const { ensureAuthenticated } = require('../middlewares/auth');
const { asegurarTurnoActivo } = require('../middlewares/verificarTurno');

// Vista principal de pedidos para el dependiente (Listado de mesas ocupadas/activas)
router.get('/', ensureAuthenticated, pedidoController.listarPedidos);

// Obtener detalle de un pedido específico para edición o consulta
router.get('/detalle/:id', ensureAuthenticated, pedidoController.obtenerDetallePedido);

// Iniciar un nuevo pedido desde una mesa libre
// Requiere turno activo: crearNuevoPedido necesita turno_servicio_id (NOT NULL en BD)
router.post('/crear', ensureAuthenticated, asegurarTurnoActivo, pedidoController.crearPedido);

// Enviar orden de productos (platillos + modificadores) a cocina
// Recibe: { items: [ { id_platillo, cantidad, modificadores: [] }, ... ] }
router.post('/enviar/:id', ensureAuthenticated, asegurarTurnoActivo, pedidoController.enviarOrden);

// Realizar el cierre financiero de la cuenta del cliente
router.post('/cerrar/:id', ensureAuthenticated, asegurarTurnoActivo, pedidoController.cerrarCuenta);

// Cancelar ítems o servicios (con control de stock/mermas)
router.post('/cancelar/:id', ensureAuthenticated, asegurarTurnoActivo, pedidoController.cancelarServicio);

module.exports = router;