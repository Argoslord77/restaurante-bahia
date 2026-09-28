-- ============================================================================
-- MIGRACIÓN V12 (C2 + C3): reservas de mesa y estado fusionada
-- ============================================================================
-- C2: tabla `reservas` — apartados de mesa con cliente, comensales, fecha y
-- estado (pendiente → sentada | cancelada | no_show). Al llegar el cliente
-- se abre su pedido y la mesa pasa a ocupada.
-- C3: nuevo valor 'fusionada' en pedidos.estado_pago para las cuentas que
-- dejan de existir al unirlas o vaciarlas en otra (totales en cero, con
-- fecha_cierre, invisibles para cobro/monitores/pendientes).
--
-- Es SEGURO ejecutarlo varias veces.
-- Aplicar UNA vez: mysql -u USUARIO -p restaurante_db < scripts/migracion_reservas_cuentas.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS reservas (
    id INT NOT NULL AUTO_INCREMENT,
    id_mesa INT NOT NULL,
    cliente_nombre VARCHAR(100) NOT NULL,
    cliente_telefono VARCHAR(30) NULL,
    comensales INT NOT NULL DEFAULT 2,
    fecha_reserva DATETIME NOT NULL,
    estado ENUM('pendiente','sentada','cancelada','no_show') NOT NULL DEFAULT 'pendiente',
    notas VARCHAR(255) NULL,
    creado_por INT NULL,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_reserva_mesa_fecha (id_mesa, fecha_reserva),
    KEY idx_reserva_estado_fecha (estado, fecha_reserva)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Valor 'fusionada' al final del ENUM (no altera los valores existentes).
SET @tiene_fusionada := (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'pedidos'
      AND COLUMN_NAME = 'estado_pago'
      AND COLUMN_TYPE LIKE '%fusionada%'
);
SET @ddl := IF(@tiene_fusionada = 0,
    'ALTER TABLE pedidos MODIFY estado_pago ENUM(''pendiente'',''pagado'',''cortesia'',''facturado'',''pendiente_pago'',''fusionada'') NOT NULL DEFAULT ''pendiente''',
    'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
