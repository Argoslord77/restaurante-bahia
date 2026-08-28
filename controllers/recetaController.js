// controllers/recetaController.js - Controlador para gestión de recetas / fichas técnicas
const RecetaService = require('../services/recetaService');
const UnidadMedidaService = require('../services/unidadMedidaService');
const AlmacenService = require('../services/almacenService');
const ProductoModel = require('../models/productoModel');
const logger = require('../config/logger');

const RecetaController = {
    // Renderizar vista principal de recetas (Consolida catálogos concurrentes)
    viewRecetas: async (req, res) => {
        try {
            // 1. Obtiene el catálogo base (recetas, platillos de la carta y unidades de medida)
            const { recetas, platillos, unidades } = await RecetaService.obtenerCatalogosAdministracion();

            // 2. Trae de forma concurrente los ingredientes válidos (Materias Primas + Productos Terminados de Venta)
            let materiasPrimas = [];
            let productosVenta = [];
            try {
                [materiasPrimas, productosVenta] = await Promise.all([
                    ProductoModel.getMateriasPrimas(),
                    ProductoModel.getProductosVenta() 
                ]);
            } catch (errInsumos) {
                logger.warn('Error al cargar insumos secundarios:', errInsumos);
            }

            // 3. Unifica ambos catálogos en un único arreglo para el select de insumos/ingredientes de la tabla
            const insumosValidos = [...(materiasPrimas || []), ...(productosVenta || [])];

            res.render('inventarios/recetas', {
                recetas: recetas || [],
                productos: insumosValidos,               
                unidades: unidades || [],
                platillos: platillos || [],
                user: req.user || (req.session && req.session.user) || { rol: 'administrador', nombre: 'Admin' },
                view: 'admin_recetas',
                pageTitle: 'Fichas Técnicas / Recetas de Menú'
            });
        } catch (error) {
            logger.error('Error al cargar vista de recetas:', error);
            res.status(500).render('errors/500', { 
                message: 'Error interno al cargar el catálogo de recetas', 
                user: req.user || (req.session && req.session.user) 
            });
        }
    },

    // API: Obtener ingredientes de una receta por su receta_id (platilloId)
    getIngredientesByPlatillo: async (req, res) => {
        try {
            const { platilloId } = req.params;
            const ingredientes = await RecetaService.obtenerPorPlatillo(platilloId);
            
            const mapeados = (ingredientes || []).map(ing => ({
                id: ing.id,
                producto_id: ing.producto_id,
                producto_nombre: ing.producto_nombre,
                producto_codigo: ing.producto_codigo,
                cantidad_requerida: ing.cantidad_requerida,
                unidad_medida: ing.unidad_medida,
                porcentaje_merma: ing.porcentaje_merma,
                costo_estimado: ing.costo_estimado,
                orden_preparacion: ing.orden_preparacion,
                stock_disponible: ing.stock_disponible,
                stock_logistico: ing.stock_logistico,
                stock_produccion: ing.stock_produccion,
                es_opcional: ing.es_opcional
            }));

            return res.status(200).json(mapeados);
        } catch (error) {
            logger.error('Error al obtener ingredientes por platillo:', error);
            return res.status(500).json({ success: false, message: 'Error al recuperar el detalle de ingredientes' });
        }
    },

    // API: Verificar disponibilidad de código de receta asincrónicamente
    checkCodigo: async (req, res) => {
        try {
            const { codigo, excludeId } = req.query;
            if (!codigo || !codigo.toString().trim()) {
                return res.status(400).json({ success: false, disponible: false, message: 'Código no proporcionado' });
            }
            const resultado = await RecetaService.verificarCodigoDisponible(codigo, excludeId);
            return res.status(200).json({
                success: true,
                disponible: resultado.disponible,
                message: resultado.message,
                recetaExistente: resultado.recetaExistente || null
            });
        } catch (error) {
            logger.error('Error al verificar código de receta:', error);
            return res.status(500).json({ success: false, disponible: false, message: 'Error interno al validar código' });
        }
    },

    // API: Crear nueva receta Maestro-Detalle con persistencia atómica via AJAX
    createReceta: async (req, res) => {
        try {
            const usuarioId = req.user?.id || (req.session?.user?.id) || 1;
            req.body.creada_por = usuarioId;
            const recetaId = await RecetaService.crearReceta(req.body);
            return res.status(201).json({
                success: true,
                message: 'Ficha técnica maestro-detalle guardada correctamente.',
                recetaId
            });
        } catch (error) {
            logger.error('Error al crear receta:', error);
            const status = (error.message && (error.message.includes('ya está en uso') || error.message.includes('ya existe') || error.message.includes('obligatorio'))) ? 400 : 500;
            return res.status(status).json({ success: false, message: error.message || 'Error interno al procesar la receta' });
        }
    },

    // API: Actualizar receta Maestro-Detalle con estrategia Delete-Insert transaccional
    updateReceta: async (req, res) => {
        try {
            const { id } = req.params;
            await RecetaService.actualizarReceta(id, req.body);
            return res.status(200).json({
                success: true,
                message: 'Ficha técnica maestro-detalle actualizada con éxito.'
            });
        } catch (error) {
            logger.error('Error al actualizar receta:', error);
            const status = (error.message && (error.message.includes('ya está en uso') || error.message.includes('ya existe') || error.message.includes('obligatorio'))) ? 400 : 500;
            return res.status(status).json({ success: false, message: error.message || 'Error interno al modificar la receta' });
        }
    },

    // API: Eliminar receta DEFINITIVAMENTE de la base de datos (Hard Delete)
    deleteReceta: async (req, res) => {
        try {
            const { id } = req.params;
            if (!id) {
                return res.status(400).json({ success: false, message: 'ID de receta requerido' });
            }
            await RecetaService.eliminarReceta(id);
            return res.status(200).json({ 
                success: true, 
                message: 'Ficha técnica / Receta eliminada definitivamente de la base de datos con todos sus ingredientes' 
            });
        } catch (error) {
            logger.error('Error al eliminar definitivamente la receta:', error);
            return res.status(500).json({ success: false, message: error.message || 'No se pudo eliminar la receta de la base de datos' });
        }
    },

    // API: Verificar stock crítico antes de confirmar un pedido.
    // El almacén es opcional: si no se envía, cada platillo resuelve su propio
    // almacén de PRODUCCIÓN (nunca se comprueba contra el logístico).
    verificarStock: async (req, res) => {
        try {
            const { items, almacen_id } = req.body;
            
            if (!items || !Array.isArray(items) || items.length === 0) {
                return res.status(400).json({ success: false, message: 'Parámetros insuficientes para la verificación' });
            }

            const resultado = await RecetaService.verificarStockParaPedido(items, almacen_id || null);
            return res.status(200).json(resultado);
        } catch (error) {
            logger.error('Error al verificar stock de ingredientes:', error);
            return res.status(500).json({ success: false, message: error.message || 'Error en la comprobación' });
        }
    },

    /**
     * @desc Obtiene los platillos del menú que consumen un producto/insumo específico en sus recetas
     * @route GET /api/recetas/producto/:productoId
     */
    getPlatillosByProducto: async (req, res) => {
        try {
            const { productoId } = req.params;

            if (!productoId || isNaN(productoId)) {
                return res.status(400).json({
                    success: false,
                    message: 'El ID del producto proporcionado no es válido.'
                });
            }

            const platillosAfectados = await RecetaService.obtenerPlatillosPorProducto(productoId);

            return res.status(200).json({
                success: true,
                count: platillosAfectados.length,
                data: platillosAfectados
            });

        } catch (error) {
            logger.error('Error en recetaController.getPlatillosByProducto:', error);
            return res.status(500).json({
                success: false,
                message: 'Error interno del servidor al obtener los platillos que consumen este producto.'
            });
        }
    },

    // Vista de configuración avanzada / maestro-detalle unificado
    viewConfigurarReceta: async (req, res) => {
        try {
            const { platilloId } = req.params;
            
            const recetaCompleta = await RecetaService.obtenerRecetaCompleta(platilloId);
            const { unidades } = await RecetaService.obtenerCatalogosAdministracion();
            

            let materiasPrimas = [];
            let productosVenta = [];
            try {
                [materiasPrimas, productosVenta] = await Promise.all([
                    ProductoModel.getMateriasPrimas(),
                    ProductoModel.getProductosVenta()
                ]);
            } catch (errInsumos) {
                logger.warn('Error al cargar insumos:', errInsumos);
            }
            const insumosValidos = [...(materiasPrimas || []), ...(productosVenta || [])];

            // Catálogo de almacenes por categoría operativa para la matriz de existencias
            let almacenes = { logisticos: [], produccion: [] };
            try {
                almacenes = await AlmacenService.listarPorCategoriasOperativas();
            } catch (errAlmacenes) {
                logger.warn('Error al cargar almacenes por categoría:', errAlmacenes);
            }

            res.render('inventarios/configurar-receta', {
                platillo: recetaCompleta || { nombre: 'Receta', id: platilloId },
                ingredientes: recetaCompleta ? recetaCompleta.detalles : [],
                productos: insumosValidos,               
                unidades: unidades || [], 
                almacenesLogisticos: almacenes.logisticos || [],
                almacenesProduccion: almacenes.produccion || [],
                user: req.user || (req.session && req.session.user) || { rol: 'administrador' },
                view: 'admin_recetas',
                pageTitle: `Configurar Receta: ${recetaCompleta ? (recetaCompleta.nombre || recetaCompleta.receta_nombre) : 'Ficha Técnica'}`
            });
        } catch (error) {
            logger.error('Error al cargar configuración de receta:', error);
            res.status(500).render('errors/500', { 
                message: 'Error al cargar la configuración de receta',
                user: req.user || (req.session && req.session.user)
            });
        }
    },

    // API: Cambiar estado activo/inactivo (Desactivación lógica)
    toggleEstadoReceta: async (req, res) => {
        try {
            const { id } = req.params;
            const { activa } = req.body;

            await RecetaService.cambiarEstado(id, activa !== undefined ? activa : 1);
            return res.status(200).json({
                success: true,
                message: `Ficha técnica ${activa ? 'activada' : 'desactivada'} correctamente.`
            });
        } catch (error) {
            logger.error('Error al cambiar estado de receta:', error);
            return res.status(500).json({ success: false, message: 'No se pudo cambiar el estado de la receta' });
        }
    },

    // API: Eliminar ingrediente individual de la receta
    deleteIngrediente: async (req, res) => {
        try {
            const { detalleId } = req.params;
            if (!detalleId) {
                return res.status(400).json({ success: false, message: 'ID del ingrediente requerido' });
            }
            await RecetaService.eliminarIngrediente(detalleId);
            return res.status(200).json({
                success: true,
                message: 'Ingrediente removido de la ficha técnica correctamente'
            });
        } catch (error) {
            logger.error('Error al eliminar ingrediente de receta:', error);
            return res.status(500).json({ success: false, message: error.message || 'Error al eliminar el ingrediente' });
        }
    },

    // API: Agregar ingrediente individual a la receta
    addIngrediente: async (req, res) => {
        try {
            const { receta_id, producto_id, cantidad_requerida, unidad_medida, porcentaje_merma, es_opcional } = req.body;
            if (!receta_id || !producto_id || !cantidad_requerida) {
                return res.status(400).json({ success: false, message: 'Faltan campos obligatorios para el ingrediente' });
            }
            await RecetaService.agregarIngrediente({
                receta_id,
                producto_id,
                cantidad_requerida,
                unidad_medida,
                porcentaje_merma: porcentaje_merma || 0,
                es_opcional: es_opcional === 'on' || es_opcional === true || es_opcional === 1 || es_opcional === '1'
            });
            return res.status(201).json({
                success: true,
                message: 'Ingrediente agregado a la ficha técnica con éxito'
            });
        } catch (error) {
            logger.error('Error al agregar ingrediente a receta:', error);
            return res.status(500).json({ success: false, message: error.message || 'Error al agregar el ingrediente' });
        }
    }
};

module.exports = RecetaController;
