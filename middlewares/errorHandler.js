// errorHandler.js - Middleware centralizado de manejo de errores
const logger = require('../config/logger');

// Códigos de error personalizados
const ErrorCodes = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
    AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    DATABASE_ERROR: 'DATABASE_ERROR',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    BAD_REQUEST: 'BAD_REQUEST'
};

// Clase personalizada para errores de la aplicación
class AppError extends Error {
    constructor(message, statusCode, code = ErrorCodes.INTERNAL_ERROR) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

// Middleware de manejo de errores
const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;
    error.statusCode = err.statusCode || 500;
    
    // Log del error
    logger.error(`${error.statusCode} - ${error.message}`, {
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        stack: err.stack
    });

    // Error de validación de Mongoose o express-validator
    if (err.name === 'ValidationError' || err.name === 'ValidationError') {
        const message = 'Datos de entrada inválidos';
        error = new AppError(message, 400, ErrorCodes.VALIDATION_ERROR);
        error.details = err.errors || err.array?.() || [];
    }

    // Error de duplicado (MongoDB/MySQL)
    if (err.code === 11000 || err.code === 'ER_DUP_ENTRY') {
        const message = 'El recurso ya existe';
        error = new AppError(message, 409, ErrorCodes.BAD_REQUEST);
    }

    // Error de cast (MongoDB)
    if (err.name === 'CastError') {
        const message = 'Recurso no encontrado';
        error = new AppError(message, 404, ErrorCodes.NOT_FOUND);
    }

    // Error de JWT
    if (err.name === 'JsonWebTokenError') {
        const message = 'Token inválido';
        error = new AppError(message, 401, ErrorCodes.AUTHENTICATION_ERROR);
    }

    // Error de JWT expirado
    if (err.name === 'TokenExpiredError') {
        const message = 'Token expirado';
        error = new AppError(message, 401, ErrorCodes.AUTHENTICATION_ERROR);
    }

    // Error de base de datos
    if (err.code && err.code.startsWith('ER_')) {
        const message = 'Error de base de datos';
        error = new AppError(message, 500, ErrorCodes.DATABASE_ERROR);
    }

    // Respuesta de error
    res.status(error.statusCode).json({
        success: false,
        code: error.code || ErrorCodes.INTERNAL_ERROR,
        message: error.message || 'Error interno del servidor',
        ...(error.details && { details: error.details }),
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

// Middleware para rutas no encontradas
const notFoundHandler = (req, res, next) => {
    const error = new AppError(`Ruta no encontrada: ${req.originalUrl}`, 404, ErrorCodes.NOT_FOUND);
    next(error);
};

// Middleware para capturar errores asíncronos
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
    errorHandler,
    notFoundHandler,
    asyncHandler,
    AppError,
    ErrorCodes
};
