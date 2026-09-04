-- ============================================================================
-- Migración: trazabilidad de tiempos por ítem (`detalles_pedido`)
-- Restaurante Bahía · 04-09-2026
--
-- POR QUÉ: el reporte de Pedidos / Ventas necesita informar el tiempo de
-- entrega de cada producto, cuánto tardó la cocina o el bar en producirlo y
-- qué cocinero lo sacó. Hoy el estado del ítem se cambia con un UPDATE plano
-- sobre `detalles_pedido.estado_item` y no queda ninguna marca de tiempo.
--
-- QUÉ HACE: agrega cuatro columnas NULLABLE a `detalles_pedido`:
--   enviado_en             → cuando la ronda se envió a cocina / bar
--   listo_en               → cuando producción lo marcó listo
--   entregado_en           → cuando el dependiente lo entregó en la mesa
--   usuario_produccion_id  → usuario que lo marcó listo (cocinero / bartender)
--
-- Es seguro con los datos existentes: las órdenes antiguas quedan con las
-- marcas en NULL y el reporte muestra «—» en esas columnas. La aplicación
-- funciona igual antes y después de aplicar este script.
--
-- ⚠️  Respaldo antes: mysqldump restaurante_db > respaldo_antes_tiempos.sql
--     (los ADD COLUMN son idempotentes gracias al chequeo por información_schema)
--
-- Equivalente con knex:  npm run migrate
-- ============================================================================

DROP PROCEDURE IF EXISTS `sp_bahia_tiempos_item_pedido`;

DELIMITER $$
CREATE PROCEDURE `sp_bahia_tiempos_item_pedido`()
BEGIN
    DECLARE db VARCHAR(64) DEFAULT DATABASE();

    -- 1) enviado_en -----------------------------------------------------------
    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                    WHERE TABLE_SCHEMA = db AND TABLE_NAME = 'detalles_pedido'
                      AND COLUMN_NAME = 'enviado_en') THEN
        ALTER TABLE `detalles_pedido`
            ADD COLUMN `enviado_en` DATETIME NULL AFTER `afecta_inventario`;
    END IF;

    -- 2) listo_en -------------------------------------------------------------
    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                    WHERE TABLE_SCHEMA = db AND TABLE_NAME = 'detalles_pedido'
                      AND COLUMN_NAME = 'listo_en') THEN
        ALTER TABLE `detalles_pedido`
            ADD COLUMN `listo_en` DATETIME NULL AFTER `enviado_en`;
    END IF;

    -- 3) entregado_en ---------------------------------------------------------
    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                    WHERE TABLE_SCHEMA = db AND TABLE_NAME = 'detalles_pedido'
                      AND COLUMN_NAME = 'entregado_en') THEN
        ALTER TABLE `detalles_pedido`
            ADD COLUMN `entregado_en` DATETIME NULL AFTER `listo_en`;
    END IF;

    -- 4) usuario_produccion_id ------------------------------------------------
    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                    WHERE TABLE_SCHEMA = db AND TABLE_NAME = 'detalles_pedido'
                      AND COLUMN_NAME = 'usuario_produccion_id') THEN
        ALTER TABLE `detalles_pedido`
            ADD COLUMN `usuario_produccion_id` INT NULL AFTER `entregado_en`;
    END IF;

    -- 5) índices --------------------------------------------------------------
    IF NOT EXISTS (SELECT 1 FROM information_schema.STATISTICS
                    WHERE TABLE_SCHEMA = db AND TABLE_NAME = 'detalles_pedido'
                      AND INDEX_NAME = 'idx_dp_pedido_entregado') THEN
        ALTER TABLE `detalles_pedido`
            ADD INDEX `idx_dp_pedido_entregado` (`id_pedido`, `entregado_en`);
    END IF;

    -- 6) FK con usuarios (opcional: si hay huérfanos se puede ignorar) -------
    IF NOT EXISTS (SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
                    WHERE TABLE_SCHEMA = db AND TABLE_NAME = 'detalles_pedido'
                      AND CONSTRAINT_NAME = 'fk_dp_usuario_produccion') THEN
        ALTER TABLE `detalles_pedido`
            ADD CONSTRAINT `fk_dp_usuario_produccion`
            FOREIGN KEY (`usuario_produccion_id`) REFERENCES `usuarios` (`id`)
            ON DELETE SET NULL ON UPDATE RESTRICT;
    END IF;
END$$
DELIMITER ;

CALL `sp_bahia_tiempos_item_pedido`();
DROP PROCEDURE `sp_bahia_tiempos_item_pedido`;

-- Backfill: los ítems ya entregados antes de la migración reciben como marca
-- de entrega la fecha de cierre de la cuenta (aproximada, pero mejor que
-- dejarlos vacíos para el histórico). Quita el comentario si quieres que la
-- trazabilidad arranque limpia desde hoy.
--
-- UPDATE detalles_pedido dp
--   INNER JOIN pedidos p ON p.id = dp.id_pedido
--      SET dp.entregado_en = COALESCE(p.fecha_cierre, p.actualizado_en),
--          dp.enviado_en   = p.creado_en
--    WHERE dp.estado_item = 'entregado'
--      AND dp.entregado_en IS NULL;
