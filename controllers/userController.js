// userController.js
const userService = require('../services/userService');
const dashboardService = require('../services/dashboardService');
const db = require('../config/db'); // Conexión compartida de la base de datos

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

        // Validación manual adicional (por si el middleware no está capturando bien)
        if (!nombre || nombre.trim() === '') {
            return res.status(400).json({ success: false, message: 'El nombre es obligatorio' });
        }
        if (!apellidos || apellidos.trim() === '') {
            return res.status(400).json({ success: false, message: 'Los apellidos son obligatorios' });
        }
        if (!usuario || usuario.trim() === '') {
            return res.status(400).json({ success: false, message: 'El usuario es obligatorio' });
        }
        if (!password || password.length < 6) {
            return res.status(400).json({ success: false, message: 'La contraseña debe tener al menos 6 caracteres' });
        }
        if (!rol) {
            return res.status(400).json({ success: false, message: 'El rol es obligatorio' });
        }

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

/**
 * Cambia la contraseña del usuario autenticado.
 * @param {Object} req - Objeto de solicitud de Express.
 * @param {Object} res - Objeto de respuesta de Express.
 * @param {Function} next - Función de middleware de Express.
 */
exports.cambiarPassword = async (req, res, next) => {
    const { passwordActual, nuevaPassword } = req.body;
    const usuarioId = req.user.id; 

    // Inicializar el contador de intentos fallidos si no existe en la sesión
    if (typeof req.session.intentosPassword === 'undefined') {
        req.session.intentosPassword = 0;
    }

    try {
        // 1. Obtener datos del usuario
        const [rows] = await db.query('SELECT password FROM usuarios WHERE id = ?', [usuarioId]);
        
        if (rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Usuario no encontrado en el sistema.' 
            });
        }

        const userDb = rows[0];

        // 2. Verificar contraseña actual con bcryptjs
        const coincide = await bcrypt.compare(passwordActual, userDb.password);

        if (!coincide) {
            req.session.intentosPassword += 1;
            const intentosRestantes = 3 - req.session.intentosPassword;

            // CONDICIÓN CRÍTICA: 3 Intentos fallidos consecutivos
            if (req.session.intentosPassword >= 3) {
                req.session.intentosPassword = 0; // Resetear contador de sesión

                console.warn(`ALERTA DE SEGURIDAD: Intentos fallidos de contraseña excedidos para ID: ${usuarioId}. Desactivando cuenta.`);

                // A) Desactivar la cuenta en la Base de Datos (activo = 0)
                await db.query('UPDATE usuarios SET activo = 0 WHERE id = ?', [usuarioId]);

                // B) Eliminar tokens "Recordarme" del usuario
                const cookieToken = req.signedCookies.remember_me;
                if (cookieToken) {
                    await db.query('DELETE FROM usuarios_tokens WHERE token = ?', [cookieToken]);
                    res.clearCookie('remember_me', { path: '/' });
                }

                // C) Desautenticar al usuario de la sesión de Passport y retornar código 403 (Forbidden)
                return req.logout((err) => {
                    if (err) return next(err);
                    return res.status(403).json({
                        success: false,
                        usurpado: true, // Flag útil para que tu frontend sepa que debe redirigir a /login
                        message: 'Tu cuenta ha sido bloqueada y la sesión cerrada por seguridad tras 3 intentos fallidos.'
                    });
                });
            }

            // Error de contraseña incorrecta normal (Retorna un 400)
            return res.status(400).json({
                success: false,
                intentosRestantes,
                message: `La contraseña actual es incorrecta. Te quedan ${intentosRestantes} ${intentosRestantes === 1 ? 'intento' : 'intentos'}.`
            });
        }

        // 3. ÉXITO: Resetear contador
        req.session.intentosPassword = 0;

        // 4. Generar Hash de la nueva contraseña
        const hashedNuevaPass = await bcrypt.hash(nuevaPassword, 10);

        // 5. Actualizar base de datos
        await db.query('UPDATE usuarios SET password = ? WHERE id = ?', [hashedNuevaPass, usuarioId]);

        return res.status(200).json({
            success: true,
            message: 'Tu contraseña ha sido actualizada con éxito.'
        });

    } catch (error) {
        console.error('Error al cambiar contraseña:', error);
        return res.status(500).json({
            success: false,
            message: 'Ocurrió un error interno en el servidor al procesar la solicitud.'
        });
    }
};