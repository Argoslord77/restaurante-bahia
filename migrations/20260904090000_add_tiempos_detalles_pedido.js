// migrations/20260904090000_add_tiempos_detalles_pedido.js
//
// Ciclo de vida de los ítems de una orden: sello de tiempo por transición
// (alta → envío a producción → listo → entregado/cancelado) y responsable de
// cada etapa. Sin estos campos la vista de Pedidos/Ventas no puede mostrar el
// tiempo de entrega de cada plato en h:m:s ni el cocinero que lo preparó.
//
// Equivalente en SQL puro (para despliegue manual sin knex):
//   mysql -u root -p restaurante_db < scripts/migracion_tiempos_detalles_pedido.sql
//
// La migración es idempotente: si las columnas ya existen (porque se aplicó el
// script SQL a mano) no vuelve a crearlas.
'use strict';

const TABLA = 'detalles_pedido';

// [columna, definición SQL] en el orden en que deben quedar en la tabla.
const COLUMNAS = [
    ['creado_en', "DATETIME NULL DEFAULT NULL AFTER `afecta_inventario`"],
    ['enviado_en', "DATETIME NULL DEFAULT NULL AFTER `creado_en`"],
    ['area_preparacion', "ENUM('cocina','bar') NULL DEFAULT NULL AFTER `enviado_en`"],
    ['listo_en', "DATETIME NULL DEFAULT NULL AFTER `area_preparacion`"],
    ['entregado_en', "DATETIME NULL DEFAULT NULL AFTER `listo_en`"],
    ['cancelado_en', "DATETIME NULL DEFAULT NULL AFTER `entregado_en`"],
    ['id_usuario_preparacion', 'INT(11) NULL DEFAULT NULL AFTER `cancelado_en`'],
    ['id_usuario_entrega', 'INT(11) NULL DEFAULT NULL AFTER `id_usuario_preparacion`']
];

const INDICES = [
    ['idx_dp_entregado_en', '`entregado_en`'],
    ['idx_dp_creado_en', '`creado_en`'],
    ['idx_dp_pedido_estado_item', '`id_pedido`, `estado_item`']
];

const FKS = [
    ['fk_dp_usuario_preparacion', 'id_usuario_preparacion'],
    ['fk_dp_usuario_entrega', 'id_usuario_entrega']
];

async function columnasExistentes(knex) {
    const filas = await knex.raw(
        `SELECT COLUMN_NAME AS nombre
           FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
        [TABLA]
    );
    // mysql2 devuelve [filas, meta]; knex.raw ya entrega el primer elemento.
    const lista = Array.isArray(filas) ? filas : (filas && filas[0]) || [];
    return new Set(lista.map(f => String(f.nombre || f.COLUMN_NAME || '').toLowerCase()));
}

async function indicesExistentes(knex) {
    const filas = await knex.raw(
        `SELECT DISTINCT INDEX_NAME AS nombre
           FROM information_schema.STATISTICS
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
        [TABLA]
    );
    const lista = Array.isArray(filas) ? filas : (filas && filas[0]) || [];
    return new Set(lista.map(f => String(f.nombre || f.INDEX_NAME || '').toLowerCase()));
}

