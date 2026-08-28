// controllers/cajaController.js
// Cobro en caja con descuento de inventario.
const RecetaService = require('../services/recetaService');
const AlmacenService = require('../services/almacenService');
const db = require('../config/db');
const logger = require('../config/logger');

const CajaController = {
  /**
   * Cobra un pedido y descuenta los insumos de su explosión de receta.
   *
   * Usa el mismo camino verificado que el cierre financiero
   * (RecetaService.descontarStockPedido) en lugar del procedimiento almacenado
   * `sp_procesar_explosion_inventario_venta`, que no está versionado en el
   * repositorio y duplicaba la lógica de descuento con reglas propias de
   * almacén.
   *
   * Reglas aplicadas:
   *   - El descuento SIEMPRE ocurre en un almacén de producción.
   *   - `almacenId` es opcional: si no llega, cada platillo resuelve el suyo
   *     por su categoría de menú. Si llega uno logístico, se rechaza.
   *   - Se ignoran los ítems cancelados, los que no afectan inventario y los
   *     platillos del día (que no tienen receta).
   */
  async cobrarPedido(req, res) {
    const { pedidoId } = req.params;
    const { almacenId } = req.body || {};
    const usuarioId = (req.user && req.user.id) || (req.session && req.session.user ? req.session.user.id : 1);

    try {
      // Si se envía un almacén explícito, se valida antes de tocar nada
      if (almacenId) {
        await AlmacenService.resolverAlmacenProduccion(null, almacenId);
      }

      const [detalles] = await db.query(
        `SELECT id_platillo, es_platillo_dia, cantidad
           FROM detalles_pedido
          WHERE id_pedido = ?
            AND estado_item != 'cancelado'
            AND (afecta_inventario = 1 OR afecta_inventario IS NULL)`,
        [pedidoId]
      );

      let resultado = { success: true, movimientos: [], sin_receta: [] };
      if (detalles.length > 0) {
        resultado = await RecetaService.descontarStockPedido(
          detalles,
          almacenId || null,
          pedidoId,
          usuarioId
        );
      }

      return res.json({
        success: true,
        message: 'Cobro exitoso e inventario actualizado',
        data: {
          movimientos: resultado.movimientos.length,
          sin_receta: resultado.sin_receta || [],
          detalle: resultado.movimientos
        }
      });
    } catch (error) {
      logger.error('Error en cobro de caja:', error);
      return res.status(500).json({ success: false, message: 'Falló el proceso de cobro: ' + error.message });
    }
  }
};

module.exports = CajaController;
