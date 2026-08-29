// tableModel.test.js
const db = require('../config/db');
const Table = require('./tableModel');

// Mock de la base de datos
jest.mock('../config/db');

describe('TableModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('debe resolver el área de la mesa desde el catálogo ubicacion_mesa (JOIN + COALESCE)', async () => {
      const mockMesas = [
        { id: 1, numero: '1', ubicacion_id: 2, ubicacion: 'Terraza', total_productos: 0 },
        { id: 2, numero: '2', ubicacion_id: 1, ubicacion: 'Salon Principal', total_productos: 3 }
      ];

      db.query.mockResolvedValue([mockMesas]);

      const result = await Table.getAll();

      expect(result).toEqual(mockMesas);

      const sql = db.query.mock.calls[0][0];
      expect(sql).toContain('LEFT JOIN ubicacion_mesa um ON m.ubicacion_id = um.id');
      expect(sql).toContain('COALESCE(um.nombre, m.ubicacion) AS ubicacion');
      expect(sql).toContain('m.ubicacion_id');
      // El orden debe basarse en el nombre del catálogo, no en el string legado
      expect(sql).toContain('ORDER BY COALESCE(um.nombre, m.ubicacion) ASC');
    });

    it('debe manejar errores de base de datos', async () => {
      db.query.mockRejectedValue(new Error('Database error'));
      await expect(Table.getAll()).rejects.toThrow('Database error');
    });
  });

  describe('getById', () => {
    it('debe incluir el JOIN al catálogo de áreas', async () => {
      const mockMesa = { id: 1, numero: '1', ubicacion_id: 2, ubicacion: 'Terraza' };
      db.query.mockResolvedValue([[mockMesa]]);

      const result = await Table.getById(1);

      expect(result).toEqual(mockMesa);

      const [sql, params] = db.query.mock.calls[0];
      expect(sql).toContain('LEFT JOIN ubicacion_mesa um ON m.ubicacion_id = um.id');
      expect(sql).toContain('COALESCE(um.nombre, m.ubicacion) AS ubicacion');
      expect(params).toEqual([1]);
    });

    it('debe manejar errores de base de datos', async () => {
      db.query.mockRejectedValue(new Error('Database error'));
      await expect(Table.getById(1)).rejects.toThrow('Database error');
    });
  });

  describe('create', () => {
    it('debe insertar ubicacion_id del catálogo y el nombre como espejo', async () => {
      db.query.mockResolvedValue([{ insertId: 10 }]);

      await Table.create({
        numero: '15',
        carta: 'CUP',
        capacidad: 4,
        estado: 'libre',
        ubicacion_id: 2,
        ubicacion: 'Terraza'
      });

      const [sql, params] = db.query.mock.calls[0];
      expect(sql).toContain('INSERT INTO mesas (numero, carta, capacidad, estado, ubicacion_id, ubicacion)');
      expect(params).toEqual(['15', 'CUP', 4, 'libre', 2, 'Terraza']);
    });

    it('debe permitir ubicacion_id NULL (retrocompatibilidad)', async () => {
      db.query.mockResolvedValue([{ insertId: 11 }]);

      await Table.create({
        numero: '16',
        carta: 'CUP',
        capacidad: 2,
        estado: 'libre',
        ubicacion_id: null,
        ubicacion: 'Salon Principal'
      });

      const [, params] = db.query.mock.calls[0];
      expect(params[4]).toBeNull();
      expect(params[5]).toBe('Salon Principal');
    });
  });

  describe('update', () => {
    it('debe actualizar ubicacion_id y el espejo del nombre', async () => {
      db.query.mockResolvedValue([{ affectedRows: 1 }]);

      await Table.update(7, {
        numero: '7',
        carta: 'ZELLE',
        capacidad: 6,
        estado: 'ocupada',
        ubicacion_id: 3,
        ubicacion: 'VIP'
      });

      const [sql, params] = db.query.mock.calls[0];
      expect(sql).toContain('UPDATE mesas SET numero = ?, carta = ?, capacidad = ?, estado = ?, ubicacion_id = ?, ubicacion = ? WHERE id = ?');
      expect(params).toEqual(['7', 'ZELLE', 6, 'ocupada', 3, 'VIP', 7]);
    });
  });
});
