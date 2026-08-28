-- ============================================================================
-- Migración: categoría operativa de almacenes (logístico / producción)
-- Restaurante Bahía
--
-- Contexto
-- --------
-- `almacenes.tipo` describe la NATURALEZA física del almacén (cocina, bar,
-- congelador, despensa...). Lo que faltaba era la CATEGORÍA OPERATIVA, que es
-- la que gobierna el flujo de inventario:
--
--   * logistico  -> Almacén central / de logística. Recibe las compras y
--                   abastece por transferencia a los almacenes de producción.
--                   NUNCA se descuenta por venta en el POS.
--   * produccion -> Almacenes de las áreas de producción (cocina, bar,
--                   pastelería...). Es de AQUÍ, y solo de aquí, de donde el POS
--                   descuenta los insumos al vender una receta.
--
-- ⚠️  Haz respaldo antes: mysqldump restaurante_db > respaldo_antes_migracion.sql
-- Script idempotente: se puede ejecutar varias veces sin efectos colaterales.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Agregar la columna `categoria` sólo si aún no existe
-- ----------------------------------------------------------------------------
SET @existe_columna := (
    SELECT COUNT(*)
      FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'almacenes'
       AND COLUMN_NAME = 'categoria'
);

SET @sql := IF(@existe_columna = 0,
    'ALTER TABLE `almacenes`
       ADD COLUMN `categoria` ENUM(''logistico'', ''produccion'') NULL DEFAULT NULL
       COMMENT ''Categoría operativa: logistico = almacén central/abastecedor; produccion = almacén de área que consume por venta''
       AFTER `tipo`',
    'SELECT ''La columna almacenes.categoria ya existe, se omite el ALTER'' AS aviso'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ----------------------------------------------------------------------------
-- 2. Índice para filtrar rápido por categoría (solo si no existe)
-- ----------------------------------------------------------------------------
SET @existe_indice := (
    SELECT COUNT(*)
      FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'almacenes'
       AND INDEX_NAME = 'idx_almacenes_categoria'
);

SET @sql := IF(@existe_indice = 0,
    'CREATE INDEX `idx_almacenes_categoria` ON `almacenes` (`categoria`, `activo`)',
    'SELECT ''El índice idx_almacenes_categoria ya existe, se omite'' AS aviso'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ----------------------------------------------------------------------------
-- 3. Backfill: inferir la categoría de los almacenes existentes desde `tipo`
--    (solo toca filas con categoria NULL, así que respeta ajustes manuales)
-- ----------------------------------------------------------------------------
UPDATE `almacenes`
   SET `categoria` = 'produccion'
 WHERE `categoria` IS NULL
   AND `tipo` IN ('cocina', 'bar', 'produccion');

UPDATE `almacenes`
   SET `categoria` = 'logistico'
 WHERE `categoria` IS NULL
   AND `tipo` IN ('principal', 'despensa', 'congelador', 'camara_fria');

-- Cualquier remanente ('otro' o tipos no contemplados) queda como logístico:
-- es el valor conservador, porque impide que el POS descuente de él por error.
UPDATE `almacenes`
   SET `categoria` = 'logistico'
 WHERE `categoria` IS NULL;

-- ----------------------------------------------------------------------------
-- 4. Verificación posterior (revisa el resultado antes de dar por buena la
--    migración y corrige a mano lo que no cuadre con tu operación real)
-- ----------------------------------------------------------------------------
SELECT
    `id`,
    `codigo`,
    `nombre`,
    `tipo`,
    `categoria`,
    `activo`
FROM `almacenes`
ORDER BY `categoria` ASC, `codigo` ASC;

-- Almacenes de producción sin categoría de platillos asociada: estos NO podrán
-- recibir descuentos automáticos del POS hasta que se les asigne una categoría
-- de menú en Configuración → Categorías de Platillos.
SELECT
    a.`id`,
    a.`codigo`,
    a.`nombre`,
    'Sin categoría de platillos asociada' AS advertencia
FROM `almacenes` a
LEFT JOIN `categorias_platillos` cp ON cp.`almacen_id` = a.`id`
WHERE a.`categoria` = 'produccion'
  AND a.`activo` = 1
  AND cp.`id` IS NULL;
