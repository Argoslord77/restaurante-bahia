-- ============================================================================
-- Migración: tiempos de elaboración y entrega por ítem + cocinero
-- (pedido.ejs "Pedidos / Ventas" profesional).
--
-- Agrega a `detalles_pedido`:
--   hora_enviado   → momento en que el ítem entra a producción (cocina/bar)
--                    o se agrega en modo directo.
--   hora_listo     → momento en que producción lo marca "listo" (monitor).
--   hora_entregado → momento en que el dependiente lo entrega / se cobra.
--   cocinado_por   → usuario que marcó el ítem como listo (cocina o bar).
--
-- Las columnas son NULLABLE a propósito: los ítems históricos no las tienen y
-- el reporte muestra "—" en esos tiempos.
--
-- ⚠️  Haz respaldo antes: mysqldump restaurante_db > respaldo_antes_migracion.sql
-- ============================================================================

-- ¿Ya está aplicada? (devuelve 1 = ya aplicada, no ejecutar de nuevo)
-- SELECT COUNT(*) FROM information_schema.columns
-- WHERE table_schema='restaurante_db'
--   AND table_name='detalles_pedido' AND column_name='hora_enviado';

ALTER TABLE `detalles_pedido`
    ADD COLUMN `hora_enviado` DATETIME NULL DEFAULT NULL AFTER `afecta_inventario`,
    ADD COLUMN `hora_listo` DATETIME NULL DEFAULT NULL AFTER `hora_enviado`,
    ADD COLUMN `hora_entregado` DATETIME NULL DEFAULT NULL AFTER `hora_listo`,
    ADD COLUMN `cocinado_por` INT(11) NULL DEFAULT NULL AFTER `hora_entregado`,
    ADD CONSTRAINT `fk_dp_cocinado_por` FOREIGN KEY (`cocinado_por`)
        REFERENCES `usuarios` (`id`) ON DELETE SET NULL;

-- Nota: si prefiere usar las migraciones de knex en lugar de este script:
--   npm run migrate
-- (la migración equivalente es
--  migrations/20260904120000_add_tiempos_entrega_detalles_pedido.js)
