'use strict';

const Licencia = require('../services/licencia/licenciaService');

/** Restringe módulos cuya disponibilidad depende del plan contratado. */
function requierePlan(plan) {
    return async (req, res, next) => {
        try {
            const evaluacion = req.licencia || await Licencia.evaluar();
            const planActual = String(evaluacion.licencia && evaluacion.licencia.plan || '').trim().toUpperCase();
            if (planActual === String(plan).toUpperCase()) return next();
            return res.status(403).render('admin/licencia-bloqueada', {
                pageTitle: 'Función no disponible',
                evaluacion,
                layout: false,
                mensaje: `Este reporte requiere una licencia del plan ${plan}.`
            });
        } catch (error) {
            return res.status(503).send('No se pudo verificar el plan de licencia.');
        }
    };
}

const requiereEmpresa = requierePlan('EMPRESA');
module.exports = { requierePlan, requiereEmpresa };
