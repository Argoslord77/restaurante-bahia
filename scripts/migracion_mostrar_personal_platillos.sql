-- ============================================================================
-- Migración: visibilidad de los platillos para el personal (POS)
-- Restaurante Bahía
--
-- Contexto
-- --------
-- El campo `activo` de platillos_menu controlaba a la vez la carta del
-- cliente y el POS del dependiente/capitán: al ocultar un platillo al
-- cliente también desaparecía del POS y ya no se podía ordenar.
-- Desde esta migración:
--   * `activo` solo controla la carta del cliente.
--   * `mostrar_a_personal` controla si el platillo aparece en el POS.
-- Por defecto todo queda visible al personal (1), incluidos los que hoy
-- están ocultos al cliente: el personal los sigue viendo y puede
-- ordenarlos; desde el admin se puede ocultar a cada público por separado.
--
-- ⚠️  Haz respaldo antes: mysqldump restaurante_db > respaldo_antes_migracion.sql
-- Script idempotente: se puede ejecutar varias veces sin efectos colaterales.
-- ============================================================================

SET @existe_columna := (
    SELECT COUNT(*)
      FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'platillos_menu'
       AND COLUMN_NAME = 'mostrar_a_personal'
);

SET @sql := IF(@existe_columna = 0,
    'ALTER TABLE `platillos_menu`
       ADD COLUMN `mostrar_a_personal` TINYINT(1) NOT NULL DEFAULT 1
       COMMENT ''1 = visible en el POS del personal, 0 = oculto al personal''',
    'SELECT ''La columna platillos_menu.mostrar_a_personal ya existe, se omite el ALTER'' AS aviso'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
