// menuService.test.js
const menuService = require('./menuService');
const MenuModel = require('../models/menuModel');

// Mock del MenuModel
jest.mock('../models/menuModel');

describe('MenuService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllItems', () => {
    it('should return all menu items', async () => {
      const mockItems = [
        { id: 1, nombre: 'Hamburguesa', precio: 10.99, categoria: 'Platos' },
        { id: 2, nombre: 'Refresco', precio: 2.50, categoria: 'Bebidas' }
      ];
      
      MenuModel.getAll.mockResolvedValue(mockItems);
      
      const result = await menuService.getAllItems();
      
      expect(result).toEqual(mockItems);
      expect(MenuModel.getAll).toHaveBeenCalledTimes(1);
    });

    it('should handle database errors', async () => {
      MenuModel.getAll.mockRejectedValue(new Error('Database error'));
      
      await expect(menuService.getAllItems()).rejects.toThrow('Database error');
    });
  });

  describe('getItemById', () => {
    it('should return menu item by id', async () => {
      const mockItem = { id: 1, nombre: 'Hamburguesa', precio: 10.99 };
      MenuModel.getById.mockResolvedValue(mockItem);
      
      const result = await menuService.getItemById(1);
      
      expect(result).toEqual(mockItem);
      expect(MenuModel.getById).toHaveBeenCalledWith(1);
    });

    it('should throw error if id is not provided', async () => {
      await expect(menuService.getItemById()).rejects.toThrow('ID requerido');
    });
  });

  describe('createItem', () => {
    it('should create menu item with valid data', async () => {
      const itemData = {
        nombre: 'Hamburguesa',
        descripcion: 'Deliciosa hamburguesa',
        precio: 10.99,
        categoria: 'Platos'
      };
      
      MenuModel.create.mockResolvedValue({ insertId: 1 });
      
      const result = await menuService.createItem(itemData);
      
      expect(result).toBeDefined();
      expect(MenuModel.create).toHaveBeenCalledWith(itemData);
    });

    it('should throw error if nombre is missing', async () => {
      const itemData = {
        descripcion: 'Deliciosa hamburguesa',
        precio: 10.99
      };
      
      await expect(menuService.createItem(itemData)).rejects.toThrow('Nombre requerido');
    });
  });

  describe('updateItem', () => {
    it('should update menu item with valid data', async () => {
      const itemData = {
        nombre: 'Hamburguesa Especial',
        precio: 12.99
      };
      
      MenuModel.update.mockResolvedValue({ affectedRows: 1 });
      
      const result = await menuService.updateItem(1, itemData);
      
      expect(result).toBeDefined();
      expect(MenuModel.update).toHaveBeenCalledWith(1, itemData);
    });

    it('should throw error if id is not provided', async () => {
      await expect(menuService.updateItem()).rejects.toThrow('ID requerido');
    });
  });

  describe('deleteItem', () => {
    it('should delete menu item by id', async () => {
      MenuModel.delete.mockResolvedValue({ affectedRows: 1 });
      
      const result = await menuService.deleteItem(1);
      
      expect(result).toBeDefined();
      expect(MenuModel.delete).toHaveBeenCalledWith(1);
    });

    it('should throw error if id is not provided', async () => {
      await expect(menuService.deleteItem()).rejects.toThrow('ID requerido');
    });
  });
});
