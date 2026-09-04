const pedidoService = require('../services/pedidoService');
const inventarioService = require('../services/inventarioService');
const db = require('../config/db');
const Pedido = require('../models/pedidoModel'); // Importación necesaria para usar addDetailWithModifiers

const pedidoController = {
    /**
     * Recoge y normaliza los filtros del panel de Pedidos / Ventas desde la
     * query string. Por defecto el período es HOY (regla del reporte).
     */
    _leerFiltrosVentas(query = {}) {
        const hoy = (() => {
            const d = new Date();
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        })();

        const estadosValidos = ['todos', 'curso', 'cobrados', 'cortesia', 'anulados'];
        const ordenesValidos = ['fecha', 'id', 'mesa', 'mesero', 'total', 'duracion'];

        // Regla del período: sin parámetros → HOY (comportamiento por defecto
        // del reporte); parámetro presente pero VACÍO (rango "Todo el
        // histórico") → sin límite; fecha ISO válida → esa fecha; fecha mal
        // formada → vuelve al día seguro (nunca abre el histórico por error).
        const esFechaValida = (v) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(String(v));

        return {
            desde: esFechaValida(query.desde) ? query.desde : (Object.prototype.hasOwnProperty.call(query, 'desde') && query.desde === '' ? '' : hoy),
            hasta: esFechaValida(query.hasta) ? query.hasta : (Object.prototype.hasOwnProperty.call(query, 'hasta') && query.hasta === '' ? '' : hoy),
            estado: estadosValidos.includes(query.estado) ? query.estado : 'todos',
            turnoId: query.turnoId || '',
            meseroId: query.meseroId || '',
            mesa: (query.mesa || '').toString().trim().slice(0, 100),
            buscar: (query.buscar || '').trim().slice(0, 100),
            orden: ordenesValidos.includes(query.orden) ? query.orden : 'fecha',
            dir: String(query.dir).toLowerCase() === 'asc' ? 'asc' : 'desc',
            pagina: query.pagina || 1,
            porPagina: query.porPagina || 50
        };
    },

    // Reporte de Pedidos / Ventas por rango de fechas (hoy por defecto), con
    // desglose de ítems, pagos por moneda, tiempos del servicio y cocinero.
    listarPedidos: async (req, res) => {
        try {
            const filtros = pedidoController._leerFiltrosVentas(req.query);

            const [resultado, resumen, { turnos, meseros }] = await Promise.all([
                pedidoService.listarVentas(filtros),
                pedidoService.resumenVentas(filtros),
                pedidoService.opcionesFiltrosVentas()
            ]);

            res.render('pedido/pedido', {
                lista: resultado.rows,
                paginacion: resultado,
                filtros,
                resumen,
                turnos,
                meseros,
                user: req.user || { role: 'administrador' },
                view: "orders"
            });
        } catch (error) {
            console.error('Error al listar pedidos:', error);
            req.flash && req.flash('error_msg', 'No se pudo cargar el reporte de pedidos.');
            res.status(500).render('error', { message: 'Error al cargar los pedidos' });
        }
    },

    /**
     * Exporta a CSV el listado de pedidos con los filtros del panel aplicados.
     * La exportación queda registrada por el middleware de auditoría como
     * operación de EXPORTACION (config/auditoriaCatalogo.js).
     */
    exportarPedidosCSV: async (req, res) => {
        try {
            const filtros = pedidoController._leerFiltrosVentas(req.query);
            const { csv, filas } = await pedidoService.exportarVentasCSV(filtros);

            const marca = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="pedidos_ventas_${marca}.csv"`);
            res.setHeader('X-Exportacion-Filas', String(filas));
            return res.send(csv);
        } catch (error) {
            console.error('Error al exportar pedidos a CSV:', error);
            return res.status(500).json({ success: false, message: 'No se pudo generar la exportación.' });
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