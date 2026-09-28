-- scripts/migracion_sesiones.sql
-- V10 (A2): tabla del store persistente de sesiones.
-- Las sesiones sobreviven a reinicios y se limpian solas por expira_en.
-- Aplicar UNA vez:  mysql -u USUARIO -p restaurante_db < scripts/migracion_sesiones.sql
CREATE TABLE IF NOT EXISTS sesiones (
    sid VARCHAR(255) NOT NULL PRIMARY KEY,
    sess MEDIUMTEXT NOT NULL,
    expira_en DATETIME NOT NULL,
    KEY idx_sesiones_expira (expira_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
