// controllers/salidaManualController.js - Controlador para gestión de salidas manuales
const SalidaManualService = require('../services/salidaManualService');
const AlmacenModel = require('../models/almacenModel');
const ProductoModel = require('../models/productoModel');
const logger = require('../config/logger');

const SalidaManualController = {
    /** Recoge y normaliza los filtros del panel profesional desde la query string. */
    _leerFiltros(query = {}) {
        return {
            tipo: query.tipo || '',
            almacenId: query.almacenId || '',
            productoId: query.productoId || '',
            usuarioId: query.usuarioId || '',
            desde: query.desde || '',
            hasta: query.hasta || '',
            buscar: (query.buscar || '').trim().slice(0, 100),
            orden: query.orden || 'fecha',
            dir: query.dir || 'desc',
            pagina: query.pagina || 1,
            porPagina: query.porPagina || 50
        };
    },

    // Renderizar vista principal de salidas manuales
    viewSalidasManuales: async (req, res) => {
        try {
            const filtros = SalidaManualController._leerFiltros(req.query);
            const UnidadMedidaService = require('../services/unidadMedidaService');

            const [resultado, resumen, almacenes, productos, usuarios, unidades] = await Promise.all([
                SalidaManualService.listarFiltrado(filtros),
                SalidaManualService.resumenFiltrado(filtros),
                AlmacenModel.getAll(),
                ProductoModel.getAll(),
                SalidaManualService.usuariosConSalidas(),
                UnidadMedidaService.listarUnidades(false)
            ]);

            res.render('inventarios/salidas-manuales', {
                salidas: resultado.rows,
                paginacion: resultado,
                filtros,
                resumen,
                almacenes,
                productos,
                usuarios,
                unidades,
                tipoFiltro: filtros.tipo || 'todos',
                almacenFiltro: filtros.almacenId || null,
                user: req.user,
                view: 'salidas-manuales'
            });
        } catch (error) {
            logger.error('Error al cargar vista de salidas manuales:', error);
            res.status(500).render('error', { message: 'Error al cargar las salidas manuales' });
        }
    },

    /**
     * Exporta a CSV el listado de salidas con los filtros del panel aplicados.
     * Mismo espíritu que la exportación de auditoría: la exportación queda
     * registrada por el middleware global como operación EXPORTACION.
     */
    exportarSalidasCSV: async (req, res) => {
        try {
            const filtros = SalidaManualController._leerFiltros(req.query);
            const { csv, filas } = await SalidaManualService.exportarCSV(filtros);

            const marca = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="salidas_manuales_${marca}.csv"`);
            res.setHeader('X-Exportacion-Filas', String(filas));
            return res.send(csv);
        } catch (error) {
            logger.error('Error al exportar salidas manuales:', error);
            if (req.flash) req.flash('error_msg', 'No se pudo exportar el listado de salidas.');
            return res.redirect('/admin/salidas-manuales');
        }
    },

    // Registrar nueva salida manual (API)
    createSalida: async (req, res) => {
        try {
            const salidaData = {
                almacen_id: req.body.almacen_id,
                producto_id: req.body.producto_id,
                cantidad: req.body.cantidad,
                unidad_medida_id: req.body.unidad_medida_id || null,
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
