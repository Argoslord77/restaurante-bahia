// userController.js
const userService = require('../services/userService');
const dashboardService = require('../services/dashboardService');

const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// Listar usuarios (Se mantiene igual, ya que carga la vista inicial HTML)
exports.listUsers = async (req, res) => {
    try {
        const users = await userService.getAllUsers();

        res.render('users/users', {
            usuarios: users,
            user: req.user,
            error_msg: req.flash('error_msg'),
            success_msg: req.flash('success_msg'),
            view: 'user'
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al obtener usuarios');
    }
};

// Crear usuario (Optimizado para API Fetch / SweetAlert2)
exports.createUser = async (req, res) => {
    const { nombre, apellidos, email, usuario, password, rol } = req.body;
    const foto = req.file ? req.file.filename : null;

    try {
        const hashedPass = await bcrypt.hash(password, 10);

        await userService.createUser({
            nombre,
            apellidos,
            email,
            usuario,
            password: hashedPass,
            rol,
            foto
        });

        // Retornamos JSON de éxito
        return res.status(201).json({
            success: true,
            message: `¡Usuario ${nombre} ${apellidos} creado con éxito!`
        });

    } catch (error) {
        console.error('Error al crear usuario:', error);

        // Si ocurre un error, borramos la foto que subió Multer para no dejar basura
        if (req.file) {
            const rutaFotoError = path.join(__dirname, '../public/uploads', req.file.filename);
            fs.unlink(rutaFotoError, () => {});
        }

        // Retornamos JSON de error con el mensaje de la validación del servicio o uno genérico
        return res.status(400).json({
            success: false,
            message: error.message || 'Hubo un error al intentar registrar al usuario.'
        });
    }
};

// Actualizar usuario (Optimizado para API Fetch / SweetAlert2)
exports.updateUser = async (req, res) => {
    const { id } = req.params;
    const { nombre, apellidos, email, usuario, password, rol, fotoActual } = req.body;
    const foto = req.file ? req.file.filename : fotoActual;

    try {
        let hashedPass = null;

        if (password && password.trim() !== '') {
            hashedPass = await bcrypt.hash(password, 10);
        }

        if (req.file && fotoActual && fotoActual !== 'null' && fotoActual !== '') {
            const rutaFotoVieja = path.join(__dirname, '../public/uploads', fotoActual);
            fs.unlink(rutaFotoVieja, (err) => {
                if (err) {
                    console.error(`No se pudo eliminar la imagen vieja: ${fotoActual}`, err);
                }
            });
        }

        await userService.updateUser(id, {
            nombre,
            apellidos,
            email,
            usuario,
            password: hashedPass,
            rol,
            foto
        });

        // Retornamos JSON de éxito
        return res.status(200).json({
            success: true,
            message: `¡Datos de ${nombre} ${apellidos} actualizados con éxito!`
        });

    } catch (error) {
        console.error('Error al actualizar usuario:', error);

        // Si falló la actualización pero se subió una nueva foto, la eliminamos
        if (req.file) {
            const rutaFotoError = path.join(__dirname, '../public/uploads', req.file.filename);
            fs.unlink(rutaFotoError, () => {});
        }

        return res.status(400).json({
            success: false,
            message: error.message || 'Hubo un error al intentar actualizar al usuario.'
        });
    }
};

// Eliminar usuario (Optimizado para API Fetch / SweetAlert2)
exports.deleteUser = async (req, res) => {
    const { id } = req.params;

    try {
        const usuarioAEliminar = await userService.getUserById(id);
        let nombreCompleto = 'Usuario';

        if (usuarioAEliminar) {
            nombreCompleto = `${usuarioAEliminar.nombre} ${usuarioAEliminar.apellidos}`;

            if (usuarioAEliminar.foto && usuarioAEliminar.foto !== 'null' && usuarioAEliminar.foto !== '') {
                const rutaFoto = path.join(__dirname, '../public/uploads', usuarioAEliminar.foto);
                fs.unlink(rutaFoto, (err) => {
                    if (err) {
                        console.error(`No se pudo eliminar la foto: ${usuarioAEliminar.foto}`, err);
                    }
                });
            }
        }

        await userService.deleteUser(id);

        // Retornamos JSON de éxito
        return res.status(200).json({
            success: true,
            message: `El usuario ${nombreCompleto} ha sido eliminado correctamente.`
        });

    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        
        return res.status(500).json({
            success: false,
            message: error.message || 'No se pudo eliminar al miembro del personal de la base de datos.'
        });
    }
};