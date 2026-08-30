// migrations/20260829120000_add_unidad_medida_salidas_manuales.js
//
// Agrega el campo de unidad de medida a las salidas manuales de inventario,
// alineándolas con las entradas de almacén (lotes.unidad_medida_id).
//
// La columna es NULLABLE a propósito: los registros históricos no la tienen y
// el sistema muestra para ellos la unidad de inventario del producto.
//
// También puede aplicarse manualmente (sin knex) con:
//   ALTER TABLE salidas_manuales
//       ADD COLUMN unidad_medida_id BIGINT UNSIGNED NULL AFTER cantidad,
//       ADD CONSTRAINT fk_sm_unidad FOREIGN KEY (unidad_medida_id)
//           REFERENCES unidades_medida (id) ON DELETE SET NULL;

exports.up = function(knex) {
    return knex.schema.alterTable('salidas_manuales', (table) => {
        table.bigint('unidad_medida_id', 20).unsigned().nullable().after('cantidad');
        table.foreign('unidad_medida_id', 'fk_sm_unidad')
            .references('id').on('unidades_medida')
            .onDelete('SET NULL');
    });
};

exports.down = function(knex) {
    return knex.schema.alterTable('salidas_manuales', (table) => {
        table.dropForeign('unidad_medida_id', 'fk_sm_unidad');
        table.dropColumn('unidad_medida_id');
    });
};
