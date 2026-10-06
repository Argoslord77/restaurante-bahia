// tienda/app.js — Punto de venta para pequeños negocios (app independiente).
require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const helmet = require('helmet');

const app = express();
const PUERTO = Number(process.env.PUERTO) || 3001;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(session({
    secret: process.env.SESION_SECRETO || 'tienda-secreto-temporal',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 12 * 60 * 60 * 1000 }
}));
app.use(flash());

// Usuario y mensajes disponibles en todas las vistas
app.use((req, res, next) => {
    res.locals.sesion = req.session.tiendaUser || null;
    res.locals.ok_msg = req.flash('ok_msg');
    res.locals.error_msg = req.flash('error_msg');
    next();
});

// Licencia de la instalación: se evalúa antes que las rutas. Nunca bloquea el
// inicio de sesión, la pantalla de licencia ni los recursos estáticos.
const { exigirLicencia } = require('./middlewares/licencia');
app.use(exigirLicencia());

app.use('/', require('./routes'));

// 404
app.use((req, res) => res.status(404).render('error', {
    titulo: 'No encontrado',
    mensaje: 'La página que busca no existe.'
}));

// 500
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    console.error('Error:', err);
    if ((req.headers.accept || '').includes('application/json') || req.xhr) {
        return res.status(500).json({ success: false, message: 'Error interno.' });
    }
    res.status(500).render('error', { titulo: 'Error interno', mensaje: 'Algo salió mal. Intente de nuevo.' });
});

if (require.main === module) {
    app.listen(PUERTO, () => console.log(`CajaFácil en http://localhost:${PUERTO}`));
}

module.exports = app;
