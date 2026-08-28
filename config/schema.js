// config/schema.js
// Utilidades de introspección del esquema con caché en memoria.
//
// Permiten que el código nuevo funcione tanto en bases de datos que ya
// aplicaron la migración `scripts/migracion_categoria_almacenes.sql` como en
// las que todavía no la aplicaron (degradación elegante en vez de error 500).
const db = require('./db');
const logger = require('./logger');

// Caché de existencia de columnas: 'tabla.columna' => boolean
const cacheColumnas = new Map();

const Schema = {
    /**
     * Indica si una columna existe en la base de datos actual.
     * El resultado se cachea en memoria (el esquema no cambia en caliente).
     */
    hasColumn: async (tabla, columna) => {
        const clave = `${tabla}.${columna}`;
        if (cacheColumnas.has(clave)) return cacheColumnas.get(clave);
        if (!db) {
            cacheColumnas.set(clave, false);
            return false;
        }
        try {
            const [rows] = await db.query(
                `SELECT 1
                   FROM information_schema.COLUMNS
                  WHERE TABLE_SCHEMA = DATABASE()
                    AND TABLE_NAME = ?
                    AND COLUMN_NAME = ?
                  LIMIT 1`,
                [tabla, columna]
            );
            const existe = Array.isArray(rows) && rows.length > 0;
            cacheColumnas.set(clave, existe);
            if (!existe) {
                logger.warn(`[schema] La columna \`${clave}\` no existe. Se usará el modo de compatibilidad. ` +
                            `Ejecuta scripts/migracion_categoria_almacenes.sql para habilitar todas las funciones.`);
            }
            return existe;
        } catch (error) {
            logger.warn(`[schema] No se pudo verificar la columna \`${clave}\`: ${error.message}`);
            cacheColumnas.set(clave, false);
            return false;
        }
    },

    /**
     * Expresión SQL que resuelve la categoría operativa de un almacén.
     * Si la columna `almacenes.categoria` existe se usa directamente; si no,
     * se infiere desde `almacenes.tipo` para no romper instalaciones antiguas.
     *
     * @param {string} alias Alias de la tabla `almacenes` en la consulta.
     */
    categoriaAlmacenExpr: async (alias = 'a') => {
        const tieneColumna = await Schema.hasColumn('almacenes', 'categoria');
        if (tieneColumna) {
            // COALESCE por si hay filas antiguas con categoria NULL
            return `COALESCE(${alias}.categoria, ${Schema.categoriaDesdeTipoExpr(alias)})`;
        }
        return Schema.categoriaDesdeTipoExpr(alias);
    },

    /** Inferencia de categoría a partir del campo `tipo` (modo compatibilidad). */
    categoriaDesdeTipoExpr: (alias = 'a') =>
        `CASE WHEN ${alias}.tipo IN ('cocina', 'bar', 'produccion') THEN 'produccion' ELSE 'logistico' END`,

    /** Limpia la caché (útil en tests o tras aplicar una migración en caliente). */
    invalidate: () => cacheColumnas.clear()
};

module.exports = Schema;
