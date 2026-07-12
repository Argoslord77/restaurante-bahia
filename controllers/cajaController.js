const InventarioModel = require('../models/inventarioModel');
const db = require('../config/db');

const CajaController = {
  async cobrarPedido(req, res) {
    const { pedidoId } = req.params;
    const { almacenId } = req.body;
    const usuarioId = req.session.user ? req.session.user.id : 1; // Fallback para sesión

    try {
      // Ejecuta procedimiento almacenado: explosión de insumos + actualización de estados
      const resultado = await InventarioModel.ejecutarExplosionVenta(pedidoId, usuarioId, almacenId);
      
      res.json({ 
        success: true, 
        message: 'Cobro exitoso e inventario actualizado', 
        data: resultado 
      });
    } catch (error) {
      console.error('Error en cobro de caja:', error);
      res.status(500).json({ success: false, message: 'Falló el proceso de cobro: ' + error.message });
    }
  }
};

module.exports = CajaController;