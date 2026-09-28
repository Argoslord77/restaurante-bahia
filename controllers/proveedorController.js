// controllers/proveedorController.js
// V13 (C1): catálogo de proveedores y su historial de compras.
const ProveedorService = require('../services/proveedorService');
const CompraService = require('../services/compraService');

exports.renderProveedores = async (req, res) => {
    try {
        const proveedores = await ProveedorService.listar();
        return res.render('inventarios/proveedores', {
            title: 'Proveedores - Restaurante Bahía',
            view: 'proveedores',
            proveedores,
            user: req.session?.user || req.user || null
        });
    } catch (error) {
        console.error('Error al cargar los proveedores:', error);
        return res.status(500).send('Error interno al cargar los proveedores.');
    }
};

exports.renderDetalle = async (req, res) => {
    try {
        const proveedor = await ProveedorService.obtener(req.params.id);
        if (!proveedor) return res.status(404).send('Proveedor no encontrado.');
        const [resumen, historial] = await Promise.all([
            CompraService.resumenProveedor(req.params.id),
            CompraService.historial({ proveedorId: req.params.id, limite: 50 })
        ]);
        return res.render('inventarios/proveedor-detalle', {
            title: `Proveedor ${proveedor.nombre} - Restaurante Bahía`,
            view: 'proveedores',
            proveedor,
            resumen,
            historial: historial.compras,
            totalHistorial: historial.totales,
            user: req.session?.user || req.user || null
        });
    } catch (error) {
        console.error('Error al cargar el proveedor:', error);
        return res.status(500).send('Error interno al cargar el proveedor.');
    }
};

exports.crear = async (req, res) => {
    try {
        const proveedor = await ProveedorService.crear(req.body || {});
        return res.status(201).json({ success: true, proveedor });
    } catch (error) {
        console.error('Error al crear el proveedor:', error.message);
        return res.status(400).json({ success: false, message: error.message });
    }
};

exports.actualizar = async (req, res) => {
    try {
        const proveedor = await ProveedorService.actualizar(req.params.id, req.body || {});
        return res.json({ success: true, proveedor });
    } catch (error) {
        console.error('Error al actualizar el proveedor:', error.message);
        const codigo = /no existe/.test(error.message) ? 404 : 400;
        return res.status(codigo).json({ success: false, message: error.message });
    }
};

exports.cambiarEstado = async (req, res) => {
    try {
        const activo = req.body.activo === true || req.body.activo === '1' || req.body.activo === 1;
        const r = await ProveedorService.cambiarActivo(req.params.id, activo);
        return res.json({ success: true, ...r });
    } catch (error) {
        console.error('Error al cambiar el estado del proveedor:', error.message);
        const codigo = /no existe/.test(error.message) ? 404 : 400;
        return res.status(codigo).json({ success: false, message: error.message });
    }
};
