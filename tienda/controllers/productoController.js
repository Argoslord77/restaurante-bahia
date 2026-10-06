const ProductoService = require('../services/productoService');
const InventarioService = require('../services/inventarioService');

module.exports = {
    lista: async (req, res) => {
        try {
            const [productos, categorias] = await Promise.all([
                ProductoService.listar({ q: req.query.q || '', categoria: req.query.categoria || null, activos: false }),
                ProductoService.listarCategorias()
            ]);
            res.render('productos', { productos, categorias, q: req.query.q || '', categoria: req.query.categoria || '' });
        } catch (err) {
            req.flash('error_msg', err.message);
            res.redirect('/');
        }
    },

    verForm: async (req, res) => {
        try {
            const categorias = await ProductoService.listarCategorias();
            const producto = req.params.id ? await ProductoService.obtener(req.params.id) : null;
            if (req.params.id && !producto) {
                req.flash('error_msg', 'El producto no existe.');
                return res.redirect('/productos');
            }
            res.render('producto_form', { producto, categorias });
        } catch (err) {
            req.flash('error_msg', err.message);
            res.redirect('/productos');
        }
    },

    guardar: async (req, res) => {
        try {
            const datos = {
                sku: req.body.sku, nombre: req.body.nombre, categoria_id: req.body.categoria_id || null,
                descripcion: req.body.descripcion, precio_costo: req.body.precio_costo,
                precio_venta: req.body.precio_venta, stock_minimo: req.body.stock_minimo
            };
            if (req.params.id) {
                await ProductoService.actualizar(req.params.id, datos);
                req.flash('ok_msg', 'Producto actualizado.');
            } else {
                datos.stock_inicial = req.body.stock_inicial || 0;
                await ProductoService.crear(datos, req.session.tiendaUser.id);
                req.flash('ok_msg', 'Producto creado.');
            }
            res.redirect('/productos');
        } catch (err) {
            req.flash('error_msg', err.message);
            res.redirect(req.params.id ? `/productos/${req.params.id}/editar` : '/productos/nuevo');
        }
    },

    toggle: async (req, res) => {
        try {
            const p = await ProductoService.obtener(req.params.id);
            if (!p) throw new Error('El producto no existe.');
            await ProductoService.cambiarActivo(req.params.id, !p.activo);
            req.flash('ok_msg', p.activo ? 'Producto desactivado.' : 'Producto activado.');
        } catch (err) {
            req.flash('error_msg', err.message);
        }
        res.redirect('/productos');
    },

    crearCategoria: async (req, res) => {
        try {
            await ProductoService.crearCategoria(req.body.nombre);
            req.flash('ok_msg', 'Categoría creada.');
        } catch (err) {
            req.flash('error_msg', err.message);
        }
        res.redirect('/productos');
    },

    kardex: async (req, res) => {
        try {
            const producto = await ProductoService.obtener(req.params.id);
            if (!producto) {
                req.flash('error_msg', 'El producto no existe.');
                return res.redirect('/productos');
            }
            const movs = await InventarioService.kardex(req.params.id);
            res.render('kardex', { producto, movs });
        } catch (err) {
            req.flash('error_msg', err.message);
            res.redirect('/productos');
        }
    }
};
