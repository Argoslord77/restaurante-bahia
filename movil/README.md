# CajaFácil móvil — Punto de venta Android 100% offline

Versión para clientes **sin PC**: APK nativa (Capacitor 8) con los datos en
**archivos JSON de texto plano** dentro del teléfono. Sin internet, sin
servidor, sin base de datos. Misma marca, mismas reglas de negocio que la
versión web.

## Estado: Fase 4 terminada ✅ (app completa)

- Todo lo de la Fase 3 (impresión térmica + CSV)
- **Licencia adaptada**: misma firma Ed25519 y formato .lic que la web
  (tweetnacl embebido, sin red), huella del dispositivo Android, tiempo de
  confianza sobre ventas/turnos/movimientos, días de uso, gracia 7 días y
  bloqueo gradual (cerrar turno sí, vender no)
- Pantallas Licencia (código, solicitud, instalar, bitácora) y Bloqueo
- Emisor del proveedor en `tools/` (`npm run licencia:emitir`)
- 58 pruebas jest en verde

- Todo lo de la Fase 2 (app completa funcional)
- **Impresión térmica**: constructor ESC/POS propio (español latin-1, tablas,
  corte) + driver Bluetooth SPP / USB OTG / WiFi (plugin
  @devlas/capacitor-thermal-printer 0.8.0) + pantalla de configuración
- **Exportar CSV** (formato Excel latam: `;` y decimales con coma) en ventas
  y los 3 reportes
- 49 pruebas jest en verde

- Todo lo de la Fase 1 (proyecto Capacitor, almacén JSON, PIN, respaldos)
- **POS completo**: búsqueda, carrito, descuento, IVA, cobro 3 métodos, cambio, ticket
- **Productos**: categorías, SKU, precios, stock mínimo, activar/desactivar, kardex
- **Inventario**: entradas/salidas, recientes, stock bajo, valorizado
- **Caja**: apertura con fondo, cierre con arqueo, historial
- **Ventas**: lista con filtros, tickets, cancelación con devolución de stock
- **Reportes**: ventas por día con utilidad, más vendidos, valorizado
- **Ajustes + usuarios + datos de ejemplo**, navegación inferior por roles
- 35 pruebas jest en verde

## Cómo se guardan los datos

```
datos/_meta.json        identidad de la instalación + contadores
datos/usuarios.json     usuarios con PIN (hash, nunca en claro)
datos/productos.json    catálogo (Fase 2)
datos/ventas.json       ventas (Fase 2)
datos/turnos.json       turnos de caja (Fase 2)
datos/movimientos.json  kardex (Fase 2)
datos/ajustes.json      nombre negocio, IVA %, pie de ticket (Fase 2)
respaldos/auto-N.json   7 respaldos automáticos rotativos
```

Cada archivo lleva un sello: editarlo fuera de la app queda en evidencia.
Cada guardado escribe a un temporal y renombra: un apagón no corrompe nada.

## Probar aquí (sin teléfono)

```bash
cd movil
npm install
npm test            # 17 pruebas, sin dispositivo
npx cap sync        # copia www/ al proyecto Android
```

Para ver las pantallas en el navegador: sirva `www/` con cualquier servidor
estático (los datos se guardan en localStorage solo en este modo).

## Generar el APK (en su PC, 3 pasos)

Requiere Android Studio reciente + JDK 17 (lo trae el propio Android Studio).

```bash
cd movil
npm install
npx cap sync android
npx cap open android
```

En Android Studio: menú **Build → Build App Bundle(s)/APK(s) → Build APK(s)**.
El instalador sale en `android/app/build/outputs/apk/debug/app-debug.apk`.
Cópielo al teléfono, ábralo y confirme la instalación (orígenes desconocidos).

> El identificador de la app es `com.cajafacil.app` (se cambia en
> `capacitor.config.ts` y en `android/app/build.gradle` si lo desea).

## Plugin nativo CajaFacilPrinter (dojo M1)

Plugin Capacitor PROPIO en Kotlin (android/app/.../printer/): BT SPP
(seguro->inseguro), USB host (permiso MUTABLE, bulk por trozos) y WiFi
(reintento unico). El JS (www/js/printer-nativo.js) traduce destinos y codigos;
impresora.js prefiere la via nativa y usa el plugin viejo solo por ausencia
(jamas reintenta un error en el otro driver: anti doble ticket).

Compilar (requiere Android Studio + SDK 36, no se compila aqui):
cd movil/android && ./gradlew :app:assembleDebug, instalar en telefono
fisico y correr la matriz B.5 (dojo-android/ELITE-ANDROID-90-DIAS.md).
Tests JVM del plugin: ./gradlew :app:testDebugUnitTest (Target.parse + cola).
Guia paso a paso de las 9 pruebas: parche/LEEME-B5-CAJAFACILPRINTER-2026-10-07.txt.
android/ es codigo fuente desde M1: no borrar, no regenerar.

## Licencias (proveedor)

```bash
# Una sola vez: par de claves SOLO para móvil (distinto al de la web)
node tools/emitir.js claves
# licencia-privada-movil/licencia.key → LUGAR SEGURO, nunca al cliente

# Por cliente: con su solicitud-licencia-cajafacil.json
npm run licencia:emitir -- emitir --solicitud solicitud.json --dias 365 \
  --cliente "Abarrotes Lupita" --salida licencia.lic
```
El cliente pega la `licencia.pub` y el `.lic` en Más → Licencia (o se los
envía por WhatsApp e importa el archivo). Sin clave pública, la app no
restringe nada (dormida).

## Permisos Android

- **Fases 1-2**: ninguno (archivos privados de la app + compartir estándar).
- **Fase 3**: Bluetooth (`BLUETOOTH_CONNECT`, lo pide el plugin al imprimir)
  y USB OTG si usa impresora por cable. Empareje la impresora primero en
  Ajustes → Bluetooth de Android; luego elíjala en Más → Impresora.

## Mapa de ruta

| Fase | Contenido | Estado |
|---|---|---|
| 1 | Cimiento: almacén, PIN, respaldos, APK compilable | ✅ lista |
| 2 | POS + productos + inventario + caja + reportes | ✅ lista |
| 3 | Impresora térmica (BT/USB/WiFi) + exportar CSV | ✅ lista |
| 4 | Licencia adaptada (misma firma Ed25519, atada al dispositivo) | ✅ lista |

## Estructura

```
movil/
├── www/                 # la app (HTML/CSS/JS sin build: editar y npx cap sync)
│   ├── index.html       # cáscara + login PIN
│   ├── css/             # diseño heredado de la versión web + táctil
│   ├── js/              # storage, store, users, money, backup, app
│   └── img/             # marca CajaFácil
├── tests/               # jest (17 pruebas)
├── android/             # proyecto nativo generado (abrir en Android Studio)
└── capacitor.config.ts  # appId com.cajafacil.app
```
