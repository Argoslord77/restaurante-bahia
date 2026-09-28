// security.js - Middleware de seguridad
const rateLimit = require('express-rate-limit');

// Rate limiting más estricto para rutas de autenticación
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // límite de 5 intentos de login por ventana
    message: {
        success: false,
        message: 'Demasiados intentos de login, por favor intenta más tarde.'
    },
    skipSuccessfulRequests: true,
});

// Rate limiting para rutas de API
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 200, // límite de 200 requests por ventana
    message: {
        success: false,
        message: 'Demasiadas solicitudes a la API, por favor intenta más tarde.'
    },
});

// B2: el circuito QR de cliente es público (sin login). Límite generoso
// por IP: el dashboard de cliente no sondea, solo actúa por gesto.
const clienteLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 120, // 120 peticiones por IP y ventana
    message: {
        success: false,
        message: 'Demasiadas solicitudes desde este dispositivo, por favor intenta más tarde.'
    },
});

module.exports = {
    authLimiter,
    apiLimiter,
    clienteLimiter
};
