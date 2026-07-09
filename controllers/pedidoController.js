const pedidoService = require('../services/pedidoService');
const inventarioService = require('../services/inventarioService');
const db = require('../config/db'); // <-- Requerimos la base de datos para manejar la transacción global

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
            const nuevoId = await pedidoService.crearNuevoPedido(id_mesa);
            res.redirect(`/admin/pedido/${nuevoId}`);
        } catch (error) {
            console.error('Error al crear pedido:', error);
            res.status(500).send('Error al iniciar el servicio');
        }
    },

    // Procesar la lista de productos enviada en lote para la orden y descontar inventario FIFO
    enviarOrden: async (req, res) => {
        const { id } = req.params;
        const { items } = req.body; // Array de objetos { id_platillo, cantidad }

        if (!items || items.length === 0) {
            return res.status(400).json({ success: false, message: 'No hay elementos en la orden.' });
        }

        // Iniciamos una transacción atómica global para la Base de Datos
        const conn = await db.getConnection();
        await conn.beginTransaction();

        try {
            // 1. Adicionar la orden al flujo de comandas usando la conexión transaccional
            // NOTA: Es necesario que tu pedidoService.adicionarOrdenLote acepte 'conn' como parámetro opcional
            await pedidoService.adicionarOrdenLote(id, items, conn);

            // 2. Definir el almacén de donde saldrán por defecto los insumos de cocina (ej: ID 1 - Almacén Central/Cocina)
            const almacenDefaultId = 1; 

            // 3. Explotar la receta de cada ítem de la comanda y reducir el stock FIFO de sus insumos
            for (const item of items) {
                // Invocamos el servicio pasándole la conexión activa para que herede la transacción
                await InventarioService.descontarPorReceta(
                    item.id_platillo, 
                    parseFloat(item.cantidad), 
                    almacenDefaultId, 
                    conn
                );
            }

            // Si todo el bucle se completó con éxito y hay stock suficiente de todo, asentamos los datos
            await conn.commit();
            res.json({ success: true, redirectUrl: `/admin/pedido/${id}` });

        } catch (error) {
            // Si falta un solo insumo o hay error de concurrencia, hacemos ROLLBACK absoluto.
            // La comanda no se envía a cocina y el inventario no se desajusta.
            await conn.rollback();
            console.error('Error al enviar orden y descontar inventario:', error);
            res.status(500).json({ 
                success: false, 
                message: `No se pudo enviar la orden: ${error.message}` 
            });
        } finally {
            conn.release(); // Liberamos la conexión de vuelta al pool
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