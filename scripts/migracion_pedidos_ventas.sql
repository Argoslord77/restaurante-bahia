-- ============================================================================
-- Migración: auditoría por ítem de pedido (tiempos de entrega y elaborador)
-- Restaurante Bahía — Vista profesional de Pedidos/Ventas
--
-- `detalles_pedido` no registraba CUÁNDO se entregó cada ítem ni quién lo
-- elaboró. Con estas columnas el reporte puede mostrar:
--   * tiempo de entrega por ítem (entregado_en - creado_en) en h:m:s
--   * cocinero/bartender que marcó el ítem como entregado
--
-- ⚠️  Respaldo antes: mysqldump restaurante_db > respaldo_antes_migracion.sql
-- ============================================================================

ALTER TABLE `detalles_pedido`
  ADD COLUMN `creado_en` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `afecta_inventario`,
  ADD COLUMN `entregado_en` DATETIME NULL DEFAULT NULL AFTER `creado_en`,
  ADD COLUMN `usuario_elaboro_id` INT NULL DEFAULT NULL AFTER `entregado_en`,
  ADD KEY `idx_dp_pedido_creado` (`id_pedido`, `creado_en`),
  ADD CONSTRAINT `fk_dp_elaboro` FOREIGN KEY (`usuario_elaboro_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL;

-- Backfill: los ítems históricos heredan la fecha de creación del pedido
-- (el DEFAULT CURRENT_TIMESTAMP estamparía la fecha de la migración).
UPDATE `detalles_pedido` d
INNER JOIN `pedidos` p ON p.id = d.id_pedido
SET d.creado_en = p.creado_en
WHERE d.creado_en > p.creado_en;

-- Ítems ya entregados heredan como referencia el cierre del pedido
-- (aproximación conservadora para datos históricos; los nuevos la llenan sola).
UPDATE `detalles_pedido` d
INNER JOIN `pedidos` p ON p.id = d.id_pedido
SET d.entregado_en = p.fecha_cierre
WHERE d.estado_item = 'entregado' AND d.entregado_en IS NULL AND p.fecha_cierre IS NOT NULL;
