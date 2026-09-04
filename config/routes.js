// config/routes.js
// Registro central de rutas.
//
// En el app.js monolítico había 20 `require` sueltos y 23 `app.use(...)`, con
// `transferenciaRoutes` montado DOS veces (el segundo montaje era código muerto:
// el primero ya capturaba todas sus rutas). Aquí la tabla es la única fuente de
// verdad: se puede recorrer, validar y probar sin levantar el servidor.
'use strict';

const path = require('path');

/**
 * Orden de montaje = orden de precedencia en Express. NO reordenar sin pensar:
 * authRoutes va primero porque atiende '/', y posRoutes/clienteRoutes van al
 * final para no solaparse con el backend de administración.
 */
const REGISTRO_RUTAS = [
    { prefijo: '/', modulo: 'authRoutes', descripcion: 'Login, logout, registro y recuperación' },
    { prefijo: '/admin', modulo: 'userRoutes', descripcion: 'Personal y usuarios' },
    { prefijo: '/admin', modulo: 'adminRoutes', descripcion: 'Dashboard, mesas, pedidos y panel general' },
    { prefijo: '/admin', modulo: 'almacenRoutes', descripcion: 'Almacenes y áreas de stock' },
    { prefijo: '/admin', modulo: 'productoRoutes', descripcion: 'Catálogo de productos e insumos' },
    { prefijo: '/admin', modulo: 'pedidoRoutes', descripcion: 'Pedidos y ventas' },
    { prefijo: '/admin', modulo: 'recetaRoutes', descripcion: 'Recetas y fichas técnicas' },
    { prefijo: '/admin', modulo: 'transferenciaRoutes', descripcion: 'Transferencias entre almacenes' },
    { prefijo: '/admin', modulo: 'salidaManualRoutes', descripcion: 'Salidas manuales de inventario' },
    { prefijo: '/admin', modulo: 'settingRoutes', descripcion: 'Configuración del sistema' },
    { prefijo: '/admin', modulo: 'entradaRoutes', descripcion: 'Entradas de inventario' },
    { prefijo: '/admin', modulo: 'inventarioRoutes', descripcion: 'Inventario, kardex y reportes de stock' },
    { prefijo: '/admin', modulo: 'reporteRoutes', descripcion: 'Reportes e impresión' },
    { prefijo: '/admin', modulo: 'turnoRoutes', descripcion: 'Turnos de servicio, apertura y cierre' },
    { prefijo: '/admin', modulo: 'monedaRoutes', descripcion: 'Monedas y tasas de cambio' },
    { prefijo: '/admin', modulo: 'cierreDiaRoutes', descripcion: 'Cierre del día y arqueo' },
    { prefijo: '/admin', modulo: 'unidadMedidaRoutes', descripcion: 'Unidades de medida y conversiones' },
    { prefijo: '/admin', modulo: 'auditoriaRoutes', descripcion: 'Auditoría de operaciones' },
    { prefijo: '/admin', modulo: 'fichaCostoRoutes', descripcion: 'Fichas de costo' },
    { prefijo: '/admin', modulo: 'licenciaRoutes', descripcion: 'Licencia de la instalación' },
    { prefijo: '/', modulo: 'posRoutes', descripcion: 'Punto de venta del dependiente' },
    { prefijo: '/', modulo: 'clienteRoutes', descripcion: 'Menú y precuenta del cliente' },
];

/** Redirección de la raíz, montada al final (después de todos los routers). */
const RUTA_RAIZ = { metodo: 'get', ruta: '/', destino: '/admin/dashboard' };

/** Resuelve la ruta absoluta del archivo de un router. */
function rutaDeModulo(modulo) {
    return path.join(__dirname, '..', 'routes', `${modulo}.js`);
}

/**
 * Valida el registro: prefijos bien formados y módulos sin duplicar ni faltar.
 * Devuelve la lista de problemas (vacía si todo está correcto).
 */
function validarRegistro(registro = REGISTRO_RUTAS) {
    const problemas = [];
    const vistos = new Set();

    for (const entrada of registro) {
        const clave = `${entrada.metodo || 'use'}:${entrada.prefijo}:${entrada.modulo}`;
        if (vistos.has(clave)) {
            problemas.push(`Router duplicado: ${entrada.modulo} montado en '${entrada.prefijo}'`);
        }
        vistos.add(clave);

        if (typeof entrada.prefijo !== 'string' || !entrada.prefijo.startsWith('/')) {
            problemas.push(`Prefijo inválido en ${entrada.modulo}: '${entrada.prefijo}'`);
        }
        if (!require('fs').existsSync(rutaDeModulo(entrada.modulo))) {
            problemas.push(`No existe routes/${entrada.modulo}.js`);
        }
    }

    return problemas;
}

/**
 * Monta todo el registro sobre la aplicación.
 * Los `require` son perezosos a propósito: así `validarRegistro()` y los tests
 * pueden inspeccionar la tabla sin cargar controladores ni tocar la BD.
 */
function montarRutas(app, registro = REGISTRO_RUTAS) {
    for (const entrada of registro) {
        const router = require(rutaDeModulo(entrada.modulo));
        app.use(entrada.prefijo, router);
    }

    app[RUTA_RAIZ.metodo](RUTA_RAIZ.ruta, (req, res) => res.redirect(RUTA_RAIZ.destino));
    return app;
}

module.exports = {
    REGISTRO_RUTAS,
    RUTA_RAIZ,
    rutaDeModulo,
    validarRegistro,
    montarRutas,
};
