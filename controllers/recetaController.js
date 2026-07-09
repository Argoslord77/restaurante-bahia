// controllers/recetaController.js - Controlador para gestión de recetas / fichas técnicas
const RecetaService = require('../services/recetaService');
const ProductoModel = require('../models/productoModel'); // Requerido para consultas específicas de insumos
const logger = require('../config/logger');

const RecetaController = {
    // Renderizar vista principal de recetas (Consolida catálogos concurrentes)
    viewRecetas: async (req, res) => {
        try {
            // 1. Obtiene el catálogo base (recetas, platillos de la carta y unidades de medida)
            const { recetas, platillos, unidades } = await RecetaService.obtenerCatalogosAdministracion();

            // 2. Trae de forma concurrente los ingredientes válidos (Materias Primas + Productos Terminados de Venta)
            const [materiasPrimas, productosVenta] = await Promise.all([
                ProductoModel.getMateriasPrimas(),
                ProductoModel.getProductosVenta() 
            ]);

            // 3. Unifica ambos catálogos en un único arreglo para el select de insumos/ingredientes de la tabla
            const insumosValidos = [...materiasPrimas, ...productosVenta];

            res.render('inventarios/recetas', {
                recetas: recetas,
                productos: insumosValidos,               
                unidades: unidades,
                platillos: platillos,                    // <-- CORREGIDO: Inyecta el catálogo real del menú obtenido desde el servicio
                user: req.session.user || { rol: 'administrador' },
                view: 'recetas'
            });
        } catch (error) {
            logger.error('Error al cargar vista de recetas:', error);
            res.status(500).render('error', { message: 'Error interno al cargar el catálogo de recetas' });
        }
    },

    // API: Obtener ingredientes de una receta por su receta_id (platilloId)
    getIngredientesByPlatillo: async (req, res) => {
        try {
            const { platilloId } = req.params; // ID del maestro de la receta
            const ingredientes = await RecetaService.obtenerPorPlatillo(platilloId);
            
            // Mapeo seguro con la propiedad de base de datos unificada
            const mapeados = ingredientes.map(ing => ({
                producto_id: ing.producto_id,
                cantidad_requerida: ing.cantidad_requerida,
                unidad_medida: ing.unidad_medida,
                porcentaje_merma: ing.porcentaje_merma
            }));

            return res.status(200).json(mapeados);
        } catch (error) {
            logger.error('Error al obtener ingredientes por platillo:', error);
            return res.status(500).json({ success: false, message: 'Error al recuperar el detalle de ingredientes' });
        }
    },

    // API: Crear nueva receta Maestro-Detalle con persistencia atómica via AJAX
    createReceta: async (req, res) => {
        try {
            //Guardar en el body el id del creador de la receta
            req.body.creada_por = req.session.user.id;
            const recetaId = await RecetaService.crearReceta(req.body);
            return res.status(201).json({
                success: true,
                message: 'Ficha técnica maestro-detalle guardada correctamente.',
                recetaId
            });
        } catch (error) {
            logger.error('Error al crear receta:', error);
            return res.status(500).json({ success: false, message: error.message || 'Error interno al procesar la receta' });
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
            return res.status(500).json({ success: false, message: error.message || 'Error interno al modificar la receta' });
        }
    },

    // API: Eliminar receta (Baja lógica del sistema)
    deleteReceta: async (req, res) => {
        try {
            const { id } = req.params;
            await RecetaService.eliminarReceta(id);
            return res.status(200).json({ success: true, message: 'Receta dada de baja correctamente' });
        } catch (error) {
            logger.error('Error al dar de baja la receta:', error);
            return res.status(500).json({ success: false, message: 'No se pudo procesar la baja de la receta' });
        }
    },

    // API: Verificar stock crítico en un almacén específico antes de confirmar un pedido
    verificarStock: async (req, res) => {
        try {
            const { items, almacen_id } = req.body;
            
            if(!items || !almacen_id) {
                return res.status(400).json({ success: false, message: 'Parámetros insuficientes para la verificación' });
            }

            const resultado = await RecetaService.verificarStockParaPedido(items, almacen_id);
            return res.status(200).json(resultado);
        } catch (error) {
            logger.error('Error al verificar stock de ingredientes:', error);
            return res.status(500).json({ success: false, message: error.message || 'Error en la comprobación' });
        }
    },

    /**
     * @desc Obtiene los platillos del menú que consumen un producto/insumo específico en sus recetas
     * @route GET /api/recetas/producto/:productoId
     * @access Private (superadministrador, administrador, almacenero)
     */
    getPlatillosByProducto: async (req, res) => {
        try {
            const { productoId } = req.params;

            // 1. Validación del parámetro de entrada (debe ser un ID numérico válido)
            if (!productoId || isNaN(productoId)) {
                return res.status(400).json({
                    success: false,
                    message: 'El ID del producto proporcionado no es válido.'
                });
            }

            // 2. Consulta al modelo enviando el ID del producto (insumo)
            const platillosAfectados = await RecetaService.obtenerPlatillosPorProducto(productoId);

            // 3. Respuesta JSON estructurada
            return res.status(200).json({
                success: true,
                count: platillosAfectados.length,
                data: platillosAfectados
            });

        } catch (error) {
            console.error('Error en recetaController.getPlatillosByProducto:', error);
            return res.status(500).json({
                success: false,
                message: 'Error interno del servidor al obtener los platillos que consumen este producto.',
                error: process.env.NODE_ENV === 'development' ? error.message : {}
            });
        }
    },

    // Vista de configuración avanzada / maestro-detalle unificado (Mantenida por compatibilidad)
    viewConfigurarReceta: async (req, res) => {
        try {
            const { platilloId } = req.params; // ID de la receta maestro
            
            const recetaCompleta = await RecetaService.obtenerRecetaCompleta(platilloId);
            const { unidades } = await RecetaService.obtenerCatalogosAdministracion();

            const [materiasPrimas, productosVenta] = await Promise.all([
                ProductoModel.getMateriasPrimas(),
                ProductoModel.getProductosVenta()
            ]);
            const insumosValidos = [...materiasPrimas, ...productosVenta];

            res.render('inventarios/configurar-receta', {
                platillo: recetaCompleta || { nombre: 'Receta No Encontrada' },
                ingredientes: recetaCompleta ? recetaCompleta.detalles : [],
                productos: insumosValidos,               
                unidades: unidades, 
                user: req.session.user || { rol: 'administrador' },
                view: 'recetas'
            });
        } catch (error) {
            logger.error('Error al cargar configuración de receta:', error);
            res.status(500).render('error', { message: 'Error al cargar la configuración de receta' });
        }
    }
};

module.exports = RecetaController;