// middlewares/licencia.js
// Aplicación de la licencia sobre el tráfico HTTP.
//
// Criterio de negocio, no solo técnico
// ------------------------------------
// Un punto de venta que se apaga a mitad de servicio es una catástrofe para el
// restaurante y un problema de reputación para el proveedor. Por eso el bloqueo
// es GRADUAL y respeta el trabajo en curso:
//
//   ACTIVA     Todo normal.
//   GRACIA     Todo funciona; se muestra un aviso persistente al personal
//              administrativo. La caja no se entera.
//   BLOQUEADA  Se impide ABRIR trabajo nuevo (nuevos turnos, nuevas comandas,
//              altas de catálogo), pero se permite CERRAR lo que está abierto:
//              cobrar las cuentas, cerrar el turno e imprimir. Nadie se queda
//              con mesas servidas y sin poder cobrarlas.
//
// Siempre quedan accesibles el inicio de sesión, la pantalla de licencia y los
// recursos estáticos, para que se pueda regularizar la situación.
'use strict';

const Licencia = require('../services/licencia/licenciaService');
const logger = require('../config/logger');

// Rutas siempre permitidas, incluso bloqueado
const SIEMPRE_PERMITIDO = [
    /^\/login$/, /^\/logout$/, /^\/admin\/licencia/, /^\/api\/licencia/,
    /^\/css\//, /^\/js\//, /^\/img\//, /^\/images\//, /^\/fonts\//, /^\/webfonts\//,
    /^\/uploads\//, /^\/favicon\./, /\.(css|js|map|png|jpe?g|gif|svg|webp|ico|woff2?|ttf)$/i
];

// Operaciones que permiten CERRAR lo que ya está abierto. Se siguen
// permitiendo aunque la licencia esté bloqueada.
const CIERRE_PERMITIDO = [
    /^\/pos\/cobrar\//,                       // cobrar una cuenta abierta
    /^\/pos\/precuenta\//,                    // imprimir la pre-cuenta
    /^\/admin\/cierre-dia/,                   // cierre de día y su ticket
    /^\/admin\/turno\/cierre$/,               // cerrar el turno en marcha
    /^\/admin\/pedido\/[^/]+\/cerrar$/,       // cerrar un pedido
    /^\/api\/monitor\/comandas$/,             // que cocina termine lo pedido
    /^\/api\/monitor\/cambiar-estado$/,
    /^\/api\/pos\/items-listos\//,
    /^\/monitor\//
];

const coincide = (lista, ruta) => lista.some(p => p.test(ruta));

/** Middleware principal. Se monta una sola vez, antes de las rutas. */
function exigirLicencia(opciones = {}) {
    return async function middlewareLicencia(req, res, next) {
        const ruta = String(req.originalUrl || req.url || '/').split('?')[0];

        if (coincide(SIEMPRE_PERMITIDO, ruta)) return next();

        let evaluacion;
        try {
            evaluacion = await Licencia.evaluar();
        } catch (error) {
            // Un fallo del propio sistema de licencias no puede dejar sin
            // servicio al restaurante: se registra y se deja pasar.
            logger.error(`[Licencia] Error al evaluar, se permite el paso: ${error.message}`);
            return next();
        }

        // Disponible para las vistas: el aviso del periodo de gracia
        res.locals.licencia = {
            estado: evaluacion.estado,
            operativa: evaluacion.operativa,
            gracia: evaluacion.gracia,
            problemas: evaluacion.problemas,
            avisos: evaluacion.avisos
        };
        req.licencia = evaluacion;

        if (evaluacion.operativa) return next();

        // ── Bloqueada ──
        if (coincide(CIERRE_PERMITIDO, ruta)) {
            // Se deja terminar el trabajo en curso, pero queda constancia
            Licencia.registrarEvento('ACCESO_EN_BLOQUEO', { ruta, motivo: 'cierre_permitido' }, 'AVISO');
            return next();
        }

        const esApi = ruta.startsWith('/api/') || ruta.includes('/api/') ||
                      (req.headers.accept || '').includes('application/json');

        if (esApi) {
            return res.status(423).json({
                success: false,
                codigo: 'LICENCIA_BLOQUEADA',
                message: 'La licencia de esta instalación no es válida. Solo se permite cerrar las operaciones en curso.',
                problemas: evaluacion.problemas
            });
        }

        return res.status(423).render('admin/licencia-bloqueada', {
            pageTitle: 'Licencia no válida',
            evaluacion,
            layout: false
        });
    };
}

module.exports = { exigirLicencia, SIEMPRE_PERMITIDO, CIERRE_PERMITIDO };
