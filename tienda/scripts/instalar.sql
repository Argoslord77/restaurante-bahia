-- ============================================================================
-- TIENDA POS — Instalación de la base de datos (tienda_db)
-- ============================================================================
-- Uso:
--   mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS tienda_db CHARACTER SET utf8mb4;"
--   mysql -u root -p tienda_db < scripts/instalar.sql
--   npm run crear-admin -- usuario clave   (crea el administrador)
--
-- Idempotente: puede ejecutarse varias veces sin duplicar ni romper nada.
-- ============================================================================

CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    usuario VARCHAR(60) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    rol ENUM('administrador','cajero','vendedor') NOT NULL DEFAULT 'vendedor',
    activo TINYINT(1) NOT NULL DEFAULT 1,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS categorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    activo TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sku VARCHAR(60) NULL UNIQUE COMMENT 'Código/SKU (opcional, único si se indica)',
    nombre VARCHAR(150) NOT NULL,
    categoria_id INT NULL,
    descripcion VARCHAR(255) NULL,
    precio_costo DECIMAL(12,2) NOT NULL DEFAULT 0,
    precio_venta DECIMAL(12,2) NOT NULL DEFAULT 0,
    stock INT NOT NULL DEFAULT 0,
    stock_minimo INT NOT NULL DEFAULT 0,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_producto_nombre (nombre),
    KEY idx_producto_categoria (categoria_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ajustes (
    clave VARCHAR(60) PRIMARY KEY,
    valor VARCHAR(255) NOT NULL DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS turnos_caja (
    id INT AUTO_INCREMENT PRIMARY KEY,
    abierto_por INT NULL,
    abierto_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fondo_inicial DECIMAL(12,2) NOT NULL DEFAULT 0,
    cerrado_por INT NULL,
    cerrado_en DATETIME NULL,
    conteo_efectivo DECIMAL(12,2) NULL COMMENT 'Efectivo contado al cierre',
    diferencia DECIMAL(12,2) NULL COMMENT 'Contado menos esperado (+ sobrante / - faltante)',
    nota VARCHAR(255) NULL,
    estado ENUM('abierto','cerrado') NOT NULL DEFAULT 'abierto',
    KEY idx_turno_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ventas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    turno_id INT NULL,
    usuario_id INT NULL,
    cliente_nombre VARCHAR(120) NULL,
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    descuento DECIMAL(12,2) NOT NULL DEFAULT 0,
    iva_pct DECIMAL(5,2) NOT NULL DEFAULT 0,
    iva_monto DECIMAL(12,2) NOT NULL DEFAULT 0,
    total DECIMAL(12,2) NOT NULL DEFAULT 0,
    cambio DECIMAL(12,2) NOT NULL DEFAULT 0,
    estado ENUM('cobrada','cancelada') NOT NULL DEFAULT 'cobrada',
    motivo_cancelacion VARCHAR(255) NULL,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_venta_fecha (creado_en),
    KEY idx_venta_turno (turno_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS venta_detalles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    venta_id INT NOT NULL,
    producto_id INT NULL,
    nombre VARCHAR(150) NOT NULL COMMENT 'Foto del nombre al momento de vender',
    precio_unitario DECIMAL(12,2) NOT NULL DEFAULT 0,
    costo_unitario DECIMAL(12,2) NOT NULL DEFAULT 0 COMMENT 'Foto del costo (para utilidad)',
    cantidad INT NOT NULL DEFAULT 1,
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    KEY idx_detalle_venta (venta_id),
    KEY idx_detalle_producto (producto_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pagos_venta (
    id INT AUTO_INCREMENT PRIMARY KEY,
    venta_id INT NOT NULL,
    metodo ENUM('efectivo','tarjeta','transferencia') NOT NULL DEFAULT 'efectivo',
    monto DECIMAL(12,2) NOT NULL DEFAULT 0,
    KEY idx_pago_venta (venta_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS movimientos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    producto_id INT NOT NULL,
    tipo ENUM('entrada','salida','venta','devolucion','ajuste') NOT NULL,
    cantidad INT NOT NULL COMMENT 'Con signo: + entra, - sale',
    stock_antes INT NOT NULL DEFAULT 0,
    stock_despues INT NOT NULL DEFAULT 0,
    motivo VARCHAR(255) NULL,
    referencia_id INT NULL COMMENT 'Id de venta si aplica',
    usuario_id INT NULL,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_mov_producto (producto_id),
    KEY idx_mov_fecha (creado_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Ajustes base (no pisan valores existentes)
INSERT IGNORE INTO ajustes (clave, valor) VALUES
    ('negocio_nombre', 'Mi Negocio'),
    ('iva_pct', '16.00'),
    ('ticket_pie', 'Gracias por su compra');

INSERT IGNORE INTO categorias (nombre) VALUES ('General');
