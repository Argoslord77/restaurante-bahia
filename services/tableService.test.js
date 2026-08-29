// tableService.test.js
const tableService = require('./tableService');
const TableModel = require('../models/tableModel');
const UbicacionMesaModel = require('../models/ubicacionMesaModel');

// Mocks de los modelos y la base de datos
jest.mock('../models/tableModel');
jest.mock('../models/ubicacionMesaModel');
jest.mock('../config/db');

describe('TableService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('resolverUbicacion', () => {
    it('debe resolver por id del catálogo y devolver el nombre canónico', async () => {
      UbicacionMesaModel.getById.mockResolvedValue({ id: 2, nombre: 'Terraza', activo: 1 });

      const result = await tableService.resolverUbicacion(2, 'lo que sea');

      expect(result).toEqual({ ubicacion_id: 2, ubicacion: 'Terraza' });
      expect(UbicacionMesaModel.getById).toHaveBeenCalledWith(2);
    });

    it('debe rechazar un id inexistente en el catálogo', async () => {
      UbicacionMesaModel.getById.mockResolvedValue(null);

      await expect(tableService.resolverUbicacion(99, '')).rejects.toThrow('área de servicio');
    });

    it('debe aceptar id numérico en formato string', async () => {
      UbicacionMesaModel.getById.mockResolvedValue({ id: 3, nombre: 'VIP', activo: 1 });

      const result = await tableService.resolverUbicacion('3', undefined);

      expect(result).toEqual({ ubicacion_id: 3, ubicacion: 'VIP' });
      expect(UbicacionMesaModel.getById).toHaveBeenCalledWith('3');
    });

    it('retrocompatibilidad: dado solo el nombre, usa el área existente del catálogo', async () => {
      UbicacionMesaModel.getByNombre.mockResolvedValue({ id: 1, nombre: 'Salon Principal', activo: 1 });

      const result = await tableService.resolverUbicacion(null, 'Salon Principal');

      expect(result).toEqual({ ubicacion_id: 1, ubicacion: 'Salon Principal' });
      expect(UbicacionMesaModel.create).not.toHaveBeenCalled();
    });

    it('retrocompatibilidad: dado un nombre desconocido, lo da de alta en el catálogo', async () => {
      UbicacionMesaModel.getByNombre
        .mockResolvedValueOnce(null)                       // primera búsqueda: no existe
        .mockResolvedValueOnce({ id: 7, nombre: 'Jardín' }); // tras crear: existe
      UbicacionMesaModel.create.mockResolvedValue({ insertId: 7 });

      const result = await tableService.resolverUbicacion(null, 'Jardín');

      expect(UbicacionMesaModel.create).toHaveBeenCalledWith({ nombre: 'Jardín' });
      expect(result).toEqual({ ubicacion_id: 7, ubicacion: 'Jardín' });
    });

    it('sin datos, resuelve al área por defecto Salon Principal', async () => {
      UbicacionMesaModel.getByNombre
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 1, nombre: 'Salon Principal' });
      UbicacionMesaModel.create.mockResolvedValue({ insertId: 1 });

      const result = await tableService.resolverUbicacion(null, '');

      expect(result).toEqual({ ubicacion_id: 1, ubicacion: 'Salon Principal' });
    });
  });

  describe('createTable', () => {
    it('debe crear la mesa con ubicacion_id resuelto y el nombre espejo', async () => {
      UbicacionMesaModel.getById.mockResolvedValue({ id: 2, nombre: 'Terraza', activo: 1 });
      TableModel.create.mockResolvedValue({ insertId: 10 });

      await tableService.createTable({ numero: '15', capacidad: 4, ubicacion_id: 2 });

      expect(TableModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ numero: '15', ubicacion_id: 2, ubicacion: 'Terraza' })
      );
    });

    it('debe propagar el error si el área no existe', async () => {
      UbicacionMesaModel.getById.mockResolvedValue(null);

      await expect(
        tableService.createTable({ numero: '15', capacidad: 4, ubicacion_id: 99 })
      ).rejects.toThrow('área de servicio');

      expect(TableModel.create).not.toHaveBeenCalled();
    });
  });

  describe('updateTable', () => {
    it('debe actualizar la mesa con el área resuelta', async () => {
      UbicacionMesaModel.getById.mockResolvedValue({ id: 3, nombre: 'VIP', activo: 1 });
      TableModel.update.mockResolvedValue({ affectedRows: 1 });

      await tableService.updateTable(7, { numero: '7', capacidad: 6, ubicacion_id: 3 });

      expect(TableModel.update).toHaveBeenCalledWith(
        7,
        expect.objectContaining({ numero: '7', ubicacion_id: 3, ubicacion: 'VIP' })
      );
    });
  });

  describe('getAllTables', () => {
    it('debe mapear ubicacion_id en cada mesa', async () => {
      TableModel.getAll.mockResolvedValue([
        {
          id: 1, numero: '1', carta: 'CUP', capacidad: 4, estado: 'libre',
          ubicacion: 'Terraza', ubicacion_id: 2, creado_en: null, actualizado_en: null,
          orden_id: null, orden_estado: null, total_productos: 0
        }
      ]);

      const mesas = await tableService.getAllTables();

      expect(mesas[0].ubicacion).toBe('Terraza');
      expect(mesas[0].ubicacion_id).toBe(2);
    });
  });
});
