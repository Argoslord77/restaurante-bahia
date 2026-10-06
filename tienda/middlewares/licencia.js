// tienda/middlewares/licencia.js
// Aplicación de la licencia sobre el tráfico HTTP.
// (Mismo criterio que la app del restaurante: bloqueo gradual que respeta
// el trabajo en curso.)
//
//   ACTIVA     Todo normal.
//   GRACIA     Todo funciona; se muestra un aviso persistente al administrador.
//   BLOQUEADA  Se impide ABRIR trabajo nuevo (vender, abrir caja, altas de
//              catálogo), pero se permite CERRAR lo que está abierto: cerrar
//              el turno de caja y reimprimir tickets. Nadie se queda con la
//              caja abierta y sin poder cerrarla.
//
// Siempre quedan accesibles el inicio de sesión, la pantalla de licencia y los
// recursos estáticos, para que se pueda regularizar la situación.
'use strict';

const Licencia = require('../services/licencia/licenciaService');
const logger = require('../config/logger');

// Rutas siempre permitidas, incluso bloqueado
const SIEMPRE_PERMITIDO = [
    /^\/login$/, /^\/logout$/, /^\/licencia/, /^\/api\/licencia/,
    /^\/css\//, /^\/js\//, /^\/img\//, /^\/favicon\./,
    /\.(css|js|map|png|jpe?g|gif|svg|webp|ico|woff2?|ttf)$/i
];

// Operaciones que permiten CERRAR lo que ya está abierto. Se siguen
// permitiendo aunque la licencia esté bloqueada.
const CIERRE_PERMITIDO = [
    { metodo: 'GET', ruta: /^\/caja$/ },                 // ver el estado para cerrar
    { metodo: 'POST', ruta: /^\/caja\/cerrar$/ },        // cerrar el turno en marcha
    { metodo: 'GET', ruta: /^\/ventas\/\d+\/ticket$/ }   // reimprimir tickets
];

const coincideSiempre = ruta => SIEMPRE_PERMITIDO.some(p => p.test(ruta));
const coincideCierre = (req, ruta) =>
    CIERRE_PERMITIDO.some(c => c.metodo === req.method && c.ruta.test(ruta));

/** Middleware principal. Se monta una sola vez, antes de las rutas. */
function exigirLicencia(opciones = {}) {
    return async function middlewareLicencia(req, res, next) {
        const ruta = String(req.originalUrl || req.url || '/').split('?')[0];

        if (coincideSiempre(ruta)) return next();

        let evaluacion;
        try {
            evaluacion = await Licencia.evaluar();
        } catch (error) {
            // Un fallo del propio sistema de licencias no puede dejar sin
            // servicio a la tienda: se registra y se deja pasar.
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
        if (coincideCierre(req, ruta)) {
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
                message: 'La licencia de esta instalación no es válida. Solo se permite cerrar el turno de caja.',
                problemas: evaluacion.problemas
            });
        }

        return res.status(423).render('licencia-bloqueada', { evaluacion });
    };
}

module.exports = { exigirLicencia, SIEMPRE_PERMITIDO, CIERRE_PERMITIDO };
