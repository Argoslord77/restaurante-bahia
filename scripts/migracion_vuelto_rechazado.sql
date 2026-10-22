-- ============================================================================
-- MIGRACIÓN: propina topada + concepto de vuelto (devuelto / rechazado)
-- Fecha: 2026-10-22
-- ============================================================================
-- Nueva regla del cobro: la propina NUNCA supera lo definido ni el
-- excedente (propina = min(definida, abonado - orden)). Lo pagado de más
-- por encima de la propina aplicada es VUELTO del cliente: se devuelve, o
-- si el cliente lo rechaza queda como INGRESO EXTRA del negocio (NO es
-- propina) y entra al cuadre de caja.
--
-- La aplicación también crea estas columnas sola (primer cobro / cierre
-- tras actualizar), pero este script deja la base lista por adelantado.
--
-- Es SEGURO ejecutarlo varias veces: cada ALTER se aplica solo si falta.
-- Datos viejos: las columnas nacen en 0.00, y como antes todo excedente
-- se guardaba como propina, el vuelto derivado de cobros viejos es 0.
-- ============================================================================

-- 1) pedidos.vuelto_rechazado: vuelto que el cliente rechazó (ingreso extra)
SET @existe_col := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'pedidos'
      AND COLUMN_NAME = 'vuelto_rechazado'
);
SET @ddl := IF(@existe_col = 0,
    'ALTER TABLE pedidos ADD COLUMN vuelto_rechazado DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER propina',
    'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2) pedidos.vuelto_devuelto: vuelto entregado de vuelta al cliente
SET @existe_col := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'pedidos'
      AND COLUMN_NAME = 'vuelto_devuelto'
);
SET @ddl := IF(@existe_col = 0,
    'ALTER TABLE pedidos ADD COLUMN vuelto_devuelto DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER vuelto_rechazado',
    'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3) cierres_servicio.total_vuelto_rechazado (instantánea del cierre)
SET @existe_col := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'cierres_servicio'
      AND COLUMN_NAME = 'total_vuelto_rechazado'
);
SET @ddl := IF(@existe_col = 0,
    'ALTER TABLE cierres_servicio ADD COLUMN total_vuelto_rechazado DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER total_propinas',
    'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4) cierres_servicio.total_vuelto_devuelto (instantánea del cierre)
SET @existe_col := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'cierres_servicio'
      AND COLUMN_NAME = 'total_vuelto_devuelto'
);
SET @ddl := IF(@existe_col = 0,
    'ALTER TABLE cierres_servicio ADD COLUMN total_vuelto_devuelto DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER total_vuelto_rechazado',
    'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