exports.up = async function (knex) {
    const existentes = await columnasExistentes(knex);
    const faltantes = COLUMNAS.filter(([nombre]) => !existentes.has(nombre.toLowerCase()));

    if (faltantes.length) {
        await knex.raw(
            `ALTER TABLE \`${TABLA}\` ${faltantes.map(([n, def]) => `ADD COLUMN \`${n}\` ${def}`).join(', ')}`
        );
    }

    // ---- Reconstrucción aproximada del histórico -------------------------
    // Las órdenes anteriores a la migración no tienen tiempos reales: se usa
    // la apertura de la orden como alta del ítem y el cierre de la cuenta como
    // entrega, para que los reportes no queden vacíos.
    await knex.raw(`
        UPDATE \`${TABLA}\` dp
        INNER JOIN pedidos p ON p.id = dp.id_pedido
        SET dp.creado_en = p.creado_en
        WHERE dp.creado_en IS NULL
    `);
    await knex.raw(`
        UPDATE \`${TABLA}\` dp
        SET dp.enviado_en = dp.creado_en
        WHERE dp.enviado_en IS NULL
          AND dp.estado_item IN ('en_cocina', 'en_bar', 'en_preparacion', 'listo', 'entregado')
    `);
    await knex.raw(`
        UPDATE \`${TABLA}\` dp
        INNER JOIN pedidos p ON p.id = dp.id_pedido
        SET dp.listo_en = COALESCE(p.fecha_cierre, p.actualizado_en)
        WHERE dp.listo_en IS NULL AND dp.estado_item IN ('listo', 'entregado')
    `);
    await knex.raw(`
        UPDATE \`${TABLA}\` dp
        INNER JOIN pedidos p ON p.id = dp.id_pedido
        SET dp.entregado_en = COALESCE(p.fecha_cierre, p.actualizado_en),
            dp.id_usuario_entrega = COALESCE(dp.id_usuario_entrega, p.id_usuario_cajero)
        WHERE dp.entregado_en IS NULL AND dp.estado_item = 'entregado'
    `);
    await knex.raw(`
        UPDATE \`${TABLA}\` dp
        INNER JOIN pedidos p ON p.id = dp.id_pedido
        SET dp.cancelado_en = COALESCE(p.fecha_cierre, p.actualizado_en)
        WHERE dp.cancelado_en IS NULL AND dp.estado_item = 'cancelado'
    `);
    await knex.raw(`
        UPDATE \`${TABLA}\` SET area_preparacion = 'bar'
        WHERE area_preparacion IS NULL AND estado_item = 'en_bar'
    `);
    await knex.raw(`
        UPDATE \`${TABLA}\` SET area_preparacion = 'cocina'
        WHERE area_preparacion IS NULL AND estado_item IN ('en_cocina', 'en_preparacion')
    `);
    await knex.raw(`
        UPDATE \`${TABLA}\` dp
        INNER JOIN platillos_menu pm
            ON pm.id = dp.id_platillo AND (dp.es_platillo_dia = 0 OR dp.es_platillo_dia IS NULL)
        INNER JOIN categorias_platillos cp ON cp.id = pm.categoria
        SET dp.area_preparacion = IF(UPPER(COALESCE(cp.tipo, '')) = 'BEBIDAS', 'bar', 'cocina')
        WHERE dp.area_preparacion IS NULL
    `).catch(() => { /* categorías sin tipo: el área queda nula, no es crítico */ });

    // ---- creado_en pasa a obligatorio con valor por defecto --------------
    await knex.raw(
        `ALTER TABLE \`${TABLA}\` MODIFY COLUMN \`creado_en\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`
    );

    // ---- Índices y claves foráneas --------------------------------------
    const idx = await indicesExistentes(knex);
    for (const [nombre, columnas] of INDICES) {
        if (!idx.has(nombre.toLowerCase())) {
            await knex.raw(`ALTER TABLE \`${TABLA}\` ADD KEY \`${nombre}\` (${columnas})`);
        }
    }
    const idxFinal = await indicesExistentes(knex);
    for (const [nombre, columna] of FKS) {
        if (!idxFinal.has(nombre.toLowerCase())) {
            await knex.raw(
                `ALTER TABLE \`${TABLA}\` ADD CONSTRAINT \`${nombre}\`
                 FOREIGN KEY (\`${columna}\`) REFERENCES \`usuarios\` (\`id\`) ON DELETE SET NULL`
            );
        }
    }
};

exports.down = async function (knex) {
    const existentes = await columnasExistentes(knex);
    const idx = await indicesExistentes(knex);

    for (const [nombre] of FKS) {
        if (idx.has(nombre.toLowerCase())) {
            await knex.raw(`ALTER TABLE \`${TABLA}\` DROP FOREIGN KEY \`${nombre}\``);
        }
    }
    const idxTrasFk = await indicesExistentes(knex);
    for (const [nombre] of INDICES) {
        if (idxTrasFk.has(nombre.toLowerCase())) {
            await knex.raw(`ALTER TABLE \`${TABLA}\` DROP INDEX \`${nombre}\``);
        }
    }
    for (const [nombre] of COLUMNAS.slice().reverse()) {
        if (existentes.has(nombre.toLowerCase())) {
            await knex.raw(`ALTER TABLE \`${TABLA}\` DROP COLUMN \`${nombre}\``);
        }
    }
};
