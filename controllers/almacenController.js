const AlmacenService = require('../services/almacenService');
const UsuarioModel = require('../models/userModel');

const AlmacenController = {
    // Renderiza la vista principal
    viewAlmacenes: async (req, res) => {
        try {
            const almacenes = await AlmacenService.listarTodos();
            const usuarios = await UsuarioModel.getAll(); // Para el selector de responsables
            
            res.render('inventarios/almacenes', {
                almacenes,
                usuarios,
                user: req.user,
                view: 'warehouse'
            });
        } catch (error) {
            res.status(500).render('error', { message: 'Error al cargar almacenes' });
        }
    },

    // API: Obtener un almacén
    getAlmacen: async (req, res) => {
        try {
            const data = await AlmacenService.obtenerPorId(req.params.id);
            res.json({ success: true, data });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    },

    // API: Crear almacén
    addAlmacen: async (req, res) => {
        try {
            await AlmacenService.crearAlmacen(req.body);
            res.json({ success: true, message: 'Almacén creado exitosamente.' });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    },

    // API: Editar almacén
    editAlmacen: async (req, res) => {
        try {
            await AlmacenService.actualizarAlmacen(req.params.id, req.body);
            res.json({ success: true, message: 'Almacén actualizado correctamente.' });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    },

    // API: Borrado lógico (Desactivar)
    deleteAlmacen: async (req, res) => {
        try {
            await AlmacenService.desactivarAlmacen(req.params.id);
            res.json({ success: true, message: 'El almacén ha sido desactivado.' });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
};

module.exports = AlmacenController;