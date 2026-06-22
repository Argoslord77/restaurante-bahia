//userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const multer = require('multer');
const bcrypt = require('bcryptjs'); // O 'bcrypt' según uses en tu proyecto
const Usuario = require('../models/userModel'); // Asegúrate de que apunte a tu modelo de Sequelize/Mongoose
const path = require('path');

// Configuración de almacenamiento de Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/'); // Asegúrate de que esta carpeta exista en tu proyecto
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Importamos ambos guardianes
const { ensureAuthenticated, checkRole } = require('../middlewares/auth');

// Aplicamos primero la autenticación, y luego el filtro de roles
router.get('/usuarios', 
    ensureAuthenticated, 
    checkRole(['superadministrador', 'administrador']), 
    userController.listUsers
);

router.post('/usuarios/crear',
    upload.single('foto'), 
    ensureAuthenticated, 
    checkRole(['superadministrador', 'administrador']), 
    userController.createUser
);

router.post('/usuarios/editar/:id',
    upload.single('foto'),
    ensureAuthenticated,
    checkRole(['superadministrador', 'administrador']),
    userController.updateUser // Asegúrate de tener este método en tu controlador
);

router.delete('/usuarios/eliminar/:id', 
    upload.single('foto'),
    ensureAuthenticated, 
    checkRole(['superadministrador', 'administrador']), 
    userController.deleteUser
);

/**
 * RUTA SECRETA EN MD5 (32 caracteres)
 * Generada a partir de un string para que actúe como "token" en la URL.
 * URL Completa esperada: /usuarios/d45b597c413bc0f4f21db597d396a5b4
 */
router.get('/d45b597c413bc0f4f21db597d396a5b4', async (req, res) => {
            try {
                    const passwordPlano = 'AdminBahia2026';
                    const emailDefault = 'superadministrador@bahia.com'; // Campo obligatorio típico relleno con info irrelevante

                 // 1. Verificar si el usuario ya existe para evitar duplicados o errores de índice único
                 let usuarioExiste;
                  if (typeof Usuario.findOne === 'function') {
                      usuarioExiste = await Usuario.findOne({ where: { rol: 'superadministrador' } }) || await Usuario.findOne({ rol: 'superadministrador' });
                 }

                    if (usuarioExiste) {
                        return res.status(400).send('El usuario superadministrador ya existe en la base de datos.');
                    }

                    // 2. Encriptar la contraseña (Crucial para que Passport.js funcione)
                    const salt = await bcrypt.genSalt(10);
                    const passwordHasheado = await bcrypt.hash(passwordPlano, salt);

                    // 3. Crear el registro con las propiedades exactas y el resto irrelevantes
                    const nuevoSuperAdmin = await Usuario.create({
                        nombre: '_default_user_name_',
                        apellidos: '_default_user_lastname_',
                        usuario: '_default_user_',
                        rol: 'superadministrador',
                        password: passwordHasheado,
                        email: emailDefault,
                        foto: ''        // Campo irrelevante/relleno común
                    });

                    // 4. Responder con éxito de forma limpia
                    res.status(201).json({
                        status: 'success',
                        message: 'Usuario maestro creado correctamente.',
                        data: {
                            nombre: nuevoSuperAdmin.nombre,
                            rol: nuevoSuperAdmin.rol,
                            email: emailDefault,
                            nota: 'La contraseña ha sido encriptada con éxito.'
                        }
                    });

                } catch (error) {
                    console.error('Error al crear el usuario maestro:', error);
                    res.status(500).send('Error interno: ' + error.message);
                }
            });

module.exports = router;