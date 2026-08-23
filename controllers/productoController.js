const ProductoService = require('../services/productoService');

/**
 * Renderiza la vista principal del catálogo con productos, categorías y unidades
 */
exports.renderProductos = async (req, res) => {
    try {
        const productos = await ProductoService.getCatalogoCompleto();
        const { categorias, unidades } = await ProductoService.getDatosParaFormularios();

        res.render('admin/productos', {
            title: 'Catálogo de Productos - Restaurante Bahía',
            productos: productos || [],
            categorias: categorias || [],
            unidades: unidades || [],
            user: req.user,
            view: 'productos' // Mantiene activo el link en el sidebar
        });
    } catch (error) {
        console.error('Error al renderizar catálogo:', error);
        req.flash('error_msg', 'No se pudo cargar el catálogo de productos.');
        res.redirect('/admin/dashboard');
    }
};

/**
 * Obtiene los datos de un producto en formato JSON (para poblar el modal de edición)
 */
exports.getProductoJson = async (req, res) => {
    try {
        const producto = await ProductoService.getProductoPorId(req.params.id);
        res.json({ success: true, data: producto });
    } catch (error) {
        res.status(404).json({ success: false, message: error.message });
    }
};

// Cambiar el método de creación en productoController.js
exports.createProducto = async (req, res) => {
    try {
        // Combinamos los campos de texto con la ruta del archivo guardado por Multer
        const dataProducto = {
            ...req.body,
            // Guardamos la ruta relativa de la imagen si se subió una
            foto_url: req.file ? `/uploads/${req.file.filename}` : null 
        };

        await ProductoService.registrarNuevoProducto(dataProducto);
        res.status(201).json({ success: true, message: 'Producto registrado correctamente.' });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// Cambiar el método de actualización en productoController.js
exports.updateProducto = async (req, res) => {
    try {
        const { id } = req.params;
        const dataProducto = {
            ...req.body,
            foto_url: req.file ? `/uploads/${req.file.filename}` : null
        };

        const result = await ProductoService.actualizarProducto(id, dataProducto);
        
        if (result) {
            res.json({ success: true, message: 'Producto actualizado correctamente.' });
        } else {
            res.status(404).json({ success: false, message: 'No se realizaron cambios o el producto no existe.' });
        }
    } catch (error) {
        console.error('Error en updateProducto:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteProducto = async (req, res) => {
    try {
        const { id } = req.params;
        const eliminado = await ProductoService.eliminarProducto(id);
        
        if (eliminado) {
            return res.json({ success: true, message: 'Producto eliminado correctamente.' });
        } else {
            return res.status(404).json({ success: false, message: 'El producto no pudo ser eliminado.' });
        }
    } catch (error) {
        console.error('Error en deleteProducto:', error);
        return res.status(500).json({ 
            success: false, 
            message: error.message || 'Error interno del servidor al eliminar el producto.' 
        });
    }
};