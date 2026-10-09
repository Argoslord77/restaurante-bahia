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
// D3: cache de 1 día en navegador (las tablets de sala no re-descargan
// Bootstrap en cada pantalla). Tras actualizar, Ctrl+F5 como siempre.
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1d', etag: true }));
// D3: gzip para HTML/JSON dinámicos (estáticos y descargas no se tocan).
app.use(require('./middlewares/compress'));

// ==========================================
// SEGURIDAD - Helmet para headers de seguridad
// ==========================================
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            // helmet trae script-src-attr 'none' por defecto y bloqueaba TODOS los
            // onclick inline (botones de impresion, acciones de tablas, etc.)
            scriptSrcAttr: ["'unsafe-inline'"],
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
// A2: sesiones persistentes en MySQL: sobreviven a reinicios y se
// limpian solas (tabla `sesiones`, ver scripts/migracion_sesiones.sql).
const MysqlSessionStore = require('./config/sessionStore');
const sessionStore = new MysqlSessionStore(require('./config/db'), { ttlMs: 3600000 });
sessionStore.iniciarLimpieza();
app.use(session({ 
    secret: process.env.SESSION_SECRET, 
    store: sessionStore,
    resave: false,                  
    saveUninitialized: false,       
    cookie: { 
        secure: true,
        httpOnly: true,
        sameSite: 'lax',
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
const { checkRememberMe, deslizarSesion } = require('./middlewares/auth');
app.use(checkRememberMe);
// Sesión deslizante: la actividad renueva la vigencia (anti-expulsión).
app.use(deslizarSesion);

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
// D2: healthcheck público para monitoreo/pm2. Va ANTES de la auditoría
// para no ensuciar el registro con cada sonda (cada minuto).
app.get('/salud', require('./controllers/healthController').estadoSalud);

// 2.b AUDITORÍA GLOBAL DE OPERACIONES
// ==========================================
// Debe ir DESPUÉS de la sesión, Passport y checkRememberMe (para conocer al
// usuario) y ANTES de las rutas (para envolver toda la aplicación).
// Registra consultas, altas, modificaciones, bajas, impresiones y cierres.
// El detalle semántico de cada ruta vive en config/auditoriaCatalogo.js.
const { auditoriaGlobal } = require('./middlewares/auditoria');
app.use(auditoriaGlobal());

// ==========================================
// 2.c LICENCIA DE LA INSTALACIÓN
// ==========================================
// Va después de la auditoría (para que el intento quede registrado) y antes de
// las rutas. Nunca bloquea el inicio de sesión, la pantalla de licencia ni el
// cierre de las operaciones que ya estén abiertas.
const { exigirLicencia } = require('./middlewares/licencia');
app.use(exigirLicencia());

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
const reporteRoutes = require('./routes/reporteRoutes');
const turnoRoutes = require('./routes/turnoRoutes');
const reservaRoutes = require('./routes/reservaRoutes');
const cuentaRoutes = require('./routes/cuentaRoutes');
const proveedorRoutes = require('./routes/proveedorRoutes');
const monedaRoutes = require('./routes/monedaRoutes');
const cierreDiaRoutes = require('./routes/cierreDiaRoutes');
const clienteRoutes = require('./routes/clienteRoutes'); 
const unidadMedidaRoutes = require('./routes/unidadMedidaRoutes'); 
const auditoriaRoutes = require('./routes/auditoriaRoutes'); 
const fichaCostoRoutes = require('./routes/fichaCostoRoutes');
const licenciaRoutes = require('./routes/licenciaRoutes');

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
app.use('/admin', entradaRoutes);
app.use('/admin', inventarioRoutes);
app.use('/admin', reporteRoutes);
app.use('/admin', turnoRoutes);
app.use('/admin', reservaRoutes);
app.use('/admin', cuentaRoutes);
app.use('/admin', proveedorRoutes);
app.use('/admin', monedaRoutes);
app.use('/admin', cierreDiaRoutes);
app.use('/admin', unidadMedidaRoutes);
app.use('/admin', auditoriaRoutes);
app.use('/admin', fichaCostoRoutes);
app.use('/admin', licenciaRoutes);

app.use(posRoutes);
app.use(clienteRoutes);

// Ruta inicial (según el rol: el personal de servicio entra a su circuito
// dependiente/capitán y no al panel administrativo, al que no tiene acceso)
app.get('/', (req, res) => {
    const { destinoPorRol } = require('./middlewares/auth');
    const rol = (req.session && req.session.user && req.session.user.rol)
        || (req.user && req.user.rol)
        || null;
    if (!req.isAuthenticated || !req.isAuthenticated() || !rol) {
        return res.redirect('/login');
    }
    return res.redirect(destinoPorRol(rol) || '/login');
});

// ==========================================
// MIDDLEWARE DE MANEJO DE ERRORES (Siempre al final)
// ==========================================
// Manejo de rutas no encontradas
app.use(notFoundHandler);

// Manejo centralizado de errores
app.use(errorHandler);

// 1. Leer los certificados generados por mkcert
const sslOptions = {
  key: fs.readFileSync(path.join(__dirname, 'certs', 'key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'certs', 'cert.pem'))
};

// 2. Crear el servidor HTTPS en lugar del HTTP normal
const server = https.createServer(sslOptions, app).listen(PORT, () => {
  console.log(`Servidor HTTPS corriendo en: https://localhost:${PORT}`);
});

// A4: respaldo automático diario (hora/retención por .env).
const respaldoAuto = require('./services/backupScheduler').iniciar();

// A3: apagado limpio. pm2/docker mandan SIGTERM al reiniciar: se deja de
// aceptar conexiones, se drena el pool MySQL y se paran los intervalos
// antes de salir. Nada se corta a mitad de un cobro o un cierre.
let cerrando = false;
async function apagadoLimpio(origen) {
    if (cerrando) return;
    cerrando = true;
    logger.info(`[apagado] señal ${origen}: cerrando limpio...`);
    try {
        respaldoAuto.detener();
        sessionStore.detenerLimpieza();
        await new Promise(resolve => server.close(resolve));
        await require('./config/db').end();
        logger.info('[apagado] listo.');
    } catch (err) {
        logger.error(`[apagado] ${err.message}`);
    } finally {
        process.exit(0);
    }
}
function apagadoConFailsafe(origen) {
    // Failsafe: si algo cuelga el cierre, salir de todos modos.
    setTimeout(() => process.exit(1), 10000).unref();
    apagadoLimpio(origen).catch(() => process.exit(1));
}
process.on('SIGTERM', () => apagadoConFailsafe('SIGTERM'));
process.on('SIGINT', () => apagadoConFailsafe('SIGINT'));
process.on('uncaughtException', err => {
    logger.error(`[uncaughtException] ${err.stack || err.message}`);
    apagadoConFailsafe('uncaughtException');
});
process.on('unhandledRejection', motivo => {
    logger.error(`[unhandledRejection] ${(motivo && motivo.stack) || motivo}`);
});