const orderModel = require('../models/orderModel');
const MenuModel = require('../models/menuModel');
const STATUS = require('../config/orderStatus'); // NUEVO: Importar normalización de estados

class OrderService {
    /**
     * Procesa la solicitud manual de creación desde el Dashboard o la recupera si ya existe
     */
    async getOrCreateOrderForMesa(id_mesa, userId, turno_servicio_id) {
        if (!id_mesa) throw new Error('ID de mesa inválido.');
        if (!turno_servicio_id) throw new Error('Se requiere un turno activo.');

        let pedidoActivo = await orderModel.getActiveOrderByMesa(id_mesa);
        
        if (!pedidoActivo) {
            const id_pedido = await orderModel.createEmptyOrder(id_mesa, userId, turno_servicio_id);
            pedidoActivo = { id: id_pedido, id_mesa, estado_pedido: STATUS.PEDIDO.PENDIENTE };
        }
        
        return pedidoActivo;
    }

    /**
     * Procesa el ingreso automático por QR mediante Hash
     */
    async processQRActivation(hash, userId) {
        if (!hash) throw new Error('Código QR o Hash inválido.');

        // Validar si el hash existe en la tabla de auto-creación
        const mesa = await orderModel.getMesaByHash(hash);
        if (!mesa) {
            throw new Error('El código QR escaneado no está activo o no corresponde a una mesa autorizada.');
        }

        // Obtener o crear orden para la mesa vinculada
        return await this.getOrCreateOrderForMesa(mesa.id, userId);
    }

    /**
     * Sincroniza y guarda los platillos enviados desde la interfaz del POS
     */
    async syncPosOrder(id_pedido, items) {
        if (!id_pedido) throw new Error('Identificador de pedido faltante.');

        let subtotal = 0;
        const verifiedItems = [];

        if (items && items.length > 0) {
            for (const item of items) {
                const platillo = await MenuModel.getById(item.id);
                if (!platillo) throw new Error(`El producto con ID ${item.id} no existe.`);

                const precioReal = parseFloat(platillo.precio);
                const cantidad = parseInt(item.cantidad, 10);
                subtotal += (precioReal * cantidad);

                // Determinar dinámicamente si el producto va a BAR o COCINA.
                const esBebida = (platillo.categoria && platillo.categoria.toLowerCase().includes('bebida'));
                const destino = esBebida ? 'bar' : 'cocina';
                
                // Mapeo normalizado del estado inicial del ítem según tu ENUM: detalles_pedido.estado_item
                const estado_preparacion = esBebida ? STATUS.ITEM.EN_BAR : STATUS.ITEM.EN_COCINA;

                verifiedItems.push({
                    id: item.id,
                    cantidad,
                    precio: precioReal,
                    notas: item.notas || null,
                    destino, 
                    estado_preparacion // NUEVO: Estado del ENUM normalizado ('en_cocina' o 'en_bar')
                });
            }
        }

        const impuesto = subtotal * 0.10; // 10% IVA/Tasa
        const total = subtotal + impuesto;

        const financialData = { subtotal, impuesto, total };
        await orderModel.updateOrderItems(id_pedido, verifiedItems, financialData);
        return financialData;
    }
}

module.exports = new OrderService();