// controllers/almacenController.js
// Controlador administrativo de Inventarios y Almacenes - Restaurante Bahía
const pool = require('../config/db');
const AlmacenService = require('../services/almacenService');

/**
 * Renderiza la vista principal de la lista de Almacenes (GET /admin/almacenes)
 * Mapeado exactamente a: router.get('/almacenes', ...)
 */
const viewAlmacenes = async (req, res, next) => {
    try {
        // Consumimos el servicio para listar almacenes manteniendo la consistencia de la arquitectura
        const almacenes = await AlmacenService.listarAlmacenes();

        // Traer lista de usuarios con rol administrativo para el selector de responsables del modal
        const [usuarios] = await pool.query(`
            SELECT id, CONCAT(nombre, ' ', apellidos) AS nombre_completo 
            FROM usuarios 
            WHERE rol IN ('superadministrador', 'administrador', 'almacenero')
            ORDER BY nombre ASC
        `);

        // Renderizado seguro de la vista principal del submódulo
        return res.render('inventarios/almacenes', {
            title: 'Gestión de Almacenes - Restaurante Bahía',
            almacenes: almacenes || [],
            usuarios: usuarios || [],
            view: "warehouse"
        });

    } catch (error) {
        return next(error);
    }
};

/**
 * Obtiene un almacén específico por ID en formato JSON para el Front-end
 * Mapeado exactamente a: router.get('/almacen/:id', ...)
 */
const getAlmacen = async (req, res, next) => {
    try {
        const { id } = req.params;
        const almacen = await AlmacenService.obtenerPorId(id);
        
        return res.status(200).json({
            success: true,
            almacen
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * Crea un nuevo almacén procesando los parámetros mediante el servicio
 * Mapeado exactamente a: router.post('/almacenes/add', ...)
 */
const addAlmacen = async (req, res, next) => {
    try {
        const nuevoAlmacen = await AlmacenService.crearAlmacen(req.body);
        
        return res.status(201).json({
            success: true,
            message: 'Almacén creado correctamente',
            almacen: nuevoAlmacen
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * Modifica un almacén existente validando las reglas de negocio
 * Mapeado exactamente a: router.put('/almacen/edit/:id', ...)
 */
const editAlmacen = async (req, res, next) => {
    try {
        const { id } = req.params;
        const almacenActualizado = await AlmacenService.actualizarAlmacen(id, req.body);
        
        return res.status(200).json({
            success: true,
            message: 'Almacén actualizado correctamente',
            almacen: almacenActualizado
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * Realiza un borrado lógico del almacén pasando su estado 'activo' a 0 (Inactivo)
 * Mapeado exactamente a: router.delete('/almacen/delete/:id', ...)
 */
const deleteAlmacen = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Instanciamos el servicio (o llamamos a su método según tengas la arquitectura estructurada)
        // Usamos cambiarEstadoAlmacen pasando 'false' para que ponga activo = 0
        await AlmacenService.cambiarEstadoAlmacen(id, false);

        return res.status(200).json({
            success: true,
            message: 'Almacén desactivado con éxito. Se ha restringido su uso operacional.'
        });
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message || 'No se pudo desactivar el almacén.'
        });
    }
};

// =========================================================================
// MÓDULO ADICIONAL: ENTRADAS E INGRESO DE LOTES (FIFO)
// =========================================================================

/**
 * Renderiza la vista principal de Entradas de Almacén / Lotes activos
 */
const getEntradasView = async (req, res, next) => {
    try {
        const [entradas] = await pool.query(`
            SELECT e.*, p.nombre AS producto_nombre, p.codigo AS producto_codigo, a.nombre AS almacen_nombre 
            FROM lotes e
            INNER JOIN productos p ON e.producto_id = p.id
            INNER JOIN almacenes a ON e.almacen_id = a.id
            ORDER BY e.fecha_ingreso DESC, e.id DESC
        `);

        const almacenes = await AlmacenService.listarAlmacenes();
        const [productos] = await pool.query('SELECT id, nombre, codigo FROM productos ORDER BY nombre ASC');

        return res.render('inventarios/entradas', {
            title: 'Entradas de Almacén - Restaurante Bahía',
            entradas: entradas || [],
            almacenes: almacenes || [],
            productos: productos || []
        });
    } catch (error) {
        return next(error);
    }
};

const registrarEntradaApi = async (req, res, next) => {
    try {
        const { 
            almacen_id, 
            producto_id, 
            fecha_ingreso, 
            fecha_vencimiento, 
            cantidad, 
            costo_unitario 
        } = req.body;

        // Validaciones explícitas para saber exactamente qué falta
        if (!almacen_id) throw new Error('El almacén de destino es obligatorio.');
        if (!producto_id) throw new Error('El producto es obligatorio.');
        if (!fecha_ingreso) throw new Error('La fecha de ingreso es obligatoria para generar el lote.');
        if (!cantidad || cantidad <= 0) throw new Error('La cantidad ingresada debe ser mayor a 0.');
        if (!costo_unitario || costo_unitario <= 0) throw new Error('El costo unitario debe ser mayor a 0.');

        const anoActual = new Date(fecha_ingreso).getFullYear();
        
        const [countResult] = await pool.query(
            'SELECT COUNT(*) AS total FROM lotes WHERE YEAR(fecha_ingreso) = ?', 
            [anoActual]
        );
        
        const siguienteCorrelativo = String(countResult[0].total + 1).padStart(4, '0');
        const numero_lote = `LOT-${anoActual}-${siguienteCorrelativo}`;

        const sqlInsert = `
            INSERT INTO lotes 
            (almacen_id, producto_id, numero_lote, fecha_ingreso, fecha_vencimiento, cantidad_inicial, cantidad_actual, costo_unitario) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const valores = [
            almacen_id,
            producto_id,
            numero_lote,
            fecha_ingreso,
            fecha_vencimiento === '' ? null : fecha_vencimiento,
            cantidad,
            cantidad, 
            costo_unitario
        ];

        await pool.query(sqlInsert, valores);

        return res.status(201).json({
            success: true,
            message: `Entrada procesada con éxito en inventario. Asignado el Lote: ${numero_lote}`
        });

    } catch (error) {
        // Devolvemos un 400 controlado para que SweetAlert muestre tu mensaje personalizado
        return res.status(400).json({
            success: false,
            message: error.message || 'Todos los campos obligatorios deben ser completados.'
        });
    }
};

module.exports = {
    viewAlmacenes,
    getAlmacen,
    addAlmacen,
    editAlmacen,
    deleteAlmacen,
    getEntradasView,
    registrarEntradaApi
};