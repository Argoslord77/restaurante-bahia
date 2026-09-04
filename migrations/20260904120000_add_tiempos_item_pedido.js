// migrations/20260904120000_add_tiempos_item_pedido.js
//
// Traza de tiempos por ítem de la orden (`detalles_pedido`).
//
// El reporte de Ventas / Pedidos necesita informar cuánto tardó cada plato,
// desde que se envió a producción hasta que se entregó en la mesa, y quién lo
// sacó. Hoy el estado del ítem cambia con un UPDATE plano y el tiempo se pierde.
//
//   enviado_en             → la comanda se envió a cocina/bar
//   listo_en               → producción la marcó lista
//   entregado_en           → el dependiente la entregó en la mesa
//   usuario_produccion_id  → quién la marcó lista (cocinero / bartender)
//
// Todo es NULLABLE a propósito: las órdenes anteriores no tienen trazabilidad y
// la aplicación funciona igual con la migración aplicada que sin ella (las
// columnas de tiempos simplemente muestran «—»). Ver config/schema.js.
//
// Equivalente sin knex: scripts/migracion_tiempos_item_pedido.sql

const TABLA = 'detalles_pedido';

/** True si la columna aún no existe (permite ejecutar la migración dos veces). */
async function falta(knex, columna) {
    return !(await knex.schema.hasColumn(TABLA, columna));
}

exports.up = async function (knex) {
    if (await falta(knex, 'enviado_en')) {
        await knex.schema.alterTable(TABLA, (t) => {
            t.dateTime('enviado_en').nullable().after('afecta_inventario');
        });
    }
    if (await falta(knex, 'listo_en')) {
        await knex.schema.alterTable(TABLA, (t) => {
            t.dateTime('listo_en').nullable().after('enviado_en');
        });
    }
    if (await falta(knex, 'entregado_en')) {
        await knex.schema.alterTable(TABLA, (t) => {
            t.dateTime('entregado_en').nullable().after('listo_en');
            t.index(['id_pedido', 'entregado_en'], 'idx_dp_pedido_entregado');
        });
    }
    if (await falta(knex, 'usuario_produccion_id')) {
        await knex.schema.alterTable(TABLA, (t) => {
            // Firmado y del mismo tamaño que usuarios.id (int(11)): MySQL exige
            // coincidencia exacta de tipo y signo para poder crear la FK.
            t.integer('usuario_produccion_id').nullable().after('entregado_en');
        });
    }

    // La FK se intenta por separado: en instalaciones con usuarios depurados a
    // mano podría haber filas huérfanas y no debe tumbar la migración entera.
    try {
        await knex.schema.alterTable(TABLA, (t) => {
            t.foreign('usuario_produccion_id', 'fk_dp_usuario_produccion')
                .references('id').on('usuarios')
                .onDelete('SET NULL').onUpdate('RESTRICT');
        });
    } catch (error) {
        console.warn('[migración] No se pudo crear fk_dp_usuario_produccion:', error.message);
    }
};

exports.down = async function (knex) {
    try {
        await knex.schema.alterTable(TABLA, (t) => {
            t.dropForeign('usuario_produccion_id', 'fk_dp_usuario_produccion');
        });
    } catch (_) { /* la FK puede no existir */ }

    try {
        await knex.schema.alterTable(TABLA, (t) => {
            t.dropIndex(['id_pedido', 'entregado_en'], 'idx_dp_pedido_entregado');
        });
    } catch (_) { /* el índice puede no existir */ }

    for (const columna of ['usuario_produccion_id', 'entregado_en', 'listo_en', 'enviado_en']) {
        if (!(await falta(knex, columna))) {
            await knex.schema.alterTable(TABLA, (t) => t.dropColumn(columna));
        }
    }
};
