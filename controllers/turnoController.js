// controllers/turnoController.js
const TurnoService = require('../services/turnoService');

/**
 * RENDERIZA LA VISTA PRINCIPAL DE TURNOS
 * GET /admin/turnos-servicio
 */
exports.renderTurnos = async (req, res) => {
    try {
        const { turnoActivo, historial, monedas } = await TurnoService.obtenerDatosParaVista();
        // C4/C7: retiros del turno y cuentas abiertas. Tolerante a que
        // falte la migración (avisa en log y muestra vacíos).
        let retiros = [];
        let abiertas = { cuentas: 0, total: 0 };
        if (turnoActivo) {
            try {
                retiros = await TurnoService.listarRetiros(turnoActivo.id);
            } catch (err) {
                console.warn('[turnos] retiros no disponibles:', err.message);
            }
            try {
                abiertas = await TurnoService.contarPedidosAbiertos(turnoActivo.id);
            } catch (err) {
                console.warn('[turnos] conteo de abiertas:', err.message);
            }
        }

        return res.render('caja/turnos', {
            title: 'Control de Turnos y Arqueo de Caja',
            user: req.user,
            turnoActivo,
            historial,
            monedas,
            retiros,
            abiertas,
            view: "turnos"
        });
    } catch (error) {
        console.error("Error en renderTurnos (Controller):", error);
        req.flash('error_msg', 'Error al cargar la interfaz de turnos de servicio.');
        return res.redirect('/admin/dashboard');
    }
};

/**
 * 1. APERTURA DE TURNO
 * POST /admin/turno/apertura
 */
exports.abrirTurno = async (req, res) => {
    const { monto_apertura, observaciones, monedas_turno } = req.body;
    const usuario_apertura_id = req.user.id; 

    // Validación básica sintáctica en controlador
    if (monto_apertura === undefined || isNaN(monto_apertura) || monto_apertura < 0) {
        return res.status(400).json({
            success: false,
            message: "El monto de apertura es requerido y debe ser un número mayor o igual a cero."
        });
    }

    try {
        const turnoId = await TurnoService.abrirNuevoTurno(usuario_apertura_id, monto_apertura, observaciones, monedas_turno);
        
        return res.status(201).json({
            success: true,
            message: "Turno de servicio abierto correctamente.",
            turnoId
        });
    } catch (error) {
        console.error("Error en abrirTurno (Controller):", error);
        return res.status(400).json({
            success: false,
            message: error.message || "Error interno al intentar abrir el turno."
        });
    }
};

/**
 * 2. CIERRE DE TURNO Y ARQUEO
 * POST /admin/turno/cierre
 */
exports.cerrarTurno = async (req, res) => {
    const { monto_cierre_real, observaciones_cierre } = req.body;
    const usuario_cierre_id = req.user.id;
    const userRol = req.user.rol; 

    // Validación de Roles en capa de controlador
    if (!['superadministrador', 'administrador'].includes(userRol)) {
        return res.status(403).json({
            success: false,
            message: "Acceso denegado. Solo un Administrador puede efectuar el cierre formal del turno."
        });
    }

    if (monto_cierre_real === undefined || isNaN(monto_cierre_real) || monto_cierre_real < 0) {
        return res.status(400).json({
            success: false,
            message: "El monto de cierre real es obligatorio y debe ser un número válido."
        });
    }

    try {
        const resumen = await TurnoService.cerrarTurnoActivo(usuario_cierre_id, monto_cierre_real, observaciones_cierre);
        
        return res.status(200).json({
            success: true,
            message: "Turno de servicio cerrado de forma exitosa.",
            resumen
        });
    } catch (error) {
        console.error("Error en cerrarTurno (Controller):", error);
        return res.status(400).json({
            success: false,
            message: error.message || "Error interno al procesar el cierre de caja."
        });
    }
};

/**
 * 3. OBTENER ESTADO ACTUAL (JSON para el Frontend)
 * GET /admin/turno/estado-actual
 */
exports.obtenerEstadoTurno = async (req, res) => {
    try {
        const turnoActivo = await TurnoService.obtenerTurnoActivo();
        return res.status(200).json({
            success: true,
            hayTurnoActivo: !!turnoActivo,
            turno: turnoActivo
        });
    } catch (error) {
        console.error("Error en obtenerEstadoTurno (Controller):", error);
        return res.status(500).json({ 
            success: false, 
            message: "Error al consultar el estado del turno desde el servicio." 
        });
    }
};

/**
 * OBTENER MONEDAS Y TASAS DEL TURNO ACTIVO (JSON para el POS)
 * GET /api/pos/monedas-turno-activo
 */
exports.obtenerMonedasTurnoActivo = async (req, res) => {
    try {
        const data = await TurnoService.obtenerMonedasTurnoActivo();
        return res.status(200).json({
            success: true,
            ...data
        });
    } catch (error) {
        console.error("Error en obtenerMonedasTurnoActivo (Controller):", error);
        return res.status(400).json({
            success: false,
            message: error.message || "Error al obtener las monedas del turno activo."
        });
    }
};

/**
 * C4: REGISTRAR RETIRO DE EFECTIVO A CAJA FUERTE
 * POST /admin/turno/retiros  { monto, motivo }
 */
exports.registrarRetiro = async (req, res) => {
    try {
        const turnoActivo = await TurnoService.obtenerTurnoActivo();
        if (!turnoActivo) {
            return res.status(400).json({ success: false, message: 'No hay un turno abierto para registrar retiros.' });
        }
        const usuarioId = req.user ? req.user.id : null;
        const retiro = await TurnoService.registrarRetiro({
            turnoId: turnoActivo.id,
            monto: req.body.monto,
            motivo: req.body.motivo,
            usuarioId
        });
        return res.status(201).json({ success: true, message: 'Retiro registrado.', retiro });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

/**
 * C4: LISTAR RETIROS DEL TURNO (?turno=id, por defecto el activo)
 * GET /admin/turno/retiros
 */
exports.listarRetiros = async (req, res) => {
    try {
        let turnoId = parseInt(req.query.turno, 10) || null;
        if (!turnoId) {
            const turnoActivo = await TurnoService.obtenerTurnoActivo();
            if (!turnoActivo) return res.json({ success: true, retiros: [], total: 0 });
            turnoId = turnoActivo.id;
        }
        const retiros = await TurnoService.listarRetiros(turnoId);
        const total = await TurnoService.totalRetirosVigentes(turnoId);
        return res.json({ success: true, turnoId, retiros, total });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * C4: ANULAR RETIRO (solo con el turno abierto; conserva el registro)
 * POST /admin/turno/retiros/:id/anular
 */
exports.anularRetiro = async (req, res) => {
    try {
        const retiroId = parseInt(req.params.id, 10);
        if (!retiroId) return res.status(400).json({ success: false, message: 'Retiro no válido.' });
        const usuarioId = req.user ? req.user.id : null;
        const retiro = await TurnoService.anularRetiro(retiroId, usuarioId);
        return res.json({ success: true, message: 'Retiro anulado.', retiro });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};
