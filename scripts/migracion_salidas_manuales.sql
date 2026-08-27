-- ============================================================================
-- Migración: tabla `salidas_manuales` (no existía en la BD).
-- El módulo de Salidas Manuales de Inventario la requiere para registrar y
-- listar salidas (merma / rotura / pérdida). Sin ella, tanto el listado como
-- el registro fallan ("Table 'restaurante_db.salidas_manuales' doesn't exist").
--
-- ⚠️  Haz respaldo antes: mysqldump restaurante_db > respaldo_antes_migracion.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS `salidas_manuales` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `almacen_id` BIGINT UNSIGNED NOT NULL,
  `producto_id` BIGINT UNSIGNED NOT NULL,
  `cantidad` DECIMAL(18,3) NOT NULL,
  `tipo` VARCHAR(30) NOT NULL COMMENT 'merma / rotura / perdida',
  `motivo` VARCHAR(150) DEFAULT NULL,
  `notas` TEXT DEFAULT NULL,
  `usuario_id` INT DEFAULT NULL,
  `fecha_registro` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sm_almacen` (`almacen_id`),
  KEY `idx_sm_producto` (`producto_id`),
  KEY `idx_sm_fecha` (`fecha_registro`),
  CONSTRAINT `fk_sm_almacen` FOREIGN KEY (`almacen_id`) REFERENCES `almacenes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sm_producto` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
