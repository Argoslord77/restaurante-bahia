// tienda/services/inventarioService.js — Movimientos de stock con candado
// de fila: el stock nunca queda negativo ni se corrompe entre dos ventas.
const pool = require('../config/db');

const InventarioService = {
    // Movimiento genérico (transaccional, con SELECT ... FOR UPDATE).
    // cantidad: número positivo; direccion: +1 entra / -1 sale.
    async registrar({ producto_id, tipo, cantidad, motivo = null, usuario_id = null, referencia_id = null }) {
        const pid = parseInt(producto_id, 10);
        const cant = parseInt(cantidad, 10);
        if (!Number.isInteger(pid) || pid <= 0) throw new Error('Producto no válido.');
        if (!Number.isInteger(cant) || cant <= 0) throw new Error('La cantidad debe ser mayor a 0.');
        if (!['entrada', 'salida', 'venta', 'devolucion', 'ajuste'].includes(tipo)) {
            throw new Error('Tipo de movimiento no válido.');
        }
        const direccion = (tipo === 'salida' || tipo === 'venta') ? -1 : 1;
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();
            const [filas] = await conn.query(
                'SELECT id, stock, activo FROM productos WHERE id = ? FOR UPDATE', [pid]);
            if (!filas.length) throw new Error('El producto no existe.');
            const antes = Number(filas[0].stock) || 0;
            const despues = antes + direccion * cant;
            if (despues < 0) throw new Error('Stock insuficiente para este movimiento.');
            await conn.query('UPDATE productos SET stock = ? WHERE id = ?', [despues, pid]);
            await conn.query(`
                INSERT INTO movimientos (producto_id, tipo, cantidad, stock_antes, stock_despues, motivo, referencia_id, usuario_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [pid, tipo, direccion * cant, antes, despues, motivo, referencia_id, usuario_id]);
            await conn.commit();
            return { producto_id: pid, antes, despues };
        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }
    },

    async entrada(producto_id, cantidad, motivo, usuario_id = null) {
        return this.registrar({ producto_id, tipo: 'entrada', cantidad, motivo, usuario_id });
    },

    async salida(producto_id, cantidad, motivo, usuario_id = null) {
        return this.registrar({ producto_id, tipo: 'salida', cantidad, motivo, usuario_id });
    },

    // Kardex del producto (más recientes primero).
    async kardex(producto_id, limite = 100) {
        const [filas] = await pool.query(`
            SELECT m.*, u.nombre AS usuario_nombre
            FROM movimientos m
            LEFT JOIN usuarios u ON m.usuario_id = u.id
            WHERE m.producto_id = ?
            ORDER BY m.id DESC
            LIMIT ?
        `, [producto_id, Math.min(500, Math.max(1, parseInt(limite, 10) || 100))]);
        return filas;
    },

    // Últimos movimientos de la tienda (con nombre del producto).
    async recientes(limite = 50) {
        const [filas] = await pool.query(`
            SELECT m.*, p.nombre AS producto_nombre, p.sku,
                   u.nombre AS usuario_nombre
            FROM movimientos m
            INNER JOIN productos p ON m.producto_id = p.id
            LEFT JOIN usuarios u ON m.usuario_id = u.id
            ORDER BY m.id DESC
            LIMIT ?
        `, [Math.min(200, Math.max(1, parseInt(limite, 10) || 50))]);
        return filas;
    },

    // Productos en o bajo su mínimo (activos).
    async stockBajo() {
        const [filas] = await pool.query(`
            SELECT p.id, p.sku, p.nombre, p.stock, p.stock_minimo, c.nombre AS categoria_nombre
            FROM productos p
            LEFT JOIN categorias c ON p.categoria_id = c.id
            WHERE p.activo = 1 AND p.stock <= p.stock_minimo
            ORDER BY p.stock ASC, p.nombre ASC
        `);
        return filas;
    },

    // Valorizado del inventario (a costo y a precio de venta).
    async valorizado() {
        const [filas] = await pool.query(`
            SELECT p.id, p.sku, p.nombre, c.nombre AS categoria_nombre,
                   p.stock, p.precio_costo, p.precio_venta,
                   (p.stock * p.precio_costo) AS valor_costo,
                   (p.stock * p.precio_venta) AS valor_venta
            FROM productos p
            LEFT JOIN categorias c ON p.categoria_id = c.id
            WHERE p.activo = 1
            ORDER BY p.nombre ASC
        `);
        const totales = filas.reduce((acc, f) => ({
            costo: acc.costo + Number(f.valor_costo || 0),
            venta: acc.venta + Number(f.valor_venta || 0),
            unidades: acc.unidades + (Number(f.stock) || 0)
        }), { costo: 0, venta: 0, unidades: 0 });
        return { filas, totales };
    }
};

module.exports = InventarioService;
