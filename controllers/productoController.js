const ProductoService = require('../services/productoService');
const { nombreUsuario } = require('../services/pdfTabla');

// Descarga CSV (mismo formato que los reportes: ; + BOM para Excel).
function responderCSV(res, nombre, csv, filas) {
    const marca = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${nombre}_${marca}.csv"`);
    if (filas != null) res.setHeader('X-Reporte-Filas', String(filas));
    return res.send(csv);
}

// Descarga PDF (se genera en memoria al vuelo).
function responderPDF(res, nombre, pdf) {
    const marca = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nombre}_${marca}.pdf"`);
    res.setHeader('Content-Length', pdf.length);
    return res.send(pdf);
}

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
 * Exporta el catálogo a CSV (guardar / compartir)
 */
exports.exportarProductos = async (req, res) => {
    try {
        const productos = await ProductoService.getCatalogoCompleto();
        return responderCSV(res, 'catalogo_productos',
            ProductoService.catalogoACSV(productos), productos.length);
    } catch (error) {
        console.error('Error al exportar productos:', error);
        return res.redirect('/admin/productos');
    }
};

/**
 * Exporta el catálogo a PDF (se crea al momento y se descarga)
 */
exports.exportarProductosPDF = async (req, res) => {
    try {
        const productos = await ProductoService.getCatalogoCompleto();
        const pdf = await ProductoService.catalogoAPDF(productos, { generadoPor: nombreUsuario(req) });
        return responderPDF(res, 'catalogo_productos', pdf);
    } catch (error) {
        console.error('Error al exportar productos a PDF:', error);
        return res.redirect('/admin/productos');
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