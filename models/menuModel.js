const db = require('../config/db');

class MenuModel {

    /**
     * Obtener todos los platillos
     */
    async getAll() {
        const query = `
            SELECT 
                pm.id,
                pm.nombre,
                pm.descripcion,
                pm.precio,
                pm.precio_alt,
                pm.precio_usd,
                pm.foto,
                pm.categoria AS categoria_id,
                cp.nombre AS nombre_categoria,
                cp.tipo AS tipo_categoria,
                1 AS disponible
            FROM platillos_menu pm
            LEFT JOIN categorias_platillos cp ON pm.categoria = cp.id
            ORDER BY cp.nombre ASC, pm.nombre ASC
        `;
        const [rows] = await db.query(query);
        return rows;
    }

    /**
     * Obtener platillo por ID
     */
    async getById(id) {

        const [rows] = await db.query(`
            SELECT 
                pm.*, 
                cp.tipo AS tipo_categoria
            FROM platillos_menu pm
            LEFT JOIN categorias_platillos cp ON pm.categoria = cp.id
            WHERE pm.id = ?
            LIMIT 1
        `, [id]);

        return rows[0] || null;
    }

    /**
     * Crear nuevo platillo
     */
    async create(data) {

        const {
            nombre,
            descripcion,
            precio,
            categoria,
            precio_alt,
            precio_usd,
            foto
        } = data;

        const [result] = await db.query(`
            INSERT INTO platillos_menu (
                nombre,
                descripcion,
                precio,
                categoria,
                precio_alt,
                precio_usd,
                foto
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            nombre,
            descripcion,
            precio,
            categoria,
            precio_alt,
            precio_usd,
            foto
        ]);

        return result.insertId;
    }

    /**
     * Actualizar platillo
     */
    async update(id, data) {

        const {
            nombre,
            descripcion,
            precio,
            categoria,
            precio_alt,
            precio_usd,
            foto
        } = data;

        const [result] = await db.query(`
            UPDATE platillos_menu
            SET
                nombre = ?,
                descripcion = ?,
                precio = ?,
                categoria = ?,
                precio_alt = ?,
                precio_usd = ?,
                foto = ?
            WHERE id = ?
        `, [
            nombre,
            descripcion,
            precio,
            categoria,
            precio_alt,
            precio_usd,
            foto,
            id
        ]);

        return result.affectedRows;
    }

    /**
     * Eliminar platillo
     */
    async delete(id) {

        const [result] = await db.query(`
            DELETE FROM platillos_menu
            WHERE id = ?
        `, [id]);

        return result.affectedRows;
    }

    /**
     * Obtener platillos por categoría
     */
    async getByCategory(categoria) {

        const [rows] = await db.query(`
            SELECT
                id,
                nombre,
                descripcion,
                precio,
                categoria,
                precio_alt,
                precio_usd,
                foto
            FROM platillos_menu
            WHERE categoria = ?
            ORDER BY nombre ASC
        `, [categoria]);

        return rows;
    }

    /**
     * Obtener platillos activos para POS
     */
    async getMenuPOS() {

        const [rows] = await db.query(`
            SELECT
                id,
                nombre,
                precio,
                precio_usd,
                categoria,
                foto
            FROM platillos_menu
            ORDER BY categoria ASC, nombre ASC
        `);

        return rows;
    }

    /**
     * Obtener todas las categorías de platillos activas para los selectores
     */
    async getActiveCategories() {
        const [rows] = await db.query(`
            SELECT id, nombre 
            FROM categorias_platillos 
            WHERE activo = 1 
            ORDER BY nombre ASC
        `);
        return rows;
    }

}

module.exports = new MenuModel();