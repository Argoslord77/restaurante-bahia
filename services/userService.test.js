// userService.test.js
const userService = require('./userService');
const UserModel = require('../models/userModel');

// Mock del UserModel
jest.mock('../models/userModel');

// Mock console.error para evitar logs en tests
global.console.error = jest.fn();

describe('UserService', () => {
  beforeEach(() => {
    // Limpiar todos los mocks antes de cada test
    jest.clearAllMocks();
    console.error.mockClear();
  });

  describe('getAllUsers', () => {
    it('should return all users', async () => {
      const mockUsers = [
        { id: 1, nombre: 'Juan', apellidos: 'Perez', usuario: 'juanp' },
        { id: 2, nombre: 'Maria', apellidos: 'Gomez', usuario: 'mariag' }
      ];
      
      UserModel.getAll.mockResolvedValue(mockUsers);
      
      const result = await userService.getAllUsers();
      
      expect(result).toEqual(mockUsers);
      expect(UserModel.getAll).toHaveBeenCalledTimes(1);
    });

    it('should handle database errors', async () => {
      UserModel.getAll.mockRejectedValue(new Error('Database error'));
      
      await expect(userService.getAllUsers()).rejects.toThrow('Database error');
    });
  });

  describe('getUserById', () => {
    it('should return user by id', async () => {
      const mockUser = { id: 1, nombre: 'Juan', apellidos: 'Perez' };
      UserModel.getById.mockResolvedValue(mockUser);
      
      const result = await userService.getUserById(1);
      
      expect(result).toEqual(mockUser);
      expect(UserModel.getById).toHaveBeenCalledWith(1);
    });

    it('should throw error if id is not provided', async () => {
      await expect(userService.getUserById()).rejects.toThrow('ID de usuario requerido');
    });

    it('should throw error if id is null', async () => {
      await expect(userService.getUserById(null)).rejects.toThrow('ID de usuario requerido');
    });
  });

  describe('createUser', () => {
    it('should create user with valid data', async () => {
      const userData = {
        nombre: 'Juan',
        apellidos: 'Perez',
        usuario: 'juanp',
        password: 'hashedPassword',
        rol: 'administrador'
      };
      
      UserModel.create.mockResolvedValue({ insertId: 1 });
      
      const result = await userService.createUser(userData);
      
      expect(result).toBeDefined();
      expect(UserModel.create).toHaveBeenCalledWith(userData);
    });

    it('should throw error if nombre is missing', async () => {
      const userData = {
        apellidos: 'Perez',
        usuario: 'juanp'
      };
      
      await expect(userService.createUser(userData)).rejects.toThrow('El nombre es obligatorio');
    });

    it('should throw error if usuario is missing', async () => {
      const userData = {
        nombre: 'Juan',
        apellidos: 'Perez'
      };
      
      await expect(userService.createUser(userData)).rejects.toThrow('El usuario es obligatorio');
    });
  });

  describe('updateUser', () => {
    it('should update user with valid data', async () => {
      const userData = {
        nombre: 'Juan',
        apellidos: 'Perez',
        usuario: 'juanp'
      };
      
      UserModel.update.mockResolvedValue({ affectedRows: 1 });
      
      const result = await userService.updateUser(1, userData);
      
      expect(result).toBeDefined();
      expect(UserModel.update).toHaveBeenCalledWith(1, userData);
    });

    it('should throw error if id is not provided', async () => {
      await expect(userService.updateUser()).rejects.toThrow('ID requerido');
    });
  });

  describe('deleteUser', () => {
    it('should delete user by id', async () => {
      UserModel.delete.mockResolvedValue({ affectedRows: 1 });
      
      const result = await userService.deleteUser(1);
      
      expect(result).toBeDefined();
      expect(UserModel.delete).toHaveBeenCalledWith(1);
    });

    it('should throw error if id is not provided', async () => {
      await expect(userService.deleteUser()).rejects.toThrow('ID requerido');
    });
  });

  describe('changeUserStatus', () => {
    it('should change user status', async () => {
      UserModel.update.mockResolvedValue({ affectedRows: 1 });
      
      const result = await userService.changeUserStatus(1, 'activo');
      
      expect(result).toBeDefined();
      expect(UserModel.update).toHaveBeenCalledWith(1, { estado: 'activo' });
    });
  });
});
