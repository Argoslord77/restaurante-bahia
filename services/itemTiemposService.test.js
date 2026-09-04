// services/itemTiemposService.test.js
// Verifica el sello de tiempo del ciclo de vida de los ítems y, sobre todo, la
// tolerancia al despliegue: si la migración todavía no está aplicada el POS
// debe seguir funcionando con el UPDATE simple de estado.
const ItemTiempos = require('./itemTiemposService');

function crearPool({ fallaPorColumna = false } = {}) {
    const llamadas = [];
    return {
        llamadas,
        query: jest.fn(async (sql, params) => {
            llamadas.push({ sql, params });
            if (fallaPorColumna && /enviado_en|entregado_en|cancelado_en|area_preparacion/.test(sql)) {
                const err = new Error("Unknown column 'enviado_en' in 'field list'");
                err.code = 'ER_BAD_FIELD_ERROR';
                err.errno = 1054;
                throw err;
            }
            return [{ affectedRows: 1 }];
        })
    };
}

describe('itemTiemposService', () => {
    beforeEach(() => {
        ItemTiempos.marcarConTiempos();
    });

    describe('camposTransicion', () => {
        it('sella el envío a producción con su área', () => {
            const { sets, params } = ItemTiempos.camposTransicion('en_bar');
            expect(sets.join(' ')).toContain('enviado_en = COALESCE(enviado_en, NOW())');
            expect(sets.join(' ')).toContain('area_preparacion');
            expect(params).toEqual(['bar']);
        });

        it('registra el cocinero que marca el plato como listo', () => {
            const { sets, params } = ItemTiempos.camposTransicion('listo', { usuarioId: 20 });
            expect(sets.join(' ')).toContain('listo_en = COALESCE(listo_en, NOW())');
            expect(sets.join(' ')).toContain('id_usuario_preparacion');
            expect(params).toEqual([20]);
        });

        it('registra la entrega y rellena las etapas previas que falten', () => {
            const { sets, params } = ItemTiempos.camposTransicion('entregado', { usuarioId: 4 });
            const texto = sets.join(' ');
            expect(texto).toContain('entregado_en = COALESCE(entregado_en, NOW())');
            expect(texto).toContain('listo_en = COALESCE(listo_en, entregado_en)');
            expect(texto).toContain('enviado_en = COALESCE(enviado_en, listo_en)');
            expect(params).toEqual([4]);
        });

        it('no añade responsables cuando no viene usuario', () => {
            const { params } = ItemTiempos.camposTransicion('entregado', {});
            expect(params).toEqual([]);
        });

        it('sella la cancelación', () => {
            const { sets } = ItemTiempos.camposTransicion('cancelado');
            expect(sets).toEqual(['cancelado_en = COALESCE(cancelado_en, NOW())']);
        });
    });

    describe('sellarItem', () => {
        it('actualiza estado y tiempos en una sola consulta', async () => {
            const pool = crearPool();
            const afectados = await ItemTiempos.sellarItem(pool, 52, 'entregado', { usuarioId: 4 });

            expect(afectados).toBe(1);
            expect(pool.query).toHaveBeenCalledTimes(1);
            const { sql, params } = pool.llamadas[0];
            expect(sql).toMatch(/^UPDATE detalles_pedido SET estado_item = \?, entregado_en/);
            expect(params[0]).toBe('entregado');
            expect(params[params.length - 1]).toBe(52);
        });

        it('cae al UPDATE simple si la base no tiene las columnas y no vuelve a intentarlo', async () => {
            const pool = crearPool({ fallaPorColumna: true });

            await ItemTiempos.sellarItem(pool, 52, 'entregado', { usuarioId: 4 });
            expect(ItemTiempos.tiemposDisponibles()).toBe(false);
            expect(pool.llamadas).toHaveLength(2);
            expect(pool.llamadas[1].sql).toBe('UPDATE detalles_pedido SET estado_item = ? WHERE id = ?');
            expect(pool.llamadas[1].params).toEqual(['entregado', 52]);

            await ItemTiempos.sellarItem(pool, 53, 'listo', { usuarioId: 20 });
            expect(pool.llamadas).toHaveLength(3);
            expect(pool.llamadas[2].sql).toBe('UPDATE detalles_pedido SET estado_item = ? WHERE id = ?');
        });

        it('propaga los errores que no son de columnas faltantes', async () => {
            const pool = { query: jest.fn(async () => { throw new Error('Deadlock encontrado'); }) };
            await expect(ItemTiempos.sellarItem(pool, 1, 'listo')).rejects.toThrow('Deadlock');
            expect(ItemTiempos.tiemposDisponibles()).toBe(true);
        });
    });

    describe('sellarItemsDePedido', () => {
        it('excluye los ítems ya entregados o cancelados', async () => {
            const pool = crearPool();
            await ItemTiempos.sellarItemsDePedido(pool, 22, 'entregado', { usuarioId: 4 });

            const { sql } = pool.llamadas[0];
            expect(sql).toContain("estado_item NOT IN ('entregado', 'cancelado')");
        });

        it('en una cancelación solo excluye los ya cancelados', async () => {
            const pool = crearPool();
            await ItemTiempos.sellarItemsDePedido(pool, 22, 'cancelado');

            expect(pool.llamadas[0].sql).toContain("estado_item NOT IN ('cancelado')");
        });
    });

    describe('sellarCancelacion', () => {
        it('sella la hora de cancelación y admite campos extra', async () => {
            const pool = crearPool();
            await ItemTiempos.sellarCancelacion(pool, [52, 53], {
                afectaInventario: 0,
                sets: ['notas_especiales = ?'],
                params: ['CANCELADO: sin stock']
            });

            const { sql, params } = pool.llamadas[0];
            expect(sql).toContain('cancelado_en = COALESCE(cancelado_en, NOW())');
            expect(sql).toContain('notas_especiales = ?');
            expect(sql).toContain('afecta_inventario = 0');
            expect(sql).toContain('id IN (?, ?)');
            expect(params).toEqual(['CANCELADO: sin stock', 52, 53]);
        });

        it('no emite consultas cuando no hay ítems válidos', async () => {
            const pool = crearPool();
            const afectados = await ItemTiempos.sellarCancelacion(pool, [], {});
            expect(afectados).toBe(0);
            expect(pool.query).not.toHaveBeenCalled();
        });

        it('sin la migración mantiene el estado y el inventario, sin intentar sellar', async () => {
            const pool = crearPool({ fallaPorColumna: true });
            await ItemTiempos.sellarCancelacion(pool, [52], { afectaInventario: 1 });

            expect(pool.llamadas).toHaveLength(2);
            expect(pool.llamadas[1].sql).toContain("estado_item = 'cancelado'");
            expect(pool.llamadas[1].sql).toContain('afecta_inventario = 1');
        });
    });

    describe('sellarEnvio', () => {
        it('sella el área de los ítems que nacen en cocina o bar', async () => {
            const pool = crearPool();
            await ItemTiempos.sellarEnvio(pool, [60, 61], 'en_cocina');

            const { sql, params } = pool.llamadas[0];
            expect(sql).toContain('enviado_en = COALESCE(enviado_en, NOW())');
            expect(params).toEqual(['cocina', 60, 61]);
        });

        it('no hace nada con ítems en espera (aún no salen a producción)', async () => {
            const pool = crearPool();
            const afectados = await ItemTiempos.sellarEnvio(pool, [60], 'en_espera');
            expect(afectados).toBe(0);
            expect(pool.query).not.toHaveBeenCalled();
        });

        it('sin la migración no intenta escribir columnas inexistentes', async () => {
            const pool = crearPool({ fallaPorColumna: true });
            const afectados = await ItemTiempos.sellarEnvio(pool, [60], 'en_bar');

            expect(afectados).toBe(0);
            expect(pool.llamadas).toHaveLength(1); // solo el intento, sin reintento
        });
    });

    describe('areaDe', () => {
        it('clasifica cocina, bar y sin área', () => {
            expect(ItemTiempos.areaDe('en_bar')).toBe('bar');
            expect(ItemTiempos.areaDe('en_cocina')).toBe('cocina');
            expect(ItemTiempos.areaDe('en_preparacion')).toBe('cocina');
            expect(ItemTiempos.areaDe('en_espera')).toBeNull();
            expect(ItemTiempos.areaDe('entregado')).toBeNull();
        });
    });
});
