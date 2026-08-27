-- Crea el registro general de auditoría de usuarios.
-- Ejecutar después de importar sql/db.sql:
--   mysql restaurante_db < scripts/migracion_auditoria_usuarios.sql

CREATE TABLE IF NOT EXISTS auditoria_usuarios (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    usuario_id INT NULL,
    usuario_nombre VARCHAR(150) NULL,
    usuario_rol VARCHAR(60) NULL,
    metodo_http VARCHAR(10) NOT NULL,
    ruta VARCHAR(255) NOT NULL,
    url VARCHAR(1024) NULL,
    accion VARCHAR(150) NOT NULL,
    entidad VARCHAR(100) NULL,
    entidad_id VARCHAR(100) NULL,
    estado_http SMALLINT UNSIGNED NULL,
    operacion_exitosa TINYINT(1) NOT NULL DEFAULT 0,
    ip_origen VARCHAR(100) NULL,
    user_agent VARCHAR(500) NULL,
    datos_operacion LONGTEXT NULL,
    duracion_ms INT UNSIGNED NULL,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_auditoria_usuario (usuario_id),
    KEY idx_auditoria_fecha (creado_en),
    KEY idx_auditoria_accion (accion),
    KEY idx_auditoria_ruta (ruta),
    KEY idx_auditoria_estado (estado_http),
    CONSTRAINT fk_auditoria_usuario FOREIGN KEY (usuario_id)
        REFERENCES usuarios (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
