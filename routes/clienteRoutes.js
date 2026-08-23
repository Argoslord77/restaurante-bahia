const express = require('express');
const router = express.Router();
const clienteController = require('../controllers/clienteController');

// ========================================================
// RUTAS DEL DASHBOARD DEL LINE
// ========================================================
// Vista principal del cliente 
router.get('/cliente/dashboard/:id_mesa', clienteController.viewDashboard);


// ========================================================
// RUTAS OPERACIONALES DEL CIRCUITO CLIENTE
// ========================================================
// Llamar al dependiente de la mesa 
router.post('/cliente/llamar-servicio/:id_mesa', clienteController.callService);

// Agrega a la preorden de la mesa los items seleccionados 
router.post('/cliente/agregar-a-preorden/:id_mesa', clienteController.agregarAPreorden);

// Solicitar cierre
router.post('/cliente/solicitar-cierre/:id_pedido', clienteController.cerrarCuenta);

module.exports = router;