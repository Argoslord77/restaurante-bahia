// dashboardDependienteController.js
const db = require('../config/db');

class DashboardDependienteController {
    /**
     * Renderiza el panel principal del dependiente con el estado de las mesas
     */
    async viewDependienteDashboard(req, res) {
        try {
            // Consultar todas las mesas limpias de hashes junto con el ID del pedido activo si tienen uno
            // Se selecciona tanto 'numero' como un alias de 'nombre' para garantizar compatibilidad con la plantilla
            const [mesas] = await db.query(`
                SELECT 
                    m.id, 
                    m.numero, 
                    CONCAT('Mesa ', m.numero) AS nombre,
                    m.capacidad, 
                    m.estado,
                    p.id AS id_pedido_activo
                FROM mesas m
                LEFT JOIN pedidos p ON m.id = p.id_mesa AND p.estado_pedido IN ('pendiente', 'preparando', 'listo')
                ORDER BY m.numero ASC
            `);

            res.render('dependiente/dashboard', {
                mesas,
                user: req.user || { nombre: 'Dependiente de Turno', id: 1, rol: 'dependiente' },
                pageTitle: 'Panel de Servicio - Restaurante Bahía',
                view: 'dashboard',
                success_msg: req.flash('success_msg'),
                error_msg: req.flash('error_msg')
            });
        } catch (error) {
            console.error('Error al cargar el dashboard de dependiente:', error);
            res.status(500).send('Error interno del servidor al cargar el panel de servicio.');
        }
    }
}

module.exports = new DashboardDependienteController();