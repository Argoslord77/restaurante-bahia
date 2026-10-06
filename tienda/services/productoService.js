// tienda/services/productoService.js — Catálogo de artículos y categorías.
const pool = require('../config/db');

function num(valor, defecto = 0) {
    const n = Number(valor);
    return Number.isFinite(n) ? n : defecto;
}

const ProductoService = {
    async listarCategorias() {
        const [filas] = await pool.query('SELECT id, nombre, activo FROM categorias ORDER BY nombre ASC');
        return filas;
    },

    async crearCategoria(nombre) {
        const nom = String(nombre || '').trim();
        if (!nom) throw new Error('El nombre de la categoría es obligatorio.');
        try {
            const [r] = await pool.query('INSERT INTO categorias (nombre) VALUES (?)', [nom]);
            return r.insertId;
        } catch (err) {
            if (err && err.code === 'ER_DUP_ENTRY') throw new Error('Esa categoría ya existe.');
            throw err;
        }
    },

    async listar({ q = '', categoria = null, activos = true } = {}) {
        const conds = [];
        const params = [];
        if (activos) conds.push('p.activo = 1');
        if (categoria) { conds.push('p.categoria_id = ?'); params.push(categoria); }
        if (q && String(q).trim()) {
            conds.push('(p.nombre LIKE ? OR p.sku LIKE ?)');
            params.push(`%${String(q).trim()}%`, `%${String(q).trim()}%`);
        }
        const [filas] = await pool.query(`
            SELECT p.*, c.nombre AS categoria_nombre
            FROM productos p
            LEFT JOIN categorias c ON p.categoria_id = c.id
            ${conds.length ? 'WHERE ' + conds.join(' AND ') : ''}
            ORDER BY p.nombre ASC
            LIMIT 500
        `, params);
        return filas;
    },

    // Búsqueda rápida del POS (solo vendibles: activos y con stock).
    async buscarParaVenta(q) {
        const texto = String(q || '').trim();
        if (texto.length < 1) return [];
        const [filas] = await pool.query(`
            SELECT p.id, p.sku, p.nombre, c.nombre AS categoria_nombre,
                   p.precio_venta, p.stock
            FROM productos p
            LEFT JOIN categorias c ON p.categoria_id = c.id
            WHERE p.activo = 1 AND p.stock > 0
              AND (p.nombre LIKE ? OR p.sku LIKE ?)
            ORDER BY p.nombre ASC
            LIMIT 30
        `, [`%${texto}%`, `%${texto}%`]);
        return filas;
    },

    async obtener(id) {
        const [filas] = await pool.query(`
            SELECT p.*, c.nombre AS categoria_nombre
            FROM productos p
            LEFT JOIN categorias c ON p.categoria_id = c.id
            WHERE p.id = ? LIMIT 1
        `, [id]);
        return filas.length ? filas[0] : null;
    },

    async crear({ sku = null, nombre, categoria_id = null, descripcion = null,
                  precio_costo = 0, precio_venta = 0, stock_inicial = 0, stock_minimo = 0 }, usuarioId = null) {
        const nom = String(nombre || '').trim();
        if (!nom) throw new Error('El nombre es obligatorio.');
        const costo = num(precio_costo);
        const venta = num(precio_venta);
        if (costo < 0 || venta < 0) throw new Error('Los precios no pueden ser negativos.');
        const inicial = Math.max(0, parseInt(stock_inicial, 10) || 0);
        const minimo = Math.max(0, parseInt(stock_minimo, 10) || 0);
        const codigo = sku && String(sku).trim() ? String(sku).trim() : null;

        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();
            const [r] = await conn.query(`
                INSERT INTO productos (sku, nombre, categoria_id, descripcion, precio_costo, precio_venta, stock, stock_minimo)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [codigo, nom, categoria_id || null, descripcion || null, costo, venta, inicial, minimo]);
            if (inicial > 0) {
                await conn.query(`
                    INSERT INTO movimientos (producto_id, tipo, cantidad, stock_antes, stock_despues, motivo, usuario_id)
                    VALUES (?, 'entrada', ?, 0, ?, ?, ?)
                `, [r.insertId, inicial, inicial, 'Stock inicial', usuarioId]);
            }
            await conn.commit();
            return r.insertId;
        } catch (err) {
            await conn.rollback();
            if (err && err.code === 'ER_DUP_ENTRY') throw new Error('Ese SKU ya existe.');
            throw err;
        } finally {
            conn.release();
        }
    },

    async actualizar(id, { sku = null, nombre, categoria_id = null, descripcion = null,
                           precio_costo = 0, precio_venta = 0, stock_minimo = 0 }) {
        const nom = String(nombre || '').trim();
        if (!nom) throw new Error('El nombre es obligatorio.');
        const costo = num(precio_costo);
        const venta = num(precio_venta);
        if (costo < 0 || venta < 0) throw new Error('Los precios no pueden ser negativos.');
        try {
            await pool.query(`
                UPDATE productos
                SET sku = ?, nombre = ?, categoria_id = ?, descripcion = ?,
                    precio_costo = ?, precio_venta = ?, stock_minimo = ?
                WHERE id = ?
            `, [sku && String(sku).trim() ? String(sku).trim() : null, nom,
                categoria_id || null, descripcion || null, costo, venta,
                Math.max(0, parseInt(stock_minimo, 10) || 0), id]);
        } catch (err) {
            if (err && err.code === 'ER_DUP_ENTRY') throw new Error('Ese SKU ya existe.');
            throw err;
        }
    },

    async cambiarActivo(id, activo) {
        await pool.query('UPDATE productos SET activo = ? WHERE id = ?', [activo ? 1 : 0, id]);
    }
};

module.exports = ProductoService;
