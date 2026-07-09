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
            .isLength({ min: 1, max: 60 }).withMessage('El número o código de mesa debe tener entre 1 y 60 caracteres'),
        
        body('capacidad')
            .notEmpty().withMessage('La capacidad es obligatoria')
            .isInt({ min: 1, max: 50 }).withMessage('La capacidad debe ser entre 1 y 50'),
        
        body('ubicacion')
            .optional()
            .trim()
            .isLength({ max: 50 }).withMessage('La ubicación no puede exceder 50 caracteres'),
        
        body('estado')
            .optional()
            .isIn(['libre', 'ocupada', 'reservada', 'desocupandose', 'mantenimiento']).withMessage('Estado no válido')
    ],
    
    update: [
        param('id')
            .isInt().withMessage('El ID debe ser un número entero'),
        
        body('numero')
            .optional()
            .isLength({ min: 1, max: 60 }).withMessage('El número o código de mesa debe tener entre 1 y 60 caracteres'),
        
        body('capacidad')
            .optional()
            .isInt({ min: 1, max: 50 }).withMessage('La capacidad debe ser entre 1 y 50'),
        
        body('ubicacion')
            .optional()
            .trim()
            .isLength({ max: 50 }).withMessage('La ubicación no puede exceder 50 caracteres'),
        
        body('estado')
            .optional()
            .isIn(['libre', 'ocupada', 'reservada', 'desocupandose', 'mantenimiento']).withMessage('Estado no válido')
    ]
};

// Validaciones para Recetas
const recetaValidationRules = {
    create: [
        body('codigo')
            .trim()
            .notEmpty().withMessage('El código de la receta es obligatorio')
            .isLength({ min: 2, max: 50 }).withMessage('El código debe tener entre 2 y 50 caracteres'),

        body('nombre')
            .trim()
            .notEmpty().withMessage('El nombre de la receta es obligatorio')
            .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres'),

        body('tipo')
            .notEmpty().withMessage('El tipo de receta es obligatorio')
            .isIn(['subreceta', 'platillo_final', 'VENTA']).withMessage('El tipo debe ser subreceta, platillo_final o VENTA'),

        body('rendimiento')
            .notEmpty().withMessage('El rendimiento es obligatorio')
            .isFloat({ min: 0.01 }).withMessage('El rendimiento debe ser un número mayor a 0'),

        body('unidad_rendimiento')
            .trim()
            .notEmpty().withMessage('La unidad de rendimiento es obligatoria')
            .isLength({ max: 50 }).withMessage('La unidad de rendimiento no puede superar los 50 caracteres'),

        body('producto_resultante_id')
            .notEmpty().withMessage('El producto o platillo final resultante es obligatorio')
            .isInt().withMessage('El ID del producto resultante debe ser un número entero'),

        body('costo_estimado')
            .optional()
            .isFloat({ min: 0 }).withMessage('El costo estimado debe ser un número positivo'),

        body('precio_sugerido')
            .optional()
            .isFloat({ min: 0 }).withMessage('El precio sugerido debe ser un número positivo'),

        body('activa')
            .optional()
            .isBoolean().withMessage('El campo activa debe ser un booleano'),

        body('detalles')
            .isArray({ min: 1 }).withMessage('La receta debe contener al menos un ingrediente'),

        body('detalles.*.producto_id')
            .notEmpty().withMessage('El ID del insumo/producto es obligatorio')
            .isInt().withMessage('El ID del insumo debe ser un número entero'),

        body('detalles.*.cantidad_requerida')
            .notEmpty().withMessage('La cantidad requerida es obligatoria')
            .isFloat({ min: 0.0001 }).withMessage('La cantidad del ingrediente debe ser mayor a 0'),

        body('detalles.*.unidad_medida')
            .trim()
            .notEmpty().withMessage('La unidad de medida del ingrediente es obligatoria')
            .isLength({ max: 20 }).withMessage('La unidad de medida del ingrediente no puede exceder los 20 caracteres')
    ],
    
    update: [
        param('id')
            .isInt().withMessage('El ID debe ser un número entero'),
        
        body('codigo')
            .optional()
            .trim()
            .isLength({ min: 2, max: 50 }).withMessage('El código debe tener entre 2 y 50 caracteres'),

        body('nombre')
            .optional()
            .trim()
            .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres'),

        body('tipo')
            .optional()
            .isIn(['subreceta', 'platillo_final', 'VENTA']).withMessage('El tipo debe ser subreceta, platillo_final o VENTA'),

        body('rendimiento')
            .optional()
            .isFloat({ min: 0.01 }).withMessage('El rendimiento debe ser un número mayor a 0'),

        body('unidad_rendimiento')
            .optional()
            .trim()
            .isLength({ max: 50 }).withMessage('La unidad de rendimiento no puede superar los 50 caracteres'),

        body('producto_resultante_id')
            .optional()
            .isInt().withMessage('El ID del producto resultante debe ser un número entero'),

        body('costo_estimado')
            .optional()
            .isFloat({ min: 0 }).withMessage('El costo estimado debe ser un número positivo'),

        body('precio_sugerido')
            .optional()
            .isFloat({ min: 0 }).withMessage('El precio sugerido debe ser un número positivo'),
        
        body('activa')
            .optional()
            .isBoolean().withMessage('El campo activa debe ser un booleano'),

        body('detalles')
            .optional()
            .isArray().withMessage('Los detalles deben ser un array de ingredientes'),

        body('detalles.*.producto_id')
            .optional()
            .isInt().withMessage('El ID del insumo debe ser un número entero'),

        body('detalles.*.cantidad_requerida')
            .optional()
            .isFloat({ min: 0.0001 }).withMessage('La cantidad debe ser mayor a 0'),

        body('detalles.*.unidad_medida')
            .optional()
            .trim()
            .isLength({ max: 20 }).withMessage('La unidad de medida del ingrediente no puede exceder los 20 caracteres')
    ],
    
    verificarStock: [
        body('items')
            .isArray().withMessage('Los items deben ser un array'),
        
        body('almacenId')
            .notEmpty().withMessage('El ID del almacén es obligatorio')
            .isInt().withMessage('El ID del almacén debe ser un número entero'),
        
        body('items.*.id_platillo')
            .optional()
            .isInt().withMessage('El ID del platillo debe ser un número entero'),
        
        body('items.*.cantidad')
            .optional()
            .isInt({ min: 1 }).withMessage('La cantidad debe ser un entero positivo')
    ]
};

