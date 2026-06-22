const MenuModel = require('../models/menuModel');

class MenuService {

    async getAllItems() {
        return await MenuModel.getAll();
    }

    async getItemById(id) {

        if (!id) {
            throw new Error('ID requerido');
        }

        return await MenuModel.getById(id);
    }

    async createItem(data) {

        if (!data.nombre) {
            throw new Error('Nombre requerido');
        }

        return await MenuModel.create(data);
    }

    async updateItem(id, data) {

        if (!id) {
            throw new Error('ID requerido');
        }

        return await MenuModel.update(id, data);
    }

    async deleteItem(id) {

        if (!id) {
            throw new Error('ID requerido');
        }

        return await MenuModel.delete(id);
    }

    async getActiveItems() {

        const items = await MenuModel.getAll();

        return items.filter(
            item => item.estado === 'activo'
        );
    }

    async updatePrice(id, precio) {

        if (precio < 0) {
            throw new Error('Precio inválido');
        }

        return await MenuModel.update(id, {
            precio
        });
    }

}

module.exports = new MenuService();