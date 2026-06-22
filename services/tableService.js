// tableService.js
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

    // Cambiar estado de forma segura recuperando los datos previos de la mesa
    async changeStatus(id, nuevoEstado) {
        if (!id) {
            throw new Error('ID requerido');
        }

        const mesaActual = await TableModel.getById(id);
        if (!mesaActual) {
            throw new Error('La mesa especificada no existe');
        }

        // Combinamos los datos actuales para no romper los valores requeridos en el UPDATE del modelo
        return await TableModel.update(id, {
            numero: mesaActual.numero,
            capacidad: mesaActual.capacidad,
            ubicacion: mesaActual.ubicacion,
            estado: nuevoEstado
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