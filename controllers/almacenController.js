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

module.exports = {
    viewAlmacenes,
    getAlmacen,
    addAlmacen,
    editAlmacen,
    deleteAlmacen
};