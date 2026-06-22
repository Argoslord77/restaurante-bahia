const dashboardService = require('../services/dashboardService');

class DashboardController {

    /**
     * Dashboard principal del sistema
     */
    async index(req, res) {

        try {

            const metrics = await dashboardService.getMetrics();

            res.render(
                'admin/dashboard',
                {
                    metrics,
                    user: req.user,
                    view: 'admin_dashboard'
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