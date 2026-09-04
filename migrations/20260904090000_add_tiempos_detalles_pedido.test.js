// migrations/20260904090000_add_tiempos_detalles_pedido.test.js
// La migración no se puede ejecutar aquí (no hay MySQL), pero sí se puede
// EJECUTAR SU LÓGICA contra un knex simulado: así se comprueba el SQL que
// genera, el orden de los pasos y que sea idempotente cuando el cliente ya
// aplicó el script SQL a mano.
const migracion = require('./20260904090000_add_tiempos_detalles_pedido');

const COLUMNAS_NUEVAS = [
    'creado_en', 'enviado_en', 'area_preparacion', 'listo_en',
    'entregado_en', 'cancelado_en', 'id_usuario_preparacion', 'id_usuario_entrega'
];

function crearKnex({ columnas = [], indices = [] } = {}) {
    const crudas = [];
    const knex = {
        raw: jest.fn(async (sql) => {
            const texto = String(sql).replace(/\s+/g, ' ');
            crudas.push(texto);
            if (/information_schema\.COLUMNS/i.test(texto)) return columnas.map(nombre => ({ nombre }));
            if (/information_schema\.STATISTICS/i.test(texto)) return indices.map(nombre => ({ nombre }));
            return [];
        })
    };
    return { knex, crudas };
}

describe('migración de tiempos de detalles_pedido', () => {
    it('crea las ocho columnas del ciclo de vida en el orden correcto', async () => {
        const { knex, crudas } = crearKnex();

        await migracion.up(knex);

        const alter = crudas.find(s => /ALTER TABLE `detalles_pedido` ADD COLUMN/.test(s));
        expect(alter).toBeDefined();
        COLUMNAS_NUEVAS.forEach(columna => {
            expect(alter).toContain(`ADD COLUMN \`${columna}\``);
        });
        // creado_en queda anclada tras afecta_inventario y las demás en cadena.
        expect(alter).toMatch(/ADD COLUMN `creado_en` DATETIME NULL DEFAULT NULL AFTER `afecta_inventario`/);
        expect(alter).toMatch(/ADD COLUMN `entregado_en` DATETIME NULL DEFAULT NULL AFTER `listo_en`/);
    });

    it('reconstruye el histórico y deja creado_en obligatorio con valor por defecto', async () => {
        const { knex, crudas } = crearKnex();

        await migracion.up(knex);

        expect(crudas.some(s => /SET dp\.creado_en = p\.creado_en/.test(s))).toBe(true);
        expect(crudas.some(s => /SET dp\.entregado_en = COALESCE\(p\.fecha_cierre, p\.actualizado_en\)/.test(s))).toBe(true);
        expect(crudas.some(s => /SET area_preparacion = 'bar'/.test(s))).toBe(true);
        expect(crudas.some(s => /MODIFY COLUMN `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP/.test(s))).toBe(true);
    });

    it('crea los índices de consulta y las claves foráneas de responsables', async () => {
        const { knex, crudas } = crearKnex();

        await migracion.up(knex);

        expect(crudas).toContain('ALTER TABLE `detalles_pedido` ADD KEY `idx_dp_entregado_en` (`entregado_en`)');
        expect(crudas).toContain('ALTER TABLE `detalles_pedido` ADD KEY `idx_dp_pedido_estado_item` (`id_pedido`, `estado_item`)');
        expect(crudas.some(s => /ADD CONSTRAINT `fk_dp_usuario_preparacion` FOREIGN KEY \(`id_usuario_preparacion`\)/.test(s))).toBe(true);
        expect(crudas.some(s => /ON DELETE SET NULL/.test(s))).toBe(true);
    });

    it('es idempotente: si el script SQL ya se aplicó no vuelve a crear nada', async () => {
        const { knex, crudas } = crearKnex({
            columnas: ['id', 'id_pedido', 'estado_item', ...COLUMNAS_NUEVAS],
            indices: ['PRIMARY', 'fk_dp_pedido', 'idx_dp_entregado_en', 'idx_dp_creado_en',
                'idx_dp_pedido_estado_item', 'fk_dp_usuario_preparacion', 'fk_dp_usuario_entrega']
        });

        await migracion.up(knex);

        expect(crudas.some(s => /ADD COLUMN/.test(s))).toBe(false);
        expect(crudas.some(s => /ADD KEY/.test(s))).toBe(false);
        expect(crudas.some(s => /ADD CONSTRAINT/.test(s))).toBe(false);
        // Aun así repasa el histórico (no hace daño y cubre filas nuevas).
        expect(crudas.some(s => /SET dp\.creado_en = p\.creado_en/.test(s))).toBe(true);
    });

    it('un fallo de la deducción de área por categoría no aborta la migración', async () => {
        const { knex } = crearKnex();
        knex.raw.mockImplementation(async (sql) => {
            const texto = String(sql);
            if (/categorias_platillos/.test(texto)) throw new Error("Table 'categorias_platillos' doesn't exist");
            if (/information_schema\.COLUMNS/i.test(texto)) return [];
            if (/information_schema\.STATISTICS/i.test(texto)) return [];
            return [];
        });

        await expect(migracion.up(knex)).resolves.not.toThrow();
    });

    it('down revierte claves, índices y columnas', async () => {
        const { knex, crudas } = crearKnex({
            columnas: ['id', ...COLUMNAS_NUEVAS],
            indices: ['idx_dp_entregado_en', 'idx_dp_creado_en', 'idx_dp_pedido_estado_item',
                'fk_dp_usuario_preparacion', 'fk_dp_usuario_entrega']
        });

        await migracion.down(knex);

        expect(crudas.some(s => /DROP FOREIGN KEY `fk_dp_usuario_preparacion`/.test(s))).toBe(true);
        expect(crudas.some(s => /DROP INDEX `idx_dp_entregado_en`/.test(s))).toBe(true);
        COLUMNAS_NUEVAS.forEach(columna => {
            expect(crudas.some(s => s === `ALTER TABLE \`detalles_pedido\` DROP COLUMN \`${columna}\``)).toBe(true);
        });
    });
});
