-- ============================================================================
-- Migración: los tokens de "Recuérdame" pasan a guardarse como huella
-- Restaurante Bahía
--
-- Problema
-- --------
-- `usuarios_tokens.token` almacenaba EN CLARO el mismo valor que viaja en la
-- cookie del navegador. Cualquiera con acceso de lectura a la base de datos
-- (una copia de seguridad extraviada, una inyección SQL, un volcado enviado por
-- correo) podía copiar esos valores en su propio navegador y entrar como
-- cualquier usuario durante los 15 días de validez, sin conocer su contraseña.
--
-- Solución
-- --------
-- Se guarda únicamente la huella SHA-256 del token. El valor en claro existe
-- solo dentro de la cookie del usuario. Al validar, la aplicación calcula la
-- huella de la cookie y la compara con la almacenada: de la huella no se puede
-- reconstruir el token, así que un volcado de la base ya no sirve para entrar.
--
-- LAS SESIONES ABIERTAS NO SE PIERDEN
-- -----------------------------------
-- Como la base contiene hoy el token en claro, basta con sustituirlo por su
-- propia huella: las cookies que ya están en los navegadores seguirán
-- validando, porque la aplicación hashea la cookie antes de comparar. Nadie
-- tiene que volver a iniciar sesión.
--
-- Idempotente: distingue las huellas (64 caracteres) de los tokens en claro
-- (128 caracteres), de modo que reejecutarla no vuelve a hashear lo ya hecho.
--
-- ⚠️  Haz respaldo antes: mysqldump restaurante_db > respaldo_antes_migracion.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Crear la tabla si la instalación aún no la tiene
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `usuarios_tokens` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `token` VARCHAR(255) NOT NULL COMMENT 'Huella SHA-256 del token; nunca el valor en claro',
    `usuario_id` INT NOT NULL,
    `expira_en` DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------------------------------------------------------
-- 2. Estado antes de migrar
-- ----------------------------------------------------------------------------
SELECT
    COUNT(*)                                                   AS tokens_totales,
    SUM(CASE WHEN CHAR_LENGTH(`token`) = 64 THEN 1 ELSE 0 END) AS ya_son_huella,
    SUM(CASE WHEN CHAR_LENGTH(`token`) <> 64 THEN 1 ELSE 0 END) AS en_claro_a_migrar
FROM `usuarios_tokens`;

-- ----------------------------------------------------------------------------
-- 3. Sustituir cada token en claro por su huella SHA-256
--    Las cookies ya emitidas siguen siendo válidas.
-- ----------------------------------------------------------------------------
UPDATE `usuarios_tokens`
   SET `token` = SHA2(`token`, 256)
 WHERE CHAR_LENGTH(`token`) <> 64;

-- ----------------------------------------------------------------------------
-- 4. Aprovechar para retirar los tokens ya caducados
-- ----------------------------------------------------------------------------
DELETE FROM `usuarios_tokens` WHERE `expira_en` <= NOW();

-- ----------------------------------------------------------------------------
-- 5. Índice de apoyo para la búsqueda por huella (solo si no existe)
-- ----------------------------------------------------------------------------
SET @existe_indice := (
    SELECT COUNT(*)
      FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'usuarios_tokens'
       AND INDEX_NAME = 'idx_tokens_huella'
);

SET @sql := IF(@existe_indice = 0,
    'CREATE INDEX `idx_tokens_huella` ON `usuarios_tokens` (`token`, `expira_en`)',
    'SELECT ''El índice idx_tokens_huella ya existe, se omite'' AS aviso'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Índice para poder revocar por usuario sin recorrer la tabla
SET @existe_indice2 := (
    SELECT COUNT(*)
      FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'usuarios_tokens'
       AND INDEX_NAME = 'idx_tokens_usuario'
);

SET @sql := IF(@existe_indice2 = 0,
    'CREATE INDEX `idx_tokens_usuario` ON `usuarios_tokens` (`usuario_id`)',
    'SELECT ''El índice idx_tokens_usuario ya existe, se omite'' AS aviso'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ----------------------------------------------------------------------------
-- 6. Verificación: no debe quedar ningún token en claro
-- ----------------------------------------------------------------------------
SELECT
    COUNT(*)                                                    AS tokens_totales,
    SUM(CASE WHEN CHAR_LENGTH(`token`) = 64 THEN 1 ELSE 0 END)  AS son_huella,
    SUM(CASE WHEN CHAR_LENGTH(`token`) <> 64 THEN 1 ELSE 0 END) AS quedan_en_claro
FROM `usuarios_tokens`;
