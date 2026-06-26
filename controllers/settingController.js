// controllers/settingController.js
const SettingService = require('../services/settingService');

exports.viewSettings = async (req, res) => {
    try {
        const settings = await SettingService.getSettings();
        
        res.render('admin/settings', {
            user: req.session.user || { rol: 'administrador' },
            settings: settings,
            view: 'settings',
            serverIp: req.hostname
        });
    } catch (error) {
        console.error("Error al cargar configuraciones:", error);
        res.status(500).send("Error interno del servidor al cargar las configuraciones.");
    }
};

exports.updateSettings = async (req, res) => {
    try {
        await SettingService.saveSettings(req.body);
        res.json({ success: true, message: "Configuraciones del sistema actualizadas correctamente." });
    } catch (error) {
        console.error("Error al actualizar configuraciones:", error);
        res.json({ success: false, message: "No se pudieron salvar los cambios en el sistema." });
    }
};