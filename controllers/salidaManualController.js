// controllers/salidaManualController.js - Controlador para gestión de salidas manuales
const SalidaManualService = require('../services/salidaManualService');
const AlmacenModel = require('../models/almacenModel');
const ProductoModel = require('../models/productoModel');
const logger = require('../config/logger');

const SalidaManualController = {
    // Renderizar vista principal de salidas manuales
    viewSalidasManuales: async (req, res) => {
        try {
            const { tipo, almacenId } = req.query;
            let salidas;

            if (tipo) {
                salidas = await SalidaManualService.listarPorTipo(tipo);
            } else if (almacenId) {
                salidas = await SalidaManualService.listarPorAlmacen(almacenId);
            } else {
                salidas = await SalidaManualService.listarTodas();
            }

            const almacenes = await AlmacenModel.getAll();
            const productos = await ProductoModel.getAll();
            const resumen = await SalidaManualService.obtenerResumenPorTipo();

            res.render('inventarios/salidas-manuales', {
                salidas,
                almacenes,
                productos,
                resumen,
                tipoFiltro: tipo || 'todos',
                almacenFiltro: almacenId || null,
                user: req.user,
                view: 'salidas-manuales'
            });
        } catch (error) {
            logger.error('Error al cargar vista de salidas manuales:', error);
            res.status(500).render('error', { message: 'Error al cargar las salidas manuales' });
        }
    },

    // Registrar nueva salida manual (API)
    createSalida: async (req, res) => {
        try {
            const salidaData = {
                almacen_id: req.body.almacen_id,
                producto_id: req.body.producto_id,
                cantidad: req.body.cantidad,
                tipo: req.body.tipo,
                motivo: req.body.motivo,
                notas: req.body.notas,
                usuario_id: req.user.id
            };

            const resultado = await SalidaManualService.registrarSalida(salidaData);
            res.json({ success: true, message: 'Salida manual registrada exitosamente', id: resultado.id, movimientos: resultado.movimientos });
        } catch (error) {
            logger.error('Error al registrar salida manual:', error);
            res.status(400).json({ success: false, message: error.message });
        }
    },

    // Obtener salida por ID (API)
    getSalida: async (req, res) => {
        try {
            const { id } = req.params;
            const salida = await SalidaManualService.obtenerPorId(id);
            res.json({ success: true, data: salida });
        } catch (error) {
            logger.error('Error al obtener salida manual:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Obtener resumen por tipo (API)
    getResumen: async (req, res) => {
        try {
            const { fechaInicio, fechaFin } = req.query;
            const resumen = await SalidaManualService.obtenerResumenPorTipo(fechaInicio, fechaFin);
            res.json({ success: true, data: resumen });
        } catch (error) {
            logger.error('Error al obtener resumen:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Obtener salidas por período (API)
    getSalidasPorPeriodo: async (req, res) => {
        try {
            const { fechaInicio, fechaFin } = req.query;
            const salidas = await SalidaManualService.listarPorPeriodo(fechaInicio, fechaFin);
            res.json({ success: true, data: salidas });
        } catch (error) {
            logger.error('Error al listar salidas por período:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }
};

module.exports = SalidaManualController;
