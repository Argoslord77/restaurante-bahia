// controllers/recetaController.js - Controlador para gestión de recetas / fichas técnicas
const RecetaService = require('../services/recetaService');
const MenuModel = require('../models/menuModel');
const logger = require('../config/logger');

const RecetaController = {
    // Renderizar vista principal de recetas (Consolida catálogos concurrentes)
    viewRecetas: async (req, res) => {
        try {
            const catalogos = await RecetaService.obtenerCatalogosAdministracion();
            const platillos = await MenuModel.getAll();

            res.render('inventarios/recetas', {
                recetas: catalogos.recetas,
                productos: catalogos.productos,
                unidades: catalogos.unidades,
                platillos,
                user: req.session.user || { rol: 'administrador' }, 
                view: 'recetas'
            });
        } catch (error) {
            logger.error('Error al cargar vista de recetas:', error);
            // CORREGIDO: Evita buscar la vista "error" inexistente si falla la BD
            res.status(500).send('<h3>Error Interno (500)</h3><p>Error al cargar las recetas e insumos en el sistema.</p>');
        }
    },

    // Obtener ingredientes de una receta específica (API)
    getIngredientesByPlatillo: async (req, res) => {
        try {
            const { platilloId } = req.params; // Mapea al receta_id real
            const { almacenId } = req.query;

            let ingredientes;
            if (almacenId) {
                ingredientes = await RecetaService.obtenerPorPlatilloYAlmacen(platilloId, almacenId);
            } else {
                ingredientes = await RecetaService.obtenerPorPlatillo(platilloId);
            }

            res.json({ success: true, data: ingredientes });
        } catch (error) {
            logger.error('Error al obtener ingredientes:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Crear la receta de forma integral: Cabecera + Desglose de Ingredientes (API)
    createReceta: async (req, res) => {
        try {
            const usuarioSesion = req.session.user || { id: 1 };
            
            const recetaData = {
                codigo: req.body.codigo,
                nombre: req.body.nombre,
                descripcion: req.body.descripcion,
                tipo: req.body.tipo || 'VENTA',
                producto_resultante_id: req.body.producto_resultante_id,
                rendimiento: parseFloat(req.body.rendimiento) || 1.000,
                unidad_rendimiento: req.body.unidad_rendimiento,
                tiempo_preparacion_minutos: parseInt(req.body.tiempo_preparacion_minutos) || null,
                costo_estimado: parseFloat(req.body.costo_estimado) || 0.0000,
                precio_sugerido: parseFloat(req.body.precio_sugerido) || null,
                activa: req.body.activa !== undefined ? req.body.activa : 1,
                version: parseInt(req.body.version) || 1,
                observaciones: req.body.observaciones,
                creada_por: usuarioSesion.id,
                detalles: req.body.detalles || [] // Array estructural mapeado: [{ producto_id, cantidad_requerida, unidad_medida, porcentaje_merma, costo_estimado }]
            };

            const id = await RecetaService.crearReceta(recetaData);
            res.json({ success: true, message: 'Ficha técnica de receta creada transaccionalmente', id });
        } catch (error) {
            logger.error('Error al crear receta:', error);
            res.status(400).json({ success: false, message: error.message });
        }
    },

    // Actualizar receta de forma integral: Cabecera + Reemplazo atómico de Ingredientes (API)
    updateReceta: async (req, res) => {
        try {
            const { id } = req.params;
            const recetaData = {
                codigo: req.body.codigo,
                nombre: req.body.nombre,
                descripcion: req.body.descripcion,
                tipo: req.body.tipo,
                producto_resultante_id: req.body.producto_resultante_id,
                rendimiento: parseFloat(req.body.rendimiento),
                unidad_rendimiento: req.body.unidad_rendimiento,
                tiempo_preparacion_minutos: parseInt(req.body.tiempo_preparacion_minutos) || null,
                costo_estimado: parseFloat(req.body.costo_estimado) || 0.0000,
                precio_sugerido: parseFloat(req.body.precio_sugerido) || null,
                activa: req.body.activa,
                version: parseInt(req.body.version) || 1,
                observaciones: req.body.observaciones,
                detalles: req.body.detalles || [] // Sobrescribe la composición de ingredientes previa
            };

            await RecetaService.actualizarReceta(id, recetaData);
            res.json({ success: true, message: 'Ficha técnica y desglose de insumos actualizados correctamente' });
        } catch (error) {
            logger.error('Error al actualizar receta:', error);
            res.status(400).json({ success: false, message: error.message });
        }
    },

    // Eliminar receta (API - Borrado lógico seguro)
    deleteReceta: async (req, res) => {
        try {
            const { id } = req.params;
            await RecetaService.eliminarReceta(id);
            res.json({ success: true, message: 'Receta dada de baja exitosamente' });
        } catch (error) {
            logger.error('Error al eliminar receta:', error);
            res.status(400).json({ success: false, message: error.message });
        }
    },

    // Verificar stock crítico de insumos antes de procesar comandas o producciones (API)
    verificarStock: async (req, res) => {
        try {
            const { items, almacenId } = req.body;

            if (!items || !Array.isArray(items) || items.length === 0) {
                return res.json({ success: true, suficiente: true });
            }

            const resultado = await RecetaService.verificarStockParaPedido(items, almacenId);
            res.json(resultado);
        } catch (error) {
            logger.error('Error al verificar stock:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Obtener las recetas en las que impacta un insumo específico (API)
    getPlatillosByProducto: async (req, res) => {
        try {
            const { productoId } = req.params;
            const platillos = await RecetaService.obtenerPlatillosPorProducto(productoId);
            res.json({ success: true, data: platillos });
        } catch (error) {
            logger.error('Error al obtener platillos por producto:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Vista para configurar los ingredientes de una receta utilizando empaquetado Maestro-Detalle unificado
    viewConfigurarReceta: async (req, res) => {
        try {
            const { platilloId } = req.params; // id de la receta maestro
            
            // Reemplaza la búsqueda local por la consulta directa de objeto completo
            const recetaCompleta = await RecetaService.obtenerRecetaCompleta(platilloId);
            const catalogos = await RecetaService.obtenerCatalogosAdministracion();

            res.render('inventarios/configurar-receta', {
                platillo: recetaCompleta || { nombre: 'Receta No Encontrada' },
                ingredientes: recetaCompleta ? recetaCompleta.detalles : [],
                productos: catalogos.productos,
                unidades: catalogos.unidades, // Soporte dinámico para mapeos UI
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