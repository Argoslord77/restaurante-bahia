-- Migración de cartas por mesa, Zelle y unidad de entrada de lotes.
-- Ejecutar después de importar sql/db.sql:
--   mysql restaurante_db < scripts/migracion_cartas_zelle_unidades.sql
-- Hacer un respaldo antes de aplicar en producción.

ALTER TABLE lotes
  ADD COLUMN IF NOT EXISTS unidad_medida_id BIGINT UNSIGNED NULL AFTER ubicacion_id,
  ADD COLUMN IF NOT EXISTS cantidad_ingresada DECIMAL(18,3) NULL AFTER unidad_medida_id;

UPDATE lotes l
INNER JOIN productos p ON p.id = l.producto_id
SET l.unidad_medida_id = p.unidad_inventario_id
WHERE l.unidad_medida_id IS NULL;

UPDATE lotes
SET cantidad_ingresada = cantidad_inicial
WHERE cantidad_ingresada IS NULL;

INSERT INTO monedas (codigo, nombre, simbolo, factor_cambio, es_moneda_base, activo)
SELECT 'ZELLE', 'Zelle (Dólar estadounidense)', '$',
       COALESCE((SELECT factor_cambio FROM monedas WHERE UPPER(codigo) = 'USD' LIMIT 1), 1.0000),
       0, 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM monedas WHERE UPPER(codigo) = 'ZELLE');

-- Nota: los lotes existentes quedan en la unidad canónica del producto.
-- Las nuevas entradas se validan y se normalizan desde la aplicación.
