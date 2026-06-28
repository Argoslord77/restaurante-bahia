// controllers/inventarioController.js
const db = require('../config/db');

/**
 * Renderiza la interfaz de monitoreo de stock por almacén con filtrado dinámico
 */
exports.viewStockGeneral = async (req, res, next) => {
    try {
        // 1. Obtener todos los almacenes activos para el selector superior
        const [almacenes] = await db.query(
            "SELECT id, codigo, nombre FROM almacenes WHERE activo = 1 ORDER BY nombre ASC"
        );

        // 2. Capturar el almacén seleccionado desde los Query Params (?almacenId=X)
        // Si no se envía ninguno (carga inicial), tomamos el primero de la lista
        let almacenSeleccionado = req.query.almacenId;
        if (!almacenSeleccionado && almacenes.length > 0) {
            almacenSeleccionado = almacenes[0].id;
        }

        // 3. Consultar los productos y consolidar su stock sumando los lotes activos del almacén
        let productos = [];
        if (almacenSeleccionado) {
            const queryStock = `
                SELECT 
                    p.id AS producto_id,
                    p.codigo AS codigo,
                    p.nombre AS nombre,
                    c.nombre AS categoria_nombre,
                    um.abreviatura AS unidad_medida,
                    p.stock_minimo AS stock_minimo,
                    COALESCE(SUM(l.cantidad_actual), 0) AS stock_actual,
                    COUNT(CASE WHEN l.cantidad_actual > 0 AND l.estado = 'ACTIVO' THEN 1 END) AS lotes_activos,
                    ROUND(AVG(l.costo_unitario), 2) AS costo_promedio,
                    ROUND(SUM(l.cantidad_actual * l.costo_unitario), 2) AS valor_inventario
                FROM productos p
                INNER JOIN categorias c ON p.categoria_id = c.id
                INNER JOIN unidades_medida um ON p.unidad_inventario_id = um.id
                LEFT JOIN lotes l ON p.id = l.producto_id AND l.almacen_id = ? AND l.estado = 'ACTIVO'
                WHERE p.activo = 1
                GROUP BY p.id, p.codigo, p.nombre, c.nombre, um.abreviatura, p.stock_minimo
                HAVING stock_actual > 0
                ORDER BY p.nombre ASC
            `;  
            
            const [rows] = await db.query(queryStock, [almacenSeleccionado]);
            productos = rows;
        }

        // 4. Renderizar la vista pasando todas las variables necesarias sincronizadas con stock.ejs
        return res.render('inventarios/stock', {
            title: 'Control de Stock por Almacén - Restaurante Bahía',
            almacenes: almacenes || [],
            productos: productos,
            almacenSeleccionado: almacenSeleccionado,
            user: req.user || req.session?.user || null,
            view: 'stock'
        });

    } catch (error) {
        console.error("Error en viewStockGeneral:", error);
        return next(error);
    }
};

/**
 * API GET: Retorna el stock consolidado de un almacén específico en formato JSON
 * URL: /admin/inventario/api/stock/:almacenId
 */
exports.getStockByAlmacenApi = async (req, res, next) => {
    try {
        const { almacenId } = req.params;

        if (!almacenId) {
            return res.status(400).json({ success: false, message: "El ID del almacén es requerido." });
        }

        const query = `
            SELECT 
                p.id AS producto_id,
                p.codigo AS producto_codigo,
                p.nombre AS producto_nombre,
                c.nombre AS categoria_nombre,
                um.abreviatura AS unidad_medida,
                COALESCE(SUM(l.cantidad_actual), 0) AS stock_actual,
                COUNT(CASE WHEN l.cantidad_actual > 0 AND l.estado = 'ACTIVO' THEN 1 END) AS lotes_activos,
                ROUND(AVG(l.costo_unitario), 2) AS costo_promedio,
                ROUND(SUM(l.cantidad_actual * l.costo_unitario), 2) AS valor_inventario
            FROM productos p
            INNER JOIN categorias c ON p.categoria_id = c.id
            INNER JOIN unidades_medida um ON p.unidad_inventario_id = um.id
            LEFT JOIN lotes l ON p.id = l.producto_id AND l.almacen_id = ? AND l.estado = 'ACTIVO'
            WHERE p.activo = 1
            GROUP BY p.id, p.codigo, p.nombre, c.nombre, um.abreviatura
            HAVING stock_actual > 0
            ORDER BY p.nombre ASC
        `;  

        const [stock] = await db.query(query, [almacenId]);

        return res.status(200).json({
            success: true,
            almacenId: parseInt(almacenId),
            stock: stock
        });
    } catch (error) {
        console.error("Error en getStockByAlmacenApi:", error);
        return res.status(500).json({ success: false, message: "Error interno del servidor." });
    }
};