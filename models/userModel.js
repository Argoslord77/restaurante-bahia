//userModel.js
const db = require('../config/db');
const fs = require('fs');
const path = require('path');

const User = {
    getAll: async () => {
        const [rows] = await db.query('SELECT id, nombre, apellidos, email, usuario, rol, foto FROM usuarios');
        return rows;
    },
    getById: async (id) => {
        const [rows] = await db.query('SELECT id, nombre, apellidos, email, usuario, rol, foto FROM usuarios WHERE id = ?', [id]);
        return rows[0];
    },
    getByUsername: async (usuario) => {
        const [rows] = await db.query('SELECT id, nombre, apellidos, email, usuario, rol, password, foto FROM usuarios WHERE usuario = ?', [usuario]);
        return rows[0] || null;
    },
    create: async (data) => {
        const { nombre, apellidos, email, usuario, password, rol, foto } = data;
        
        return await db.query(
            'INSERT INTO usuarios (nombre, apellidos, email, usuario, password, rol, foto) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [nombre, apellidos, email || null, usuario, password, rol, foto || null]
        );
    },
    update: async (id, data) => {
        const { nombre, apellidos, email, usuario, password, rol, foto } = data;
        
        if (password) {
            return await db.query(
                'UPDATE usuarios SET nombre = ?, apellidos = ?, email = ?, usuario = ?, password = ?, rol = ?, foto = ? WHERE id = ?',
                [nombre, apellidos, email || null, usuario, password, rol, foto, id]
            );
        } else {
            return await db.query(
                'UPDATE usuarios SET nombre = ?, apellidos = ?, email = ?, usuario = ?, rol = ?, foto = ? WHERE id = ?',
                [nombre, apellidos, email || null, usuario, rol, foto, id]
            );
        }
    },
    // NUEVO MÉTODO: Eliminar físicamente la foto y el registro del usuario
    delete: async (id) => {
        // 1. Obtener los datos del usuario para verificar si tiene foto asociada
        const [rows] = await db.query('SELECT foto FROM usuarios WHERE id = ?', [id]);
        const user = rows[0];

        if (user && user.foto) {
            const filePath = path.join(__dirname, '../public/uploads', user.foto);
            
            // Verificamos si el archivo realmente existe en el servidor para evitar excepciones
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath); // Borrado físico del archivo
            }
        }

        // 2. Eliminar el registro en la base de datos
        return await db.query('DELETE FROM usuarios WHERE id = ?', [id]);
    }
};

module.exports = User;