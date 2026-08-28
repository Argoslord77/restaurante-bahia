const db = require('../config/db');
const AlmacenService = require('../services/almacenService');
const logger = require('../config/logger');

const InventarioModel = {
  /**
   * Ejecuta el procedimiento almacenado de explosión de inventario por venta.
   *
   * ⚠️ El SP `sp_procesar_explosion_inventario_venta` NO está versionado en este
   * repositorio, por lo que su lógica interna de selección de almacén no puede
   * auditarse desde el código. Antes de invocarlo se valida aquí que el almacén
   * recibido sea de categoría 'produccion': el descuento por venta nunca puede
   * ocurrir en un almacén logístico.
   *
   * Como red de seguridad adicional a nivel de base de datos existe el trigger
   * `trg_bloquea_consumo_venta_en_logistico`
   * (ver scripts/migracion_guardia_consumo_produccion.sql), que aborta cualquier
   * consumo por venta contra un almacén logístico venga de donde venga.
   *
   * @deprecated Preferir RecetaService.descontarStockPedido(), que es el camino
   *             validado y cubierto por tests.
   */
  async ejecutarExplosionVenta(pedidoId, usuarioId, almacenId) {
    // Valida / resuelve el almacén de producción antes de tocar el inventario
    const almacenProduccion = await AlmacenService.resolverAlmacenProduccion(null, almacenId || null);

    // El SP no abre transacción propia: si el trigger de guardia lo aborta a
    // mitad de camino, los UPDATE de lotes que ya hizo quedarían aplicados.
    // Envolver la llamada garantiza atomicidad (comprobado: sin esto, un SP con
    // el almacén logístico "quemado" deja alterado el stock del central aunque
    // el asiento en movimientos_inventario sí quede bloqueado).
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const [result] = await connection.query(
        `CALL sp_procesar_explosion_inventario_venta(?, ?, ?)`,
        [pedidoId, usuarioId, almacenProduccion.id]
      );
      await connection.commit();
      return result[0][0]; // Retorna el SELECT 'SUCCESS' del SP
    } catch (error) {
      await connection.rollback();
      logger.error('Error al ejecutar explosión de inventario (rollback aplicado):', error);
      throw error;
    } finally {
      connection.release();
    }
  }
};

module.exports = InventarioModel;
