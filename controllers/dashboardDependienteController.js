// controllers/dashboardDependienteController.js
const db = require('../config/db');
const turnoService = require('../services/turnoService');

const DashboardDependienteController = {

    viewDependienteDashboard: async (req, res) => {
        try {
            const turnoActivo = await turnoService.obtenerTurnoActivo();

            //Si es depediente o capitan de salon
            if (!turnoActivo && (req.user?.rol === 'dependiente' || req.user?.rol === 'capitan')) {
                req.flash('error_msg', 'No hay un turno de servicio abierto. Contacta al administrador.');
                return res.redirect('/logout');
            }

            const usuarioId = req.user?.id || 1;
            const usuarioRol = req.user?.rol || 'dependiente';
            const turnoId = turnoActivo ? turnoActivo.id : null;

            // Obtener mesas asignadas al dependiente (o todas si es admin)
            let queryMesas = '';
            let paramsMesas = [];

            if (usuarioRol === 'dependiente') {
                queryMesas = `
                    SELECT 
                        m.id,
                        m.numero,
                        CONCAT('Mesa ', m.numero) AS nombre,
                        m.capacidad,
                        m.estado AS estado_mesa,
                        m.ubicacion,
                        p.id AS id_pedido_activo,
                        p.estado_pedido,
                        p.estado_pago,
                        COALESCE(p.total, 0) AS total,
                        p.creado_en AS hora_apertura,
                        u.usuario AS mesero_asignado,
                        TIMESTAMPDIFF(MINUTE, p.creado_en, NOW()) AS minutos_abiertos
                    FROM mesas m
                    INNER JOIN detalle_asignacion_mesa dam ON m.id = dam.mesa_id 
                        AND dam.dependiente_id = ?
                    LEFT JOIN pedidos p 
                        ON m.id = p.id_mesa 
                        AND p.turno_servicio_id = ?
                        AND p.estado_pago != 'pagado'
                        AND p.estado_pedido NOT IN ('cancelado', 'pagado')
                    LEFT JOIN usuarios u ON p.id_usuario_mesero = u.id
                    ORDER BY CAST(m.numero AS UNSIGNED) ASC
                `;
                paramsMesas = [usuarioId, turnoId];
            } else {
                // Admin o Supervisor
                queryMesas = `
                    SELECT 
                        m.id,
                        m.numero,
                        CONCAT('Mesa ', m.numero) AS nombre,
                        m.capacidad,
                        m.estado AS estado_mesa,
                        m.ubicacion,
                        p.id AS id_pedido_activo,
                        p.estado_pedido,
                        p.estado_pago,
                        COALESCE(p.total, 0) AS total,
                        p.creado_en AS hora_apertura,
                        u.usuario AS mesero_asignado,
                        TIMESTAMPDIFF(MINUTE, p.creado_en, NOW()) AS minutos_abiertos
                    FROM mesas m
                    LEFT JOIN pedidos p 
                        ON m.id = p.id_mesa 
                        AND p.turno_servicio_id = ?
                        AND p.estado_pago != 'pagado'
                        AND p.estado_pedido NOT IN ('cancelado', 'pagado')
                    LEFT JOIN usuarios u ON p.id_usuario_mesero = u.id
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
                view: 'dashboard',
                success_msg: req.flash('success_msg'),
                error_msg: req.flash('error_msg')
            });

        } catch (error) {
            console.error('Error al cargar dashboard de dependiente:', error);
            req.flash('error_msg', 'Error al cargar el dashboard. Inténtalo de nuevo.');
            return res.redirect('/dependiente/dashboard');
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
                              AND p2.estado_pago = 'pagado'
                        ) AS ventas_del_turno
                    FROM detalle_asignacion_mesa dam
                    INNER JOIN mesas m ON dam.mesa_id = m.id
                    LEFT JOIN pedidos p ON m.id = p.id_mesa 
                        AND p.turno_servicio_id = ? 
                        AND p.estado_pago = 'pendiente'
                    WHERE dam.dependiente_id = ?
                `;
                paramsStats = [turnoId, usuarioId, turnoId, usuarioId];
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
                              AND p2.estado_pago = 'pagado'
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