const pedidoService = require('../services/pedidoService');
const inventarioService = require('../services/inventarioService');
const ReportesService = require('../services/reportesService');
const TableService = require('../services/tableService');
const db = require('../config/db');
const Pedido = require('../models/pedidoModel'); // Importación necesaria para usar addDetailWithModifiers

/**
 * Ventas / Pedidos: vista profesional por rango de fechas (hoy por defecto).
 *
 * No es solo el listado de mesas abiertas: muestra cada cuenta del período con
 * turno, mesa y área, dependiente y cajero, hora de apertura y cierre, importe
 * desglosado por moneda, ítems entregados/cancelados, tiempos de producción y
 * de entrega por plato y quién lo sacó. Las cuentas en curso se marcan como
 * tales y conservan sus acciones (ver detalle / anular).
 *
 * El mismo cargador sirve a la vista y al CSV, de modo que lo exportado
 * coincide con lo que se ve en pantalla.
 */
async function cargarReportePedidos(req) {
    const rango = ReportesService.normalizarRangoDelDia(req.query);
    const filtros = ReportesService.leerFiltrosPedidos(req.query);
    const reporte = await ReportesService.pedidosVentas({ rango, filtros });
    return { rango, filtros, reporte };
}

const pedidoController = {
    /** Listar los pedidos del período (por defecto, el día de hoy) */
    listarPedidos: async (req, res) => {
        try {
            const { rango, filtros, reporte } = await cargarReportePedidos(req);

            // El modal de apertura necesita las mesas reales (número, no ID)
            // para no teclear identificadores de base de datos.
            let mesas = [];
            try {
                mesas = (await TableService.getAllTables())
                    .filter(m => m.estado !== 'mantenimiento')
                    .map(m => ({
                        id: m.id, numero: m.numero, capacidad: m.capacidad,
                        estado: m.estado, ubicacion: m.ubicacion, pedido_activo: m.pedido_id || null
                    }));
            } catch (error) {
                console.error('Error al cargar las mesas para abrir orden:', error);
            }

            res.render('pedido/pedido', {
                title: 'Ventas / Pedidos - Restaurante Bahía',
                reporte,
                rango,
                filtros,
                mesas,
                lista: reporte.pedidos.filter(p => p.en_curso),
                user: req.user || { role: 'administrador' },
                view: "orders",
                success_msg: req.flash ? req.flash('success_msg') : null,
                error_msg: req.flash ? req.flash('error_msg') : null
            });
        } catch (error) {
            console.error('Error al listar pedidos:', error);
            res.status(500).send('Error interno del servidor');
        }
    },

    // Exportación del reporte a CSV (Excel): cabecera + detalle de ítems
    exportarPedidos: async (req, res) => {
        try {
            const { reporte } = await cargarReportePedidos(req);
            const marca = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="pedidos_ventas_${reporte.desde}_${reporte.hasta}_${marca}.csv"`);
            res.setHeader('X-Reporte-Filas', String(reporte.totales.cuentas));
            return res.send(ReportesService.pedidosVentasACSV(reporte));
        } catch (error) {
            console.error('Error al exportar pedidos/ventas:', error);
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