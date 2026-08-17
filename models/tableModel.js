// models/tableModel.js
const db = require('../config/db');

const Table = {
    // Listar todas las mesas ordenadas por ubicación y número con su orden activa
    getAll: async () => {
        const queryStr = `
            SELECT 
                m.id, 
                m.numero, 
                m.carta, 
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

    getById: async (id) => {
        const [rows] = await db.query(
            'SELECT id, numero, carta, capacidad, estado, ubicacion, creado_en, actualizado_en FROM mesas WHERE id = ?', 
            [id]
        );
        return rows[0];
    },

    // Crear una nueva mesa respetando 'carta'
    create: async (data) => {
        const { numero, carta, capacidad, estado, ubicacion } = data;
        return await db.query(
            'INSERT INTO mesas (numero, carta, capacidad, estado, ubicacion) VALUES (?, ?, ?, ?, ?)',
            [
                numero, 
                carta || 'CUP',
                capacidad || 2, 
                estado || 'libre', 
                ubicacion || 'Salon Principal'
            ]
        );
    },

    update: async (id, data) => {
        const { numero, carta, capacidad, estado, ubicacion } = data;
        
        return await db.query(
            'UPDATE mesas SET numero = ?, carta = ?, capacidad = ?, estado = ?, ubicacion = ? WHERE id = ?',
            [numero, carta || 'CUP', capacidad, estado, ubicacion, id]
        );
    },

    delete: async (id) => {
        return await db.query('DELETE FROM mesas WHERE id = ?', [id]);
    }
};

module.exports = Table;