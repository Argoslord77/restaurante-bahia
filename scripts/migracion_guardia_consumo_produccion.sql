-- ============================================================================
-- Migración: guardia a nivel de BASE DE DATOS contra el consumo por venta
--            en almacenes logísticos
-- Restaurante Bahía
--
-- Contexto
-- --------
-- El descuento de insumos por venta tiene (al menos) dos caminos en el sistema:
--
--   1. Node:  RecetaService.descontarStockPedido()  → ya valida la categoría.
--   2. SQL:   sp_procesar_explosion_inventario_venta() → procedimiento
--             almacenado que NO está versionado en este repositorio y cuya
--             lógica interna de almacén no podemos auditar desde el código.
--
-- Este trigger es la red de seguridad que cubre AMBOS caminos y cualquier otro
-- (scripts manuales, herramientas externas, un futuro endpoint): si alguien
-- intenta registrar un consumo por venta contra un almacén logístico, la
-- transacción se aborta con un error explícito.
--
-- Movimientos BLOQUEADOS en almacenes logísticos:
--     CONSUMO_RECETA, VENTA
-- Movimientos PERMITIDOS en almacenes logísticos (operación normal del central):
--     TRANSFERENCIA_ENTRADA, TRANSFERENCIA_SALIDA, ENTRADA, AJUSTE_*, MERMA...
--
-- Requisito: aplicar antes scripts/migracion_categoria_almacenes.sql
-- ⚠️  Haz respaldo antes: mysqldump restaurante_db > respaldo_antes_migracion.sql
-- Script idempotente.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Comprobación de requisito previo: la columna `categoria` debe existir
-- ----------------------------------------------------------------------------
SET @tiene_categoria := (
    SELECT COUNT(*)
      FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'almacenes'
       AND COLUMN_NAME = 'categoria'
);

SET @sql := IF(@tiene_categoria = 0,
    'SELECT `Falta la columna almacenes.categoria: ejecuta antes migracion_categoria_almacenes.sql`',
    'SELECT ''Requisito cumplido: almacenes.categoria existe'' AS aviso'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ----------------------------------------------------------------------------
-- 1. Trigger de guardia sobre movimientos_inventario
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS `trg_bloquea_consumo_venta_en_logistico`;

DELIMITER $$

CREATE TRIGGER `trg_bloquea_consumo_venta_en_logistico`
BEFORE INSERT ON `movimientos_inventario`
FOR EACH ROW
BEGIN
    DECLARE v_categoria VARCHAR(20);
    DECLARE v_nombre VARCHAR(100);
    -- MESSAGE_TEXT de SIGNAL está limitado a 128 caracteres: si se excede,
    -- MySQL sustituye el error por "Data too long for condition item".
    -- El texto de abajo mide 126 con el nombre recortado a 30.
    DECLARE v_mensaje VARCHAR(128);

    IF NEW.tipo_movimiento IN ('CONSUMO_RECETA', 'VENTA') THEN

        SELECT a.categoria, a.nombre
          INTO v_categoria, v_nombre
          FROM almacenes a
         WHERE a.id = NEW.almacen_id
         LIMIT 1;

        IF v_categoria = 'logistico' THEN
            SET v_mensaje = CONCAT(
                'BLOQUEADO: consumo por venta en almacen logistico "',
                LEFT(IFNULL(v_nombre, NEW.almacen_id), 30),
                '". Transfiere el insumo a produccion primero.'
            );
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = v_mensaje;
        END IF;

    END IF;
END$$

DELIMITER ;

-- ----------------------------------------------------------------------------
-- 2. Verificación
-- ----------------------------------------------------------------------------
SELECT TRIGGER_NAME, EVENT_MANIPULATION, EVENT_OBJECT_TABLE, ACTION_TIMING
  FROM information_schema.TRIGGERS
 WHERE TRIGGER_SCHEMA = DATABASE()
   AND TRIGGER_NAME = 'trg_bloquea_consumo_venta_en_logistico';

-- Movimientos de venta YA REGISTRADOS contra almacenes logísticos: son
-- descuentos históricos hechos en el almacén equivocado. Revisa esta lista
-- para decidir si necesitas un ajuste de inventario correctivo.
SELECT
    m.id,
    m.tipo_movimiento,
    m.referencia_id AS pedido_id,
    a.codigo  AS almacen_codigo,
    a.nombre  AS almacen_nombre,
    p.nombre  AS producto,
    m.cantidad
FROM movimientos_inventario m
INNER JOIN almacenes a ON a.id = m.almacen_id
LEFT  JOIN productos p ON p.id = m.producto_id
WHERE m.tipo_movimiento IN ('CONSUMO_RECETA', 'VENTA')
  AND a.categoria = 'logistico'
ORDER BY m.id DESC;
