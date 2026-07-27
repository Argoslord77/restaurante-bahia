const express = require('express');
const https = require('https');
const fs = require('fs');
const session = require('express-session');
const passport = require('passport');
const flash = require('connect-flash');
const favicon = require('serve-favicon');
const path = require('path');
require('dotenv').config();
const cookieParser = require('cookie-parser');
const logger = require('./config/logger');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
// Pasamos la configuración a Passport
require('./config/passport')(passport);
const PORT = process.env.PORT || 3000;

// Configurar motor de plantillas EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware para archivos estáticos (CSS/JS local de Bootstrap)
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// SEGURIDAD - Helmet para headers de seguridad
// ==========================================
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'", "https://cdn.jsdelivr.net"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));

// ==========================================
// SEGURIDAD - Rate Limiting
// ==========================================
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 2000, // límite de 100 requests por ventana
    message: {
        success: false,
        message: 'Demasiadas solicitudes desde esta IP, por favor intenta más tarde.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Aplicar rate limiting a todas las rutas
app.use(limiter);

// Middleware para procesar datos de formularios (URL-encoded) y JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(cookieParser(process.env.COOKIE_SECRET));

// ==========================================
// 1. CONFIGURACIÓN DE SESIONES Y FLASH (Mover aquí arriba)
// ==========================================
app.use(session({ 
    secret: process.env.SESSION_SECRET, 
    resave: false,                  
    saveUninitialized: false,       
    cookie: { 
        secure: true,                
        maxAge: 3600000                 
    } 
}));

//Inicializar Passport y su sesión
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// ==========================================
// MIDDLEWARE DE RECORDARME AUTOMÁTICO
// ==========================================
const { checkRememberMe } = require('./middlewares/auth');
app.use(checkRememberMe);

// ==========================================
// 2. VARIABLES GLOBALES PARA EJS (Justo después de flash)
// ==========================================
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.user = req.session.user || null;
    next();
});

// ==========================================
// 3. SERVIR EL FAVICON CON EXPRESS y serve-favicon
// ==========================================
app.use(favicon(path.join(__dirname, 'public/img', 'favicon.png')));

// ==========================================
// 3. VINCULACIÓN DE RUTAS (Siempre al final de los middlewares globales)
// ==========================================
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const almacenRoutes = require('./routes/almacenRoutes');
const productoRoutes = require('./routes/productoRoutes');
const posRoutes = require('./routes/posRoutes');
const pedidoRoutes = require('./routes/pedidoRoutes');
const recetaRoutes = require('./routes/recetaRoutes');
const transferenciaRoutes = require('./routes/transferenciaRoutes');
const salidaManualRoutes = require('./routes/salidaManualRoutes');
const settingRoutes = require('./routes/settingRoutes');
const entradaRoutes = require('./routes/entradaRoutes');
const inventarioRoutes = require('./routes/inventarioRoutes');
const turnoRoutes = require('./routes/turnoRoutes');
const monedaRoutes = require('./routes/monedaRoutes');

app.use('/', authRoutes);
app.use('/admin', userRoutes);
app.use('/admin', adminRoutes);
app.use('/admin', almacenRoutes);
app.use('/admin', productoRoutes);
app.use('/admin', pedidoRoutes);
app.use('/admin', recetaRoutes);
app.use('/admin', transferenciaRoutes);
app.use('/admin', salidaManualRoutes);
app.use('/admin', settingRoutes);
app.use('/admin', transferenciaRoutes);
app.use('/admin', entradaRoutes);
app.use('/admin', inventarioRoutes);
app.use('/admin', turnoRoutes);
app.use('/admin', monedaRoutes);

app.use(posRoutes);

// Ruta inicial 
app.get('/', (req, res) => {
    res.redirect('/admin/dashboard'); 
});

// ==========================================
// MIDDLEWARE DE MANEJO DE ERRORES (Siempre al final)
// ==========================================
// Manejo de rutas no encontradas
// app.use(notFoundHandler);

// Manejo centralizado de errores
app.use(errorHandler);

// 1. Leer los certificados generados por mkcert
const sslOptions = {
  key: fs.readFileSync(path.join(__dirname, 'certs', 'key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'certs', 'cert.pem'))
};

// 2. Crear el servidor HTTPS en lugar del HTTP normal
https.createServer(sslOptions, app).listen(PORT, () => {
  console.log(`Servidor HTTPS corriendo en: https://localhost:${PORT}`);
});