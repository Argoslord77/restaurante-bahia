// controllers/dashboardDependienteController.js
const db = require('../config/db');
const turnoService = require('../services/turnoService');

function obtenerBasePublica(req) {
    const protocolo = process.env.PUBLIC_PROTOCOL || (process.env.SERVER_HTTP === '1' ? 'http' : 'https');
    const puerto = process.env.PUBLIC_PORT || process.env.PORT || '3000';
    const configurado = String(process.env.SERVER_IP || '').trim();

    if (/^https?:\/\//i.test(configurado)) {
        return configurado.replace(/\/$/, '');
    }

    const hostHeader = typeof req.get === 'function' ? req.get('host') : null;
    const host = configurado || hostHeader || req.hostname || 'localhost';
    const hostTienePuerto = /^\[[^\]]+\]:\d+$/.test(host) || /:\d+$/.test(host);
    return `${protocolo}://${host}${hostTienePuerto ? '' : `:${puerto}`}`;
}

const DashboardDependienteController = {

    viewDependienteDashboard: async (req, res) => {
        try {
            const turnoActivo = await turnoService.obtenerTurnoActivo();

            // Si es dependiente o capitán de salón y no hay turno abierto
            if (!turnoActivo && (req.user?.rol === 'dependiente' || req.user?.rol === 'capitan')) {
                req.flash('error_msg', 'No hay un turno de servicio abierto. Contacta al administrador.');
                return res.redirect('/logout');
            }

            return await DashboardDependienteController.renderDashboardSalon(req, res, {
                usuarioId: req.user?.id || 1,
                usuarioRol: req.user?.rol || 'dependiente'
            });
        } catch (error) {
            console.error('Error al cargar dashboard de dependiente:', error);
            req.flash('error_msg', 'Error al cargar el dashboard. Inténtalo de nuevo.');
            return res.redirect('/dependiente/dashboard');
        }
    },

    // Núcleo compartido: construye y renderiza el salón de mesas del usuario
    // indicado. Lo usa el dashboard del dependiente y la herramienta de
    // supervisión "POS mesero" (administrador visualizando a un mesero).
    renderDashboardSalon: async (req, res, opciones = {}) => {
        const {
            usuarioId,
            usuarioRol,
            modoVisualizacion = false,
            meseroVisualizado = null
        } = opciones;

        const turnoActivo = await turnoService.obtenerTurnoActivo();
        const turnoId = turnoActivo ? turnoActivo.id : null;

        try {
            let queryMesas = '';
            let paramsMesas = [];

            if (usuarioRol === 'dependiente') {
                // La asignación persiste durante TODO el turno activo (aunque cruce la medianoche),
                // no durante el día natural. Se toma la fila vigente (máxima) por ubicación del turno.
                queryMesas = `
                    SELECT
                        m.id,
                        m.numero,
                        m.numero AS nombre,
                        m.capacidad,
                        m.estado,
                        COALESCE(um.nombre, m.ubicacion) AS ubicacion,
                        m.carta,
                        p.id AS id_pedido_activo,
                        p.estado_pedido,
                        p.estado_pago,
                        COALESCE(p.total, 0) AS total,
                        p.creado_en AS hora_apertura,
                        u.usuario AS mesero_asignado,
                        TIMESTAMPDIFF(MINUTE, p.creado_en, NOW()) AS minutos_abiertos
                    FROM mesas m
                    LEFT JOIN ubicacion_mesa um ON m.ubicacion_id = um.id
                    INNER JOIN detalle_asignacion_mesa dam ON m.id = dam.mesa_id
                    INNER JOIN asignaciones_diarias ad ON dam.asignacion_diaria_id = ad.id
                    LEFT JOIN pedidos p 
                        ON m.id = p.id_mesa 
                        AND p.turno_servicio_id = ?
                        AND p.estado_pago = 'pendiente'
                        AND p.estado_pedido != 'cancelado'
                    LEFT JOIN usuarios u ON p.id_usuario_mesero = u.id
                    WHERE dam.dependiente_id = ?
                      AND ad.turno_id = ?
                      AND ad.id IN (
                          SELECT MAX(a2.id) FROM asignaciones_diarias a2
                          WHERE a2.turno_id = ?
                          GROUP BY a2.ubicacion
                      )
                    GROUP BY m.id
                    ORDER BY CAST(m.numero AS UNSIGNED) ASC
                `;
                paramsMesas = [turnoId, usuarioId, turnoId, turnoId];
            } else {
                // Admin, Capitán o Supervisor (Muestra todas las mesas del salón sin duplicados)
                queryMesas = `
                    SELECT
                        m.id,
                        m.numero,
                        m.numero AS nombre,
                        m.capacidad,
                        m.estado,
                        COALESCE(um.nombre, m.ubicacion) AS ubicacion,
                        m.carta,
                        p.id AS id_pedido_activo,
                        p.estado_pedido,
                        p.estado_pago,
                        COALESCE(p.total, 0) AS total,
                        p.creado_en AS hora_apertura,
                        u.usuario AS mesero_asignado,
                        TIMESTAMPDIFF(MINUTE, p.creado_en, NOW()) AS minutos_abiertos
                    FROM mesas m
                    LEFT JOIN ubicacion_mesa um ON m.ubicacion_id = um.id
                    LEFT JOIN pedidos p
                        ON m.id = p.id_mesa 
                        AND p.turno_servicio_id = ?
                        AND p.estado_pago = 'pendiente'
                        AND p.estado_pedido != 'cancelado'
                    LEFT JOIN usuarios u ON p.id_usuario_mesero = u.id
                    GROUP BY m.id
                    ORDER BY CAST(m.numero AS UNSIGNED) ASC
                `;
                paramsMesas = [turnoId];
            }

            const [mesas] = await db.query(queryMesas, paramsMesas);
            
            // Pasar el turnoId y el usuarioId a los stats para cálculos reales
            const stats = await DashboardDependienteController.getDashboardStats(turnoId, usuarioId, usuarioRol);

            res.render('dependiente/dashboard', {
                mesas,
                stats,
                turnoActivo,
                user: req.user || { nombre: 'Dependiente', rol: 'dependiente' },
                pageTitle: 'Dashboard - Dependiente | Restaurante Bahía',
                clientDashboardBaseUrl: `${obtenerBasePublica(req)}/cliente/dashboard/`,
                view: 'dashboard',
                modoVisualizacion,
                meseroVisualizado,
                success_msg: req.flash('success_msg'),
                error_msg: req.flash('error_msg')
            });

        } catch (error) {
            console.error('Error al renderizar el salón de mesas:', error);
            throw error;
        }
    },

    // ================================================================
    // POS MESERO — Herramienta de visualización para administradores
    // ================================================================
    // Paso 1: selector del mesero a supervisar
    viewSelectorMesero: async (req, res) => {
        try {
            const turnoActivo = await turnoService.obtenerTurnoActivo();
            const turnoId = turnoActivo ? turnoActivo.id : null;

            // Personal de servicio activo con sus mesas/órdenes abiertas del
            // turno vigente (misma semántica de asignación que el dashboard).
            let meseros = [];
            const [rows] = await db.query(`
                SELECT
                    u.id,
                    CONCAT(u.nombre, ' ', u.apellidos) AS nombre_completo,
                    u.nombre,
                    u.apellidos,
                    u.rol,
                    COUNT(DISTINCT CASE WHEN ad.id IS NOT NULL THEN dam.mesa_id END) AS mesas_asignadas,
                    COUNT(DISTINCT CASE WHEN p.id IS NOT NULL THEN p.id END) AS ordenes_abiertas,
                    COALESCE(SUM(CASE WHEN p.id IS NOT NULL THEN COALESCE(p.total, 0) ELSE 0 END), 0) AS consumo_abierto
                FROM usuarios u
                LEFT JOIN detalle_asignacion_mesa dam ON dam.dependiente_id = u.id
                LEFT JOIN asignaciones_diarias ad ON dam.asignacion_diaria_id = ad.id
                    AND ad.turno_id = ?
                    AND ad.id IN (
                        SELECT MAX(a2.id) FROM asignaciones_diarias a2
                        WHERE a2.turno_id = ?
                        GROUP BY a2.ubicacion
                    )
                LEFT JOIN pedidos p ON ad.id IS NOT NULL
                    AND p.id_mesa = dam.mesa_id
                    AND p.turno_servicio_id = ?
                    AND p.estado_pago = 'pendiente'
                    AND p.estado_pedido != 'cancelado'
                WHERE u.activo = 1 AND u.rol IN ('dependiente', 'capitan')
                GROUP BY u.id
                ORDER BY u.nombre ASC
            `, [turnoId, turnoId, turnoId]);
            meseros = rows;

            res.render('admin/pos_mesero', {
                pageTitle: 'POS Mesero - Restaurante Bahía',
                view: 'pos_mesero',
                meseros,
                turnoActivo,
                user: req.user || null,
                success_msg: req.flash('success_msg'),
                error_msg: req.flash('error_msg')
            });
        } catch (error) {
            console.error('Error al cargar el selector de meseros:', error);
            res.status(500).send('Error interno al cargar el selector de meseros');
        }
    },

    // Paso 2: salón de mesas del mesero elegido (solo visualización)
    viewDashboardMesero: async (req, res) => {
        try {
            const meseroId = parseInt(req.query.mesero, 10);

            if (!meseroId || Number.isNaN(meseroId)) {
                req.flash('error_msg', 'Selecciona un mesero para visualizar su salón.');
                return res.redirect('/admin/pos-mesero');
            }

            const [usuarios] = await db.query(
                'SELECT id, nombre, apellidos, rol, activo FROM usuarios WHERE id = ? LIMIT 1',
                [meseroId]
            );
            const mesero = usuarios && usuarios[0] ? usuarios[0] : null;

            if (!mesero || !mesero.activo || !['dependiente', 'capitan'].includes(mesero.rol)) {
                req.flash('error_msg', 'El mesero seleccionado no existe o no está disponible.');
                return res.redirect('/admin/pos-mesero');
            }

            // Se fuerza rol 'dependiente' para ver exactamente el salón que
            // ve ese mesero (sus mesas asignadas y sus órdenes abiertas).
            return await DashboardDependienteController.renderDashboardSalon(req, res, {
                usuarioId: mesero.id,
                usuarioRol: 'dependiente',
                modoVisualizacion: true,
                meseroVisualizado: {
                    id: mesero.id,
                    nombre: `${mesero.nombre} ${mesero.apellidos || ''}`.trim(),
                    rol: mesero.rol
                }
            });
        } catch (error) {
            console.error('Error al visualizar el salón del mesero:', error);
            req.flash('error_msg', 'Error al visualizar el salón del mesero.');
            return res.redirect('/admin/pos-mesero');
        }
    },

    getDashboardStats: async (turnoId, usuarioId, usuarioRol) => {
        try {
            if (!turnoId) return { total_mesas: 0, mesas_ocupadas: 0, pedidos_pendientes: 0, en_preparacion: 0, ventas_del_turno: 0 };

            let queryStats = '';
            let paramsStats = [];

            if (usuarioRol === 'dependiente') {
                queryStats = `
                    SELECT 
                        COUNT(DISTINCT dam.mesa_id) AS total_mesas,
                        COUNT(DISTINCT CASE WHEN p.estado_pago = 'pendiente' THEN m.id END) AS mesas_ocupadas,
                        SUM(CASE WHEN p.estado_pedido = 'pendiente' AND p.estado_pago = 'pendiente' THEN 1 ELSE 0 END) AS pedidos_pendientes,
                        SUM(CASE WHEN p.estado_pedido = 'preparando' AND p.estado_pago = 'pendiente' THEN 1 ELSE 0 END) AS en_preparacion,
                        (
                            SELECT COALESCE(ROUND(SUM(p2.total), 2), 0) 
                            FROM pedidos p2 
                            WHERE p2.turno_servicio_id = ? 
                              AND p2.id_usuario_mesero = ? 
                              AND p2.estado_pago IN ('pagado', 'cortesia', 'facturado')
                        ) AS ventas_del_turno
                    FROM detalle_asignacion_mesa dam
                    INNER JOIN asignaciones_diarias ad ON dam.asignacion_diaria_id = ad.id
                    INNER JOIN mesas m ON dam.mesa_id = m.id
                    LEFT JOIN pedidos p ON m.id = p.id_mesa 
                        AND p.turno_servicio_id = ? 
                        AND p.estado_pago = 'pendiente'
                    WHERE dam.dependiente_id = ?
                      AND ad.turno_id = ?
                      AND ad.id IN (
                          SELECT MAX(a2.id) FROM asignaciones_diarias a2
                          WHERE a2.turno_id = ?
                          GROUP BY a2.ubicacion
                      )
                `;
                paramsStats = [turnoId, usuarioId, turnoId, usuarioId, turnoId, turnoId];
            } else {
                // Stats globales para administración
                queryStats = `
                    SELECT 
                        COUNT(DISTINCT m.id) AS total_mesas,
                        COUNT(DISTINCT CASE WHEN p.estado_pago = 'pendiente' THEN m.id END) AS mesas_ocupadas,
                        SUM(CASE WHEN p.estado_pedido = 'pendiente' AND p.estado_pago = 'pendiente' THEN 1 ELSE 0 END) AS pedidos_pendientes,
                        SUM(CASE WHEN p.estado_pedido = 'preparando' AND p.estado_pago = 'pendiente' THEN 1 ELSE 0 END) AS en_preparacion,
                        (
                            SELECT COALESCE(ROUND(SUM(p2.total), 2), 0) 
                            FROM pedidos p2 
                            WHERE p2.turno_servicio_id = ? 
                              AND p2.estado_pago IN ('pagado', 'cortesia', 'facturado')
                        ) AS ventas_del_turno
                    FROM mesas m
                    LEFT JOIN pedidos p ON m.id = p.id_mesa 
                        AND p.turno_servicio_id = ? 
                        AND p.estado_pago = 'pendiente'
                `;
                paramsStats = [turnoId, turnoId];
            }

            const [rows] = await db.query(queryStats, paramsStats);

            return rows[0] || {
                total_mesas: 0,
                mesas_ocupadas: 0,
                pedidos_pendientes: 0,
                en_preparacion: 0,
                ventas_del_turno: 0
            };
        } catch (error) {
            console.error('Error en getDashboardStats:', error);
            return {
                total_mesas: 0,
                mesas_ocupadas: 0,
                pedidos_pendientes: 0,
                en_preparacion: 0,
                ventas_del_turno: 0
            };
        }
    }
};

module.exports = DashboardDependienteController;
