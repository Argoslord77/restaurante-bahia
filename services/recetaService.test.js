// services/recetaService.test.js
// Cobertura de la segmentación de existencias por categoría de almacén y de la
// regla de negocio central: el POS solo descuenta de almacenes de PRODUCCIÓN.

jest.mock('../config/db', () => ({
    query: jest.fn(),
    getConnection: jest.fn()
}));
jest.mock('../config/logger', () => ({
    info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn()
}));
jest.mock('../models/recetaModel');
jest.mock('../models/unidadMedidaModel', () => ({ getActivas: jest.fn() }));
jest.mock('../models/productoModel', () => ({}));
jest.mock('../models/menuModel', () => ({ getAll: jest.fn() }));
jest.mock('./almacenService');

const db = require('../config/db');
const Receta = require('../models/recetaModel');
const AlmacenService = require('./almacenService');
const RecetaService = require('./recetaService');

const ALMACEN_LOGISTICO = { id: 1, codigo: 'ALM-CEN', nombre: 'Almacén Central', categoria: 'logistico' };
const ALMACEN_COCINA = { id: 2, codigo: 'COC', nombre: 'Cocina Caliente', categoria: 'produccion' };

describe('RecetaService.fusionarStockPorAlmacen', () => {
    const detalles = [
        { id: 1, producto_id: 10, producto_nombre: 'Camarón', cantidad_requerida: 0.25, stock_logistico: 0, stock_produccion: 0 },
        { id: 2, producto_id: 11, producto_nombre: 'Aceite', cantidad_requerida: 0.03, stock_logistico: 0, stock_produccion: 0 }
    ];

    const desglose = [
        { producto_id: 10, almacen_id: 1, almacen_codigo: 'ALM-CEN', almacen_nombre: 'Almacén Central', almacen_categoria: 'logistico', stock: '25.0000' },
        { producto_id: 10, almacen_id: 2, almacen_codigo: 'COC', almacen_nombre: 'Cocina Caliente', almacen_categoria: 'produccion', stock: '5.0000' },
        { producto_id: 10, almacen_id: 3, almacen_codigo: 'BAR', almacen_nombre: 'Barra', almacen_categoria: 'produccion', stock: '2.0000' },
        { producto_id: 11, almacen_id: 1, almacen_codigo: 'ALM-CEN', almacen_nombre: 'Almacén Central', almacen_categoria: 'logistico', stock: '18.0000' },
        { producto_id: 11, almacen_id: 2, almacen_codigo: 'COC', almacen_nombre: 'Cocina Caliente', almacen_categoria: 'produccion', stock: '0.0000' }
    ];

    it('suma por separado el stock logístico y el de producción', () => {
        const [camaron, aceite] = RecetaService.fusionarStockPorAlmacen(detalles, desglose);

        expect(camaron.stock_logistico).toBe(25);
        expect(camaron.stock_produccion).toBe(7); // 5 (cocina) + 2 (barra)

        expect(aceite.stock_logistico).toBe(18);
        expect(aceite.stock_produccion).toBe(0); // existe, pero solo en el central
    });

    it('lista el desglose de cada almacén de producción, incluidos los que están en cero', () => {
        const [camaron, aceite] = RecetaService.fusionarStockPorAlmacen(detalles, desglose);

        expect(camaron.almacenes_produccion).toEqual([
            { almacen_id: 2, codigo: 'COC', nombre: 'Cocina Caliente', stock: 5 },
            { almacen_id: 3, codigo: 'BAR', nombre: 'Barra', stock: 2 }
        ]);
        expect(camaron.almacenes_logisticos).toEqual([
            { almacen_id: 1, codigo: 'ALM-CEN', nombre: 'Almacén Central', stock: 25 }
        ]);
        // El almacén en cero debe aparecer igual: es la señal de "hay que transferir"
        expect(aceite.almacenes_produccion).toEqual([
            { almacen_id: 2, codigo: 'COC', nombre: 'Cocina Caliente', stock: 0 }
        ]);
    });

    it('no rompe cuando no hay desglose disponible', () => {
        const resultado = RecetaService.fusionarStockPorAlmacen(detalles, []);
        expect(resultado).toHaveLength(2);
        expect(resultado[0].almacenes_produccion).toEqual([]);
        expect(resultado[0].stock_logistico).toBe(0);
    });
});

