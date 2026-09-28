// controllers/cuentaController.js
// V12 (C3): vista y API de cuentas abiertas (trasladar/unir/dividir).
const CuentaService = require('../services/cuentaService');

function actorDe(req) {
    const u = req.user || {};
    return { id: u.id, nombre: u.nombre, apellidos: u.apellidos, rol: u.rol, ip: req.ip };
}
exports.actorDe = actorDe;

exports.renderCuentas = async (req, res) => {
    try {
        const [cuentas, mesasLibres] = await Promise.all([
            CuentaService.listarAbiertas(),
            CuentaService.mesasLibres()
        ]);
        return res.render('caja/cuentas', {
            view: 'cuentas',
            cuentas,
            mesasLibres,
            user: req.user || null
        });
    } catch (error) {
        console.error('Error al cargar las cuentas abiertas:', error);
        return res.status(500).send('Error interno al cargar las cuentas');
    }
};

exports.detalle = async (req, res) => {
    try {
        const cuenta = await CuentaService.detalleCuenta(req.params.id);
        if (!cuenta) return res.status(404).json({ success: false, message: 'La cuenta no existe.' });
        return res.json({ success: true, cuenta });
    } catch (error) {
        console.error('Error al cargar la cuenta:', error.message);
        return res.status(500).json({ success: false, message: 'Error interno al cargar la cuenta.' });
    }
};

exports.trasladar = async (req, res) => {
    try {
        const r = await CuentaService.trasladar(req.params.id, req.body.mesaDestinoId, actorDe(req));
        return res.json({ success: true, ...r });
    } catch (error) {
        console.error('Error al trasladar la cuenta:', error.message);
        return res.status(400).json({ success: false, message: error.message });
    }
};

exports.unir = async (req, res) => {
    try {
        const r = await CuentaService.unir(req.params.id, req.body.destinoId, actorDe(req));
        return res.json({ success: true, ...r });
    } catch (error) {
        console.error('Error al unir las cuentas:', error.message);
        return res.status(400).json({ success: false, message: error.message });
    }
};

exports.dividir = async (req, res) => {
    try {
        const r = await CuentaService.dividir(
            req.params.id, req.body.detalleIds, req.body.destinoId, actorDe(req));
        return res.json({ success: true, ...r });
    } catch (error) {
        console.error('Error al dividir la cuenta:', error.message);
        return res.status(400).json({ success: false, message: error.message });
    }
};
