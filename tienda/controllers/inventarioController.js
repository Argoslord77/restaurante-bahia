const InventarioService = require('../services/inventarioService');
const ProductoService = require('../services/productoService');

module.exports = {
    home: async (req, res) => {
        try {
            const [movs, bajo, productos] = await Promise.all([
                InventarioService.recientes(50),
                InventarioService.stockBajo(),
                ProductoService.listar({})
            ]);
            res.render('inventario', { movs, bajo, productos });
        } catch (err) {
            req.flash('error_msg', err.message);
            res.redirect('/');
        }
    },

    guardarMovimiento: async (req, res) => {
        try {
            const tipo = req.body.tipo === 'salida' ? 'salida' : 'entrada';
            await InventarioService.registrar({
                producto_id: req.body.producto_id,
                tipo,
                cantidad: req.body.cantidad,
                motivo: req.body.motivo || (tipo === 'entrada' ? 'Entrada manual' : 'Salida manual'),
                usuario_id: req.session.tiendaUser.id
            });
            req.flash('ok_msg', 'Movimiento registrado.');
        } catch (err) {
            req.flash('error_msg', err.message);
        }
        res.redirect('/inventario');
    }
};
