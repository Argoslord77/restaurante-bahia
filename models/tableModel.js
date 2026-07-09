// tableModel.js
const db = require('../config/db');

const Table = {
    // Listar todas las mesas ordenadas por ubicación y número con su orden activa
    getAll: async () => {
        const queryStr = `
            SELECT 
                m.id, 
                m.numero, 
                m.capacidad, 
                m.estado, 
                m.ubicacion, 
                m.creado_en, 
                m.actualizado_en,
                p.id AS orden_id,
                p.estado_pedido AS orden_estado,
                (SELECT COALESCE(SUM(dp.cantidad), 0) FROM detalles_pedido dp WHERE dp.id_pedido = p.id AND dp.estado_item != 'cancelado') AS total_productos
            FROM mesas m
            LEFT JOIN pedidos p ON m.id = p.id_mesa AND p.estado_pedido != 'cancelado' AND p.estado_pedido != 'entregado_pagado'
            ORDER BY m.ubicacion ASC, m.numero ASC
        `;
        const [rows] = await db.query(queryStr);
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