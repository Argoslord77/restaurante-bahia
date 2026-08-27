// controllers/dashboardController.js
const dashboardService = require('../services/dashboardService');
const turnoService = require('../services/turnoService');
const ip = require("ip");
class DashboardController {

    /**
     * Dashboard principal del sistema (Renderizado HTML)
     */
    async index(req, res) {
        try {
            const turnoActivo = await turnoService.obtenerTurnoActivo();        
            const mostrarAlertaTurno = (!turnoActivo && ['superadministrador', 'administrador'].includes(req.user.rol));
            const metrics = await dashboardService.getMetrics(turnoActivo ? turnoActivo.id : null);
            const server_ip = ip.address();

            res.render(
                'admin/dashboard',
                {
                    metrics,
                    user: req.user,
                    view: 'admin_dashboard',
                    mostrarAlertaTurno: mostrarAlertaTurno,
                    turno: turnoActivo,
                    server_ip: server_ip
                }
            );
        } catch (error) {
            console.error('Error al cargar dashboard:', error);
            req.flash('error_msg', 'No fue posible cargar las métricas del sistema.');
            res.redirect('/login');
        }
    }

    /**
     * Endpoint API para Polling del Dashboard (JSON cada 10 segundos)
     * GET /admin/api/dashboard/metrics
     */
    async apiMetrics(req, res) {
        try {
            const turnoActivo = await turnoService.obtenerTurnoActivo();
            const mostrarAlertaTurno = (!turnoActivo && ['superadministrador', 'administrador'].includes(req.user.rol));
            const metrics = await dashboardService.getMetrics(turnoActivo ? turnoActivo.id : null);

            return res.json({
                success: true,
                metrics,
                turnoActivo,
                mostrarAlertaTurno,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error en apiMetrics:', error);
            return res.status(500).json({ success: false, message: 'Error al consultar métricas' });
        }
    }

}

module.exports = new DashboardController();