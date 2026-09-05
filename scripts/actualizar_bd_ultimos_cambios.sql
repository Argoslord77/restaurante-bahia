-- ================================================================
-- Restaurante Bahía · actualización acumulativa de estructura
-- Fecha: 2026-09-05
--
-- Ejecutar con un usuario que tenga permisos ALTER sobre la base de datos:
--   mysql -u restaurante_user -p restaurante_db < scripts/actualizar_bd_ultimos_cambios.sql
--
-- El script es idempotente: puede ejecutarse más de una vez sin duplicar
-- columnas ni restricciones.
-- ================================================================

USE restaurante_db;

-- 1) Excedente pagado por encima de orden + propina.
--    Se mantiene separado de pedidos.propina para que los informes y el
--    cuadre de caja no clasifiquen una diferencia como propina.
SET @existe_excedente := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'pedidos'
      AND COLUMN_NAME = 'excedente_cobro'
);
SET @sql_excedente := IF(
    @existe_excedente = 0,
    'ALTER TABLE pedidos ADD COLUMN excedente_cobro DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER propina',
    'SELECT 1'
);
PREPARE stmt_excedente FROM @sql_excedente;
EXECUTE stmt_excedente;
DEALLOCATE PREPARE stmt_excedente;

-- 2) Unidad de medida usada por una salida manual. Es necesaria para que las
--    salidas puedan conservar la unidad real de la operación y del kardex.
SET @existe_unidad_salida := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'salidas_manuales'
      AND COLUMN_NAME = 'unidad_medida_id'
);
SET @sql_unidad_salida := IF(
    @existe_unidad_salida = 0,
    'ALTER TABLE salidas_manuales ADD COLUMN unidad_medida_id BIGINT UNSIGNED NULL AFTER cantidad',
    'SELECT 1'
);
PREPARE stmt_unidad_salida FROM @sql_unidad_salida;
EXECUTE stmt_unidad_salida;
DEALLOCATE PREPARE stmt_unidad_salida;

-- La FK se agrega solo si la columna existe y todavía no tiene una FK.
SET @existe_fk_unidad := (
    SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = 'salidas_manuales'
      AND COLUMN_NAME = 'unidad_medida_id'
      AND REFERENCED_TABLE_NAME = 'unidades_medida'
);
SET @sql_fk_unidad := IF(
    @existe_fk_unidad = 0,
    'ALTER TABLE salidas_manuales ADD CONSTRAINT fk_sm_unidad FOREIGN KEY (unidad_medida_id) REFERENCES unidades_medida(id) ON DELETE SET NULL',
    'SELECT 1'
);
PREPARE stmt_fk_unidad FROM @sql_fk_unidad;
EXECUTE stmt_fk_unidad;
DEALLOCATE PREPARE stmt_fk_unidad;

-- 3) Verificación final.
SELECT 'pedidos.excedente_cobro' AS estructura,
       IF(COUNT(*) > 0, 'OK', 'FALTA') AS estado
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pedidos'
  AND COLUMN_NAME = 'excedente_cobro'
UNION ALL
SELECT 'salidas_manuales.unidad_medida_id',
       IF(COUNT(*) > 0, 'OK', 'FALTA')
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'salidas_manuales'
  AND COLUMN_NAME = 'unidad_medida_id';
