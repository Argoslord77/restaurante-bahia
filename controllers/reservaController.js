// controllers/reservaController.js
// V12 (C2): vista y API de reservas de mesa.
const ReservaService = require('../services/reservaService');

function actorDe(req) {
    const u = req.user || {};
    return { id: u.id, nombre: u.nombre, apellidos: u.apellidos, rol: u.rol };
}
exports.actorDe = actorDe;

exports.renderReservas = async (req, res) => {
    try {
        const [proximas, historial, mesas] = await Promise.all([
            ReservaService.listar('proximas'),
            ReservaService.listar('historial'),
            ReservaService.mesasReservables()
        ]);
        return res.render('admin/reservas', {
            view: 'reservas',
            proximas,
            historial: historial.slice(0, 50),
            mesas,
            user: req.user || null
        });
    } catch (error) {
        console.error('Error al cargar las reservas:', error);
        return res.status(500).send('Error interno al cargar las reservas');
    }
};

exports.listarRango = async (req, res) => {
    try {
        const reservas = await ReservaService.listarRango(req.query.desde, req.query.hasta);
        return res.json({ success: true, reservas });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

exports.crear = async (req, res) => {
    try {
        const actor = actorDe(req);
        const reserva = await ReservaService.crear({
            mesaId: req.body.mesaId,
            nombre: req.body.nombre,
            telefono: req.body.telefono,
            comensales: req.body.comensales,
            fechaReserva: req.body.fechaReserva,
            notas: req.body.notas,
            usuarioId: actor.id
        });
        return res.status(201).json({ success: true, reserva });
    } catch (error) {
        console.error('Error al crear la reserva:', error.message);
        return res.status(400).json({ success: false, message: error.message });
    }
};

exports.llegada = async (req, res) => {
    try {
        const actor = actorDe(req);
        if (!actor.id) return res.status(401).json({ success: false, message: 'Sesión no válida.' });
        const r = await ReservaService.llegada(req.params.id, actor.id);
        return res.json({ success: true, ...r });
    } catch (error) {
        console.error('Error en la llegada de la reserva:', error.message);
        return res.status(400).json({ success: false, message: error.message });
    }
};

exports.cancelar = async (req, res) => {
    try {
        const r = await ReservaService.cerrar(req.params.id, 'cancelada');
        return res.json({ success: true, ...r });
    } catch (error) {
        console.error('Error al cancelar la reserva:', error.message);
        return res.status(400).json({ success: false, message: error.message });
    }
};

exports.noShow = async (req, res) => {
    try {
        const r = await ReservaService.cerrar(req.params.id, 'no_show');
        return res.json({ success: true, ...r });
    } catch (error) {
        console.error('Error al marcar no-show:', error.message);
        return res.status(400).json({ success: false, message: error.message });
    }
};
