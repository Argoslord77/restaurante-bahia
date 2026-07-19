// userController.test.js
const request = require('supertest');
const express = require('express');
const userController = require('./userController');


// Mock de los servicios
jest.mock('../services/userService');
jest.mock('../services/dashboardService');

const userService = require('../services/userService');
const dashboardService = require('../services/dashboardService');

// Mock de bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashedPassword')
}));

// Mock de fs
jest.mock('fs');
jest.mock('path');

// Mock console.error para evitar logs en tests
global.console.error = jest.fn();

describe('UserController', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    // Setup routes para testing
    app.get('/users', userController.listUsers);
    app.post('/users', userController.createUser);
    app.put('/users/:id', userController.updateUser);
    app.delete('/users/:id', userController.deleteUser);
    
    jest.clearAllMocks();
    console.error.mockClear();
  });

  describe('listUsers', () => {
    it('should render users list', async () => {
      const mockUsers = [
        { id: 1, nombre: 'Juan', apellidos: 'Perez' },
        { id: 2, nombre: 'Maria', apellidos: 'Gomez' }
      ];
      
      userService.getAllUsers.mockResolvedValue(mockUsers);
      
      // Mock res.render
      const mockRender = jest.fn();
      const req = {
        flash: jest.fn()
      };
      const res = {
        render: mockRender,
        status: jest.fn().mockReturnThis(),
        send: jest.fn()
      };
      
      await userController.listUsers(req, res);
      
      expect(mockRender).toHaveBeenCalledWith('users/users', {
        usuarios: mockUsers,
        user: req.user,
        error_msg: req.flash('error_msg'),
        success_msg: req.flash('success_msg'),
        view: 'user'
      });
    });

    it('should handle errors', async () => {
      userService.getAllUsers.mockRejectedValue(new Error('Database error'));
      
      const req = { flash: jest.fn() };
      const res = {
        render: jest.fn(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn()
      };
      
      await userController.listUsers(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith('Error al obtener usuarios');
    });
  });

  describe('createUser', () => {
    it('should create user successfully', async () => {
      const userData = {
        nombre: 'Juan',
        apellidos: 'Perez',
        email: 'juan@test.com',
        usuario: 'juanp',
        password: 'password123',
        rol: 'administrador'
      };
      
      userService.createUser.mockResolvedValue({ insertId: 1 });
      
      const req = {
        body: userData,
        file: null
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      await userController.createUser(req, res);
      
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: '¡Usuario Juan Perez creado con éxito!'
      });
    });

    it('should handle validation errors', async () => {
      userService.createUser.mockRejectedValue(new Error('El nombre es obligatorio'));
      
      const req = {
        body: { apellidos: 'Perez' },
        file: null
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      await userController.createUser(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'El nombre es obligatorio'
      });
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const userData = {
        nombre: 'Juan',
        apellidos: 'Perez',
        email: 'juan@test.com',
        usuario: 'juanp',
        password: 'newpassword',
        rol: 'administrador'
      };
      
      userService.updateUser.mockResolvedValue({ affectedRows: 1 });
      
      const req = {
        params: { id: 1 },
        body: userData,
        file: null
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      await userController.updateUser(req, res);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: '¡Datos de Juan Perez actualizados con éxito!'
      });
    });

    it('should handle update errors', async () => {
      userService.updateUser.mockRejectedValue(new Error('User not found'));
      
      const req = {
        params: { id: 999 },
        body: { nombre: 'Juan' },
        file: null
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      await userController.updateUser(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found'
      });
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      const mockUser = {
        id: 1,
        nombre: 'Juan',
        apellidos: 'Perez',
        foto: null
      };
      
      userService.getUserById.mockResolvedValue(mockUser);
      userService.deleteUser.mockResolvedValue({ affectedRows: 1 });
      
      const req = { params: { id: 1 } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      await userController.deleteUser(req, res);
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'El usuario Juan Perez ha sido eliminado correctamente.'
      });
    });

    it('should handle delete errors', async () => {
      userService.deleteUser.mockRejectedValue(new Error('Database error'));
      
      const req = { params: { id: 1 } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      
      await userController.deleteUser(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Database error'
      });
    });
  });
});
