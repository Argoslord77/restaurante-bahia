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
      expect(MenuModel.create).toHaveBeenCalledWith({ ...itemData, activo: 1 });
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
      expect(MenuModel.update).toHaveBeenCalledWith(1, { ...itemData, activo: 1 });
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

  describe('estado visible/oculto', () => {
    it('normaliza el estado al crear y editar', async () => {
      MenuModel.create.mockResolvedValue({ insertId: 5 });
      await menuService.createItem({ nombre: 'X', activo: '0' });
      expect(MenuModel.create).toHaveBeenCalledWith({ nombre: 'X', activo: 0 });

      MenuModel.update.mockResolvedValue({ affectedRows: 1 });
      await menuService.updateItem(5, { nombre: 'X', activo: 'inactivo' });
      expect(MenuModel.update).toHaveBeenCalledWith(5, { nombre: 'X', activo: 0 });
    });

    it('getActiveItems filtra por activo', async () => {
      MenuModel.getAll.mockResolvedValue([
        { id: 1, activo: 1 }, { id: 2, activo: 0 }, { id: 3, activo: 1 }
      ]);
      const result = await menuService.getActiveItems();
      expect(result.map(i => i.id)).toEqual([1, 3]);
    });
  });

  describe('catalogoACSV', () => {
    it('genera CSV con BOM, ; y estado en texto', () => {
      const csv = menuService.catalogoACSV([
        { nombre: 'Ropa;Vieja', descripcion: 'A\nB', nombre_categoria: 'Platos', precio: 250, precio_alt: null, precio_usd: 2.5, activo: 1 },
        { nombre: 'Oculto', precio: 100, activo: 0 }
      ]);
      expect(csv.charCodeAt(0)).toBe(0xFEFF);
      expect(csv).toContain('Nombre;Descripcion;Categoria;Precio CUP;Precio Alt;Precio USD;Estado');
      expect(csv).toContain('Ropa Vieja;A B;Platos;250,00;;2,50;En carta');
      expect(csv).toContain('Oculto;;;100,00;;;Oculto');
    });
  });
});
