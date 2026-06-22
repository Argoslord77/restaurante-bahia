//tableService.js
const TableModel = require('../models/tableModel');

class TableService {

    async getAllTables() {
        return await TableModel.getAll();
    }

    async getTableById(id) {

        if (!id) {
            throw new Error('ID de mesa requerido');
        }

        return await TableModel.getById(id);
    }

    async createTable(data) {

        if (!data.numero) {
            throw new Error('Número de mesa requerido');
        }

        return await TableModel.create(data);
    }

    async updateTable(id, data) {

        if (!id) {
            throw new Error('ID requerido');
        }

        return await TableModel.update(id, data);
    }

    async deleteTable(id) {

        if (!id) {
            throw new Error('ID requerido');
        }

        return await TableModel.delete(id);
    }

    async changeStatus(id, estado) {

        return await TableModel.update(id, {
            estado
        });
    }

    async getAvailableTables() {

        const tables = await TableModel.getAll();

        return tables.filter(
            table => table.estado === 'libre'
        );
    }

}

module.exports = new TableService();