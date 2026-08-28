-- ============================================================================
-- Migración: parámetros de derivación de precios entre cartas
-- Restaurante Bahía
--
-- Contexto
-- --------
-- El sistema mantiene tres precios independientes por platillo:
--     CUP      -> platillos_menu.precio
--     COMISION -> platillos_menu.precio_alt
--     ZELLE    -> platillos_menu.precio_usd
--
-- Cuando una mesa se cambia a la carta COMISION o ZELLE, los platillos que solo
-- tenían precio en CUP quedaban sin precio: la vista del cliente los mostraba a
-- $0.00 y el cliente los interpretaba como agotados.
--
-- Con estos parámetros, un platillo sin precio propio en la carta secundaria se
-- muestra y se cobra a partir del precio base en CUP:
--     COMISION = precio CUP x carta_comision_factor
--     ZELLE    = precio CUP / tasa de la moneda USD/ZELLE
--
-- Poniendo `carta_precio_derivado` a 0 se recupera el comportamiento estricto:
-- sin precio propio, el platillo no se ofrece.
--
-- Script idempotente.
-- ============================================================================

CREATE TABLE IF NOT EXISTS `configuraciones` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `clave` VARCHAR(100) NOT NULL UNIQUE,
    `valor` LONGTEXT NULL,
    `descripcion` VARCHAR(255) NULL,
    `grupo` VARCHAR(50) DEFAULT 'general',
    `tipo` VARCHAR(20) DEFAULT 'boolean',
    `actualizado_en` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT IGNORE INTO `configuraciones` (`clave`, `valor`, `descripcion`, `grupo`, `tipo`)
VALUES
    ('carta_precio_derivado', '1',
     'Si un platillo no tiene precio propio en la carta Comisión o Zelle, derivarlo del precio CUP en lugar de ocultarlo',
     'precios', 'boolean'),
    ('carta_comision_factor', '1.10',
     'Factor aplicado al precio CUP para derivar el precio de la carta Comisión',
     'precios', 'number');

-- ----------------------------------------------------------------------------
-- Verificación: platillos a los que les falta precio en alguna carta
-- ----------------------------------------------------------------------------
SELECT
    'platillos_menu' AS origen, id, nombre, precio AS cup, precio_alt AS comision, precio_usd AS zelle,
    CONCAT_WS(', ',
        CASE WHEN precio     IS NULL OR precio     = 0 THEN 'falta CUP'      END,
        CASE WHEN precio_alt IS NULL OR precio_alt = 0 THEN 'falta COMISION' END,
        CASE WHEN precio_usd IS NULL OR precio_usd = 0 THEN 'falta ZELLE'    END
    ) AS pendientes
FROM platillos_menu
WHERE activo = 1
  AND (precio IS NULL OR precio = 0 OR precio_alt IS NULL OR precio_alt = 0
       OR precio_usd IS NULL OR precio_usd = 0)
ORDER BY nombre;

-- La moneda usada para derivar la carta Zelle debe existir y estar activa
SELECT id, codigo, nombre, factor_cambio, activo
  FROM monedas
 WHERE UPPER(codigo) IN ('ZELLE', 'USD');
