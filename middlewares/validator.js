// validator.js - Middleware de validación de datos usando express-validator
const { body, param, query, validationResult } = require('express-validator');

// Middleware para manejar errores de validación
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Error de validación',
            errors: errors.array().map(err => ({
                field: err.path,
                message: err.msg,
                value: err.value
            }))
        });
    }
    
    next();
};

// Validaciones para Usuarios
const userValidationRules = {
    create: [
        body('nombre')
            .trim()
            .notEmpty().withMessage('El nombre es obligatorio')
            .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres')
            .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/).withMessage('El nombre solo debe contener letras'),
        
        body('apellidos')
            .trim()
            .notEmpty().withMessage('Los apellidos son obligatorios')
            .isLength({ min: 2, max: 100 }).withMessage('Los apellidos deben tener entre 2 y 100 caracteres')
            .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/).withMessage('Los apellidos solo deben contener letras'),
        
        body('email')
            .optional()
            .trim()
            .isEmail().withMessage('El email no es válido')
            .normalizeEmail(),
        
        body('usuario')
            .trim()
            .notEmpty().withMessage('El usuario es obligatorio')
            .isLength({ min: 3, max: 50 }).withMessage('El usuario debe tener entre 3 y 50 caracteres')
            .matches(/^[a-zA-Z0-9_]+$/).withMessage('El usuario solo puede contener letras, números y guiones bajos'),
        
        body('password')
            .notEmpty().withMessage('La contraseña es obligatoria')
            .isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
        
        body('rol')
            .notEmpty().withMessage('El rol es obligatorio')
            .isIn(['superadministrador', 'administrador', 'dependiente']).withMessage('Rol no válido')
    ],
    
    update: [
        param('id')
            .isInt().withMessage('El ID debe ser un número entero'),
        
        body('nombre')
            .optional()
            .trim()
            .notEmpty().withMessage('El nombre no puede estar vacío')
            .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres')
            .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/).withMessage('El nombre solo debe contener letras'),
        
        body('apellidos')
            .optional()
            .trim()
            .notEmpty().withMessage('Los apellidos no pueden estar vacíos')
            .isLength({ min: 2, max: 100 }).withMessage('Los apellidos deben tener entre 2 y 100 caracteres')
            .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/).withMessage('Los apellidos solo deben contener letras'),
        
        body('email')
            .optional()
            .trim()
            .isEmail().withMessage('El email no es válido')
            .normalizeEmail(),
        
        body('usuario')
            .optional()
            .trim()
            .notEmpty().withMessage('El usuario no puede estar vacío')
            .isLength({ min: 3, max: 50 }).withMessage('El usuario debe tener entre 3 y 50 caracteres')
            .matches(/^[a-zA-Z0-9_]+$/).withMessage('El usuario solo puede contener letras, números y guiones bajos'),
        
        body('password')
            .optional()
            .isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
        
        body('rol')
            .optional()
            .isIn(['superadministrador', 'administrador', 'dependiente']).withMessage('Rol no válido')
    ],
    
    delete: [
        param('id')
            .isInt().withMessage('El ID debe ser un número entero')
    ]
};

// Validaciones para Menú/Platillos
const menuValidationRules = {
    create: [
        body('nombre')
            .trim()
            .notEmpty().withMessage('El nombre del platillo es obligatorio')
            .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres'),
        
        body('descripcion')
            .optional()
            .trim()
            .isLength({ max: 500 }).withMessage('La descripción no puede exceder 500 caracteres'),
        
        body('precio')
            .notEmpty().withMessage('El precio es obligatorio')
            .isFloat({ min: 0 }).withMessage('El precio debe ser un número positivo'),
        
        body('precio_alt')
            .optional()
            .isFloat({ min: 0 }).withMessage('El precio alternativo debe ser un número positivo'),
        
        body('categoria')
            .optional()
            .trim()
            .isLength({ max: 50 }).withMessage('La categoría no puede exceder 50 caracteres')
    ],
    
    update: [
        param('id')
            .isInt().withMessage('El ID debe ser un número entero'),
        
        body('nombre')
            .optional()
            .trim()
            .notEmpty().withMessage('El nombre no puede estar vacío')
            .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres'),
        
        body('descripcion')
            .optional()
            .trim()
            .isLength({ max: 500 }).withMessage('La descripción no puede exceder 500 caracteres'),
        
        body('precio')
            .optional()
            .isFloat({ min: 0 }).withMessage('El precio debe ser un número positivo'),
        
        body('precio_alt')
            .optional()
            .isFloat({ min: 0 }).withMessage('El precio alternativo debe ser un número positivo'),
        
        body('categoria')
            .optional()
            .trim()
            .isLength({ max: 50 }).withMessage('La categoría no puede exceder 50 caracteres')
    ],
    
    delete: [
        param('id')
            .isInt().withMessage('El ID debe ser un número entero')
    ]
};

