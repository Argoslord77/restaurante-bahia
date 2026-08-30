const pedidoService = require('../services/pedidoService');
const inventarioService = require('../services/inventarioService');
const db = require('../config/db');
const Pedido = require('../models/pedidoModel'); // Importación necesaria para usar addDetailWithModifiers

const pedidoController = {
    // Listar todos los pedidos activos en consumo
    listarPedidos: async (req, res) => {
        try {
            // Rango de fechas: hoy por defecto (formato YYYY-MM-DD)
            const hoy = new Date().toISOString().slice(0, 10);
            const desde = (req.query.desde && /^\d{4}-\d{2}-\d{2}$/.test(req.query.desde)) ? req.query.desde : hoy;
            const hasta = (req.query.hasta && /^\d{4}-\d{2}-\d{2}$/.test(req.query.hasta)) ? req.query.hasta : desde;
            const turnoFiltro = parseInt(req.query.turno, 10) || null;
            const estadoFiltro = req.query.estado || 'todos';

            const datos = await pedidoService.obtenerPedidosPorRango(desde, hasta);

            // Filtros en memoria (turno / estado) sobre el resultado del rango
            let pedidos = datos.pedidos;
            if (turnoFiltro) pedidos = pedidos.filter(p => p.turno_servicio_id === turnoFiltro);
            if (estadoFiltro === 'curso') pedidos = pedidos.filter(p => p.estado_pedido !== 'cancelado' && !['pagado', 'facturado', 'cortesia', 'pendiente_pago'].includes(p.estado_pago));
            if (estadoFiltro === 'cobrados') pedidos = pedidos.filter(p => ['pagado', 'facturado', 'pendiente_pago'].includes(p.estado_pago));
            if (estadoFiltro === 'cancelados') pedidos = pedidos.filter(p => p.estado_pedido === 'cancelado');

            res.render('pedido/pedido', {
                lista: pedidos,
                itemsPorPedido: datos.itemsPorPedido,
                pagosPorPedido: datos.pagosPorPedido,
                kpis: datos.kpis,
                turnos: datos.turnos,
                filtros: { desde, hasta, turno: turnoFiltro || '', estado: estadoFiltro },
                user: req.user || { rol: 'administrador' },
                view: "orders"
            });
        } catch (error) {
            console.error('Error al listar pedidos:', error);
            res.status(500).send('Error interno del servidor');
        }
    },

    // Obtener el detalle específico asegurando la carga de productos de la orden
    /**
     * Reporte completo del pedido (cualquier estado) — destino del ícono de
     * detalle del listado Ventas/Pedidos. GET /admin/pedido-reporte/:id
     */
    obtenerReportePedido: async (req, res) => {
        try {
            const { id } = req.params;
            // Filtros del listado origen (para que "Volver al listado" conserve el rango)
            const hoy = new Date().toISOString().slice(0, 10);
            const filtros = {
                desde: (req.query.desde && /^\d{4}-\d{2}-\d{2}$/.test(req.query.desde)) ? req.query.desde : hoy,
                hasta: (req.query.hasta && /^\d{4}-\d{2}-\d{2}$/.test(req.query.hasta)) ? req.query.hasta : '',
                turno: parseInt(req.query.turno, 10) || '',
                estado: ['todos', 'curso', 'cobrados', 'cancelados'].includes(req.query.estado) ? req.query.estado : 'todos'
            };
            const qs = new URLSearchParams({ desde: filtros.desde, hasta: filtros.hasta || filtros.desde, estado: filtros.estado });
            if (filtros.turno) qs.set('turno', String(filtros.turno));
            filtros.queryString = qs.toString();

            const datos = await pedidoService.obtenerReportePedido(id);
            if (!datos) {
                return res.status(404).send('Pedido no encontrado');
            }
            res.render('pedido/reporte', {
                datos,
                filtros,
                user: req.user || { rol: 'administrador' },
                view: "orders"
            });
        } catch (error) {
            console.error('Error al generar reporte del pedido:', error);
            res.status(500).send('Error interno del servidor');
        }
    },


    // Iniciar un nuevo pedido abriendo una mesa
    crearPedido: async (req, res) => {
        try {
            const { id_mesa, comensales } = req.body;
            const id_usuario_mesero = req.user?.id;
            const turno_servicio_id = req.turnoServicioId;

            if (!id_usuario_mesero) {
                req.flash('error_msg', 'Sesión inválida o expirada. Inicie sesión de nuevo para abrir una mesa.');
                return res.redirect('/login');
            }

            const nuevoId = await pedidoService.crearNuevoPedido(id_mesa, id_usuario_mesero, turno_servicio_id, comensales);
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