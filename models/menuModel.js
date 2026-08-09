const db = require('../config/db');

class MenuModel {

    /**
     * Obtener todos los platillos
     */
    async getAll() {

        const [rows] = await db.query(`
            SELECT
                p.id,
                p.nombre,
                p.descripcion,
                p.precio,
                p.categoria,
                c.nombre AS nombre_categoria,
                p.precio_alt,
                p.foto,
                p.creado_en
            FROM platillos_menu p
            LEFT JOIN categorias_platillos c ON p.categoria = c.id
            ORDER BY c.nombre ASC, p.nombre ASC
        `);

        return rows;
    }

    /**
     * Obtener platillo por ID
     */
    async getById(id) {

        const [rows] = await db.query(`
            SELECT
                id,
                nombre,
                descripcion,
                precio,
                categoria,
                precio_alt,
                foto,
                creado_en
            FROM platillos_menu
            WHERE id = ?
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
            foto
        } = data;

        const [result] = await db.query(`
            INSERT INTO platillos_menu (
                nombre,
                descripcion,
                precio,
                categoria,
                precio_alt,
                foto
            )
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            nombre,
            descripcion,
            precio,
            categoria,
            precio_alt,
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
                foto = ?
            WHERE id = ?
        `, [
            nombre,
            descripcion,
            precio,
            categoria,
            precio_alt,
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