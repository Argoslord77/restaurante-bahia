const Inventario = require('../models/inventarioModel');
const Almacen = require('../models/almacenModel');

exports.renderStockPanel = async (req, res) => {
    try {
        // 1. Obtener todos los almacenes activos para el selector/pestañas
        const almacenes = await Almacen.getAll();
        
        // Si no hay almacenes creados, enviamos arreglos vacíos
        if (almacenes.length === 0) {
            return res.render('inventarios/stock', {
                title: 'Stock e Inventario - Restaurante Bahía',
                almacenes,
                almacenSeleccionado: null,
                stock: [],
                alertasVencimiento: [],
                user: req.user || null,
                view: 'stock'
            });
        }

        // 2. Determinar qué almacén estamos visualizando (por Query string o el primero por defecto)
        const almacenId = req.query.almacenId || almacenes[0].id;
        const almacenSeleccionado = almacenes.find(a => a.id == almacenId) || almacenes[0];

        // 3. Traer stock consolidado y alertas de vencimiento (margen de 30 días)
        const stock = await Inventario.getStockByAlmacen(almacenSeleccionado.id);
        const alertasVencimiento = await Inventario.getAlertasVencimiento(almacenSeleccionado.id, 30);

        res.render('inventarios/stock', {
            title: `Stock: ${almacenSeleccionado.nombre} - Restaurante Bahía`,
            almacenes,
            almacenSeleccionado,
            stock,
            alertasVencimiento,
            user: req.user || null,
            view: 'stock'
        });
    } catch (error) {
        console.error("Error al renderizar el panel de stock:", error);
        res.status(500).send("Error interno del servidor al procesar el inventario.");
    }
};