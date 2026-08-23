const pedidoService = require('../services/pedidoService');
const inventarioService = require('../services/inventarioService');
const db = require('../config/db');
const Pedido = require('../models/pedidoModel'); // Importación necesaria para usar addDetailWithModifiers

const pedidoController = {
    // Listar todos los pedidos activos en consumo
    listarPedidos: async (req, res) => {
        try {
            const lista = await pedidoService.obtenerTodosActivos();
            res.render('pedido/pedido', { 
                lista, 
                user: req.user || { role: 'administrador' } ,
                view: "orders"
            });
        } catch (error) {
            console.error('Error al listar pedidos:', error);
            res.status(500).send('Error interno del servidor');
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
                    conn
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