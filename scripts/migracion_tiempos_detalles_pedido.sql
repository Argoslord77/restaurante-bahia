-- ============================================================================
-- Migración: ciclo de vida (tiempos) de los ítems de una orden
-- Restaurante Bahía — soporte para la vista profesional de Pedidos/Ventas
--
-- PROBLEMA: `detalles_pedido` solo guarda el estado actual del ítem
-- (en_espera/en_cocina/en_bar/listo/entregado/cancelado). No queda huella de
-- CUÁNDO pasó por cada etapa ni QUIÉN lo preparó o lo entregó, de modo que es
-- imposible calcular el tiempo de entrega de un plato en h:m:s, señalar al
-- cocinero responsable ni medir la duración real del servicio.
--
-- SOLUCIÓN: sello de tiempo por transición + responsables.
--   creado_en               alta del ítem en la orden (ronda del mesero)
--   enviado_en              momento en que la comanda sale hacia producción
--   area_preparacion        cocina | bar (según la categoría del platillo)
--   listo_en                producción lo marca listo
--   entregado_en            el dependiente lo entrega al cliente
--   cancelado_en            anulación del ítem
--   id_usuario_preparacion  cocinero / bartender que lo marcó listo
--   id_usuario_entrega      dependiente (o cajero al cobrar) que lo entregó
--
-- ⚠️  Respaldo antes: mysqldump restaurante_db > respaldo_antes_tiempos.sql
-- ⚠️  Los ALTER de columna no son idempotentes: ejecutar UNA sola vez
--     (el bloque 7 sirve para comprobar si ya está aplicada).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Columnas del ciclo de vida (todas NULLABLE: el histórico no las tiene)
-- ---------------------------------------------------------------------------
ALTER TABLE `detalles_pedido`
  ADD COLUMN `creado_en`              DATETIME        NULL DEFAULT NULL AFTER `afecta_inventario`,
  ADD COLUMN `enviado_en`             DATETIME        NULL DEFAULT NULL AFTER `creado_en`,
  ADD COLUMN `area_preparacion`       ENUM('cocina','bar') NULL DEFAULT NULL AFTER `enviado_en`,
  ADD COLUMN `listo_en`               DATETIME        NULL DEFAULT NULL AFTER `area_preparacion`,
  ADD COLUMN `entregado_en`           DATETIME        NULL DEFAULT NULL AFTER `listo_en`,
  ADD COLUMN `cancelado_en`           DATETIME        NULL DEFAULT NULL AFTER `entregado_en`,
  ADD COLUMN `id_usuario_preparacion` INT(11)         NULL DEFAULT NULL AFTER `cancelado_en`,
  ADD COLUMN `id_usuario_entrega`     INT(11)         NULL DEFAULT NULL AFTER `id_usuario_preparacion`;

-- ---------------------------------------------------------------------------
-- 2) Reconstrucción del histórico (APROXIMADA, solo para no dejar huecos)
--    Las órdenes antiguas no tienen tiempos reales: se toma la apertura de la
--    orden como alta del ítem y el cierre de la cuenta como entrega. Con el
--    sistema en marcha los sellos pasan a ser exactos.
-- ---------------------------------------------------------------------------
UPDATE `detalles_pedido` dp
INNER JOIN `pedidos` p ON p.`id` = dp.`id_pedido`
SET dp.`creado_en` = p.`creado_en`
WHERE dp.`creado_en` IS NULL;

UPDATE `detalles_pedido` dp
INNER JOIN `pedidos` p ON p.`id` = dp.`id_pedido`
SET dp.`enviado_en` = dp.`creado_en`
WHERE dp.`enviado_en` IS NULL
  AND dp.`estado_item` IN ('en_cocina', 'en_bar', 'en_preparacion', 'listo', 'entregado');

UPDATE `detalles_pedido` dp
INNER JOIN `pedidos` p ON p.`id` = dp.`id_pedido`
SET dp.`listo_en` = COALESCE(p.`fecha_cierre`, p.`actualizado_en`)
WHERE dp.`listo_en` IS NULL
  AND dp.`estado_item` IN ('listo', 'entregado');

