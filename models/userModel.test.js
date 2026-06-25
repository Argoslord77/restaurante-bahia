// userModel.test.js
const db = require('../config/db');
const User = require('./userModel');

// Mock de la base de datos
jest.mock('../config/db');

describe('UserModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('should return all users', async () => {
      const mockUsers = [
        { id: 1, nombre: 'Juan', apellidos: 'Perez', usuario: 'juanp' },
        { id: 2, nombre: 'Maria', apellidos: 'Gomez', usuario: 'mariag' }
      ];
      
      db.query.mockResolvedValue([mockUsers]);
      
      const result = await User.getAll();
      
      expect(result).toEqual(mockUsers);
      expect(db.query).toHaveBeenCalledWith('SELECT id, nombre, apellidos, email, usuario, rol, foto FROM usuarios');
    });

    it('should handle database errors', async () => {
      db.query.mockRejectedValue(new Error('Database error'));
      
      await expect(User.getAll()).rejects.toThrow('Database error');
    });
  });

  describe('getById', () => {
    it('should return user by id', async () => {
      const mockUser = { id: 1, nombre: 'Juan', apellidos: 'Perez' };
      db.query.mockResolvedValue([[mockUser]]);
      
      const result = await User.getById(1);
      
      expect(result).toEqual(mockUser);
      expect(db.query).toHaveBeenCalledWith(
        'SELECT id, nombre, apellidos, email, usuario, rol, foto FROM usuarios WHERE id = ?',
        [1]
      );
    });

    it('should handle database errors', async () => {
      db.query.mockRejectedValue(new Error('Database error'));
      
      await expect(User.getById(1)).rejects.toThrow('Database error');
    });
  });

  describe('getByUsername', () => {
    it('should return user by username', async () => {
      const mockUser = { id: 1, nombre: 'Juan', usuario: 'juanp', password: 'hashed' };
      db.query.mockResolvedValue([[mockUser]]);
      
      const result = await User.getByUsername('juanp');
      
      expect(result).toEqual(mockUser);
      expect(db.query).toHaveBeenCalledWith(
        'SELECT id, nombre, apellidos, email, usuario, rol, password, foto FROM usuarios WHERE usuario = ?',
        ['juanp']
      );
    });

    it('should return null if user not found', async () => {
      db.query.mockResolvedValue([[]]);
      
      const result = await User.getByUsername('nonexistent');
      
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const userData = {
        nombre: 'Juan',
        apellidos: 'Perez',
        email: 'juan@test.com',
        usuario: 'juanp',
        password: 'hashedPassword',
        rol: 'administrador',
        foto: 'photo.jpg'
      };
      
      db.query.mockResolvedValue([{ insertId: 1 }]);
      
      const result = await User.create(userData);
      
      expect(result).toBeDefined();
      expect(db.query).toHaveBeenCalledWith(
        'INSERT INTO usuarios (nombre, apellidos, email, usuario, password, rol, foto) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['Juan', 'Perez', 'juan@test.com', 'juanp', 'hashedPassword', 'administrador', 'photo.jpg']
      );
    });

    it('should create user without email and foto', async () => {
      const userData = {
        nombre: 'Juan',
        apellidos: 'Perez',
        usuario: 'juanp',
        password: 'hashedPassword',
        rol: 'dependiente'
      };
      
      db.query.mockResolvedValue([{ insertId: 1 }]);
      
      await User.create(userData);
      
      expect(db.query).toHaveBeenCalledWith(
        'INSERT INTO usuarios (nombre, apellidos, email, usuario, password, rol, foto) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ['Juan', 'Perez', null, 'juanp', 'hashedPassword', 'dependiente', null]
      );
    });
  });

  describe('update', () => {
    it('should update user with password', async () => {
      const userData = {
        nombre: 'Juan',
        apellidos: 'Perez',
        email: 'juan@test.com',
        usuario: 'juanp',
        password: 'newHashedPassword',
        rol: 'administrador',
        foto: 'photo.jpg'
      };
      
      db.query.mockResolvedValue([{ affectedRows: 1 }]);
      
      const result = await User.update(1, userData);
      
      expect(result).toBeDefined();
      expect(db.query).toHaveBeenCalledWith(
        'UPDATE usuarios SET nombre = ?, apellidos = ?, email = ?, usuario = ?, password = ?, rol = ?, foto = ? WHERE id = ?',
        ['Juan', 'Perez', 'juan@test.com', 'juanp', 'newHashedPassword', 'administrador', 'photo.jpg', 1]
      );
    });

    it('should update user without password', async () => {
      const userData = {
        nombre: 'Juan',
        apellidos: 'Perez',
        email: 'juan@test.com',
        usuario: 'juanp',
        rol: 'administrador',
        foto: 'photo.jpg'
      };
      
      db.query.mockResolvedValue([{ affectedRows: 1 }]);
      
      await User.update(1, userData);
      
      expect(db.query).toHaveBeenCalledWith(
        'UPDATE usuarios SET nombre = ?, apellidos = ?, email = ?, usuario = ?, rol = ?, foto = ? WHERE id = ?',
        ['Juan', 'Perez', 'juan@test.com', 'juanp', 'administrador', 'photo.jpg', 1]
      );
    });
  });

  describe('delete', () => {
    it('should delete user and photo file', async () => {
      const mockUser = { foto: 'photo.jpg' };
      db.query.mockResolvedValueOnce([[mockUser]]);
      db.query.mockResolvedValueOnce([{ affectedRows: 1 }]);
      
      // Mock fs.existsSync and fs.unlinkSync
      const fs = require('fs');
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'unlinkSync').mockImplementation();
      
      const result = await User.delete(1);
      
      expect(result).toBeDefined();
      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.unlinkSync).toHaveBeenCalled();
      expect(db.query).toHaveBeenCalledWith('DELETE FROM usuarios WHERE id = ?', [1]);
      
      fs.existsSync.mockRestore();
      fs.unlinkSync.mockRestore();
    });

    it('should delete user without photo', async () => {
      const mockUser = { foto: null };
      db.query.mockResolvedValueOnce([[mockUser]]);
      db.query.mockResolvedValueOnce([{ affectedRows: 1 }]);
      
      const result = await User.delete(1);
      
      expect(result).toBeDefined();
      expect(db.query).toHaveBeenCalledWith('DELETE FROM usuarios WHERE id = ?', [1]);
    });
  });
});
