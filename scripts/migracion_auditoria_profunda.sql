-- ============================================================================
-- Migración: auditoría en profundidad
-- Restaurante Bahía
--
-- Amplía `auditoria_usuarios` para soportar el registro completo de la
-- actividad de los usuarios: autenticación, consultas y visualizaciones,
-- altas/modificaciones/bajas, impresiones y cierres de cuenta, turno y día.
--
-- Columnas añadidas
-- -----------------
--   modulo        Agrupación funcional (Inventario, Caja, Recetas, Turnos...)
--   categoria     AUTENTICACION | LECTURA | ESCRITURA | IMPRESION | CIERRE |
--                 EXPORTACION | SEGURIDAD | SISTEMA
--   severidad     INFO | AVISO | CRITICO
--   sesion_id     Permite reconstruir toda la actividad de una misma sesión
--   repeticiones  Nº de peticiones agrupadas cuando el asiento corresponde a
--                 un endpoint de sondeo (refresco de monitores y del POS)
--
-- ⚠️  Haz respaldo antes: mysqldump restaurante_db > respaldo_antes_migracion.sql
-- Script idempotente: se puede ejecutar varias veces sin efectos colaterales.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Crear la tabla si la instalación aún no la tiene
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `auditoria_usuarios` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `usuario_id` INT NULL,
    `usuario_nombre` VARCHAR(150) NULL,
    `usuario_rol` VARCHAR(60) NULL,
    `metodo_http` VARCHAR(10) NOT NULL,
    `ruta` VARCHAR(255) NOT NULL,
    `url` VARCHAR(1024) NULL,
    `accion` VARCHAR(150) NOT NULL,
    `entidad` VARCHAR(100) NULL,
    `entidad_id` VARCHAR(100) NULL,
    `estado_http` SMALLINT UNSIGNED NULL,
    `operacion_exitosa` TINYINT(1) NOT NULL DEFAULT 0,
    `ip_origen` VARCHAR(100) NULL,
    `user_agent` VARCHAR(500) NULL,
    `datos_operacion` LONGTEXT NULL,
    `duracion_ms` INT UNSIGNED NULL,
    `creado_en` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_auditoria_usuario` (`usuario_id`),
    KEY `idx_auditoria_fecha` (`creado_en`),
    KEY `idx_auditoria_accion` (`accion`),
    KEY `idx_auditoria_ruta` (`ruta`),
    KEY `idx_auditoria_estado` (`estado_http`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 2. Añadir las columnas nuevas (solo las que falten)
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_tmp_auditoria_add_columna`;
DELIMITER $$
CREATE PROCEDURE `sp_tmp_auditoria_add_columna`(
    IN p_columna VARCHAR(64),
    IN p_definicion VARCHAR(255)
)
BEGIN
    DECLARE v_existe INT DEFAULT 0;

    SELECT COUNT(*) INTO v_existe
      FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'auditoria_usuarios'
       AND COLUMN_NAME = p_columna;

    IF v_existe = 0 THEN
        SET @sql = CONCAT('ALTER TABLE `auditoria_usuarios` ADD COLUMN `',
                          p_columna, '` ', p_definicion);
        PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
    END IF;
END$$
DELIMITER ;

CALL sp_tmp_auditoria_add_columna('modulo',
    "VARCHAR(60) NULL COMMENT 'Agrupación funcional: Inventario, Caja, Recetas...' AFTER `entidad_id`");
CALL sp_tmp_auditoria_add_columna('categoria',
    "VARCHAR(20) NULL COMMENT 'AUTENTICACION|LECTURA|ESCRITURA|IMPRESION|CIERRE|EXPORTACION|SEGURIDAD|SISTEMA' AFTER `modulo`");
CALL sp_tmp_auditoria_add_columna('severidad',
    "VARCHAR(10) NULL COMMENT 'INFO|AVISO|CRITICO' AFTER `categoria`");
CALL sp_tmp_auditoria_add_columna('sesion_id',
    "VARCHAR(128) NULL COMMENT 'Correlaciona toda la actividad de una misma sesión' AFTER `severidad`");
CALL sp_tmp_auditoria_add_columna('repeticiones',
    "INT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'Peticiones agrupadas en endpoints de sondeo' AFTER `sesion_id`");

DROP PROCEDURE IF EXISTS `sp_tmp_auditoria_add_columna`;

-- ----------------------------------------------------------------------------
-- 3. Índices de apoyo para los filtros de la vista (solo los que falten)
-- ----------------------------------------------------------------------------
DROP PROCEDURE IF EXISTS `sp_tmp_auditoria_add_indice`;
DELIMITER $$
CREATE PROCEDURE `sp_tmp_auditoria_add_indice`(
    IN p_indice VARCHAR(64),
    IN p_columnas VARCHAR(255)
)
BEGIN
    DECLARE v_existe INT DEFAULT 0;

    SELECT COUNT(*) INTO v_existe
      FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'auditoria_usuarios'
       AND INDEX_NAME = p_indice;

    IF v_existe = 0 THEN
        SET @sql = CONCAT('CREATE INDEX `', p_indice,
                          '` ON `auditoria_usuarios` (', p_columnas, ')');
        PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
    END IF;
END$$
DELIMITER ;

CALL sp_tmp_auditoria_add_indice('idx_auditoria_categoria', '`categoria`, `creado_en`');
CALL sp_tmp_auditoria_add_indice('idx_auditoria_severidad', '`severidad`, `creado_en`');
CALL sp_tmp_auditoria_add_indice('idx_auditoria_modulo',    '`modulo`, `creado_en`');
CALL sp_tmp_auditoria_add_indice('idx_auditoria_entidad',   '`entidad`, `entidad_id`');
CALL sp_tmp_auditoria_add_indice('idx_auditoria_sesion',    '`sesion_id`');

DROP PROCEDURE IF EXISTS `sp_tmp_auditoria_add_indice`;

-- ----------------------------------------------------------------------------
-- 4. Clasificar los asientos históricos que se registraron sin categoría
--    (hasta ahora solo se auditaban las copias de seguridad)
-- ----------------------------------------------------------------------------
UPDATE `auditoria_usuarios`
   SET `categoria` = 'SISTEMA',
       `severidad` = 'CRITICO',
       `modulo`    = 'Sistema'
 WHERE `categoria` IS NULL
   AND (`ruta` LIKE '%backup%' OR `ruta` LIKE '%restore%' OR `accion` LIKE '%respaldo%');

UPDATE `auditoria_usuarios`
   SET `categoria` = CASE WHEN `metodo_http` = 'GET' THEN 'LECTURA' ELSE 'ESCRITURA' END,
       `severidad` = CASE WHEN `metodo_http` = 'GET' THEN 'INFO'
                          WHEN `metodo_http` = 'DELETE' THEN 'CRITICO'
                          ELSE 'AVISO' END,
       `modulo`    = 'Histórico'
 WHERE `categoria` IS NULL;

-- ----------------------------------------------------------------------------
-- 5. Verificación
-- ----------------------------------------------------------------------------
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
  FROM information_schema.COLUMNS
 WHERE TABLE_SCHEMA = DATABASE()
   AND TABLE_NAME = 'auditoria_usuarios'
 ORDER BY ORDINAL_POSITION;

SELECT COALESCE(`categoria`, 'SIN CLASIFICAR') AS categoria,
       COUNT(*) AS asientos
  FROM `auditoria_usuarios`
 GROUP BY `categoria`
 ORDER BY asientos DESC;
