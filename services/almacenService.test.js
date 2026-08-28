// services/almacenService.test.js
// Reglas de la categoría operativa de almacenes y resolución del almacén
// de producción que usa el POS al descontar insumos.

jest.mock('../models/almacenModel');
const AlmacenModel = require('../models/almacenModel');
const AlmacenService = require('./almacenService');

const CENTRAL = { id: 1, codigo: 'ALM-CEN', nombre: 'Almacén Central', tipo: 'principal', categoria_efectiva: 'logistico', activo: 1 };
const COCINA = { id: 2, codigo: 'COC', nombre: 'Cocina Caliente', tipo: 'cocina', categoria_efectiva: 'produccion', activo: 1 };
const BARRA_INACTIVA = { id: 3, codigo: 'BAR', nombre: 'Barra', tipo: 'bar', categoria_efectiva: 'produccion', activo: 0 };

describe('AlmacenService._normalizarCategoria', () => {
    it('respeta la categoría elegida explícitamente', () => {
        expect(AlmacenService._normalizarCategoria('produccion', 'principal')).toBe('produccion');
        expect(AlmacenService._normalizarCategoria('logistico', 'cocina')).toBe('logistico');
    });

    it('infiere la categoría desde el tipo cuando no se informa', () => {
        expect(AlmacenService._normalizarCategoria(null, 'cocina')).toBe('produccion');
        expect(AlmacenService._normalizarCategoria('', 'bar')).toBe('produccion');
        expect(AlmacenService._normalizarCategoria(undefined, 'despensa')).toBe('logistico');
    });

    it('cae en logístico ante valores desconocidos (opción segura: el POS no descuenta de él)', () => {
        expect(AlmacenService._normalizarCategoria('cualquiera', 'otro')).toBe('logistico');
        expect(AlmacenService._normalizarCategoria(null, null)).toBe('logistico');
    });
});

describe('AlmacenService.resolverAlmacenProduccion', () => {
    beforeEach(() => jest.clearAllMocks());

    it('acepta un almacén de producción indicado explícitamente', async () => {
        AlmacenModel.getById.mockResolvedValue(COCINA);
        await expect(AlmacenService.resolverAlmacenProduccion(7, 2)).resolves.toMatchObject({ id: 2 });
    });

    it('RECHAZA un almacén logístico indicado explícitamente', async () => {
        AlmacenModel.getById.mockResolvedValue(CENTRAL);
        await expect(AlmacenService.resolverAlmacenProduccion(7, 1))
            .rejects.toThrow(/solo puede realizarse en almacenes de producción/);
    });

    it('rechaza un almacén de producción inactivo', async () => {
        AlmacenModel.getById.mockResolvedValue(BARRA_INACTIVA);
        await expect(AlmacenService.resolverAlmacenProduccion(7, 3)).rejects.toThrow(/inactivo/);
    });

    it('resuelve por la categoría de menú del platillo cuando no se indica almacén', async () => {
        AlmacenModel.getAlmacenProduccionPorPlatillo.mockResolvedValue(COCINA);
        const res = await AlmacenService.resolverAlmacenProduccion(7, null);
        expect(res.id).toBe(2);
        expect(AlmacenModel.getAlmacenProduccionPorPlatillo).toHaveBeenCalledWith(7);
        expect(AlmacenModel.getPrimerAlmacenProduccion).not.toHaveBeenCalled();
    });

    it('usa el primer almacén de producción como fallback', async () => {
        AlmacenModel.getAlmacenProduccionPorPlatillo.mockResolvedValue(null);
        AlmacenModel.getPrimerAlmacenProduccion.mockResolvedValue(COCINA);
        await expect(AlmacenService.resolverAlmacenProduccion(7, null)).resolves.toMatchObject({ id: 2 });
    });

    it('falla con instrucciones claras si no existe ningún almacén de producción', async () => {
        AlmacenModel.getAlmacenProduccionPorPlatillo.mockResolvedValue(null);
        AlmacenModel.getPrimerAlmacenProduccion.mockResolvedValue(null);
        await expect(AlmacenService.resolverAlmacenProduccion(7, null))
            .rejects.toThrow(/No hay ningún almacén de producción activo/);
    });
});

describe('AlmacenService.esDeProduccion', () => {
    beforeEach(() => jest.clearAllMocks());

    it('distingue correctamente ambas categorías', async () => {
        AlmacenModel.getById.mockResolvedValue(COCINA);
        await expect(AlmacenService.esDeProduccion(2)).resolves.toBe(true);

        AlmacenModel.getById.mockResolvedValue(CENTRAL);
        await expect(AlmacenService.esDeProduccion(1)).resolves.toBe(false);

        AlmacenModel.getById.mockResolvedValue(BARRA_INACTIVA);
        await expect(AlmacenService.esDeProduccion(3)).resolves.toBe(false);
    });
});