// Validaciones para Transferencias
const transferenciaValidationRules = {
    create: [
        body('almacen_origen_id')
            .notEmpty().withMessage('El almacén de origen es obligatorio')
            .isInt().withMessage('El ID del almacén de origen debe ser un número entero'),
        
        body('almacen_destino_id')
            .notEmpty().withMessage('El almacén de destino es obligatorio')
            .isInt().withMessage('El ID del almacén de destino debe ser un número entero'),
        
        body('producto_id')
            .notEmpty().withMessage('El producto es obligatorio')
            .isInt().withMessage('El ID del producto debe ser un número entero'),
        
        body('cantidad')
            .notEmpty().withMessage('La cantidad es obligatoria')
            .isFloat({ min: 0.001 }).withMessage('La cantidad debe ser mayor a 0'),
        
        body('motivo')
            .optional()
            .trim()
            .isLength({ max: 255 }).withMessage('El motivo no puede exceder 255 caracteres'),
        
        body('notas')
            .optional()
            .trim()
            .isLength({ max: 1000 }).withMessage('Las notas no pueden exceder 1000 caracteres')
    ]
};

// Validaciones para Salidas Manuales
const salidaManualValidationRules = {
    create: [
        body('almacen_id')
            .notEmpty().withMessage('El almacén es obligatorio')
            .isInt().withMessage('El ID del almacén debe ser un número entero'),
        
        body('producto_id')
            .notEmpty().withMessage('El producto es obligatorio')
            .isInt().withMessage('El ID del producto debe ser un número entero'),
        
        body('cantidad')
            .notEmpty().withMessage('La cantidad es obligatoria')
            .isFloat({ min: 0.001 }).withMessage('La cantidad debe ser mayor a 0'),
        
        body('tipo')
            .notEmpty().withMessage('El tipo de salida es obligatorio')
            .isIn(['merma', 'rotura', 'perdida', 'ajuste_auditoria', 'caducado', 'otro']).withMessage('Tipo de salida no válido'),
        
        body('motivo')
            .optional()
            .trim()
            .isLength({ max: 255 }).withMessage('El motivo no puede exceder 255 caracteres'),
        
        body('notas')
            .optional()
            .trim()
            .isLength({ max: 1000 }).withMessage('Las notas no pueden exceder 1000 caracteres')
    ]
};

// Validaciones para Entradas de Almacén e Ingreso de Lotes
const entradaValidationRules = {
    create: [
        body('almacen_id')
            .exists().withMessage('El almacén de destino es obligatorio')
            .bail()
            .notEmpty().withMessage('El almacén de destino no puede estar vacío')
            .isInt().withMessage('El ID del almacén debe ser un número entero'),
        
        body('producto_id')
            .exists().withMessage('El producto/insumo es obligatorio')
            .bail()
            .notEmpty().withMessage('El producto/insumo no puede estar vacío')
            .isInt().withMessage('El ID del producto debe ser un número entero'),
        
        body('fecha_ingreso')
            .exists().withMessage('La fecha de ingreso es obligatoria')
            .bail()
            .notEmpty().withMessage('La fecha de ingreso no puede estar vacía')
            .isDate().withMessage('La fecha de ingreso debe tener un formato válido (AAAA-MM-DD)'),
        
        body('fecha_vencimiento')
            .optional({ checkFalsy: true })
            .customSanitizer(value => (value === '' ? null : value))
            .isDate().withMessage('La fecha de vencimiento debe tener un formato válido (AAAA-MM-DD)'),
        
        body('cantidad')
            .exists().withMessage('La cantidad ingresada es obligatoria')
            .bail()
            .notEmpty().withMessage('La cantidad no puede estar vacía')
            .customSanitizer(value => String(value).trim())
            .isFloat({ min: 0.001 }).withMessage('La cantidad debe ser un número mayor a 0'),
        
        body('costo_unitario')
            .exists().withMessage('El costo unitario es obligatorio')
            .bail()
            .notEmpty().withMessage('El costo unitario no puede estar vacío')
            .customSanitizer(value => String(value).trim())
            .isFloat({ min: 0.000001 }).withMessage('El costo unitario debe ser un número positivo')
    ]
};

module.exports = {
    handleValidationErrors,
    userValidationRules,
    menuValidationRules,
    pedidoValidationRules,
    posValidationRules,
    almacenValidationRules,
    mesaValidationRules,
    recetaValidationRules,
    transferenciaValidationRules,
    salidaManualValidationRules,
    entradaValidationRules
};