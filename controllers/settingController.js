const SettingService = require('../services/settingService');
const CategoriaPlatillo = require('../models/categoriaPlatilloModel');
const db = require('../config/db');

exports.viewSettings = async (req, res) => {
    try {
        const settings = await SettingService.getSettings();
        const categorias = await CategoriaPlatillo.getAll();
        
        // Carga de almacenes para selector de despacho en la modal
        const [almacenes] = await db.query('SELECT id, nombre FROM almacenes WHERE activo = 1 ORDER BY nombre ASC');
        
        res.render('admin/settings', {
            user: req.session.user || { rol: 'administrador' },
            settings: settings,
            categorias: categorias,
            almacenes: almacenes,
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
        await SettingService.updateSettings(req.body);
        res.json({ success: true, message: "Configuraciones del sistema actualizadas correctamente." });
    } catch (error) {
        console.error("Error al actualizar configuraciones:", error);
        res.status(500).json({ success: false, message: "Error al guardar los ajustes." });
    }
};

// --- CRUD API CATEGORÍAS DE PLATILLOS ---

exports.getCategoriasPlatillos = async (req, res) => {
    try {
        const categorias = await CategoriaPlatillo.getAll();
        res.json({ success: true, data: categorias });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error al consultar categorías de platillos." });
    }
};

exports.saveCategoriaPlatillo = async (req, res) => {
    try {
        const { id, nombre, descripcion, almacen_id, tipo } = req.body;
        if (!nombre || !nombre.trim()) {
            return res.json({ success: false, message: "El nombre de la categoría es obligatorio." });
        }

        const data = {
            nombre: nombre.trim(),
            descripcion: descripcion || null,
            almacen_id: almacen_id || null,
            tipo: tipo || 'COMESTIBLES'
        };

        if (id) {
            await CategoriaPlatillo.update(id, data);
            res.json({ success: true, message: "Categoría de menú actualizada correctamente." });
        } else {
            await CategoriaPlatillo.create(data);
            res.json({ success: true, message: "Categoría de menú creada correctamente." });
        }
    } catch (error) {
        console.error("Error al guardar categoría de platillo:", error);
        res.json({ success: false, message: "No se pudo guardar la categoría." });
    }
};

exports.toggleCategoriaPlatillo = async (req, res) => {
    try {
        const { id } = req.params;
        const { activo } = req.body;
        await CategoriaPlatillo.toggleEstado(id, activo);
        res.json({ success: true, message: `Categoría ${activo ? 'activada' : 'desactivada'} correctamente.` });
    } catch (error) {
        res.json({ success: false, message: "Error al cambiar el estado de la categoría." });
    }
};

exports.deleteCategoriaPlatillo = async (req, res) => {
    try {
        const { id } = req.params;
        await CategoriaPlatillo.delete(id);
        res.json({ success: true, message: "Categoría eliminada con éxito." });
    } catch (error) {
        console.error("Error al eliminar categoría:", error);
        res.json({ success: false, message: "No se puede eliminar la categoría porque tiene platillos asignados." });
    }
};

exports.actualizarOpcionRapida = async (req, res) => {
    try {
        const { clave, valor } = req.body;

        if (!clave) {
            return res.status(400).json({ success: false, message: 'La clave de configuración es requerida.' });
        }

        await SettingService.actualizarClaveIndividual(clave, valor);

        return res.json({
            success: true,
            message: 'Ajuste del sistema actualizado con éxito.'
        });
    } catch (error) {
        console.error('Error al actualizar opción rápida de configuración:', error);
        return res.status(500).json({ success: false, message: 'Error al actualizar el ajuste del sistema.' });
    }
};