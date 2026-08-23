const db = require('../config/db');

const InventarioModel = {
  async ejecutarExplosionVenta(pedidoId, usuarioId, almacenId) {
    try {
      const [result] = await db.query(
        `CALL sp_procesar_explosion_inventario_venta(?, ?, ?)`,
        [pedidoId, usuarioId, almacenId]
      );
      return result[0][0]; // Retorna el SELECT 'SUCCESS' del SP
    } catch (error) {
      console.error('Error al ejecutar explosión de inventario:', error);
      throw error;
    }
  }
};

module.exports = InventarioModel;