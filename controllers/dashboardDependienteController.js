// controllers/dashboardDependienteController.js
const db = require('../config/db');
const turnoService = require('../services/turnoService');

const DashboardDependienteController = {

    viewDependienteDashboard: async (req, res) => {
        try {
            const turnoActivo = await turnoService.obtenerTurnoActivo();

            if (!turnoActivo && req.user?.rol === 'dependiente') {
                req.flash('error_msg', 'No hay un turno de servicio abierto. Contacta al administrador.');
                return res.redirect('/logout');
            }

            // Obtener mesas
            const [mesas] = await db.query(`
                SELECT 
                    m.id,
                    m.numero,
                    CONCAT('Mesa ', m.numero) AS nombre,
                    m.capacidad,
                    m.estado AS estado_mesa,
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
                    AND p.fecha_cierre IS NULL
                LEFT JOIN usuarios u ON p.id_usuario_mesero = u.id
                ORDER BY m.numero ASC
            `);

            const stats = await DashboardDependienteController.getDashboardStats();

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

    getDashboardStats: async () => {
        try {
            const [rows] = await db.query(`
                SELECT 
                    COUNT(DISTINCT m.id) AS total_mesas,
                    COUNT(DISTINCT CASE WHEN p.id IS NOT NULL THEN m.id END) AS mesas_ocupadas,
                    SUM(CASE WHEN p.estado_pedido = 'pendiente' THEN 1 ELSE 0 END) AS pedidos_pendientes,
                    SUM(CASE WHEN p.estado_pedido = 'preparando' THEN 1 ELSE 0 END) AS en_preparacion,
                    COALESCE(ROUND(SUM(p.total), 2), 0) AS ventas_del_turno
                FROM mesas m
                LEFT JOIN pedidos p ON m.id = p.id_mesa AND p.fecha_cierre IS NULL
            `);

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