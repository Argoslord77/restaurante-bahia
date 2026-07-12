const ReporteModel = require('../models/reporteModel');

const ReporteController = {
  async renderKardexReporte(req, res) {
    const { turnoId } = req.query;
    try {
      const datos = await ReporteModel.getReporteKardexPos(turnoId || null);
      res.render('reportes/kardex', { 
        reporte: datos, 
        turnoSeleccionado: turnoId || 'Todos',
        title: 'Auditoría de Explosión de Recetas (Kardex vs POS)' 
      });
    } catch (error) {
      res.status(500).send('Error generando reporte: ' + error.message);
    }
  }
};

module.exports = ReporteController;