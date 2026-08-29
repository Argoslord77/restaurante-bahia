// ubicacionMesaModel.test.js
const db = require('../config/db');
const UbicacionMesa = require('./ubicacionMesaModel');

// Mock de la base de datos
jest.mock('../config/db');

describe('UbicacionMesaModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllWithMesas', () => {
    it('debe listar las áreas con el conteo de mesas asociadas', async () => {
      const mockUbicaciones = [
        { id: 1, nombre: 'Salon Principal', total_mesas: 5, activo: 1 },
        { id: 2, nombre: 'Terraza', total_mesas: 2, activo: 0 }
      ];

      db.query.mockResolvedValue([mockUbicaciones]);

      const result = await UbicacionMesa.getAllWithMesas();

      expect(result).toEqual(mockUbicaciones);

      const sql = db.query.mock.calls[0][0];
      expect(sql).toContain('FROM ubicacion_mesa u');
      expect(sql).toContain('LEFT JOIN mesas m ON m.ubicacion_id = u.id');
      expect(sql).toContain('COUNT(m.id) AS total_mesas');
    });

    it('debe manejar errores de base de datos', async () => {
      db.query.mockRejectedValue(new Error('Database error'));
      await expect(UbicacionMesa.getAllWithMesas()).rejects.toThrow('Database error');
    });
  });

  describe('getActivos', () => {
    it('debe filtrar solo áreas activas', async () => {
      db.query.mockResolvedValue([[{ id: 1, nombre: 'Salon Principal' }]]);

      await UbicacionMesa.getActivos();

      const [sql, params] = db.query.mock.calls[0];
      expect(sql).toContain('WHERE activo = 1');
      expect(params).toBeUndefined();
    });
  });

  describe('getById / getByNombre', () => {
    it('debe buscar por id', async () => {
      db.query.mockResolvedValue([[{ id: 2, nombre: 'Terraza' }]]);

      const result = await UbicacionMesa.getById(2);

      expect(result.nombre).toBe('Terraza');
      const [sql, params] = db.query.mock.calls[0];
      expect(sql).toContain('FROM ubicacion_mesa WHERE id = ?');
      expect(params).toEqual([2]);
    });

    it('debe devolver null si no existe el id', async () => {
      db.query.mockResolvedValue([[]]);
      expect(await UbicacionMesa.getById(99)).toBeNull();
    });

    it('debe buscar por nombre exacto', async () => {
      db.query.mockResolvedValue([[{ id: 1, nombre: 'Salon Principal' }]]);

      const result = await UbicacionMesa.getByNombre('Salon Principal');

      expect(result.id).toBe(1);
      const [sql, params] = db.query.mock.calls[0];
      expect(sql).toContain('WHERE nombre = ?');
      expect(params).toEqual(['Salon Principal']);
    });
  });

  describe('create / update / setEstado', () => {
    it('debe crear un área activa por defecto', async () => {
      db.query.mockResolvedValue([{ insertId: 3 }]);

      await UbicacionMesa.create({ nombre: 'VIP', descripcion: 'Zona alta', orden: 2 });

      const [sql, params] = db.query.mock.calls[0];
      expect(sql).toContain('INSERT INTO ubicacion_mesa (nombre, descripcion, orden, activo) VALUES (?, ?, ?, 1)');
      expect(params).toEqual(['VIP', 'Zona alta', 2]);
    });

    it('debe actualizar un área', async () => {
      db.query.mockResolvedValue([{ affectedRows: 1 }]);

      await UbicacionMesa.update(3, { nombre: 'VIP Norte', descripcion: null, orden: 4 });

      const [sql, params] = db.query.mock.calls[0];
      expect(sql).toContain('UPDATE ubicacion_mesa SET nombre = ?, descripcion = ?, orden = ? WHERE id = ?');
      expect(params).toEqual(['VIP Norte', null, 4, 3]);
    });

    it('debe cambiar el estado (activo/inactivo)', async () => {
      db.query.mockResolvedValue([{ affectedRows: 1 }]);

      await UbicacionMesa.setEstado(3, false);

      const [sql, params] = db.query.mock.calls[0];
      expect(sql).toContain('UPDATE ubicacion_mesa SET activo = ? WHERE id = ?');
      expect(params).toEqual([0, 3]);
    });
  });

  describe('sincronizarNombreMesas', () => {
    it('debe propagar el renombrado al espejo legado mesas.ubicacion', async () => {
      db.query.mockResolvedValue([{ affectedRows: 4 }]);

      await UbicacionMesa.sincronizarNombreMesas(2, 'Terraza Norte');

      const [sql, params] = db.query.mock.calls[0];
      expect(sql).toBe('UPDATE mesas SET ubicacion = ? WHERE ubicacion_id = ?');
      expect(params).toEqual(['Terraza Norte', 2]);
    });
  });

  describe('sincronizarAsignacionesHoy', () => {
    it('debe propagar el renombrado a las asignaciones del día en curso', async () => {
      db.query.mockResolvedValue([{ affectedRows: 1 }]);

      await UbicacionMesa.sincronizarAsignacionesHoy('Terraza', 'Terraza Norte');

      const [sql, params] = db.query.mock.calls[0];
      expect(sql).toBe('UPDATE asignaciones_diarias SET ubicacion = ? WHERE ubicacion = ? AND fecha = CURDATE()');
      expect(params).toEqual(['Terraza Norte', 'Terraza']);
    });
  });

  describe('countMesasAsociadas', () => {
    it('debe contar las mesas del área', async () => {
      db.query.mockResolvedValue([[{ total: 4 }]]);

      const total = await UbicacionMesa.countMesasAsociadas(2);

      expect(total).toBe(4);
      const [sql, params] = db.query.mock.calls[0];
      expect(sql).toContain('SELECT COUNT(*) AS total FROM mesas WHERE ubicacion_id = ?');
      expect(params).toEqual([2]);
    });

    it('debe devolver 0 ante respuesta vacía', async () => {
      db.query.mockResolvedValue([[]]);
      expect(await UbicacionMesa.countMesasAsociadas(2)).toBe(0);
    });
  });

  describe('delete', () => {
    it('debe eliminar por id', async () => {
      db.query.mockResolvedValue([{ affectedRows: 1 }]);

      await UbicacionMesa.delete(5);

      const [sql, params] = db.query.mock.calls[0];
      expect(sql).toBe('DELETE FROM ubicacion_mesa WHERE id = ?');
      expect(params).toEqual([5]);
    });
  });
});
