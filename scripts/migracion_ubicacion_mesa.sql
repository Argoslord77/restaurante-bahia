-- ============================================================================
-- Migración: catálogo de áreas de servicio (ubicacion_mesa)
-- Restaurante Bahía — normaliza el área/ubicación de las mesas
--
-- PROBLEMA: `mesas.ubicacion` es un VARCHAR libre que cada mesa escribe por
-- su cuenta ("Salon Principal", "salón principal", "Terraza "...). No existe
-- un catálogo: renombrar un área obliga a editar mesa por mesa y los nombres
-- duplicados con espacios/mayúsculas distintas fragmentan la distribución.
--
-- SOLUCIÓN:
--   1) Nueva tabla `ubicacion_mesa` (catálogo de áreas/salones del local).
--   2) `mesas.ubicacion_id` → FK hacia el catálogo.
--   3) Siembra inicial del catálogo con los valores que ya existen en
--      `mesas.ubicacion` (DISTINCT) y con las zonas definidas en el ajuste
--      `salon_areas` de Configuración (lista separada por comas).
--   4) Backfill de `mesas.ubicacion_id` emparejando por nombre (TRIM).
--
-- La columna legada `mesas.ubicacion` NO se elimina: se mantiene como espejo
-- del nombre (la app la sigue escribiendo junto al id) para no romper
-- respaldos/consultas antiguas. La fuente de verdad para la app pasa a ser
-- `ubicacion_mesa` vía el JOIN por `ubicacion_id`.
--
-- ⚠️  Respaldo antes: mysqldump restaurante_db > respaldo_antes_ubicacion.sql
-- ⚠️  Los ALTER de columna/FK no son idempotentes: ejecutar UNA sola vez.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Catálogo de áreas de servicio
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ubicacion_mesa` (
  `id`             INT(11)      NOT NULL AUTO_INCREMENT,
  `nombre`         VARCHAR(100) NOT NULL,
  `descripcion`    VARCHAR(255) DEFAULT NULL,
  `orden`          INT(11)      NOT NULL DEFAULT 0,
  `activo`         TINYINT(1)   NOT NULL DEFAULT 1,
  `creado_en`      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_ubicacion_mesa_nombre` (`nombre`),
  KEY `idx_ubicacion_mesa_activo` (`activo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  COMMENT='Áreas / salones del establecimiento (catálogo para mesas)';

-- ---------------------------------------------------------------------------
-- 2) Siembra desde los valores reales de mesas.ubicacion (idempotente)
--    (fuente principal: cada mesa con su área actual)
-- ---------------------------------------------------------------------------
INSERT INTO `ubicacion_mesa` (`nombre`, `descripcion`, `orden`, `activo`)
SELECT DISTINCT TRIM(m.`ubicacion`),
       CONCAT('Importada automáticamente desde mesas.ubicacion (', TRIM(m.`ubicacion`), ')'),
       0, 1
FROM `mesas` m
WHERE m.`ubicacion` IS NOT NULL
  AND TRIM(m.`ubicacion`) <> ''
  AND NOT EXISTS (SELECT 1 FROM `ubicacion_mesa` u WHERE u.`nombre` = TRIM(m.`ubicacion`));

-- Asegurar la ubicación histórica por defecto del sistema
INSERT INTO `ubicacion_mesa` (`nombre`, `descripcion`, `orden`, `activo`)
SELECT 'Salon Principal', 'Área principal del establecimiento (valor por defecto histórico)', 0, 1
WHERE NOT EXISTS (SELECT 1 FROM `ubicacion_mesa` u WHERE u.`nombre` = 'Salon Principal');

-- ---------------------------------------------------------------------------
-- 3) Siembra opcional desde el ajuste "salon_areas" de Configuración
--    (zonas declaradas en el textarea antiguo, aunque no tengan mesas aún).
--    Divide la lista separada por comas (hasta 30 zonas).
--    Si tu tabla de configuración no existe o se llama distinto, comenta
--    este bloque sin afectar el resto de la migración.
-- ---------------------------------------------------------------------------
INSERT INTO `ubicacion_mesa` (`nombre`, `descripcion`, `orden`, `activo`)
SELECT DISTINCT TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(c.`valor`, ',', n.n), ',', -1)),
       'Importada desde el ajuste salon_areas de Configuración', 0, 1
FROM `configuraciones` c
JOIN (
  SELECT 1 AS n UNION SELECT 2  UNION SELECT 3  UNION SELECT 4  UNION SELECT 5
       UNION SELECT 6 UNION SELECT 7  UNION SELECT 8  UNION SELECT 9  UNION SELECT 10
       UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15
       UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION SELECT 20
       UNION SELECT 21 UNION SELECT 22 UNION SELECT 23 UNION SELECT 24 UNION SELECT 25
       UNION SELECT 26 UNION SELECT 27 UNION SELECT 28 UNION SELECT 29 UNION SELECT 30
) n ON n.n <= (LENGTH(c.`valor`) - LENGTH(REPLACE(c.`valor`, ',', '')) + 1)
WHERE c.`clave` = 'salon_areas'
  AND c.`valor` IS NOT NULL
  AND TRIM(c.`valor`) <> ''
  AND TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(c.`valor`, ',', n.n), ',', -1)) <> ''
  AND NOT EXISTS (
      SELECT 1 FROM `ubicacion_mesa` u
      WHERE u.`nombre` = TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(c.`valor`, ',', n.n), ',', -1))
  );

-- ---------------------------------------------------------------------------
-- 4) Columna FK en mesas (ejecutar UNA sola vez)
-- ---------------------------------------------------------------------------
ALTER TABLE `mesas`
  ADD COLUMN `ubicacion_id` INT(11) NULL DEFAULT NULL AFTER `ubicacion`,
  ADD KEY `idx_mesas_ubicacion` (`ubicacion_id`);

-- ---------------------------------------------------------------------------
-- 5) Backfill: emparejar cada mesa con su área por nombre exacto (TRIM)
-- ---------------------------------------------------------------------------
UPDATE `mesas` m
INNER JOIN `ubicacion_mesa` u ON u.`nombre` = TRIM(m.`ubicacion`)
SET m.`ubicacion_id` = u.`id`
WHERE m.`ubicacion_id` IS NULL;

-- Mesas sin área legible quedan en el área por defecto
UPDATE `mesas` m
INNER JOIN `ubicacion_mesa` u ON u.`nombre` = 'Salon Principal'
SET m.`ubicacion_id` = u.`id`, m.`ubicacion` = u.`nombre`
WHERE m.`ubicacion_id` IS NULL
  AND (m.`ubicacion` IS NULL OR TRIM(m.`ubicacion`) = '');

-- ---------------------------------------------------------------------------
-- 6) Integridad referencial (ejecutar UNA sola vez)
--    ON DELETE SET NULL: si alguien borra un área directamente en la BD, las
--    mesas sobreviven sin área (la app bloquea el borrado cuando hay mesas).
-- ---------------------------------------------------------------------------
ALTER TABLE `mesas`
  ADD CONSTRAINT `fk_mesas_ubicacion`
  FOREIGN KEY (`ubicacion_id`) REFERENCES `ubicacion_mesa` (`id`)
  ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- Verificación manual sugerida:
--   SELECT u.nombre, COUNT(m.id) AS mesas FROM ubicacion_mesa u
--   LEFT JOIN mesas m ON m.ubicacion_id = u.id GROUP BY u.id ORDER BY u.nombre;
--   SELECT COUNT(*) FROM mesas WHERE ubicacion_id IS NULL;  -- debe ser 0
-- ============================================================================