describe('RecetaService.descontarStockPedido (regla: nunca descuenta del logístico)', () => {
    let connection;

    beforeEach(() => {
        jest.clearAllMocks();
        connection = {
            beginTransaction: jest.fn().mockResolvedValue(),
            commit: jest.fn().mockResolvedValue(),
            rollback: jest.fn().mockResolvedValue(),
            release: jest.fn(),
            query: jest.fn().mockResolvedValue([[]])
        };
        db.getConnection.mockResolvedValue(connection);
    });

    it('descuenta del almacén de producción resuelto para el platillo', async () => {
        AlmacenService.resolverAlmacenProduccion.mockResolvedValue(ALMACEN_COCINA);
        Receta.getIngredientesParaVenta.mockResolvedValue([
            { producto_id: 10, producto_nombre: 'Camarón', cantidad_requerida: 1, porcentaje_merma: 0, es_opcional: 0 }
        ]);
        // Lote disponible en cocina
        connection.query.mockResolvedValueOnce([[{ id: 99, cantidad_actual: 10, fecha_vencimiento: null }]]);

        const res = await RecetaService.descontarStockPedido(
            [{ id_platillo: 7, cantidad: 2 }], null, 55, 3
        );

        expect(res.success).toBe(true);
        // El almacén consultado para los lotes es el de PRODUCCIÓN, no el central
        expect(Receta.getIngredientesParaVenta).toHaveBeenCalledWith(7, ALMACEN_COCINA.id);
        expect(res.movimientos[0]).toMatchObject({ almacen_id: ALMACEN_COCINA.id, cantidad: 2 });
        expect(connection.commit).toHaveBeenCalled();
    });

    it('aborta y hace rollback si se fuerza un almacén logístico', async () => {
        AlmacenService.resolverAlmacenProduccion.mockRejectedValue(
            new Error(`El almacén "${ALMACEN_LOGISTICO.nombre}" es de categoría "logistico".`)
        );

        await expect(
            RecetaService.descontarStockPedido([{ id_platillo: 7, cantidad: 1 }], ALMACEN_LOGISTICO.id, 55, 3)
        ).rejects.toThrow(/logistico/);

        expect(connection.rollback).toHaveBeenCalled();
        expect(connection.commit).not.toHaveBeenCalled();
        // Nunca se llegó a tocar un lote
        expect(Receta.getIngredientesParaVenta).not.toHaveBeenCalled();
    });

    it('falla con un mensaje accionable si el insumo solo está en el logístico', async () => {
        AlmacenService.resolverAlmacenProduccion.mockResolvedValue(ALMACEN_COCINA);
        Receta.getIngredientesParaVenta.mockResolvedValue([
            { producto_id: 11, producto_nombre: 'Aceite', cantidad_requerida: 0.5, porcentaje_merma: 0, es_opcional: 0 }
        ]);
        connection.query.mockResolvedValueOnce([[]]); // sin lotes en producción

        await expect(
            RecetaService.descontarStockPedido([{ id_platillo: 7, cantidad: 1 }], null, 55, 3)
        ).rejects.toThrow(/transferencia/i);

        expect(connection.rollback).toHaveBeenCalled();
    });
});

