const express = require('express');
const router = express.Router();
const clienteController = require('../controllers/clienteController');
const { clienteLimiter } = require('../middlewares/security');

// ========================================================
// RUTAS DEL DASHBOARD DEL LINE
// ========================================================
// Vista principal del cliente 
router.get('/cliente/dashboard/:id_mesa', clienteLimiter, clienteController.viewDashboard);


// ========================================================
// RUTAS OPERACIONALES DEL CIRCUITO CLIENTE
// ========================================================
// Llamar al dependiente de la mesa 
router.post('/cliente/llamar-servicio/:id_mesa', clienteLimiter, clienteController.callService);

// Agrega a la preorden de la mesa los items seleccionados 
router.post('/cliente/agregar-a-preorden/:id_mesa', clienteLimiter, clienteController.agregarAPreorden);

// Solicitar cierre
router.post('/cliente/solicitar-cierre/:id_pedido', clienteLimiter, clienteController.cerrarCuenta);

module.exports = router;