-- ============================================================
-- MIGRACION: eliminar duplicados de monedas_turno
-- (Restaurante Bahia, 28-08-2026)
--
-- Causa: snapshots de monedas guardados mas de una vez para el
-- mismo turno dejaban filas repetidas por (turno, moneda), lo
-- cual duplicaba cada moneda en el select [Moneda] del cobro POS.
--
-- Conserva la fila mas reciente (mayor id) de cada par
-- (turno_servicio_id, moneda_id) y elimina las anteriores.
-- Idempotente: si no hay duplicados, no borra nada.
-- ============================================================

DELETE mt FROM monedas_turno mt
INNER JOIN monedas_turno newer
  ON newer.moneda_id = mt.moneda_id
 AND newer.turno_servicio_id = mt.turno_servicio_id
 AND newer.id > mt.id;

-- Verificacion (debe devolver 0 filas):
-- SELECT turno_servicio_id, moneda_id, COUNT(*) c
-- FROM monedas_turno
-- GROUP BY 1, 2 HAVING c > 1;
