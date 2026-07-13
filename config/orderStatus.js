// config/orderStatus.js
// Estos valores DEBEN coincidir exactamente (incluyendo mayúsculas/minúsculas)
// con los ENUM reales definidos en la base de datos:
//   pedidos.estado_pedido      -> enum('pendiente','preparando','listo','entregado','cancelado')
//   detalles_pedido.estado_item -> enum('en_espera','en_cocina','en_bar','listo','entregado','cancelado')
//   mesas.estado                -> enum('libre','ocupada','reservada','desocupandose','mantenimiento')
module.exports = {
    PEDIDO: {
        PENDIENTE: 'pendiente',
        PREPARANDO: 'preparando',
        LISTO: 'listo',
        ENTREGADO: 'entregado',
        CANCELADO: 'cancelado'
    },

    ITEM: {
        EN_ESPERA: 'en_espera',
        EN_COCINA: 'en_cocina',
        EN_BAR: 'en_bar',
        LISTO: 'listo',
        ENTREGADO: 'entregado',
        CANCELADO: 'cancelado'
    },

    MESA: {
        LIBRE: 'libre',
        OCUPADA: 'ocupada',
        RESERVADA: 'reservada',
        DESOCUPANDOSE: 'desocupandose',
        MANTENIMIENTO: 'mantenimiento'
    }
};
