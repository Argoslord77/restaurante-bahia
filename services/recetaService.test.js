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