// ============================================================
// Observaciones: conversión receta→lote, merma alineada con la
// verificación del POS y costo real asentado en el kardex.
// ============================================================
describe('RecetaService.descontarStockPedido (conversión de unidades por lote + costo en el kardex)', () => {
    let connection;
    let llamadas;

    const UNIDADES = [
        { id: 1, codigo: 'ML', nombre: 'Mililitro', abreviatura: 'ml', tipo: 'VOLUMEN', permite_decimales: 1, activa: 1 },
        { id: 2, codigo: 'BT', nombre: 'Botella', abreviatura: 'bt', tipo: 'VOLUMEN', permite_decimales: 1, activa: 1 },
        { id: 3, codigo: 'GR', nombre: 'Gramo', abreviatura: 'gr', tipo: 'PESO', permite_decimales: 1, activa: 1 }
    ];
    // 1 botella de Ron (producto 10) = 700 ml
    const CONVERSIONES = [
        { id: 1, producto_id: 10, unidad_origen_id: 2, unidad_destino_id: 1, factor: 700, activa: 1 }
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        connection = {
            beginTransaction: jest.fn().mockResolvedValue(),
            commit: jest.fn().mockResolvedValue(),
            rollback: jest.fn().mockResolvedValue(),
            release: jest.fn(),
            query: jest.fn().mockResolvedValue([[]])
        };
        db.getConnection.mockResolvedValue(connection);
        llamadas = [];

        // El pool solo atiende la caché de unidades/conversiones del UMS
        db.query.mockImplementation(async (sql) => {
            const q = String(sql);
            if (q.includes('FROM unidades_medida')) return [UNIDADES];
            if (q.includes('FROM conversiones_unidades')) return [CONVERSIONES];
            return [[]];
        });

        // La conexión transaccional atiende lotes y captura UPDATE/INSERT
        connection.query.mockImplementation(async (sql, params = []) => {
            llamadas.push({ sql: String(sql), params });
            return [[]];
        });
    });

    const conLotes = (lotes) => {
        connection.query.mockImplementation(async (sql, params = []) => {
            llamadas.push({ sql: String(sql), params });
            const q = String(sql);
            if (q.includes('FROM lotes l')) return [lotes];
            return [[]];
        });
    };

    it('convierte el consumo a la unidad del lote (ml → botellas) y registra costo y stocks', async () => {
        AlmacenService.resolverAlmacenProduccion.mockResolvedValue(ALMACEN_COCINA);
        Receta.getIngredientesParaVenta.mockResolvedValue([
            { producto_id: 10, producto_nombre: 'Ron Añejo', cantidad_requerida: 50, unidad_medida: 'Mililitro', porcentaje_merma: 0, es_opcional: 0 }
        ]);
        conLotes([
            { id: 91, cantidad_actual: 1, fecha_vencimiento: null, costo_unitario: 700, unidad_medida_id: 2, unidad_inventario_id: 2 },
            { id: 92, cantidad_actual: 0.5, fecha_vencimiento: null, costo_unitario: 800, unidad_medida_id: 2, unidad_inventario_id: 2 }
        ]);

        // 20 tragos × 50 ml = 1000 ml = 1 botella (700 ml) + 300 ml (0.428571 bt)
        const res = await RecetaService.descontarStockPedido([{ id_platillo: 7, cantidad: 20 }], null, 55, 3);

        expect(res.success).toBe(true);
        expect(res.faltantes).toBeUndefined();
        expect(res.movimientos).toHaveLength(2);

        const updates = llamadas.filter(l => l.sql.includes('UPDATE lotes'));
        expect(updates[0].params).toEqual([0, 'AGOTADO', 91]);
        expect(updates[1].params[0]).toBeCloseTo(0.071429, 4); // 0.5 - 0.428571 botellas
        expect(updates[1].params[1]).toBe('ACTIVO');

        // Kardex con costo real: lote 91 → 1 bt × $700; lote 92 → 0.428571 bt × $800 = $342.86
        const inserts = llamadas.filter(l => l.sql.includes('INSERT INTO movimientos_inventario'));
        expect(inserts).toHaveLength(2);
        expect(inserts[0].params[4]).toBeCloseTo(1, 6);         // cantidad
        expect(inserts[0].params[6]).toBe(700);                  // costo_total
        expect(inserts[1].params[4]).toBeCloseTo(0.428571, 4);
        expect(inserts[1].params[6]).toBeCloseTo(342.857, 2);

        // El kardex ahora asienta stock_anterior/stock_nuevo del lote
        expect(inserts[0].params[7]).toBe(1);  // stock_anterior
        expect(inserts[0].params[8]).toBe(0);  // stock_nuevo

        expect(connection.commit).toHaveBeenCalled();
    });

    it('aplica la merma con la MISMA fórmula que la verificación del POS (neta / (1 - %merma))', async () => {
        AlmacenService.resolverAlmacenProduccion.mockResolvedValue(ALMACEN_COCINA);
        Receta.getIngredientesParaVenta.mockResolvedValue([
            { producto_id: 12, producto_nombre: 'Harina', cantidad_requerida: 100, unidad_medida: 'Gramo', porcentaje_merma: 20, es_opcional: 0 }
        ]);
        conLotes([
            { id: 93, cantidad_actual: 200, fecha_vencimiento: null, costo_unitario: 2, unidad_medida_id: 3, unidad_inventario_id: 3 }
        ]);

        const res = await RecetaService.descontarStockPedido([{ id_platillo: 7, cantidad: 1 }], null, 55, 3);

        expect(res.success).toBe(true);
        const updates = llamadas.filter(l => l.sql.includes('UPDATE lotes'));
        // 100 / (1 - 0.20) = 125 gr consumidos (antes: 100 × 1.2 = 120)
        expect(updates[0].params[0]).toBe(75);
        const insert = llamadas.find(l => l.sql.includes('INSERT INTO movimientos_inventario'));
        expect(insert.params[4]).toBe(125);
        expect(insert.params[6]).toBe(250); // 125 gr × $2
    });

    it('salta el lote y advierte (sin lanzar inconsistencia) si no hay factor de conversión', async () => {
        AlmacenService.resolverAlmacenProduccion.mockResolvedValue(ALMACEN_COCINA);
        Receta.getIngredientesParaVenta.mockResolvedValue([
            { producto_id: 10, producto_nombre: 'Ron Añejo', cantidad_requerida: 50, unidad_medida: 'Mililitro', porcentaje_merma: 0, es_opcional: 0 }
        ]);
        // Lote del insumo 10 en GRAMOS: sin conversión VOLUMEN↔PESO definida
        conLotes([
            { id: 94, cantidad_actual: 5, fecha_vencimiento: null, costo_unitario: 10, unidad_medida_id: 3, unidad_inventario_id: 3 }
        ]);

        const res = await RecetaService.descontarStockPedido([{ id_platillo: 7, cantidad: 1 }], null, 55, 3);

        expect(res.success).toBe(true);
        expect(llamadas.filter(l => l.sql.includes('UPDATE lotes'))).toHaveLength(0);
        expect(res.advertencias).toHaveLength(1);
        expect(res.advertencias[0].detalle).toMatch(/Sin factor de conversión/);
        expect(res.advertencias[0].detalle).toMatch(/sin descontar/);
        expect(connection.commit).toHaveBeenCalled(); // no hay rollback
    });

    it('mantiene el descuento 1:1 cuando ni la receta ni el lote declaran unidad', async () => {
        AlmacenService.resolverAlmacenProduccion.mockResolvedValue(ALMACEN_COCINA);
        Receta.getIngredientesParaVenta.mockResolvedValue([
            { producto_id: 10, producto_nombre: 'Camarón', cantidad_requerida: 1, porcentaje_merma: 0, es_opcional: 0 }
        ]);
        conLotes([
            { id: 95, cantidad_actual: 10, fecha_vencimiento: null, costo_unitario: 0, unidad_medida_id: null, unidad_inventario_id: null }
        ]);

        const res = await RecetaService.descontarStockPedido([{ id_platillo: 7, cantidad: 2 }], null, 55, 3);

        expect(res.success).toBe(true);
        expect(res.movimientos[0]).toMatchObject({ cantidad: 2 });
        const updates = llamadas.filter(l => l.sql.includes('UPDATE lotes'));
        expect(updates[0].params[0]).toBe(8);
    });
});

