-- ============================================================================
-- Migración: cocinero de turno
-- Restaurante Bahía — el turno registra qué cocinero está activo, y los
-- reportes de pedido muestran ese nombre en la columna "Elaboró".
-- ⚠️  Respaldo antes: mysqldump restaurante_db > respaldo_antes_migracion.sql
-- ============================================================================

ALTER TABLE `turnos_servicio`
  ADD COLUMN `cocinero_id` INT NULL DEFAULT NULL AFTER `usuario_apertura_id`,
  ADD KEY `idx_ts_cocinero` (`cocinero_id`),
  ADD CONSTRAINT `fk_ts_cocinero` FOREIGN KEY (`cocinero_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL;
