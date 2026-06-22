const db = require('../config/db');

const Inventario = {
    /**
     * Obtener el stock consolidado de productos por almacén.
     * Mapea las unidades de inventario y los nombres de categorías correctos.
     */
    getStockByAlmacen: async (almacenId) => {
        const query = `
            SELECT 
                p.id AS producto_id,
                p.codigo AS producto_codigo,
                p.nombre AS producto_nombre,
                p.tipo AS producto_tipo,
                c.nombre AS categoria_nombre,
                p.stock_minimo,
                p.stock_maximo,
                p.controla_vencimiento,
                COALESCE(SUM(l.cantidad_actual), 0) AS stock_actual,
                u.nombre AS unidad_medida
            FROM productos p
            LEFT JOIN categorias c ON p.categoria_id = c.id
            LEFT JOIN lotes l ON p.id = l.producto_id AND l.almacen_id = ?
            LEFT JOIN unidades_medida u ON p.unidad_inventario_id = u.id
            WHERE p.activo = 1
            GROUP BY p.id, c.nombre, u.nombre
            ORDER BY p.nombre ASC
        `;
        const [rows] = await db.query(query, [almacenId]);
        return rows;
    },

    /**
     * Obtener alertas de vencimiento de lotes activos de un almacén específico.
     * Filtra únicamente aquellos productos que tienen marcada la opción 'controla_vencimiento' = 1.
     */
    getAlertasVencimiento: async (almacenId, diasMargen = 30) => {
        const query = `
            SELECT 
                l.id AS lote_id,
                -- REFACTORIZACIÓN: Usamos la columna real l.numero_lote 👈
                l.numero_lote AS lote_codigo,
                p.nombre AS producto_nombre,
                l.cantidad_actual,
                l.fecha_vencimiento,
                DATEDIFF(l.fecha_vencimiento, NOW()) AS dias_para_vencer
            FROM lotes l
            INNER JOIN productos p ON l.producto_id = p.id
            WHERE l.almacen_id = ? 
              AND l.cantidad_actual > 0 
              AND p.controla_vencimiento = 1
              AND (l.fecha_vencimiento <= DATE_ADD(NOW(), INTERVAL ? DAY) OR l.fecha_vencimiento < NOW())
            ORDER BY l.fecha_vencimiento ASC
        `;
        const [rows] = await db.query(query, [almacenId, diasMargen]);
        return rows;
    }
};

module.exports = Inventario;