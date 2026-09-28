-- ============================================================================
-- MIGRACIÓN V13 (C1): catálogo de proveedores y vínculo con las compras
-- ============================================================================
-- C1: la tabla `proveedores` existe desde el esquema inicial pero nunca
-- tuvo código; se crea solo si falta (compatible con la original).
-- Cada lote recibido puede indicar su proveedor (lotes.proveedor_id ya
-- existe en producción; se agrega solo si falta) para el historial de
-- compras por proveedor.
--
-- Es SEGURO ejecutarlo varias veces.
-- Aplicar UNA vez: mysql -u USUARIO -p restaurante_db < scripts/migracion_proveedores_compras.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS proveedores (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    codigo VARCHAR(50) NOT NULL,
    nombre_comercial VARCHAR(150) NOT NULL,
    razon_social VARCHAR(200) NULL,
    identificacion_fiscal VARCHAR(50) NULL,
    telefono VARCHAR(50) NULL,
    email VARCHAR(150) NULL,
    direccion TEXT NULL,
    persona_contacto VARCHAR(150) NULL,
    condiciones_pago VARCHAR(255) NULL,
    dias_credito INT UNSIGNED NOT NULL DEFAULT 0,
    limite_credito DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    observaciones TEXT NULL,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_proveedor_codigo (codigo),
    KEY idx_proveedor_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET @existe_col := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'lotes'
      AND COLUMN_NAME = 'proveedor_id'
);
SET @ddl := IF(@existe_col = 0,
    'ALTER TABLE lotes ADD COLUMN proveedor_id BIGINT UNSIGNED NULL, ADD KEY idx_lote_proveedor (proveedor_id)',
    'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
