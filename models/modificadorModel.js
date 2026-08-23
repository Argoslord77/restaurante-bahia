const db = require('../config/db');

const ModificadorModel = {
  async getModificadoresActivos() {
    const [rows] = await db.query(
      `SELECT * FROM modificadores_menu WHERE activo = 1 ORDER BY tipo ASC, nombre ASC`
    );
    return rows;
  },

  async agregarModificadorADetalle(detallePedidoId, modificadorId) {
    const [mod] = await db.query(
      `SELECT precio_adicional FROM modificadores_menu WHERE id = ? AND activo = 1`,
      [modificadorId]
    );
    if (mod.length === 0) throw new Error('Modificador no disponible');

    const precioCobrado = mod[0].precio_adicional;
    const [result] = await db.query(
      `INSERT INTO detalles_pedido_modificadores (detalle_pedido_id, modificador_id, precio_cobrado)
       VALUES (?, ?, ?)`,
      [detallePedidoId, modificadorId, precioCobrado]
    );
    return result.insertId;
  },

  async getModificadoresPorDetalle(detallePedidoId) {
    const [rows] = await db.query(
      `SELECT dpm.*, mm.nombre, mm.tipo FROM detalles_pedido_modificadores dpm
       JOIN modificadores_menu mm ON dpm.modificador_id = mm.id
       WHERE dpm.detalle_pedido_id = ?`,
      [detallePedidoId]
    );
    return rows;
  }
};

module.exports = ModificadorModel;