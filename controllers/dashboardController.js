const dashboardService = require('../services/dashboardService');
const turnoService = require('../services/turnoService');

class DashboardController {

    /**
     * Dashboard principal del sistema
     */
    async index(req, res) {

        try {

            const turnoActivo = await turnoService.obtenerTurnoActivo();        
            // Si es admin/superadmin y no hay turno activo, mandamos una bandera a la vista de Front-end
            const mostrarAlertaTurno = (!turnoActivo && ['superadministrador', 'administrador'].includes(req.user.rol));

            const metrics = await dashboardService.getMetrics();

            res.render(
                'admin/dashboard',
                {
                    metrics,
                    user: req.user,
                    view: 'admin_dashboard',
                    mostrarAlertaTurno: mostrarAlertaTurno,
                    turno: turnoActivo
                }
            );

        } catch (error) {

            console.error(
                'Error al cargar dashboard:',
                error
            );

            req.flash(
                'error_msg',
                'No fue posible cargar las métricas del sistema.'
            );

            res.redirect('/login');
        }
    }

}

module.exports = new DashboardController();