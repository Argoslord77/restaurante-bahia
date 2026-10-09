const ProductoModel = require('../models/productoModel');
const db = require('../config/db'); // Para consultas auxiliares de catálogos

const csvNum = (v, dec = 2) => Number(v || 0).toFixed(dec).replace('.', ',');
const csvTexto = (v) => String(v == null ? '' : v).replace(/[;\r\n]+/g, ' ');

class ProductoService {
    /**
     * Obtiene el catálogo completo procesado para la vista
     */
    async getCatalogoCompleto() {
        return await ProductoModel.getAll();
    }

    /**
     * Obtiene los datos necesarios para llenar los selectores (Categorías y Unidades)
     */
    async getDatosParaFormularios() {
        const [categorias] = await db.query('SELECT id, nombre FROM categorias WHERE activo = 1 ORDER BY nombre ASC');
        const [unidades] = await db.query('SELECT id, nombre, abreviatura FROM unidades_medida WHERE activa = 1 ORDER BY nombre ASC');
        return { categorias, unidades };
    }

    async registrarNuevoProducto(data) {
        if (!data.codigo || !data.nombre) {
            throw new Error('El código y el nombre son campos obligatorios.');
        }
        
        // Saneamos y completamos campos que tu base de datos pide pero el HTML no tiene
        const productoData = {
            ...data,
            // Si el HTML no pide unidad de compra, igualamos a la unidad de inventario elegida
            unidad_compra_id: data.unidad_compra_id || data.unidad_inventario_id, 
            requiere_lote: data.requiere_lote ? parseInt(data.requiere_lote) : 0,
            controla_vencimiento: data.controla_vencimiento ? parseInt(data.controla_vencimiento) : 0,
            permitida_venta: data.permitida_venta ? parseInt(data.permitida_venta) : 0,
            foto_url: data.foto_url || null
        };
        
        return await ProductoModel.create(productoData);
    }

    async actualizarProducto(id, data) {
        if (!id) throw new Error('ID de producto no proporcionado.');
        
        const productoExistente = await ProductoModel.getById(id);
        if (!productoExistente) throw new Error('Producto no encontrado.');

        const productoData = { 
            ...data,
            // Aseguramos casteo correcto de enteros para los switches que vienen de FormData
            activo: data.activo ? parseInt(data.activo) : 0,
            permitida_venta: data.permitida_venta ? parseInt(data.permitida_venta) : 0,
            unidad_compra_id: data.unidad_compra_id || data.unidad_inventario_id
        };

        // Regla de persistencia si no se subió una nueva foto
        if (!productoData.foto_url) {
            productoData.foto_url = productoExistente.foto_url;
        }

        return await ProductoModel.update(id, productoData);
    }

    /**
     * Elimina un producto del catálogo tras verificar su existencia
     */
    async eliminarProducto(id) {
        if (!id) throw new Error('ID de producto no proporcionado.');
        
        const existe = await ProductoModel.getById(id);
        if (!existe) throw new Error('El producto que intenta eliminar no existe.');

        // Aquí podrías añadir una validación extra: 
        // ej. verificar si el producto tiene stock o está amarrado a una receta activa.

        return await ProductoModel.delete(id);
    }

    /**
     * Obtiene un producto individual por su ID histórico
     */
    async getProductoPorId(id) {
        const producto = await ProductoModel.getById(id);
        if (!producto) throw new Error('Producto no encontrado.');
        return producto;
    }

    /** CSV del catálogo de productos de inventario. */
    catalogoACSV(productos) {
        const filas = [];
        filas.push('Catalogo de productos');
        filas.push('');
        filas.push('Codigo;Nombre;Categoria;U. Inventario;Costo Promedio;Stock Min;Venta Directa;Estado');
        for (const p of productos || []) {
            filas.push([
                csvTexto(p.codigo),
                csvTexto(p.nombre),
                csvTexto(p.categoria_nombre),
                csvTexto(p.unidad_nombre),
                csvNum(p.costo_promedio),
                csvNum(p.stock_minimo, 3),
                Number(p.permitida_venta) === 1 ? 'Si' : 'No',
                Number(p.activo) === 1 ? 'Activo' : 'Inactivo'
            ].join(';'));
        }
        return '\uFEFF' + filas.join('\r\n') + '\r\n';
    }
}

module.exports = new ProductoService();