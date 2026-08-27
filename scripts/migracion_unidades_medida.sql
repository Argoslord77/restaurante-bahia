-- ============================================================================
-- Migración: mecanismo de conversión de unidades de medida
-- Restaurante Bahía — factores de conversión para POS/recetas/transferencias
--
-- 1) `conversiones_unidades` tenía el diseño (origen→destino) pero SIN la
--    columna del factor y solo por-producto. Se agrega `factor` y se permite
--    producto_id NULL = conversión GLOBAL (aplica a todos los productos).
-- 2) Se siembran las conversiones globales estándar (PESO→kg, VOLUMEN→l).
--    Las de EMPAQUE (caja→unidades, botella→ml, etc.) dependen de cada
--    producto y se definen en Configuración → Unidades de Medida.
--
-- ⚠️  Respaldo antes: mysqldump restaurante_db > respaldo_antes_migracion.sql
-- ============================================================================

ALTER TABLE `conversiones_unidades`
  ADD COLUMN `factor` DECIMAL(18,8) NOT NULL DEFAULT 1 AFTER `unidad_destino_id`,
  MODIFY `producto_id` BIGINT UNSIGNED NULL;

-- ---------------------------------------------------------------------------
-- Conversiones globales (idempotente: no inserta si ya existe el par)
-- factor = cuántas unidades DESTINO equivale 1 unidad ORIGEN (1 kg = 1000 g)
-- ---------------------------------------------------------------------------
INSERT INTO `conversiones_unidades` (producto_id, unidad_origen_id, unidad_destino_id, factor, es_conversion_base, activa, observaciones)
SELECT NULL, o.id, d.id, 1000, 0, 1, 'Global estándar (masa)'
FROM unidades_medida o, unidades_medida d
WHERE o.codigo='KG' AND d.codigo='G'
  AND NOT EXISTS (SELECT 1 FROM conversiones_unidades c WHERE c.producto_id IS NULL AND c.unidad_origen_id=o.id AND c.unidad_destino_id=d.id);

INSERT INTO `conversiones_unidades` (producto_id, unidad_origen_id, unidad_destino_id, factor, es_conversion_base, activa, observaciones)
SELECT NULL, o.id, d.id, 0.001, 1, 1, 'Global estándar (masa) — base: todo PESO conviene expresarlo en kg'
FROM unidades_medida o, unidades_medida d
WHERE o.codigo='G' AND d.codigo='KG'
  AND NOT EXISTS (SELECT 1 FROM conversiones_unidades c WHERE c.producto_id IS NULL AND c.unidad_origen_id=o.id AND c.unidad_destino_id=d.id);

INSERT INTO `conversiones_unidades` (producto_id, unidad_origen_id, unidad_destino_id, factor, es_conversion_base, activa, observaciones)
SELECT NULL, o.id, d.id, 0.45359237, 1, 1, 'Global estándar (masa)'
FROM unidades_medida o, unidades_medida d
WHERE o.codigo='LB' AND d.codigo='KG'
  AND NOT EXISTS (SELECT 1 FROM conversiones_unidades c WHERE c.producto_id IS NULL AND c.unidad_origen_id=o.id AND c.unidad_destino_id=d.id);

INSERT INTO `conversiones_unidades` (producto_id, unidad_origen_id, unidad_destino_id, factor, es_conversion_base, activa, observaciones)
SELECT NULL, o.id, d.id, 2.20462262, 0, 1, 'Global estándar (masa)'
FROM unidades_medida o, unidades_medida d
WHERE o.codigo='KG' AND d.codigo='LB'
  AND NOT EXISTS (SELECT 1 FROM conversiones_unidades c WHERE c.producto_id IS NULL AND c.unidad_origen_id=o.id AND c.unidad_destino_id=d.id);

INSERT INTO `conversiones_unidades` (producto_id, unidad_origen_id, unidad_destino_id, factor, es_conversion_base, activa, observaciones)
SELECT NULL, o.id, d.id, 0.001, 1, 1, 'Global estándar (volumen) — base: todo VOLUMEN conviene expresarlo en l'
FROM unidades_medida o, unidades_medida d
WHERE o.codigo='ML' AND d.codigo='L'
  AND NOT EXISTS (SELECT 1 FROM conversiones_unidades c WHERE c.producto_id IS NULL AND c.unidad_origen_id=o.id AND c.unidad_destino_id=d.id);

INSERT INTO `conversiones_unidades` (producto_id, unidad_origen_id, unidad_destino_id, factor, es_conversion_base, activa, observaciones)
SELECT NULL, o.id, d.id, 1000, 0, 1, 'Global estándar (volumen)'
FROM unidades_medida o, unidades_medida d
WHERE o.codigo='L' AND d.codigo='ML'
  AND NOT EXISTS (SELECT 1 FROM conversiones_unidades c WHERE c.producto_id IS NULL AND c.unidad_origen_id=o.id AND c.unidad_destino_id=d.id);

-- Verificación rápida
SELECT c.producto_id, o.abreviatura AS origen, d.abreviatura AS destino, c.factor, c.es_conversion_base
FROM conversiones_unidades c
JOIN unidades_medida o ON c.unidad_origen_id = o.id
JOIN unidades_medida d ON c.unidad_destino_id = d.id
ORDER BY c.producto_id IS NOT NULL, o.tipo, o.id;
