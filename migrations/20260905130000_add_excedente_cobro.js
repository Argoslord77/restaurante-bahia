// Registra por separado el importe pagado por encima del total de la orden.
// No se mezcla con la propina: permite auditar diferencias de caja y cambios.
exports.up = function (knex) {
    return knex.schema.alterTable('pedidos', table => {
        table.decimal('excedente_cobro', 10, 2).notNullable().defaultTo(0).after('propina');
    });
};

exports.down = function (knex) {
    return knex.schema.alterTable('pedidos', table => {
        table.dropColumn('excedente_cobro');
    });
};
