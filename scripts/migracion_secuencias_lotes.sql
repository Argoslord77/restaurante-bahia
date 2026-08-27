-- ============================================================================
-- Migración: tabla de secuencias de lotes (numeración a prueba de concurrencia)
-- Restaurante Bahía — mejora 4 de FIX_INVENTARIOS.md
--
-- El número de lote (LOT-YYYY-XXX) se calculaba con COUNT/MAX sobre `lotes`,
-- lo que permite colisiones bajo concurrencia o tras borrar lotes. Con esta
-- tabla, el generador hace un UPDATE atómico con bloqueo de fila:
--   UPDATE secuencias_lotes SET siguiente = LAST_INSERT_ID(siguiente + 1) ...
-- ⚠️  Haz respaldo antes: mysqldump restaurante_db > respaldo_antes_migracion.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS `secuencias_lotes` (
  `anio` SMALLINT UNSIGNED NOT NULL,
  `siguiente` INT UNSIGNED NOT NULL DEFAULT 1,
  `actualizado_en` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`anio`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Sembrar cada año con el máximo correlativo YA existente en lotes (idempotente):
-- nunca retrocede la numeración aunque se re-ejecute.
INSERT INTO `secuencias_lotes` (`anio`, `siguiente`)
SELECT t.anio, t.maximo + 1
FROM (
    SELECT CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(numero_lote, '-', 2), '-', -1) AS UNSIGNED) AS anio,
           MAX(CAST(SUBSTRING_INDEX(numero_lote, '-', -1) AS UNSIGNED)) AS maximo
    FROM lotes
    WHERE numero_lote RLIKE '^LOT-[0-9]{4}-[0-9]+$'
    GROUP BY anio
) AS t
ON DUPLICATE KEY UPDATE `siguiente` = GREATEST(`siguiente`, VALUES(`siguiente`));