UPDATE `detalles_pedido` dp
INNER JOIN `pedidos` p ON p.`id` = dp.`id_pedido`
SET dp.`entregado_en` = COALESCE(p.`fecha_cierre`, p.`actualizado_en`),
    dp.`id_usuario_entrega` = COALESCE(dp.`id_usuario_entrega`, p.`id_usuario_cajero`)
WHERE dp.`entregado_en` IS NULL
  AND dp.`estado_item` = 'entregado';

UPDATE `detalles_pedido` dp
INNER JOIN `pedidos` p ON p.`id` = dp.`id_pedido`
SET dp.`cancelado_en` = COALESCE(p.`fecha_cierre`, p.`actualizado_en`)
WHERE dp.`cancelado_en` IS NULL
  AND dp.`estado_item` = 'cancelado';

-- Área de producción deducida del estado que ya tenía el ítem
UPDATE `detalles_pedido`
SET `area_preparacion` = 'bar'
WHERE `area_preparacion` IS NULL AND `estado_item` = 'en_bar';

UPDATE `detalles_pedido`
SET `area_preparacion` = 'cocina'
WHERE `area_preparacion` IS NULL AND `estado_item` IN ('en_cocina', 'en_preparacion');

-- ---------------------------------------------------------------------------
-- 3) `creado_en` pasa a ser obligatorio con valor por defecto (ítems nuevos)
-- ---------------------------------------------------------------------------
ALTER TABLE `detalles_pedido`
  MODIFY COLUMN `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ---------------------------------------------------------------------------
-- 4) Integridad referencial de los responsables (ejecutar UNA sola vez)
-- ---------------------------------------------------------------------------
ALTER TABLE `detalles_pedido`
  ADD CONSTRAINT `fk_dp_usuario_preparacion`
  FOREIGN KEY (`id_usuario_preparacion`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_dp_usuario_entrega`
  FOREIGN KEY (`id_usuario_entrega`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- 5) Índices de consulta (vista Pedidos/Ventas y reportes de tiempos)
-- ---------------------------------------------------------------------------
ALTER TABLE `detalles_pedido`
  ADD KEY `idx_dp_entregado_en` (`entregado_en`),
  ADD KEY `idx_dp_creado_en` (`creado_en`),
  ADD KEY `idx_dp_pedido_estado_item` (`id_pedido`, `estado_item`);

-- ---------------------------------------------------------------------------
-- 6) (Opcional) Área de producción real por categoría del platillo.
--    `categorias_platillos.tipo` ya distingue BEBIDAS del resto: se usa para
--    rellenar el área de los ítems históricos que venían sin ella.
-- ---------------------------------------------------------------------------
UPDATE `detalles_pedido` dp
INNER JOIN `platillos_menu` pm ON pm.`id` = dp.`id_platillo` AND (dp.`es_platillo_dia` = 0 OR dp.`es_platillo_dia` IS NULL)
INNER JOIN `categorias_platillos` cp ON cp.`id` = pm.`categoria`
SET dp.`area_preparacion` = IF(UPPER(COALESCE(cp.`tipo`, '')) = 'BEBIDAS', 'bar', 'cocina')
WHERE dp.`area_preparacion` IS NULL;

-- ---------------------------------------------------------------------------
-- 7) Verificación manual sugerida
-- ---------------------------------------------------------------------------
--   SHOW COLUMNS FROM detalles_pedido LIKE '%_en';           -- 5 columnas *_en
--   SELECT COUNT(*) FROM detalles_pedido WHERE creado_en IS NULL;   -- debe ser 0
--   SELECT dp.id, dp.estado_item, dp.enviado_en, dp.listo_en, dp.entregado_en,
--          TIMESTAMPDIFF(SECOND, COALESCE(dp.enviado_en, dp.creado_en),
--                        COALESCE(dp.entregado_en, dp.listo_en)) AS segundos
--     FROM detalles_pedido dp ORDER BY dp.id DESC LIMIT 20;
-- ============================================================================
