-- ============================================================================
-- Migración: Módulo de Ficha de Costo de productos de almacén
-- Restaurante Bahía
--
-- Contexto
-- --------
-- Hasta ahora `productos.costo_promedio` guardaba un número suelto, sin
-- explicar de dónde salía. Este módulo introduce la FICHA DE COSTO: el
-- documento que descompone cómo se llega al costo real de un insumo puesto
-- en producción, partiendo del precio de compra.
--
-- Fórmula estándar de la industria (escandallo / food cost)
-- ---------------------------------------------------------
--   Rendimiento (%)      = 100 − % merma
--   Factor de rendimiento= 1 / rendimiento
--   Costo unitario neto  = Precio de compra / cantidad de la presentación
--   Costo con merma      = Costo unitario neto / (1 − % merma)
--   Costo final          = (Costo con merma + costos directos) × (1 + % imprevistos)
--
-- Y para llevarlo al platillo:
--   Costo del platillo   = Σ (cantidad del ingrediente × costo final del insumo)
--   Precio sugerido      = Costo del platillo / % food cost objetivo
--   Food cost (%)        = (Costo del platillo / Precio de venta) × 100
--
-- ⚠️  Haz respaldo antes: mysqldump restaurante_db > respaldo_antes_migracion.sql
-- Script idempotente.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Cabecera de la ficha de costo (una vigente por producto, con histórico)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `fichas_costo_producto` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `producto_id` INT NOT NULL,
    `version` INT UNSIGNED NOT NULL DEFAULT 1,
    `vigente` TINYINT(1) NOT NULL DEFAULT 1
        COMMENT 'Solo una ficha vigente por producto; las anteriores quedan como histórico',

    -- Compra
    `precio_compra` DECIMAL(14,4) NOT NULL DEFAULT 0
        COMMENT 'Precio pagado por la presentación completa (saco, caja, litro...)',
    `cantidad_presentacion` DECIMAL(14,4) NOT NULL DEFAULT 1
        COMMENT 'Cuántas unidades de inventario trae la presentación comprada',
    `unidad_compra_id` INT NULL,
    `unidad_inventario_id` INT NULL,
    `proveedor` VARCHAR(150) NULL,

    -- Rendimiento
    `porcentaje_merma` DECIMAL(6,3) NOT NULL DEFAULT 0
        COMMENT 'Merma de limpieza/preparación en % (0-99.9)',

    -- Costos directos asociados a la compra
    `costo_flete` DECIMAL(14,4) NOT NULL DEFAULT 0
        COMMENT 'Transporte imputable a la presentación completa',
    `costo_envase` DECIMAL(14,4) NOT NULL DEFAULT 0,
    `costo_mano_obra` DECIMAL(14,4) NOT NULL DEFAULT 0
        COMMENT 'Limpieza, porcionado o preparación previa',
    `otros_costos` DECIMAL(14,4) NOT NULL DEFAULT 0,
    `porcentaje_imprevistos` DECIMAL(6,3) NOT NULL DEFAULT 5.000
        COMMENT 'Colchón estándar de la industria: 5%',

    -- Resultados calculados y persistidos (para no recalcular en cada consulta)
    `costo_unitario_bruto` DECIMAL(14,6) NOT NULL DEFAULT 0
        COMMENT 'Precio de compra / cantidad de la presentación',
    `costo_unitario_neto` DECIMAL(14,6) NOT NULL DEFAULT 0
        COMMENT 'Costo bruto ajustado por merma',
    `costo_final_unitario` DECIMAL(14,6) NOT NULL DEFAULT 0
        COMMENT 'Costo real por unidad de inventario, con todos los conceptos',
    `rendimiento_porcentaje` DECIMAL(6,3) NOT NULL DEFAULT 100,
    `factor_rendimiento` DECIMAL(10,4) NOT NULL DEFAULT 1,

    `observaciones` TEXT NULL,
    `creada_por` INT NULL,
    `creado_en` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `actualizado_en` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    KEY `idx_ficha_producto` (`producto_id`, `vigente`),
    KEY `idx_ficha_vigente` (`vigente`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 2. Conceptos libres: permiten al operario ajustar la ficha a su realidad
--    sin depender de las columnas fijas de arriba
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `fichas_costo_conceptos` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `ficha_id` INT UNSIGNED NOT NULL,
    `concepto` VARCHAR(120) NOT NULL,
    `tipo` ENUM('FIJO', 'PORCENTAJE') NOT NULL DEFAULT 'FIJO'
        COMMENT 'FIJO: importe sobre la presentación. PORCENTAJE: % sobre el costo con merma',
    `valor` DECIMAL(14,4) NOT NULL DEFAULT 0,
    `orden` INT NOT NULL DEFAULT 1,
    PRIMARY KEY (`id`),
    KEY `idx_concepto_ficha` (`ficha_id`),
    CONSTRAINT `fk_concepto_ficha` FOREIGN KEY (`ficha_id`)
        REFERENCES `fichas_costo_producto` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 3. Histórico de precios de compra: deja rastro de cada variación y de si se
--    trasladó o no a los precios de la carta
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `historial_precios_producto` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `producto_id` INT NOT NULL,
    `ficha_id` INT UNSIGNED NULL,
    `costo_anterior` DECIMAL(14,6) NULL,
    `costo_nuevo` DECIMAL(14,6) NOT NULL,
    `variacion_porcentaje` DECIMAL(10,3) NULL,
    `platillos_afectados` INT UNSIGNED NOT NULL DEFAULT 0,
    `precios_actualizados` INT UNSIGNED NOT NULL DEFAULT 0
        COMMENT 'Cuántos platillos vieron su precio de carta modificado a raíz de este cambio',
    `motivo` VARCHAR(255) NULL,
    `usuario_id` INT NULL,
    `creado_en` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_hist_producto` (`producto_id`, `creado_en`),
    KEY `idx_hist_fecha` (`creado_en`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 4. Histórico de cambios de precio de carta originados por una ficha de costo
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `historial_precios_platillo` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `platillo_id` INT NOT NULL,
    `es_platillo_dia` TINYINT(1) NOT NULL DEFAULT 0,
    `origen_producto_id` INT NULL COMMENT 'Insumo cuyo cambio de precio disparó la revisión',
    `carta` ENUM('CUP', 'COMISION', 'ZELLE') NOT NULL,
    `precio_anterior` DECIMAL(14,4) NULL,
    `precio_nuevo` DECIMAL(14,4) NOT NULL,
    `costo_platillo` DECIMAL(14,4) NULL,
    `food_cost_anterior` DECIMAL(8,3) NULL,
    `food_cost_nuevo` DECIMAL(8,3) NULL,
    `usuario_id` INT NULL,
    `creado_en` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_histp_platillo` (`platillo_id`, `creado_en`),
    KEY `idx_histp_origen` (`origen_producto_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 5. Parámetros por defecto del módulo
--
-- ⚠️  El sistema tiene DOS tablas de configuración distintas:
--       · `configuraciones_sistema` → la usa models/settingModel.js
--       · `configuraciones`         → la usa services/settingService.js
--     El módulo de costeo lee con SettingService, así que los parámetros van
--     en `configuraciones`. Se crea la tabla si no existiera todavía.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `configuraciones` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `clave` VARCHAR(100) NOT NULL UNIQUE,
    `valor` LONGTEXT NULL,
    `descripcion` VARCHAR(255) NULL,
    `grupo` VARCHAR(50) DEFAULT 'general',
    `tipo` VARCHAR(20) DEFAULT 'boolean',
    `actualizado_en` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT IGNORE INTO `configuraciones` (`clave`, `valor`, `descripcion`, `grupo`, `tipo`)
VALUES
    ('costo_food_cost_objetivo', '30',
     'Food cost objetivo (%) para sugerir el precio de venta', 'costeo', 'number'),
    ('costo_imprevistos_default', '5',
     'Porcentaje de imprevistos por defecto en la ficha de costo', 'costeo', 'number'),
    ('costo_redondeo_cup', '5',
     'Múltiplo al que se redondea el precio sugerido en la carta CUP (0 = sin redondeo)', 'costeo', 'number'),
    ('costo_umbral_aviso_variacion', '10',
     'Variación (%) del costo a partir de la cual se avisa para revisar los precios de carta', 'costeo', 'number');

-- ----------------------------------------------------------------------------
-- 6. Sembrado inicial: crear una ficha básica para cada producto que ya tenga
--    un costo promedio registrado, para no partir de cero
-- ----------------------------------------------------------------------------
INSERT INTO `fichas_costo_producto`
    (`producto_id`, `version`, `vigente`, `precio_compra`, `cantidad_presentacion`,
     `unidad_compra_id`, `unidad_inventario_id`, `porcentaje_merma`, `porcentaje_imprevistos`,
     `costo_unitario_bruto`, `costo_unitario_neto`, `costo_final_unitario`,
     `rendimiento_porcentaje`, `factor_rendimiento`, `observaciones`)
SELECT
    p.`id`, 1, 1, COALESCE(p.`costo_promedio`, 0), 1,
    p.`unidad_compra_id`, p.`unidad_inventario_id`, 0, 0,
    COALESCE(p.`costo_promedio`, 0), COALESCE(p.`costo_promedio`, 0), COALESCE(p.`costo_promedio`, 0),
    100, 1,
    'Ficha generada automáticamente a partir del costo promedio existente. Revisa merma y costos directos.'
FROM `productos` p
WHERE COALESCE(p.`costo_promedio`, 0) > 0
  AND NOT EXISTS (
      SELECT 1 FROM `fichas_costo_producto` f
       WHERE f.`producto_id` = p.`id`
  );

-- ----------------------------------------------------------------------------
-- 7. Verificación
-- ----------------------------------------------------------------------------
SELECT
    (SELECT COUNT(*) FROM `fichas_costo_producto` WHERE `vigente` = 1) AS fichas_vigentes,
    (SELECT COUNT(*) FROM `productos` WHERE COALESCE(`costo_promedio`, 0) > 0) AS productos_con_costo,
    (SELECT COUNT(*) FROM `productos`) AS productos_totales;

-- Insumos usados en recetas que TODAVÍA no tienen ficha de costo: son los que
-- distorsionan el cálculo del food cost de sus platillos.
SELECT DISTINCT
    p.`id`, p.`codigo`, p.`nombre`,
    'Sin ficha de costo' AS advertencia
FROM `receta_detalles` rd
INNER JOIN `productos` p ON p.`id` = rd.`producto_id`
LEFT JOIN `fichas_costo_producto` f ON f.`producto_id` = p.`id` AND f.`vigente` = 1
WHERE f.`id` IS NULL
ORDER BY p.`nombre`;
