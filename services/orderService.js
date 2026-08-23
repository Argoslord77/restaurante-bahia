// services/orderService.js
const orderModel = require('../models/orderModel');
const MenuModel = require('../models/menuModel');
const platilloDiaModel = require('../models/platilloDiaModel');
const STATUS = require('../config/orderStatus');

class OrderService {
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

    async processQRActivation(hash, userId) {
        if (!hash) throw new Error('Código QR o Hash inválido.');
        const mesa = await orderModel.getMesaByHash(hash);
        if (!mesa) {
            throw new Error('El código QR escaneado no está activo o no corresponde a una mesa autorizada.');
        }
        return await this.getOrCreateOrderForMesa(mesa.id, userId);
    }

    /**
     * Sincroniza y guarda los platillos enviados desde la interfaz del POS
     */
    async syncPosOrder(id_pedido, items) {
        if (!id_pedido) throw new Error('Identificador de pedido faltante.');

        const verifiedItems = [];

        if (items && items.length > 0) {
            for (const item of items) {
                let esBebida = false;
                let nombreProducto = '';
                let precioReal = 0;
                
                // Conversión booleana segura
                const esPlatilloDiaFlag = Boolean(
                    item.es_platillo_dia === true || 
                    item.es_platillo_dia === 1 || 
                    item.es_platillo_dia === '1' || 
                    item.es_platillo_dia === 'true'
                );
                let esPlatilloDia = false;

                if (esPlatilloDiaFlag) {
                    const platilloDia = await platilloDiaModel.getById(item.id);
                    if (platilloDia) {
                        esPlatilloDia = true;
                        esBebida = (platilloDia.tipo === 'BEBIDAS');
                        nombreProducto = platilloDia.nombre;
                        precioReal = parseFloat(platilloDia.precio);
                    } else {
                        throw new Error(`El platillo del día con ID ${item.id} no existe.`);
                    }
                } else {
                    const platilloMenu = await MenuModel.getById(item.id);
                    if (platilloMenu) {
                        esPlatilloDia = false;
                        const tipoCat = String(platilloMenu.tipo_categoria || platilloMenu.tipo || '').toUpperCase();
                        esBebida = (tipoCat === 'BEBIDAS');
                        nombreProducto = platilloMenu.nombre;
                        precioReal = parseFloat(platilloMenu.precio);
                    } else {
                        // Fallback de seguridad: si no está en platillos_menu, buscar en platillos_dia
                        const platilloDia = await platilloDiaModel.getById(item.id);
                        if (platilloDia) {
                            esPlatilloDia = true;
                            esBebida = (platilloDia.tipo === 'BEBIDAS');
                            nombreProducto = platilloDia.nombre;
                            precioReal = parseFloat(platilloDia.precio);
                        } else {
                            throw new Error(`El producto seleccionado (ID ${item.id}) no existe en el catálogo.`);
                        }
                    }
                }

                const cantidad = parseInt(item.cantidad, 10) || 1;
                const destino = esBebida ? 'bar' : 'cocina';
                const estado_preparacion = esBebida 
                    ? (STATUS.ITEM.EN_BAR || 'en_bar') 
                    : (STATUS.ITEM.EN_COCINA || 'en_cocina');

                verifiedItems.push({
                    id: item.id,
                    nombre: nombreProducto,
                    cantidad,
                    precio: precioReal,
                    notas: item.notas || null,
                    destino, 
                    estado_preparacion,
                    es_platillo_dia: esPlatilloDia
                });
            }
        }

        const result = await orderModel.appendOrderItems(id_pedido, verifiedItems);
        return result;
    }
}

module.exports = new OrderService();