// models/salidaManualModel.js - Modelo para gestión de salidas manuales de inventario
const db = require('../config/db');

// Tipos de salida válidos (espejo del validador)
const TIPOS_SALIDA = ['merma', 'rotura', 'perdida', 'ajuste_auditoria', 'caducado', 'otro'];

// Whitelist de columnas por las que se permite ordenar el listado
const COLUMNAS_ORDEN = {
    fecha:    'sm.fecha_registro',
    almacen:  'a.nombre',
    producto: 'p.nombre',
    cantidad: 'sm.cantidad',
    costo:    'costo_total',
    tipo:     'sm.tipo',
    usuario:  'usuario_nombre'
};

const POR_PAGINA_VALIDOS = [25, 50, 100, 200];

/**
 * Construye la cláusula WHERE a partir de los filtros del panel profesional.
 * Solo se aceptan valores validados (enteros, fechas ISO y tipos conocidos).
 */
function construirFiltros(f = {}) {
    const where = [];
    const params = [];

    if (f.tipo && TIPOS_SALIDA.includes(f.tipo)) {
        where.push('sm.tipo = ?');
        params.push(f.tipo);
    }
    if (f.almacenId && /^\d+$/.test(String(f.almacenId))) {
        where.push('sm.almacen_id = ?');
        params.push(Number(f.almacenId));
    }
    if (f.productoId && /^\d+$/.test(String(f.productoId))) {
        where.push('sm.producto_id = ?');
        params.push(Number(f.productoId));
    }
    if (f.usuarioId && /^\d+$/.test(String(f.usuarioId))) {
        where.push('sm.usuario_id = ?');
        params.push(Number(f.usuarioId));
    }
    if (f.desde && /^\d{4}-\d{2}-\d{2}$/.test(String(f.desde))) {
        where.push('sm.fecha_registro >= ?');
        params.push(`${f.desde} 00:00:00`);
    }
    if (f.hasta && /^\d{4}-\d{2}-\d{2}$/.test(String(f.hasta))) {
        where.push('sm.fecha_registro <= ?');
        params.push(`${f.hasta} 23:59:59`);
    }
    // Búsqueda libre sobre motivo, notas, nombre y código de producto
    if (f.buscar && String(f.buscar).trim()) {
        const termino = `%${String(f.buscar).trim().slice(0, 100)}%`;
        where.push('(sm.motivo LIKE ? OR sm.notas LIKE ? OR p.nombre LIKE ? OR p.codigo LIKE ?)');
        params.push(termino, termino, termino, termino);
    }

    return { clause: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

/**
 * Fragmento FROM común: joins de nombres + subconsulta del costo impactado
 * (los movimientos de kardex generados por cada salida manual).
 * `um` es la unidad registrada en la salida; `ui` la unidad de inventario del
 * producto (usada como respaldo para registros anteriores a la unidad).
 */
const FROM_COMUN = `
            FROM salidas_manuales sm
            INNER JOIN almacenes a ON sm.almacen_id = a.id
            INNER JOIN productos p ON sm.producto_id = p.id
            LEFT JOIN usuarios u ON sm.usuario_id = u.id
            LEFT JOIN unidades_medida um ON sm.unidad_medida_id = um.id
            LEFT JOIN unidades_medida ui ON p.unidad_inventario_id = ui.id
            LEFT JOIN (
                SELECT referencia_id, SUM(costo_total) AS costo_total
                FROM movimientos_inventario
                WHERE referencia_tipo = 'salida_manual'
                GROUP BY referencia_id
            ) mv ON mv.referencia_id = sm.id`;

const SELECT_LISTADO = `
            SELECT 
                sm.*,
                a.nombre AS almacen_nombre,
                p.nombre AS producto_nombre,
                p.codigo AS producto_codigo,
                p.unidad_inventario_id,
                u.nombre AS usuario_nombre,
                COALESCE(mv.costo_total, 0) AS costo_total,
                COALESCE(um.abreviatura, ui.abreviatura) AS unidad_abreviatura,
                COALESCE(sm.unidad_medida_id, p.unidad_inventario_id) AS unidad_efectiva_id`;

const SalidaManual = {
    // Obtener todas las salidas manuales
    getAll: async () => {
        const query = `
            SELECT 
                sm.*,
                a.nombre AS almacen_nombre,
                p.nombre AS producto_nombre,
                p.codigo AS producto_codigo,
                u.nombre AS usuario_nombre
            FROM salidas_manuales sm
            INNER JOIN almacenes a ON sm.almacen_id = a.id
            INNER JOIN productos p ON sm.producto_id = p.id
            LEFT JOIN usuarios u ON sm.usuario_id = u.id
            ORDER BY sm.fecha_registro DESC
        `;
        const [rows] = await db.query(query);
        return rows;
    },

    // Obtener salidas por tipo
    getByTipo: async (tipo) => {
        const query = `
            SELECT 
                sm.*,
                a.nombre AS almacen_nombre,
                p.nombre AS producto_nombre,
                p.codigo AS producto_codigo,
                u.nombre AS usuario_nombre
            FROM salidas_manuales sm
            INNER JOIN almacenes a ON sm.almacen_id = a.id
            INNER JOIN productos p ON sm.producto_id = p.id
            LEFT JOIN usuarios u ON sm.usuario_id = u.id
            WHERE sm.tipo = ?
            ORDER BY sm.fecha_registro DESC
        `;
        const [rows] = await db.query(query, [tipo]);
        return rows;
    },

    // Obtener salidas por almacén
    getByAlmacen: async (almacenId) => {
        const query = `
            SELECT 
                sm.*,
                a.nombre AS almacen_nombre,
                p.nombre AS producto_nombre,
                p.codigo AS producto_codigo,
                u.nombre AS usuario_nombre
            FROM salidas_manuales sm
            INNER JOIN almacenes a ON sm.almacen_id = a.id
            INNER JOIN productos p ON sm.producto_id = p.id
            LEFT JOIN usuarios u ON sm.usuario_id = u.id
            WHERE sm.almacen_id = ?
            ORDER BY sm.fecha_registro DESC
        `;
        const [rows] = await db.query(query, [almacenId]);
        return rows;
    },

    // Obtener salida por ID
    getById: async (id) => {
        const query = `
            SELECT 
                sm.*,
                a.nombre AS almacen_nombre,
                p.nombre AS producto_nombre,
                p.codigo AS producto_codigo,
                u.nombre AS usuario_nombre
            FROM salidas_manuales sm
            INNER JOIN almacenes a ON sm.almacen_id = a.id
            INNER JOIN productos p ON sm.producto_id = p.id
            LEFT JOIN usuarios u ON sm.usuario_id = u.id
            WHERE sm.id = ?
        `;
        const [rows] = await db.query(query, [id]);
        return rows[0];
    },

    // Crear nueva salida manual
    create: async (salidaData) => {
        const query = `
            INSERT INTO salidas_manuales 
            (almacen_id, producto_id, cantidad, unidad_medida_id, tipo, motivo, notas, usuario_id, fecha_registro)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `;
        const [result] = await db.query(query, [
            salidaData.almacen_id,
            salidaData.producto_id,
            salidaData.cantidad,
            salidaData.unidad_medida_id || null,
            salidaData.tipo,
            salidaData.motivo || null,
            salidaData.notas || null,
            salidaData.usuario_id
        ]);
        return result.insertId;
    },

    // Verificar stock disponible en almacén
    verificarStock: async (almacenId, productoId, cantidad) => {
        const query = `
            SELECT COALESCE(SUM(l.cantidad_actual), 0) AS stock_disponible
            FROM lotes l
            WHERE l.producto_id = ? 
            AND l.almacen_id = ? 
            AND l.cantidad_actual > 0
        `;
        const [rows] = await db.query(query, [productoId, almacenId]);
        return rows[0].stock_disponible >= cantidad;
    },

    // Obtener lotes disponibles en almacén (ordenados por vencimiento)
    obtenerLotes: async (almacenId, productoId) => {
        const query = `
            SELECT id, cantidad_actual, costo_unitario, fecha_vencimiento
            FROM lotes
            WHERE producto_id = ? 
            AND almacen_id = ? 
            AND cantidad_actual > 0
            ORDER BY 
                CASE WHEN fecha_vencimiento IS NOT NULL THEN fecha_vencimiento ELSE '9999-12-31' END ASC,
                id ASC
        `;
        const [rows] = await db.query(query, [productoId, almacenId]);
        return rows;
    },

    // Obtener resumen por tipo
    getResumenPorTipo: async (fechaInicio = null, fechaFin = null) => {
        let query = `
            SELECT 
                tipo,
                COUNT(*) as total_salidas,
                SUM(cantidad) as total_cantidad
            FROM salidas_manuales
        `;
        let params = [];

        if (fechaInicio && fechaFin) {
            query += ` WHERE fecha_registro BETWEEN ? AND ?`;
            params.push(fechaInicio, fechaFin);
        }

        query += ` GROUP BY tipo ORDER BY total_cantidad DESC`;

        const [rows] = await db.query(query, params);
        return rows;
    },

    // Obtener salidas por período
    getByPeriodo: async (fechaInicio, fechaFin) => {
        const query = `
            SELECT 
                sm.*,
                a.nombre AS almacen_nombre,
                p.nombre AS producto_nombre,
                p.codigo AS producto_codigo,
                u.nombre AS usuario_nombre
            FROM salidas_manuales sm
            INNER JOIN almacenes a ON sm.almacen_id = a.id
            INNER JOIN productos p ON sm.producto_id = p.id
            LEFT JOIN usuarios u ON sm.usuario_id = u.id
            WHERE sm.fecha_registro BETWEEN ? AND ?
            ORDER BY sm.fecha_registro DESC
        `;
        const [rows] = await db.query(query, [fechaInicio, fechaFin]);
        return rows;
    },

    // ─────────────────────────────────────────────────────────────────────
    // Panel profesional de análisis (kardex): filtros, orden, paginación,
    // resumen por tipo bajo filtros, usuarios con salidas y exportación.
    // ─────────────────────────────────────────────────────────────────────

    // Listado filtrado + ordenado + paginado. Devuelve { rows, total, pagina, porPagina, totalPaginas }
    getFiltrado: async (filtros = {}) => {
        const { clause, params } = construirFiltros(filtros);

        const columna = COLUMNAS_ORDEN[filtros.orden] || COLUMNAS_ORDEN.fecha;
        const direccion = String(filtros.dir).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
        const pagina = Math.max(1, parseInt(filtros.pagina, 10) || 1);
        const porPagina = POR_PAGINA_VALIDOS.includes(parseInt(filtros.porPagina, 10))
            ? parseInt(filtros.porPagina, 10) : 50;
        const offset = (pagina - 1) * porPagina;

        const [[{ total }]] = await db.query(
            `SELECT COUNT(*) AS total ${FROM_COMUN} ${clause}`,
            params
        );

        const [rows] = await db.query(
            `${SELECT_LISTADO} ${FROM_COMUN} ${clause}
             ORDER BY ${columna} ${direccion}, sm.id DESC
             LIMIT ? OFFSET ?`,
            [...params, porPagina, offset]
        );

        return {
            rows,
            total,
            pagina,
            porPagina,
            totalPaginas: Math.max(1, Math.ceil(total / porPagina))
        };
    },

    // Resumen por tipo aplicando los mismos filtros del panel
    getResumenFiltrado: async (filtros = {}) => {
        const { clause, params } = construirFiltros(filtros);
        const query = `
            SELECT 
                sm.tipo,
                COUNT(*) AS total_salidas,
                COALESCE(SUM(sm.cantidad), 0) AS total_cantidad,
                COALESCE(SUM(COALESCE(mv.costo_total, 0)), 0) AS total_costo
            ${FROM_COMUN}
            ${clause}
            GROUP BY sm.tipo
            ORDER BY total_cantidad DESC
        `;
        const [rows] = await db.query(query, params);
        return rows;
    },

    // Usuarios que han registrado salidas (para el filtro especializado)
    getUsuariosConSalidas: async () => {
        const query = `
            SELECT DISTINCT u.id, u.nombre, u.apellidos, u.usuario, u.rol
            FROM salidas_manuales sm
            INNER JOIN usuarios u ON sm.usuario_id = u.id
            ORDER BY u.nombre ASC
        `;
        const [rows] = await db.query(query);
        return rows;
    },

    // Filas completas (sin paginar, con tope) para la exportación a CSV
    getParaExportar: async (filtros = {}, limite = 20000) => {
        const { clause, params } = construirFiltros(filtros);
        const tope = Math.min(50000, Math.max(1, parseInt(limite, 10) || 20000));
        const [rows] = await db.query(
            `${SELECT_LISTADO} ${FROM_COMUN} ${clause}
             ORDER BY sm.fecha_registro DESC, sm.id DESC
             LIMIT ?`,
            [...params, tope]
        );
        return rows;
    }
};

module.exports = SalidaManual;
