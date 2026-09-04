-- ══════════════════════════════════════════════════════════════════
--  Restaurante Bahía · Actualización de base de datos
--  Unidad de medida en Salidas Manuales de Inventario
--  Fecha: 29-08-2026
-- ══════════════════════════════════════════════════════════════════
--  Ejecute este script UNA sola vez en su base de datos
--  (phpMyAdmin → SQL, HeidiSQL, mysql -u usuario -p restaurante_db < archivo.sql).
--  Es seguro para datos existentes: la columna es NULLABLE y los
--  registros históricos mostrarán la unidad de inventario del producto.
-- ══════════════════════════════════════════════════════════════════

ALTER TABLE `salidas_manuales`
    ADD COLUMN `unidad_medida_id` BIGINT UNSIGNED NULL AFTER `cantidad`,
    ADD CONSTRAINT `fk_sm_unidad` FOREIGN KEY (`unidad_medida_id`)
        REFERENCES `unidades_medida` (`id`) ON DELETE SET NULL;

-- Nota: si prefiere usar las migraciones de knex en lugar de este script:
--   npm run migrate
-- (la migración equivalente es migrations/20260829120000_add_unidad_medida_salidas_manuales.js)
