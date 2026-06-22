// tableModel.js
const db = require('../config/db');

const Table = {
    // Listar todas las mesas ordenadas por ubicación y número
    getAll: async () => {
        const [rows] = await db.query(
            'SELECT id, numero, capacidad, estado, ubicacion, creado_en, actualizado_en FROM mesas ORDER BY ubicacion ASC, numero ASC'
        );
        return rows;
    },

    // Buscar una mesa específica por ID
    getById: async (id) => {
        const [rows] = await db.query(
            'SELECT id, numero, capacidad, estado, ubicacion, creado_en, actualizado_en FROM mesas WHERE id = ?', 
            [id]
        );
        return rows[0];
    },

    // Crear una nueva mesa respetando tus valores por defecto
    create: async (data) => {
        const { numero, capacidad, estado, ubicacion } = data;
        return await db.query(
            'INSERT INTO mesas (numero, capacidad, estado, ubicacion) VALUES (?, ?, ?, ?)',
            [
                numero, 
                capacidad || 2, 
                estado || 'libre', 
                ubicacion || 'Salon Principal'
            ]
        );
    },

    // Actualizar los datos de una mesa (incluyendo ubicación y estado)
    update: async (id, data) => {
        const { numero, capacidad, estado, ubicacion } = data;
        
        return await db.query(
            'UPDATE mesas SET numero = ?, capacidad = ?, estado = ?, ubicacion = ? WHERE id = ?',
            [numero, capacidad, estado, ubicacion, id]
        );
    },

    // Eliminar físicamente el registro de la mesa
    delete: async (id) => {
        return await db.query('DELETE FROM mesas WHERE id = ?', [id]);
    }
};

module.exports = Table;