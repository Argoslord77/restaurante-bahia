class OrderEngineService {

    constructor() {

        this.orderTransitions = {

            pendiente: [
                'preparando',
                'cancelado'
            ],

            preparando: [
                'listo',
                'cancelado'
            ],

            listo: [
                'entregado'
            ],

            entregado: [
                'cerrado'
            ],

            cerrado: [],

            cancelado: []

        };

        this.itemTransitions = {

            en_espera: [
                'en_cocina',
                'en_bar',
                'cancelado'
            ],

            en_cocina: [
                'listo',
                'cancelado'
            ],

            en_bar: [
                'listo',
                'cancelado'
            ],

            listo: [
                'entregado'
            ],

            entregado: [],

            cancelado: []

        };

    }

    canChangeOrderStatus(actual, siguiente) {

        return (
            this.orderTransitions[actual] || []
        ).includes(siguiente);

    }

    canChangeItemStatus(actual, siguiente) {

        return (
            this.itemTransitions[actual] || []
        ).includes(siguiente);

    }

    validateOrderStatus(actual, siguiente) {

        if (!this.canChangeOrderStatus(actual, siguiente)) {

            throw new Error(
                `Transición inválida (${actual} -> ${siguiente})`
            );

        }

        return true;

    }

    validateItemStatus(actual, siguiente) {

        if (!this.canChangeItemStatus(actual, siguiente)) {

            throw new Error(
                `Transición inválida (${actual} -> ${siguiente})`
            );

        }

        return true;

    }

    canEditOrder(estadoPedido) {

        return [
            'pendiente',
            'preparando'
        ].includes(estadoPedido);

    }

    canDeleteItems(estadoPedido) {

        return estadoPedido === 'pendiente';

    }

    canCharge(estadoPedido, estadoPago) {

        return (
            estadoPedido === 'entregado' &&
            estadoPago === 'pendiente'
        );

    }

    canClose(estadoPedido, estadoPago) {

        return (
            estadoPedido === 'entregado' &&
            estadoPago === 'pagado'
        );

    }

}

module.exports = new OrderEngineService();