describe('RecetaService.verificarStockParaPedido', () => {
    beforeEach(() => jest.clearAllMocks());

    it('comprueba la disponibilidad contra el almacén de producción', async () => {
        AlmacenService.resolverAlmacenProduccion.mockResolvedValue(ALMACEN_COCINA);
        Receta.getIngredientesParaVenta.mockResolvedValue([
            { receta_id: 7, producto_nombre: 'Aceite', cantidad_requerida: 1, porcentaje_merma: 0, es_opcional: 0, stock_disponible: 0 }
        ]);

        const res = await RecetaService.verificarStockParaPedido([{ id_platillo: 7, cantidad: 1 }]);

        expect(Receta.getIngredientesParaVenta).toHaveBeenCalledWith(7, ALMACEN_COCINA.id);
        expect(res.suficiente).toBe(false);
        expect(res.errores[0]).toMatchObject({
            ingrediente: 'Aceite',
            almacen_id: ALMACEN_COCINA.id,
            almacen_nombre: ALMACEN_COCINA.nombre
        });
    });

    it('ignora los ingredientes opcionales sin stock', async () => {
        AlmacenService.resolverAlmacenProduccion.mockResolvedValue(ALMACEN_COCINA);
        Receta.getIngredientesParaVenta.mockResolvedValue([
            { receta_id: 7, producto_nombre: 'Perejil', cantidad_requerida: 1, porcentaje_merma: 0, es_opcional: 1, stock_disponible: 0 }
        ]);

        const res = await RecetaService.verificarStockParaPedido([{ id_platillo: 7, cantidad: 1 }]);
        expect(res.suficiente).toBe(true);
    });
});

