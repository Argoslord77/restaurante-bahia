# Modularización del arranque (bootstrap)

**Rama:** `refactor/modularizacion-bootstrap`
**Estado:** implementado y cubierto por tests (302 pruebas en verde)

## Por qué

`app.js` se había convertido en un monolito de ~200 líneas donde convivían cosas
que no tienen nada que ver entre sí: política CSP, rate limiting, sesión,
Passport, flash, variables de EJS, auditoría, licencia, favicon, 20 `require` de
routers, 23 `app.use(...)`, la lectura de certificados SSL y el `listen()`.

Consecuencias reales que ya se habían pagado en producción:

| Problema | Causa en el monolito |
|---|---|
| Los botones de impresión dejaron de funcionar | `script-src-attr 'none'` de helmet, perdido entre 200 líneas |
| Imposible iniciar sesión en modo HTTP / detrás de proxy | `cookie.secure = true` fijo |
| `require('./app')` rompía cualquier test | `fs.readFileSync(certs/key.pem)` al cargar el módulo |
| `transferenciaRoutes` montado dos veces | lista de `app.use` mantenida a mano |
| Reiniciar con pm2 dejaba conexiones MySQL colgadas | no había manejo de señales |
| Puerto ocupado o certs ausentes = stack críptico | errores sin contexto actionable |

## Estructura nueva

```
app.js                    Punto de entrada delgado (main de package.json)
config/
  app.js                  createApp(): ENSAMBLA middlewares y rutas
  security.js             helmet + CSP + rate limit
  session.js              cookies, sesión, Passport, flash, contexto EJS
  views.js                motor EJS, estáticos, favicon tolerante
  routes.js               REGISTRO_RUTAS: tabla única de routers + validación
  server.js               listener HTTP/HTTPS, certificados, apagado ordenado
scripts/
  verificar-rutas.js      imprime y valida el registro (npm run check:rutas)
  smoke-bootstrap.js      arranca sin BD y comprueba /api/health (npm run smoke)
```

`app.js` queda en 30 líneas:

```js
require('dotenv').config();
const { createApp } = require('./config/app');
const { iniciarServidor, registrarApagadoGracioso } = require('./config/server');

const app = createApp();

if (require.main === module) {
    iniciarServidor(app)
        .then((servidor) => registrarApagadoGracioso(servidor))
        .catch((error) => { console.error(error.message); process.exit(1); });
}

module.exports = app;   // usable desde supertest sin abrir puerto
```

## Orden de middlewares (contractual)

Se respeta EXACTAMENTE el orden del monolítico, porque la auditoría necesita
conocer al usuario y la licencia debe quedar registrada:

```
estáticos → helmet/CSP → rate limit → urlencoded/json → cookies
→ sesión → passport.initialize/session → flash → res.locals
→ checkRememberMe → GET /api/health → auditoriaGlobal → exigirLicencia
→ favicon → RUTAS → [404 opcional] → errorHandler
```

## Comportamiento preservado vs. corregido

**Idéntico a antes** (no hay que tocar nada en el servidor):
- HTTPS con `certs/key.pem` + `certs/cert.pem`, puerto 3000.
- Misma CSP, mismo HSTS, mismo rate limit (15 min / 2000 peticiones).
- Mismo orden de montaje de rutas y misma redirección `/` → `/admin/dashboard`.
- `npm start`, `npm run dev` y pm2 siguen apuntando a `app.js`.

**Corregido de camino** (cada punto tiene su test):
1. `SERVER_HTTP=1` ya funciona de verdad: la cookie de sesión deja de ser
   `secure` en modo texto plano.
2. `transferenciaRoutes` se monta una sola vez.
3. Los certificados se leen al arrancar, no al importar: la app se puede
   requerir desde tests.
4. Favicon ausente ya no impide el arranque (avisa y sigue).
5. `SESSION_SECRET` ausente produce un error con instrucciones, no un
   `undefined` silencioso.
6. SIGINT/SIGTERM cierran el listener y el pool de MySQL (reinicios limpios).
7. Errores de arranque con soluciones en el mensaje (mkcert, `SSL_*_PATH`,
   `SERVER_HTTP=1`).
8. Nuevo sondeo `GET /api/health` que no toca BD ni licencia.
9. `jest.config.js` ya no toma `config/environments/test.js` por una suite
   (era el único FAIL de la línea base).

## Variables de entorno nuevas

Todas opcionales; sin ellas el comportamiento es el de siempre.

| Variable | Por defecto | Para qué |
|---|---|---|
| `SERVER_HTTP` | — | `1` = servir en HTTP (proxy, preview, pruebas) |
| `HOST` | `0.0.0.0` | Interfaz de escucha |
| `TRUST_PROXY` | — | `1` detrás de nginx: IP y esquema reales del cliente |
| `SSL_KEY_PATH` | `certs/key.pem` | Ruta alternativa de la clave |
| `SSL_CERT_PATH` | `certs/cert.pem` | Ruta alternativa del certificado |
| `SESSION_MAX_AGE_MS` | `3600000` | Duración de la sesión |
| `RATE_LIMIT_MAX` | `2000` | Peticiones por ventana |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Ventana del rate limit |
| `ENABLE_NOT_FOUND` | — | `1` = responder 404 con `error.ejs` en vez del 404 de Express |

## Cómo añadir una ruta nueva

Antes: `require` arriba + `app.use` abajo, y rezar para no duplicarlo.
Ahora, una sola línea en `config/routes.js`:

```js
const REGISTRO_RUTAS = [
    // ...
    { prefijo: '/admin', modulo: 'miModuloRoutes', descripcion: 'Para qué sirve' },
];
```

`npm run check:rutas` valida que el archivo exista, que no esté duplicado y que
el prefijo sea absoluto.

## Verificación antes de desplegar

```bash
npm test            # 25 suites / 302 tests
npm run check:rutas # registro de rutas sano
npm run smoke       # arranca sin BD, comprueba /api/health y /
```

## Despliegue y marcha atrás

No hay migraciones de base de datos en esta entrega: es solo código.

```bash
git fetch origin
git checkout refactor/modularizacion-bootstrap   # o mezclar en main
npm install          # sin dependencias nuevas
npm run check:rutas && npm run smoke && npm test
pm2 restart app      # o: systemctl restart restaurante
```

Marcha atrás: `git checkout <commit-anterior> -- app.js config/ jest.config.js`
o simplemente `git revert` del commit. El `.env` actual sigue siendo válido.
