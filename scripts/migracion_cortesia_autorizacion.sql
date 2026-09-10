-- ============================================================================
-- MIGRACIÓN: autorización de cortesías (mesa de cortesía 100% gratis)
-- Fecha: 2026-09-10
-- ============================================================================
-- Guarda en cada pedido de cortesía QUIÉN la autorizó, con QUÉ MOTIVO y
-- CUÁNDO. La aplicación también crea estas columnas sola al cobrar la
-- primera cortesía (services/posAutorizacionService.js), pero este script
-- permite dejar la base lista por adelantado.
--
-- Es SEGURO ejecutarlo varias veces: cada ALTER se aplica solo si falta.
-- ============================================================================

-- 1) Columna: usuario supervisor que autorizó la cortesía
SET @existe_col := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'pedidos'
      AND COLUMN_NAME = 'cortesia_autorizada_por'
);
SET @ddl := IF(@existe_col = 0,
    'ALTER TABLE pedidos ADD COLUMN cortesia_autorizada_por INT NULL AFTER id_usuario_cajero',
    'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2) Columna: motivo obligatorio de la cortesía
SET @existe_col := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'pedidos'
      AND COLUMN_NAME = 'cortesia_motivo'
);
SET @ddl := IF(@existe_col = 0,
    'ALTER TABLE pedidos ADD COLUMN cortesia_motivo VARCHAR(255) NULL AFTER cortesia_autorizada_por',
    'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3) Columna: fecha/hora de la autorización
SET @existe_col := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'pedidos'
      AND COLUMN_NAME = 'cortesia_autorizada_en'
);
SET @ddl := IF(@existe_col = 0,
    'ALTER TABLE pedidos ADD COLUMN cortesia_autorizada_en DATETIME NULL AFTER cortesia_motivo',
    'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4) FK hacia usuarios (opcional: si ya existe, se ignora el error)
--    Nota: en MySQL puro, envolver en procedimiento para tolerar duplicados.
DROP PROCEDURE IF EXISTS bahia_add_fk_cortesia;
DELIMITER //
CREATE PROCEDURE bahia_add_fk_cortesia()
BEGIN
    DECLARE CONTINUE HANDLER FOR 1061, 1826 SELECT 1;
    ALTER TABLE pedidos
        ADD CONSTRAINT fk_pedidos_cortesia_autoriza
        FOREIGN KEY (cortesia_autorizada_por) REFERENCES usuarios (id)
        ON DELETE SET NULL;
END //
DELIMITER ;
CALL bahia_add_fk_cortesia();
DROP PROCEDURE IF EXISTS bahia_add_fk_cortesia;

-- 5) Ajustes generales nuevos (la app los crea solos, pero quedan aquí
--    documentados con sus valores por defecto)
INSERT IGNORE INTO configuraciones (clave, valor, descripcion, grupo, tipo) VALUES
('pos_quien_toma_ordenes', 'todos', 'Quién puede tomar órdenes en el POS (todos = capitanes y dependientes; solo_capitanes = únicamente capitanes)', 'general', 'string'),
('cortesia_requiere_autorizacion', '1', 'Las cortesías (100%) requieren autorización de un supervisor', 'general', 'boolean'),
('cortesia_roles_autorizan', 'superadministrador,administrador,capitan', 'Roles que pueden autorizar cortesías (separados por coma)', 'general', 'string');
