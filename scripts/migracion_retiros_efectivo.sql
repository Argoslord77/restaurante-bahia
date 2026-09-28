-- ============================================================================
-- MIGRACIÓN V11 (C4): retiros de efectivo del turno
-- ============================================================================
-- Un retiro saca efectivo de la gaveta hacia caja fuerte con motivo y
-- responsable. Los retiros vigentes RESTAN del esperado de caja:
--   esperado = fondo + abonos_en_efectivo − retiros_vigentes
-- Anular un retiro lo excluye del cálculo pero conserva el registro.
--
-- Es SEGURO ejecutarlo varias veces.
-- Aplicar UNA vez: mysql -u USUARIO -p restaurante_db < scripts/migracion_retiros_efectivo.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS retiros_efectivo (
    id INT NOT NULL AUTO_INCREMENT,
    turno_servicio_id BIGINT UNSIGNED NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    motivo VARCHAR(255) NOT NULL,
    usuario_id INT NOT NULL,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    anulado TINYINT(1) NOT NULL DEFAULT 0,
    anulado_por INT NULL,
    anulado_en DATETIME NULL,
    PRIMARY KEY (id),
    KEY idx_retiro_turno (turno_servicio_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Snapshot del cierre: total retirado en el turno.
SET @existe_tabla := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'cierres_servicio'
);
SET @existe_col := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'cierres_servicio'
      AND COLUMN_NAME = 'total_retiros'
);
SET @ddl := IF(@existe_tabla = 1 AND @existe_col = 0,
    'ALTER TABLE cierres_servicio ADD COLUMN total_retiros DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER total_cortesias',
    'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
