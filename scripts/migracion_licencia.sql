-- ============================================================================
-- Migración: sistema de licencias
-- Restaurante Bahía
--
-- Tres tablas:
--   licencia_estado    Estado de la instalación: identidad, trinquete de
--                      tiempo, días consumidos y cadena de arranques. Cada
--                      fila va sellada con HMAC para que editarla a mano quede
--                      en evidencia. Se replica en licencia/estado.dat, fuera
--                      de la base, y siempre se toma el valor MÁS AVANZADO de
--                      las dos copias: así restaurar un respaldo antiguo no
--                      devuelve días de licencia.
--   licencia_eventos   Bitácora: activaciones, relojes atrasados, bloqueos.
--   licencia_dias      Días naturales con actividad, base del contador de uso.
--
-- Script idempotente.
-- ============================================================================

CREATE TABLE IF NOT EXISTS `licencia_estado` (
    `id` TINYINT UNSIGNED NOT NULL DEFAULT 1,
    `instalacion_uuid` CHAR(36) NOT NULL
        COMMENT 'Identidad de esta instalación; la licencia se emite contra ella',
    `licencia_id` VARCHAR(40) NULL,
    `trinquete_ms` BIGINT UNSIGNED NOT NULL DEFAULT 0
        COMMENT 'Máximo instante jamás observado: solo avanza, nunca retrocede',
    `dias_consumidos` INT UNSIGNED NOT NULL DEFAULT 0,
    `ultimo_dia` CHAR(10) NULL COMMENT 'Último día natural con actividad (YYYY-MM-DD)',
    `secuencia` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Número de arranques',
    `cadena` CHAR(64) NULL COMMENT 'Cadena de hash de los arranques',
    `estado` VARCHAR(20) NULL,
    `gracia_desde_ms` BIGINT UNSIGNED NULL,
    `sello` CHAR(64) NULL COMMENT 'HMAC del contenido: detecta ediciones manuales',
    `actualizado_en` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `licencia_eventos` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `tipo` VARCHAR(60) NOT NULL,
    `gravedad` VARCHAR(10) NOT NULL DEFAULT 'INFO',
    `detalle` TEXT NULL,
    `creado_en` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_lic_ev_fecha` (`creado_en`),
    KEY `idx_lic_ev_tipo` (`tipo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `licencia_dias` (
    `dia` CHAR(10) NOT NULL COMMENT 'YYYY-MM-DD',
    `primera_actividad` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`dia`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- Verificación
-- ----------------------------------------------------------------------------
SELECT
    (SELECT COUNT(*) FROM `licencia_estado`)  AS filas_estado,
    (SELECT COUNT(*) FROM `licencia_eventos`) AS eventos,
    (SELECT COUNT(*) FROM `licencia_dias`)    AS dias_registrados;

SELECT `instalacion_uuid`, `licencia_id`, `estado`, `dias_consumidos`, `secuencia`,
       FROM_UNIXTIME(`trinquete_ms`/1000) AS trinquete
  FROM `licencia_estado`;
