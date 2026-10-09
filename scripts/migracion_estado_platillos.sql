-- ============================================================================
-- Migración: estado visible/oculto de los platillos en la carta
-- Restaurante Bahía
--
-- Contexto
-- --------
-- La carta del cliente (clienteController) solo muestra platillos con
-- `activo = 1`, pero ese campo no se podía editar desde la gestión del
-- menú. Esta migración garantiza la columna (si la base ya la tiene, no
-- hace nada) para que el formulario de crear/editar platillo la gestione.
--
-- ⚠️  Haz respaldo antes: mysqldump restaurante_db > respaldo_antes_migracion.sql
-- Script idempotente: se puede ejecutar varias veces sin efectos colaterales.
-- ============================================================================

SET @existe_columna := (
    SELECT COUNT(*)
      FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'platillos_menu'
       AND COLUMN_NAME = 'activo'
);

SET @sql := IF(@existe_columna = 0,
    'ALTER TABLE `platillos_menu`
       ADD COLUMN `activo` TINYINT(1) NOT NULL DEFAULT 1
       COMMENT ''1 = visible en la carta, 0 = oculto''',
    'SELECT ''La columna platillos_menu.activo ya existe, se omite el ALTER'' AS aviso'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