describe('RecetaService: ítems que no deben explotar inventario', () => {
    let connection;

    beforeEach(() => {
        jest.clearAllMocks();
        connection = {
            beginTransaction: jest.fn().mockResolvedValue(),
            commit: jest.fn().mockResolvedValue(),
            rollback: jest.fn().mockResolvedValue(),
            release: jest.fn(),
            query: jest.fn().mockResolvedValue([[]])
        };
        db.getConnection.mockResolvedValue(connection);
        AlmacenService.resolverAlmacenProduccion.mockResolvedValue(ALMACEN_COCINA);
    });

    it('omite los platillos del día (viven en otra tabla y no tienen receta)', async () => {
        const res = await RecetaService.descontarStockPedido(
            [{ id_platillo: 7, es_platillo_dia: 1, cantidad: 3 }], null, 55, 3
        );

        expect(res.success).toBe(true);
        expect(res.movimientos).toHaveLength(0);
        // Ni siquiera se intenta resolver almacén ni receta para ellos
        expect(AlmacenService.resolverAlmacenProduccion).not.toHaveBeenCalled();
        expect(Receta.getIngredientesParaVenta).not.toHaveBeenCalled();
    });

    it('omite y reporta los platillos sin receta activa (p. ej. bebida embotellada)', async () => {
        Receta.getIngredientesParaVenta.mockResolvedValue([]);

        const res = await RecetaService.descontarStockPedido(
            [{ id_platillo: 88, cantidad: 1 }], null, 55, 3
        );

        expect(res.success).toBe(true);
        expect(res.movimientos).toHaveLength(0);
        expect(res.sin_receta).toEqual([88]);
        expect(connection.commit).toHaveBeenCalled();
    });

    it('resuelve la receta por el ID DEL PLATILLO, no por el de la receta', async () => {
        Receta.getIngredientesParaVenta.mockResolvedValue([]);
        await RecetaService.descontarStockPedido([{ id_platillo: 7, cantidad: 1 }], null, 55, 3);

        // El platillo 7 se pasa a getIngredientesParaVenta, que internamente
        // busca recetas.platillo_id = 7 (no recetas.id = 7)
        expect(Receta.getIngredientesParaVenta).toHaveBeenCalledWith(7, ALMACEN_COCINA.id);
    });
});
