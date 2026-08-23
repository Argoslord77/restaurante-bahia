const express = require('express');
const router = express.Router();
const productoController = require('../controllers/productoController');
const multer = require('multer');
const bcrypt = require('bcryptjs'); // O 'bcrypt' según uses en tu proyecto
const Producto = require('../models/productoModel'); // Asegúrate de que apunte a tu modelo de Sequelize/Mongoose
const path = require('path');

// 1. Configuración de almacenamiento de Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/'); // Asegúrate de que esta carpeta exista en tu proyecto
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// 2. Filtro de archivos para asegurar que solo sean imágenes
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('El archivo no es una imagen válida.'), false);
    }
};

const upload = multer({ 
    storage: storage, 
    fileFilter: fileFilter,
    limits: { fileSize: 2 * 1024 * 1024 } // Límite de 2MB 
});

// Importamos ambos guardianes
const { ensureAuthenticated, checkRole } = require('../middlewares/auth');

// Ruta principal: Listado de productos
router.get('/productos', 
    ensureAuthenticated, 
    checkRole(['superadministrador', 'administrador']), 
    productoController.renderProductos
);

// Obtener datos de un producto (para el modal de edición)
router.get('/productos/:id', 
    ensureAuthenticated, 
    productoController.getProductoJson
);

// Crear nuevo producto
router.post('/productos/crear', 
    upload.single('foto'), 
    ensureAuthenticated, 
    checkRole(['superadministrador', 'administrador']), 
    productoController.createProducto
);

// Editar producto existente
router.post('/productos/editar/:id', 
    upload.single('foto'), 
    ensureAuthenticated, 
    checkRole(['superadministrador', 'administrador']), 
    productoController.updateProducto
);

// Eliminar (Desactivar) producto
router.delete('/productos/eliminar/:id', 
    ensureAuthenticated, 
    checkRole(['superadministrador', 'administrador']), 
    productoController.deleteProducto
);

module.exports = router;