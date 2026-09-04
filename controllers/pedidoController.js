const pedidoService = require('../services/pedidoService');
const inventarioService = require('../services/inventarioService');
const ventasService = require('../services/ventasService');
const itemTiempos = require('../services/itemTiemposService');
const TableModel = require('../models/tableModel');
const db = require('../config/db');
const Pedido = require('../models/pedidoModel'); // Importación necesaria para usar addDetailWithModifiers

// Límite de filas por página de la vista de Pedidos/Ventas.
const PAGINAS_VALIDAS = [10, 25, 50, 100];
const POR_PAGINA_DEFECTO = 25;

const pedidoController = {
    /**
     * Registro de Pedidos/Ventas por rango de fechas (hoy por defecto).
     * Sustituye al antiguo listado de "órdenes en consumo": ahora incluye turno,
     * mesa/área, dependiente, apertura y cierre, duración del servicio, importe
     * desglosado por moneda y el desglose de ítems con su tiempo de entrega.
     */
    listarPedidos: async (req, res) => {
        try {
            const filtros = ventasService.normalizarFiltros(req.query);
            const pagina = Math.max(1, parseInt(req.query.pagina, 10) || 1);
            const porPaginaPedido = parseInt(req.query.por_pagina, 10) || POR_PAGINA_DEFECTO;
            const porPagina = PAGINAS_VALIDAS.includes(porPaginaPedido) ? porPaginaPedido : POR_PAGINA_DEFECTO;

            const [resultado, opciones, mesas] = await Promise.all([
                ventasService.listarVentas(filtros, { pagina, porPagina }),
                ventasService.obtenerOpcionesDeFiltro(filtros).catch(() => ({ turnos: [], meseros: [], mesas: [] })),
                TableModel.getAll().catch(() => [])
            ]);

            res.render('pedido/pedido', {
                resultado,
                filtros,
                opciones,
                mesasLibres: (mesas || []).filter(m => m.estado === 'libre'),
                etiquetasEstado: ventasService.ETIQUETAS_ESTADO,
                tiemposDisponibles: itemTiempos.tiemposDisponibles(),
                paginasValidas: PAGINAS_VALIDAS,
                user: req.user || res.locals.user || { rol: 'administrador', nombre: 'Administrador' },
                view: 'orders'
            });
        } catch (error) {
            console.error('Error al listar pedidos:', error);
            res.status(500).send('Error interno del servidor');
        }
    },

    /**
     * Exporta el rango consultado a CSV (resumen por pedido o detalle por ítem).
     */
    exportarVentas: async (req, res) => {
        try {
            const filtros = ventasService.normalizarFiltros(req.query);
            const detalle = String(req.query.detalle || '').toLowerCase() === '1';
            const resultado = await ventasService.listarVentas(filtros, { pagina: 1, porPagina: 5000 });
            const { csv, filas } = ventasService.ventasACSV(resultado, { detalle });

            const marca = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition',
                `attachment; filename="pedidos_${filtros.desde}_${filtros.hasta}${detalle ? '_detalle' : ''}_${marca}.csv"`);
            res.setHeader('X-Ventas-Filas', String(filas));
            return res.send(csv);
        } catch (error) {
            console.error('Error al exportar pedidos:', error);
            return res.redirect('/admin/pedidos');
        }
    },

    // Obtener el detalle específico asegurando la carga de productos de la orden
    obtenerDetallePedido: async (req, res) => {
        try {
            const { id } = req.params;
            const pedido = await pedidoService.obtenerPorId(id);
            
            if (!pedido) {
                return res.status(404).send('Pedido no encontrado');
            }
            
            if (!pedido.detalles) {
                pedido.detalles = [];
            }
            
            res.render('pedido/detalle', { 
                pedido: pedido, 
                user: req.user || { role: 'administrador' } 
            });
        } catch (error) {
            console.error('Error al obtener detalle del pedido:', error);
            res.status(500).send('Error interno del servidor');
        }
    },

    // Iniciar un nuevo pedido abriendo una mesa
    crearPedido: async (req, res) => {
        try {
            const { id_mesa } = req.body;
            const id_usuario_mesero = req.user?.id;
            const turno_servicio_id = req.turnoServicioId;

            if (!id_usuario_mesero) {
                req.flash('error_msg', 'Sesión inválida o expirada. Inicie sesión de nuevo para abrir una mesa.');
                return res.redirect('/login');
            }

            const nuevoId = await pedidoService.crearNuevoPedido(id_mesa, id_usuario_mesero, turno_servicio_id);
            res.redirect(`/admin/pedido/${nuevoId}`);
        } catch (error) {
            console.error('Error al crear pedido:', error);
            req.flash('error_msg', error.message || 'Error al iniciar el servicio.');
            res.redirect('/dependiente/dashboard');
        }
    },

    // Procesar la lista de productos enviada en lote para la orden y descontar inventario FIFO
    enviarOrden: async (req, res) => {
        const { id } = req.params;
        const { items } = req.body; // Array de objetos { id_platillo, cantidad, modificadores: [] }

        if (!items || items.length === 0) {
            return res.status(400).json({ success: false, message: 'No hay elementos en la orden.' });
        }

        const conn = await db.getConnection();
        await conn.beginTransaction();

        try {
            // Procesar cada ítem incluyendo sus modificadores
            for (const item of items) {
                // Inserción transaccional de detalle + modificadores
                await Pedido.addDetailWithModifiers(
                    id, 
                    item.id_platillo, 
                    item.cantidad, 
                    item.modificadores || [], 
                    conn
                );

                // Descontar insumos del inventario
                const almacenDefaultId = 1; 
                await inventarioService.descontarPorReceta(
                    item.id_platillo, 
                    parseFloat(item.cantidad), 
                    almacenDefaultId, 
                    conn,
                    { referencia_tipo: 'pedido', referencia_id: id, documento_numero: `PED-${String(id).padStart(6, '0')}`, usuario_id: req.user?.id || null }
                );
            }

            await conn.commit();
            res.json({ success: true, redirectUrl: `/admin/pedido/${id}` });

        } catch (error) {
            await conn.rollback();
            console.error('Error al enviar orden con modificadores:', error);
            res.status(500).json({ 
                success: false, 
                message: `No se pudo enviar la orden: ${error.message}` 
            });
        } finally {
            conn.release();
        }
    },

    // Cierre financiero normal de la cuenta
    cerrarCuenta: async (req, res) => {
        try {
            const { id } = req.params;
            const idUsuarioCajero = req.user ? req.user.id : 1;
            
            await pedidoService.procesarCierreFinanciero(id, idUsuarioCajero);
            res.json({ success: true, redirectUrl: '/admin/pedidos' });
        } catch (error) {
            console.error('Error al cerrar cuenta:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    },

    // Procesa el flujo de cancelación especial/selectiva
    cancelarServicio: async (req, res) => {
        try {
            const { id } = req.params; 
            const { productosAfectados, motivo } = req.body; 
            const idUsuario = req.user ? req.user.id : 1;

            await pedidoService.procesarCancelacionFlujo(id, productosAfectados, motivo, idUsuario);

            res.json({ success: true, redirectUrl: '/admin/pedidos' });
        } catch (error) {
            console.error('Error en controlador al cancelar servicio:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }
};

module.exports = pedidoController;