-- ============================================================================
-- Migración: la asignación de mesas pasa a ser por TURNO, no por día natural.
-- Restaurante Bahía — fix "dependiente no ve sus mesas pasadas las 12am".
--
-- Problema en el esquema: el índice único era (fecha, ubicacion), lo que
-- forzaba a crear una fila NUEVA de asignación por cada día, aunque el turno
-- siguiera abierto (p. ej. un turno que abre 20:00 y cierra 03:00 generaba
-- dos filas para el mismo turno). Los lectores filtraban por fecha del día
-- (CURDATE) y la asignación "desaparecía" tras la medianoche.
--
-- Este script:
--   1) Traslada los detalles de las filas supersedas a la fila vigente (por
--      si alguna mesa solo existía en la fila vieja).
--   2) Elimina los duplicados por (turno_id, ubicacion), conservando la fila
--      más reciente (MAX(id)). Los detalles se borran en cascada.
--   3) Cambia el índice único a (turno_id, ubicacion): una asignación vigente
--      por turno y área. `fecha` queda solo como fecha de creación.
--
-- ⚠️  Haz respaldo antes: mysqldump restaurante_db > respaldo_antes_migracion.sql
-- ============================================================================

-- 1) Reasignar detalles de filas supersedas a la vigente (idempotente)
INSERT IGNORE INTO detalle_asignacion_mesa (asignacion_diaria_id, mesa_id, dependiente_id)
SELECT vigente.id, dam.mesa_id, dam.dependiente_id
FROM detalle_asignacion_mesa dam
JOIN asignaciones_diarias vieja
  ON dam.asignacion_diaria_id = vieja.id
JOIN asignaciones_diarias vigente
  ON  vigente.turno_id = vieja.turno_id
  AND vigente.ubicacion = vieja.ubicacion
  AND vigente.id > vieja.id
WHERE vieja.turno_id IS NOT NULL;

-- 2) Eliminar las filas supersedas (sus detalles sobrantes van en cascada)
DELETE vieja
FROM asignaciones_diarias vieja
JOIN asignaciones_diarias vigente
  ON  vigente.turno_id = vieja.turno_id
  AND vigente.ubicacion = vieja.ubicacion
  AND vigente.id > vieja.id
WHERE vieja.turno_id IS NOT NULL;

-- 3) Índice único por turno+ubicación (fecha queda como metadato de creación)
ALTER TABLE asignaciones_diarias
  DROP INDEX uq_fecha_ubicacion,
  ADD UNIQUE KEY uq_turno_ubicacion (turno_id, ubicacion);

-- Verificación: debe quedar una sola fila por turno+ubicación
SELECT turno_id, ubicacion, COUNT(*) AS filas, MIN(fecha) AS f_desde, MAX(fecha) AS f_ultima
FROM asignaciones_diarias
WHERE turno_id IS NOT NULL
GROUP BY turno_id, ubicacion;
