# CajaFácil móvil — Punto de venta Android 100% offline

Versión para clientes **sin PC**: APK nativa (Capacitor 8) con los datos en
**archivos JSON de texto plano** dentro del teléfono. Sin internet, sin
servidor, sin base de datos. Misma marca, mismas reglas de negocio que la
versión web.

## Estado: Fase 2 terminada ✅

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

## Permisos Android

- **Fase 1**: ninguno (archivos privados de la app + compartir estándar).
- **Fase 3**: Bluetooth (impresora térmica) + vibración opcional.

## Mapa de ruta

| Fase | Contenido | Estado |
|---|---|---|
| 1 | Cimiento: almacén, PIN, respaldos, APK compilable | ✅ lista |
| 2 | POS + productos + inventario + caja + reportes | siguiente |
| 3 | Impresora térmica Bluetooth + exportar CSV/compartir ticket | — |
| 4 | Licencia adaptada (misma firma Ed25519, atada al dispositivo) | — |

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
