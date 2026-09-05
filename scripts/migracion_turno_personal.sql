-- Restaurante Bahía: personal productivo obligatorio por turno.
-- Ejecutar después de respaldar la base de datos. Idempotente.
USE restaurante_db;

SET @has_cocinero := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='turnos_servicio' AND COLUMN_NAME='cocinero_id');
SET @sql := IF(@has_cocinero=0,
 'ALTER TABLE turnos_servicio ADD COLUMN cocinero_id INT NULL AFTER usuario_apertura_id', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @has_bartender := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='turnos_servicio' AND COLUMN_NAME='bartender_id');
SET @sql := IF(@has_bartender=0,
 'ALTER TABLE turnos_servicio ADD COLUMN bartender_id INT NULL AFTER cocinero_id', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @has_idx := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='turnos_servicio' AND INDEX_NAME='idx_ts_bartender');
SET @sql := IF(@has_idx=0, 'ALTER TABLE turnos_servicio ADD KEY idx_ts_bartender (bartender_id)', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @has_fk := (SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='turnos_servicio' AND CONSTRAINT_NAME='fk_ts_bartender');
SET @sql := IF(@has_fk=0, 'ALTER TABLE turnos_servicio ADD CONSTRAINT fk_ts_bartender FOREIGN KEY (bartender_id) REFERENCES usuarios(id) ON DELETE SET NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SELECT 'turnos_servicio.cocinero_id' AS estructura, IF(COUNT(*)>0,'OK','FALTA') estado FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='turnos_servicio' AND COLUMN_NAME='cocinero_id'
UNION ALL SELECT 'turnos_servicio.bartender_id', IF(COUNT(*)>0,'OK','FALTA') FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='turnos_servicio' AND COLUMN_NAME='bartender_id';
