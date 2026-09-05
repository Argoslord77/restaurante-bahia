// controllers/turnoController.js
const db = require('../config/db');
const TurnoService = require('../services/turnoService');
const InventarioService = require('../services/inventarioService');

/**
 * RENDERIZA LA VISTA PRINCIPAL DE TURNOS
 * GET /admin/turnos-servicio
 */
exports.renderTurnos = async (req, res) => {
    try {
        const { turnoActivo, historial, monedas } = await TurnoService.obtenerDatosParaVista();

        // Resumen del movimiento de inventario del turno activo (consumo por
        // ventas, mermas, etc.) para tenerlo a la vista antes del arqueo.
        // Un fallo del cálculo no debe bloquear la vista de caja.
        let movimientosInventario = null;
        if (turnoActivo) {
            try {
                movimientosInventario = await InventarioService.movimientosPorTurno(turnoActivo);
            } catch (eInv) {
                console.error('Error al calcular el movimiento de inventario del turno:', eInv);
            }
        }

        // Personal productivo obligatorio del turno: ambos quedan disponibles
        // para resolver «Elaboró» según sea platillo o bebida.
        // Si no hay ninguno definido, se avisa al usuario del backend.
        let cocineros = [];
        let bartenders = [];
        try {
            [cocineros] = await db.query(
                "SELECT id, CONCAT(nombre, ' ', COALESCE(apellidos,'')) AS nombre, usuario FROM usuarios WHERE rol = 'cocinero' AND activo = 1 ORDER BY nombre ASC"
            );
        } catch (eCoc) {
            console.error('No se pudo consultar los cocineros activos:', eCoc.message);
        }
        try {
            [bartenders] = await db.query(
                "SELECT id, CONCAT(nombre, ' ', COALESCE(apellidos,'')) AS nombre, usuario FROM usuarios WHERE rol = 'bartender' AND activo = 1 ORDER BY nombre ASC"
            );
        } catch (eBar) {
            console.error('No se pudo consultar los bartenders activos:', eBar.message);
        }

        return res.render('caja/turnos', {
            title: 'Control de Turnos y Arqueo de Caja',
            user: req.user,
            turnoActivo,
            historial,
            monedas,
            cocineros,
            bartenders,
            movimientosInventario,
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
    const { monto_apertura, observaciones, monedas_turno, cocinero_id, bartender_id } = req.body;
    const usuario_apertura_id = req.user.id; 

    // Validación básica sintáctica en controlador
    if (monto_apertura === undefined || isNaN(monto_apertura) || monto_apertura < 0) {
        return res.status(400).json({
            success: false,
            message: "El monto de apertura es requerido y debe ser un número mayor o igual a cero."
        });
    }

    try {
        // Cocinero y bartender son obligatorios para iniciar un turno.
        if (!cocinero_id || !bartender_id) {
            return res.status(400).json({ success: false, message: 'Debe seleccionar un cocinero y un bartender para iniciar el turno.' });
        }
        let cocineroId = null;
        let bartenderId = null;
        if (cocinero_id) {
            const [cocs] = await db.query(
                "SELECT id FROM usuarios WHERE id = ? AND rol = 'cocinero' AND activo = 1 LIMIT 1",
                [cocinero_id]
            );
            if (cocs.length === 0) {
                return res.status(400).json({ success: false, message: "El cocinero seleccionado no está activo o no existe." });
            }
            cocineroId = cocs[0].id;
        }
        const [bars] = await db.query(
            "SELECT id FROM usuarios WHERE id = ? AND rol = 'bartender' AND activo = 1 LIMIT 1",
            [bartender_id]
        );
        if (bars.length === 0) return res.status(400).json({ success: false, message: 'El bartender seleccionado no está activo o no existe.' });
        bartenderId = bars[0].id;

        const turnoId = await TurnoService.abrirNuevoTurno(usuario_apertura_id, monto_apertura, observaciones, monedas_turno, cocineroId, bartenderId);
        
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