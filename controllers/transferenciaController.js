// controllers/transferenciaController.js - Controlador para gestión de transferencias
const TransferenciaService = require('../services/transferenciaService');
const AlmacenModel = require('../models/almacenModel');
const ProductoModel = require('../models/productoModel');
const logger = require('../config/logger');

const TransferenciaController = {
    // Renderizar vista principal de transferencias
    viewTransferencias: async (req, res) => {
        try {
            const { estado } = req.query;
            let transferencias;

            if (estado) {
                transferencias = await TransferenciaService.listarPorEstado(estado);
            } else {
                transferencias = await TransferenciaService.listarTodas();
            }

            const almacenes = await AlmacenModel.getAll();
            const productos = await ProductoModel.getAll();

            res.render('inventarios/transferencias', {
                transferencias,
                almacenes,
                productos,
                estadoFiltro: estado || 'todos',
                user: req.user,
                view: 'transferencias'
            });
        } catch (error) {
            logger.error('Error al cargar vista de transferencias:', error);
            res.status(500).render('error', { message: 'Error al cargar las transferencias' });
        }
    },

    // Crear nueva solicitud de transferencia (API)
    createSolicitud: async (req, res) => {
        try {
            const transferenciaData = {
                almacen_origen_id: req.body.almacen_origen_id,
                almacen_destino_id: req.body.almacen_destino_id,
                producto_id: req.body.producto_id,
                cantidad: req.body.cantidad,
                solicitante_id: req.user.id,
                motivo: req.body.motivo,
                notas: req.body.notas
            };

            const id = await TransferenciaService.crearSolicitud(transferenciaData);
            res.json({ success: true, message: 'Solicitud de transferencia creada', id });
        } catch (error) {
            logger.error('Error al crear solicitud de transferencia:', error);
            res.status(400).json({ success: false, message: error.message });
        }
    },

    // Aprobar transferencia (API)
    aprobarTransferencia: async (req, res) => {
        try {
            const { id } = req.params;
            const aprobadorId = req.user.id;

            await TransferenciaService.aprobarTransferencia(id, aprobadorId);
            res.json({ success: true, message: 'Transferencia aprobada exitosamente' });
        } catch (error) {
            logger.error('Error al aprobar transferencia:', error);
            res.status(400).json({ success: false, message: error.message });
        }
    },

    // Rechazar transferencia (API)
    rechazarTransferencia: async (req, res) => {
        try {
            const { id } = req.params;

            await TransferenciaService.rechazarTransferencia(id);
            res.json({ success: true, message: 'Transferencia rechazada' });
        } catch (error) {
            logger.error('Error al rechazar transferencia:', error);
            res.status(400).json({ success: false, message: error.message });
        }
    },

    // Completar transferencia (API)
    completarTransferencia: async (req, res) => {
        try {
            const { id } = req.params;

            const resultado = await TransferenciaService.completarTransferencia(id);
            res.json({ success: true, message: 'Transferencia completada exitosamente', movimientos: resultado.movimientos });
        } catch (error) {
            logger.error('Error al completar transferencia:', error);
            res.status(400).json({ success: false, message: error.message });
        }
    },

    // Obtener transferencia por ID (API)
    getTransferencia: async (req, res) => {
        try {
            const { id } = req.params;
            const transferencia = await TransferenciaService.obtenerPorId(id);
            res.json({ success: true, data: transferencia });
        } catch (error) {
            logger.error('Error al obtener transferencia:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Obtener transferencias por almacén (API)
    getTransferenciasByAlmacen: async (req, res) => {
        try {
            const { almacenId } = req.params;
            const { tipo } = req.query;

            const transferencias = await TransferenciaService.listarPorAlmacen(almacenId, tipo);
            res.json({ success: true, data: transferencias });
        } catch (error) {
            logger.error('Error al obtener transferencias por almacén:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }
};

module.exports = TransferenciaController;
