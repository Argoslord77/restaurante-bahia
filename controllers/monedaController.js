// controllers/monedaController.js
const MonedaService = require('../services/monedaService');

/**
 * RENDERIZA LA VISTA PRINCIPAL DE GESTIÓN DE MONEDAS
 * GET /admin/monedas
 */
exports.renderMonedas = async (req, res) => {
    try {
        const monedas = await MonedaService.obtenerTodas(false);

        return res.render('monedas/index', {
            title: 'Configuración de Monedas y Tasas',
            user: req.user,
            monedas,
            view: 'monedas'
        });
    } catch (error) {
        console.error('Error en renderMonedas (Controller):', error);
        req.flash('error_msg', 'Error al cargar la gestión de monedas.');
        return res.redirect('/admin/dashboard');
    }
};

/**
 * OBTENER TODAS LAS MONEDAS (API JSON)
 * GET /api/monedas
 */
exports.obtenerMonedasAPI = async (req, res) => {
    try {
        const soloActivas = req.query.activas === 'true';
        const monedas = await MonedaService.obtenerTodas(soloActivas);
        
        return res.status(200).json({
            success: true,
            monedas
        });
    } catch (error) {
        console.error('Error en obtenerMonedasAPI:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al consultar el catálogo de monedas.'
        });
    }
};

/**
 * CREAR UNA NUEVA MONEDA
 * POST /api/monedas
 */
exports.crearMoneda = async (req, res) => {
    const { codigo, nombre, simbolo, factor_cambio, es_moneda_base } = req.body;

    // Validación sintáctica en controlador
    if (!codigo || !nombre || factor_cambio === undefined || isNaN(factor_cambio) || parseFloat(factor_cambio) <= 0) {
        return res.status(400).json({
            success: false,
            message: 'El código, nombre y un factor de cambio mayor a cero son obligatorios.'
        });
    }

    try {
        const idMoneda = await MonedaService.crearMoneda({
            codigo,
            nombre,
            simbolo,
            factor_cambio,
            es_moneda_base: !!es_moneda_base
        });

        return res.status(201).json({
            success: true,
            message: 'Moneda registrada exitosamente.',
            idMoneda
        });
    } catch (error) {
        console.error('Error en crearMoneda (Controller):', error);
        return res.status(400).json({
            success: false,
            message: error.message || 'Error interno al registrar la moneda.'
        });
    }
};

/**
 * ACTUALIZAR UNA MONEDA
 * PUT /api/monedas/:id
 */
exports.actualizarMoneda = async (req, res) => {
    const { id } = req.params;
    const { codigo, nombre, simbolo, factor_cambio, es_moneda_base } = req.body;

    if (!codigo || !nombre || factor_cambio === undefined || isNaN(factor_cambio) || parseFloat(factor_cambio) <= 0) {
        return res.status(400).json({
            success: false,
            message: 'El código, nombre y un factor de cambio válido son obligatorios.'
        });
    }

    try {
        await MonedaService.actualizarMoneda(id, {
            codigo,
            nombre,
            simbolo,
            factor_cambio,
            es_moneda_base: !!es_moneda_base
        });

        return res.status(200).json({
            success: true,
            message: 'Moneda actualizada correctamente.'
        });
    } catch (error) {
        console.error('Error en actualizarMoneda (Controller):', error);
        return res.status(400).json({
            success: false,
            message: error.message || 'Error al actualizar la moneda.'
        });
    }
};

/**
 * ESTABLECER UNA MONEDA COMO BASE
 * PATCH /api/monedas/:id/establecer-base
 */
exports.establecerMonedaBase = async (req, res) => {
    const { id } = req.params;

    try {
        await MonedaService.establecerComoMonedaBase(id);

        return res.status(200).json({
            success: true,
            message: 'Moneda establecida como base local del sistema (Factor fijado en 1.0000).'
        });
    } catch (error) {
        console.error('Error en establecerMonedaBase (Controller):', error);
        return res.status(400).json({
            success: false,
            message: error.message || 'Error al cambiar la moneda base.'
        });
    }
};

/**
 * BAJA LÓGICA / CAMBIO DE ESTADO (ACTIVO/INACTIVO)
 * PATCH /api/monedas/:id/estado
 */
exports.cambiarEstado = async (req, res) => {
    const { id } = req.params;
    const { activo } = req.body;

    if (activo === undefined) {
        return res.status(400).json({
            success: false,
            message: 'Debe especificar el parámetro "activo" (boolean).'
        });
    }

    try {
        await MonedaService.cambiarEstado(id, activo);

        const estadoTexto = activo ? 'activada' : 'desactivada';
        return res.status(200).json({
            success: true,
            message: `Moneda ${estadoTexto} correctamente.`
        });
    } catch (error) {
        console.error('Error en cambiarEstado (Controller):', error);
        return res.status(400).json({
            success: false,
            message: error.message || 'Error al modificar el estado de la moneda.'
        });
    }
};