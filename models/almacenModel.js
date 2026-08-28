const db = require('../config/db');
const Schema = require('../config/schema');

// Categorías operativas válidas para un almacén
const CATEGORIAS_VALIDAS = ['logistico', 'produccion'];

const Almacen = {
    CATEGORIAS_VALIDAS,

    getAll: async () => {
        const categoriaExpr = await Schema.categoriaAlmacenExpr('a');
        const [rows] = await db.query(
            `SELECT a.*, ${categoriaExpr} AS categoria_efectiva
               FROM almacenes a
              ORDER BY a.codigo ASC`
        );
        return rows;
    },

    getById: async (id) => {
        const categoriaExpr = await Schema.categoriaAlmacenExpr('a');
        const [rows] = await db.query(
            `SELECT a.*,
                    a.responsable_usuario_id AS responsable_id,
                    ${categoriaExpr} AS categoria_efectiva
               FROM almacenes a
              WHERE a.id = ?`,
            [id]
        );
        return rows[0];
    },

    getByCodigo: async (codigo) => {
        const [rows] = await db.query('SELECT * FROM almacenes WHERE codigo = ?', [codigo]);
        return rows[0];
    },

    /**
     * Almacenes activos filtrados por categoría operativa.
     * @param {'logistico'|'produccion'|Array<string>} categoria
     */
    getByCategoria: async (categoria) => {
        if (!db) return [];
        const categorias = Array.isArray(categoria) ? categoria : [categoria];
        const filtradas = categorias.filter(c => CATEGORIAS_VALIDAS.includes(c));
        if (filtradas.length === 0) return [];

        const categoriaExpr = await Schema.categoriaAlmacenExpr('a');
        const placeholders = filtradas.map(() => '?').join(', ');
        const [rows] = await db.query(
            `SELECT a.id, a.codigo, a.nombre, a.tipo, a.ubicacion, a.activo,
                    ${categoriaExpr} AS categoria
               FROM almacenes a
              WHERE a.activo = 1
                AND ${categoriaExpr} IN (${placeholders})
              ORDER BY a.nombre ASC`,
            filtradas
        );
        return rows;
    },

    /**
     * Resuelve el almacén de PRODUCCIÓN que abastece a un platillo del menú,
     * a través de la categoría de menú a la que pertenece
     * (categorias_platillos.almacen_id).
     *
     * Devuelve null si el platillo no tiene categoría, si la categoría no tiene
     * almacén asignado, o si el almacén asignado no es de producción/está inactivo.
     */
    getAlmacenProduccionPorPlatillo: async (platilloId) => {
        if (!db || !platilloId) return null;
        const categoriaExpr = await Schema.categoriaAlmacenExpr('a');
        try {
            const [rows] = await db.query(
                `SELECT a.id, a.codigo, a.nombre, a.activo,
                        ${categoriaExpr} AS categoria
                   FROM platillos_menu pm
                   INNER JOIN categorias_platillos cp ON cp.id = pm.categoria
                   INNER JOIN almacenes a ON a.id = cp.almacen_id
                  WHERE pm.id = ?
                  LIMIT 1`,
                [platilloId]
            );
            const almacen = rows[0];
            if (!almacen) return null;
            if (Number(almacen.activo) !== 1) return null;
            if (almacen.categoria !== 'produccion') return null;
            return almacen;
        } catch (error) {
            // Instalaciones sin categorias_platillos.almacen_id: se resuelve por fallback
            return null;
        }
    },

    /** Primer almacén de producción activo (fallback operativo). */
    getPrimerAlmacenProduccion: async () => {
        const produccion = await Almacen.getByCategoria('produccion');
        return produccion[0] || null;
    },

    create: async (d) => {
        const tieneCategoria = await Schema.hasColumn('almacenes', 'categoria');
        if (tieneCategoria) {
            const query = `INSERT INTO almacenes (codigo, nombre, descripcion, tipo, categoria, ubicacion, responsable_usuario_id, permite_ventas, permite_consumo, activo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            const [result] = await db.query(query, [d.codigo, d.nombre, d.descripcion, d.tipo, d.categoria, d.ubicacion, d.responsable_usuario_id || null, d.permite_ventas, d.permite_consumo, 1]);
            return result.insertId;
        }
        const query = `INSERT INTO almacenes (codigo, nombre, descripcion, tipo, ubicacion, responsable_usuario_id, permite_ventas, permite_consumo, activo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const [result] = await db.query(query, [d.codigo, d.nombre, d.descripcion, d.tipo, d.ubicacion, d.responsable_usuario_id || null, d.permite_ventas, d.permite_consumo, 1]);
        return result.insertId;
    },

    update: async (id, d) => {
        const tieneCategoria = await Schema.hasColumn('almacenes', 'categoria');
        if (tieneCategoria) {
            const query = `UPDATE almacenes SET codigo=?, nombre=?, descripcion=?, tipo=?, categoria=?, ubicacion=?, responsable_usuario_id=?, permite_ventas=?, permite_consumo=?, activo=? WHERE id=?`;
            const [result] = await db.query(query, [d.codigo, d.nombre, d.descripcion, d.tipo, d.categoria, d.ubicacion, d.responsable_usuario_id, d.permite_ventas, d.permite_consumo, d.activo, id]);
            return result.affectedRows > 0;
        }
        const query = `UPDATE almacenes SET codigo=?, nombre=?, descripcion=?, tipo=?, ubicacion=?, responsable_usuario_id=?, permite_ventas=?, permite_consumo=?, activo=? WHERE id=?`;
        const [result] = await db.query(query, [d.codigo, d.nombre, d.descripcion, d.tipo, d.ubicacion, d.responsable_usuario_id, d.permite_ventas, d.permite_consumo, d.activo, id]);
        return result.affectedRows > 0;
    },

    updateStatus: async (id, status) => {
        const [result] = await db.query('UPDATE almacenes SET activo = ? WHERE id = ?', [status, id]);
        return result.affectedRows > 0;
    }
};

module.exports = Almacen;