// Validaciones para Pedidos
const pedidoValidationRules = {
    create: [
        body('id_mesa')
            .notEmpty().withMessage('El ID de la mesa es obligatorio')
            .isInt().withMessage('El ID de la mesa debe ser un número entero')
    ],
    
    enviarOrden: [
        param('id')
            .isInt().withMessage('El ID del pedido debe ser un número entero'),
        
        body('items')
            .isArray({ min: 1 }).withMessage('Debe enviar al menos un item'),
        
        body('items.*.id_platillo')
            .isInt().withMessage('El ID del platillo debe ser un número entero'),
        
        body('items.*.cantidad')
            .isInt({ min: 1 }).withMessage('La cantidad debe ser al menos 1')
    ],
    
    cerrarCuenta: [
        param('id')
            .isInt().withMessage('El ID del pedido debe ser un número entero')
    ],
    
    cancelar: [
        param('id')
            .isInt().withMessage('El ID del pedido debe ser un número entero'),
        
        body('productosAfectados')
            .optional()
            .isArray(),
        
        body('motivo')
            .optional()
            .trim()
            .isLength({ min: 5, max: 500 }).withMessage('El motivo debe tener entre 5 y 500 caracteres')
    ]
};

// Validaciones para POS
const posValidationRules = {
    initOrderManual: [
        body('id_mesa')
            .notEmpty().withMessage('El ID de la mesa es obligatorio')
            .isInt().withMessage('El ID de la mesa debe ser un número entero')
    ],
    
    saveOrder: [
        body('id_pedido')
            .notEmpty().withMessage('El ID del pedido es obligatorio')
            .isInt().withMessage('El ID del pedido debe ser un número entero'),
        
        body('items')
            .isArray().withMessage('Los items deben ser un array'),
        
        body('items.*.id_platillo')
            .optional()
            .isInt().withMessage('El ID del platillo debe ser un número entero'),
        
        body('items.*.cantidad')
            .optional()
            .isInt({ min: 0 }).withMessage('La cantidad debe ser un número entero positivo')
    ]
};

// Validaciones para Almacenes
const almacenValidationRules = {
    create: [
        body('nombre')
            .trim()
            .notEmpty().withMessage('El nombre del almacén es obligatorio')
            .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres'),
        
        body('ubicacion')
            .optional()
            .trim()
            .isLength({ max: 100 }).withMessage('La ubicación no puede exceder 100 caracteres'),
        
        body('responsable_id')
            .optional()
            .isInt().withMessage('El ID del responsable debe ser un número entero')
    ],
    
    update: [
        param('id')
            .isInt().withMessage('El ID debe ser un número entero'),
        
        body('nombre')
            .optional()
            .trim()
            .notEmpty().withMessage('El nombre no puede estar vacío')
            .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres'),
        
        body('ubicacion')
            .optional()
            .trim()
            .isLength({ max: 100 }).withMessage('La ubicación no puede exceder 100 caracteres'),
        
        body('responsable_id')
            .optional()
            .isInt().withMessage('El ID del responsable debe ser un número entero')
    ]
};

// Validaciones para Mesas
const mesaValidationRules = {
    create: [
        body('numero')
            .notEmpty().withMessage('El número de mesa es obligatorio')
            .isInt({ min: 1 }).withMessage('El número de mesa debe ser un entero positivo'),
        
        body('capacidad')
            .notEmpty().withMessage('La capacidad es obligatoria')
            .isInt({ min: 1, max: 50 }).withMessage('La capacidad debe ser entre 1 y 50'),
        
        body('ubicacion')
            .optional()
            .trim()
            .isLength({ max: 50 }).withMessage('La ubicación no puede exceder 50 caracteres'),
        
        body('estado')
            .optional()
            .isIn(['disponible', 'ocupada', 'reservada']).withMessage('Estado no válido')
    ],
    
    update: [
        param('id')
            .isInt().withMessage('El ID debe ser un número entero'),
        
        body('numero')
            .optional()
            .isInt({ min: 1 }).withMessage('El número de mesa debe ser un entero positivo'),
        
        body('capacidad')
            .optional()
            .isInt({ min: 1, max: 50 }).withMessage('La capacidad debe ser entre 1 y 50'),
        
        body('ubicacion')
            .optional()
            .trim()
            .isLength({ max: 50 }).withMessage('La ubicación no puede exceder 50 caracteres'),
        
        body('estado')
            .optional()
            .isIn(['disponible', 'ocupada', 'reservada']).withMessage('Estado no válido')
    ]
};

module.exports = {
    handleValidationErrors,
    userValidationRules,
    menuValidationRules,
    pedidoValidationRules,
    posValidationRules,
    almacenValidationRules,
    mesaValidationRules
};
