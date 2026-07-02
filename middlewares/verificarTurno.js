// middlewares/verificarTurno.js
const turnoModel  = require('../models/turnoModel');

async function asegurarTurnoActivo(req, res, next) {
    try {
        const turnoActivo = await turnoModel.findActive();
        if (!turnoActivo) {
            return res.status(400).json({
                success: false,
                message: "Operación denegada. No existe ningún turno de servicio activo en el sistema."
            });
        }
        // Inyectamos el ID del turno en la petición para usarlo en los controladores
        req.turnoServicioId = turnoActivo.id;
        next();
    } catch (error) {
        return res.status(500).json({ success: false, message: "Error al validar el turno." });
    }
}

module.exports = { asegurarTurnoActivo };