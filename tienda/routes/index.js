// tienda/routes/index.js — Todas las rutas con sus roles.
const express = require('express');
const rateLimit = require('express-rate-limit');
const { ensureAuthenticated, checkRole } = require('../middlewares/auth');
const auth = require('../controllers/authController');
const dashboard = require('../controllers/dashboardController');
const producto = require('../controllers/productoController');
const pos = require('../controllers/posController');
const inventario = require('../controllers/inventarioController');
const venta = require('../controllers/ventaController');
const caja = require('../controllers/cajaController');
const reporte = require('../controllers/reporteController');
const ajuste = require('../controllers/ajusteController');
const usuario = require('../controllers/usuarioController');

const router = express.Router();
const ADMIN = ['administrador'];
const ADMIN_CAJA = ['administrador', 'cajero'];
const TODOS = ['administrador', 'cajero', 'vendedor'];

// Login (con freno anti fuerza bruta)
const frenoLogin = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: false, legacyHeaders: false });
router.get('/login', auth.verLogin);
router.post('/login', frenoLogin, express.urlencoded({ extended: false }), auth.login);
router.get('/logout', auth.logout);

// Panel
router.get('/', ensureAuthenticated, dashboard.home);

// Productos (ver: todos; modificar: admin)
router.get('/productos', ensureAuthenticated, producto.lista);
router.get('/productos/nuevo', ensureAuthenticated, checkRole(ADMIN), producto.verForm);
router.post('/productos/nuevo', ensureAuthenticated, checkRole(ADMIN), producto.guardar);
router.get('/productos/:id/editar', ensureAuthenticated, checkRole(ADMIN), producto.verForm);
router.post('/productos/:id/editar', ensureAuthenticated, checkRole(ADMIN), producto.guardar);
router.post('/productos/:id/toggle', ensureAuthenticated, checkRole(ADMIN), producto.toggle);
router.post('/productos/categorias', ensureAuthenticated, checkRole(ADMIN), producto.crearCategoria);
router.get('/productos/:id/kardex', ensureAuthenticated, producto.kardex);

// POS
router.get('/pos', ensureAuthenticated, checkRole(TODOS), pos.vista);
router.get('/api/productos', ensureAuthenticated, checkRole(TODOS), pos.apiBuscar);
router.post('/api/ventas', ensureAuthenticated, checkRole(TODOS), pos.apiVender);

// Inventario (movimientos: admin; consulta: todos)
router.get('/inventario', ensureAuthenticated, inventario.home);
router.post('/inventario/movimiento', ensureAuthenticated, checkRole(ADMIN), inventario.guardarMovimiento);

// Ventas (cancelar: admin + cajero)
router.get('/ventas', ensureAuthenticated, venta.lista);
router.get('/ventas/:id/ticket', ensureAuthenticated, venta.ticket);
router.post('/ventas/:id/cancelar', ensureAuthenticated, checkRole(ADMIN_CAJA), venta.cancelar);

// Caja (admin + cajero)
router.get('/caja', ensureAuthenticated, checkRole(ADMIN_CAJA), caja.estado);
router.post('/caja/abrir', ensureAuthenticated, checkRole(ADMIN_CAJA), caja.abrir);
router.post('/caja/cerrar', ensureAuthenticated, checkRole(ADMIN_CAJA), caja.cerrar);

// Reportes (admin + cajero)
router.get('/reportes/ventas', ensureAuthenticated, checkRole(ADMIN_CAJA), reporte.ventas);
router.get('/reportes/mas-vendidos', ensureAuthenticated, checkRole(ADMIN_CAJA), reporte.masVendidos);
router.get('/reportes/inventario', ensureAuthenticated, checkRole(ADMIN_CAJA), reporte.inventario);

// Ajustes y usuarios (solo admin)
router.get('/ajustes', ensureAuthenticated, checkRole(ADMIN), ajuste.ver);
router.post('/ajustes', ensureAuthenticated, checkRole(ADMIN), ajuste.guardar);
router.get('/usuarios', ensureAuthenticated, checkRole(ADMIN), usuario.lista);
router.post('/usuarios', ensureAuthenticated, checkRole(ADMIN), usuario.crear);
router.post('/usuarios/:id/clave', ensureAuthenticated, checkRole(ADMIN), usuario.clave);
router.post('/usuarios/:id/rol', ensureAuthenticated, checkRole(ADMIN), usuario.rol);
router.post('/usuarios/:id/toggle', ensureAuthenticated, checkRole(ADMIN), usuario.toggle);

module.exports = router;
