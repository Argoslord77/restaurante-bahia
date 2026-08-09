// services/settingService.js
const SettingModel = require('../models/settingModel');

class SettingService {
    // Retorna las variables de configuración completas
    async getSettings() {
        return await SettingModel.getAllAsObject();
    }

    // Procesa y limpia los datos del formulario antes de enviarlos al modelo
    async saveSettings(formData) {
        const processedSettings = {};

        if (formData.app_nombre) processedSettings['app_nombre'] = formData.app_nombre.trim();
        if (formData.app_moneda) processedSettings['app_moneda'] = formData.app_moneda.trim();
        if (formData.factura_impuesto) processedSettings['factura_impuesto'] = parseFloat(formData.factura_impuesto) || 0;
        if (formData.factura_propina) processedSettings['factura_propina'] = parseFloat(formData.factura_propina) || 0;

        if (formData.salon_areas) {
            processedSettings['salon_areas'] = formData.salon_areas
                .split(',')
                .map(item => item.trim())
                .filter(item => item !== "")
                .join(',');
        }

        if (formData.inventario_unidades) {
            processedSettings['inventario_unidades'] = formData.inventario_unidades
                .split(',')
                .map(item => item.trim())
                .filter(item => item !== "")
                .join(',');
        }

        return await SettingModel.updateBatch(processedSettings);
    }

    // Alias para garantizar compatibilidad con invocaciones desde settingController.js
    async updateSettings(formData) {
        return await this.saveSettings(formData);
    }
}

module.exports = new SettingService();