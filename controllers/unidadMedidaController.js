// controllers/unidadMedidaController.js
// Gestión de Unidades de Medida y Factores de Conversión (Configuración del sistema)
const UnidadMedidaService = require('../services/unidadMedidaService');

// GET /admin/unidades-medida
exports.viewUnidades = async (req, res) => {
    try {
        const [[unidades, conversiones], productos] = await Promise.all([
            Promise.all([UnidadMedidaService.listarUnidades(true), UnidadMedidaService.listarConversiones()]),
            UnidadMedidaService.listarProductosConEntrada()
        ]);
        res.render('admin/unidades', {
            pageTitle: 'Unidades de Medida',
            unidades,
            conversiones,
            productos,
            user: req.user,
            view: 'unidades'
        });
    } catch (error) {
        console.error('Error en viewUnidades:', error);
        req.flash('error_msg', 'No se pudo cargar la configuración de unidades.');
        res.redirect('/admin/configuracion');
    }
};

// GET /admin/api/unidades-medida
exports.apiListarUnidades = async (req, res) => {
    try {
        const soloActivas = req.query.activas === '1';
        res.json({ success: true, unidades: await UnidadMedidaService.listarUnidades(!soloActivas) });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// POST /admin/api/unidades-medida
exports.apiCrearUnidad = async (req, res) => {
    try {
        const id = await UnidadMedidaService.crearUnidad(req.body);
        res.status(201).json({ success: true, message: `Unidad "${req.body.abreviatura}" creada correctamente.`, id });
    } catch (e) {
        const dup = e.code === 'ER_DUP_ENTRY';
        res.status(dup ? 409 : 400).json({ success: false, message: dup ? 'Ya existe una unidad con ese código.' : e.message });
    }
};

// PUT /admin/api/unidades-medida/:id
exports.apiActualizarUnidad = async (req, res) => {
    try {
        await UnidadMedidaService.actualizarUnidad(req.params.id, req.body);
        res.json({ success: true, message: 'Unidad actualizada.' });
    } catch (e) {
        res.status(400).json({ success: false, message: e.message });
    }
};

// DELETE /admin/api/unidades-medida/:id
exports.apiEliminarUnidad = async (req, res) => {
    try {
        const r = await UnidadMedidaService.eliminarUnidad(req.params.id);
        res.json({ success: true, message: r.message, soft: r.soft });
    } catch (e) {
        res.status(400).json({ success: false, message: e.message });
    }
};

// GET /admin/api/conversiones-unidades
exports.apiListarConversiones = async (req, res) => {
    try {
        res.json({ success: true, conversiones: await UnidadMedidaService.listarConversiones() });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// POST /admin/api/conversiones-unidades
exports.apiCrearConversion = async (req, res) => {
    try {
        const id = await UnidadMedidaService.crearConversion(req.body);
        res.status(201).json({ success: true, message: 'Factor de conversión registrado.', id });
    } catch (e) {
        res.status(400).json({ success: false, message: e.message });
    }
};

// PUT /admin/api/conversiones-unidades/:id
exports.apiActualizarConversion = async (req, res) => {
    try {
        await UnidadMedidaService.actualizarConversion(req.params.id, req.body);
        res.json({ success: true, message: 'Factor de conversión actualizado.' });
    } catch (e) {
        res.status(400).json({ success: false, message: e.message });
    }
};

// DELETE /admin/api/conversiones-unidades/:id
exports.apiEliminarConversion = async (req, res) => {
    try {
        await UnidadMedidaService.eliminarConversion(req.params.id);
        res.json({ success: true, message: 'Factor de conversión eliminado.' });
    } catch (e) {
        res.status(400).json({ success: false, message: e.message });
    }
};

// GET /admin/api/unidades-medida/convertir?cantidad=2&desde=kg&hasta=g&producto_id=12
exports.apiConvertir = async (req, res) => {
    try {
        const { cantidad, desde, hasta, producto_id } = req.query;
        const r = await UnidadMedidaService.convertir(cantidad, desde, hasta, producto_id || null);
        if (!r.ok) return res.status(422).json({ success: false, message: r.error });
        res.json({ success: true, cantidad: parseFloat(cantidad), desde, hasta, factor: r.factor, valor: Number(r.valor.toFixed(6)) });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
