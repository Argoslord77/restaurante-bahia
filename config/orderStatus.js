// config/orderStatus.js
// Estos valores DEBEN coincidir exactamente (incluyendo mayúsculas/minúsculas)
// con los ENUM reales definidos en la base de datos:
//   pedidos.estado_pedido      -> enum('pendiente','preparando','listo','entregado','cancelado')
//   pedidos.estado_pago        -> enum('pendiente','pagado','cortesia','facturado','pendiente_pago','fusionada')
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
    },

    // V12 (C3): 'fusionada' = cuenta absorbida por otra al unir/dividir.
    // Nace con totales en cero y fecha_cierre: no se cobra, no se ve en
    // monitores y suma 0 en todos los reportes.
    PAGO: {
        PENDIENTE: 'pendiente',
        PAGADO: 'pagado',
        CORTESIA: 'cortesia',
        FACTURADO: 'facturado',
        PENDIENTE_PAGO: 'pendiente_pago',
        FUSIONADA: 'fusionada'
    },

    // V12 (C2): ciclo de vida de una reserva de mesa.
    RESERVA: {
        PENDIENTE: 'pendiente',
        SENTADA: 'sentada',
        CANCELADA: 'cancelada',
        NO_SHOW: 'no_show'
    }
};
