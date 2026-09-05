// Vincula obligatoriamente el bartender seleccionado al turno (la aplicación
// rechaza aperturas sin cocinero y bartender; las filas históricas conservan
// NULL para no romper datos existentes).
exports.up = function (knex) {
    return knex.schema.alterTable('turnos_servicio', table => {
        table.integer('bartender_id').unsigned().nullable().after('cocinero_id');
        table.index('bartender_id', 'idx_ts_bartender');
        table.foreign('bartender_id', 'fk_ts_bartender').references('id').inTable('usuarios').onDelete('SET NULL');
    });
};
exports.down = function (knex) {
    return knex.schema.alterTable('turnos_servicio', table => {
        table.dropForeign('fk_ts_bartender');
        table.dropIndex('bartender_id', 'idx_ts_bartender');
        table.dropColumn('bartender_id');
    });
};
