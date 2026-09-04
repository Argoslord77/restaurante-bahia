// migrations/20260904120000_add_tiempos_entrega_detalles_pedido.js
//
// Tiempos de elaboración/entrega por ítem y cocinero responsable, para el
// reporte profesional de Pedidos / Ventas (duracion del servicio, tiempo de
// entrega de cada ítem en h:m:s y quién lo preparó en cocina/bar).
//
// Las columnas son NULLABLE a propósito: los ítems históricos no las tienen y
// el reporte muestra "—" en esos tiempos.
//
// También puede aplicarse manualmente (sin knex) con el script:
//   scripts/migracion_tiempos_entrega_pedidos.sql

exports.up = function(knex) {
    return knex.schema.alterTable('detalles_pedido', (table) => {
        table.datetime('hora_enviado').nullable().after('afecta_inventario');
        table.datetime('hora_listo').nullable().after('hora_enviado');
        table.datetime('hora_entregado').nullable().after('hora_listo');
        table.integer('cocinado_por').nullable().after('hora_entregado');
        table.foreign('cocinado_por', 'fk_dp_cocinado_por')
            .references('id').on('usuarios')
            .onDelete('SET NULL');
    });
};

exports.down = function(knex) {
    return knex.schema.alterTable('detalles_pedido', (table) => {
        table.dropForeign('cocinado_por', 'fk_dp_cocinado_por');
        table.dropColumn('cocinado_por');
        table.dropColumn('hora_entregado');
        table.dropColumn('hora_listo');
        table.dropColumn('hora_enviado');
    });
};
