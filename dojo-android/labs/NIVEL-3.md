# Nivel 3 — Hardware y segundo plano (días 36–49)

> Prepara M2/M3 del módulo nativo: lo que aprendas aquí se usa contra
> una impresora térmica real. Tu código M1 (`printer/`) es la solución
> de referencia: léelo ANTES de cada lab y entiende cada línea.

## Días 36–39 — Permisos como embudo

1. Pantalla que necesita cámara (o ubicación): pide el permiso EN CONTEXTO
   (al pulsar "escanear", no al arrancar) con `ActivityResultLauncher`:
   ```kotlin
   val launcher = rememberLauncherForActivityResult(RequestPermission()) { granted ->
       if (granted) escanear() else mostrarFallback()
   }
   // rationale si shouldShowRequestPermissionRationale() == true
   // "no volver a preguntar" (false + denegado) → botón a Ajustes (Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
   ```
2. Implementa los 3 caminos: concedido / denegado / no-preguntar-más.
   Cada uno con fallback elegante (jamás pantalla muerta).
3. Prueba con 3 personas reales: ¿en qué momento aceptan? Anota tu conversión.
`Done =` matriz permiso × momento × fallback, probada en 3 humanos.
`Trampa =` pedir todo al arrancar (fábrica de desinstalaciones).

## Días 40–43 — Segundo plano honesto (WorkManager + Doze)

1. Worker periódico (15 min, mínimo real) con constraints
   (`NetworkType.CONNECTED` + `setRequiresBatteryNotLow(true)`):
   ```kotlin
   PeriodicWorkRequestBuilder<SyncWorker>(15, TimeUnit.MINUTES)
       .setConstraints(constraints).build()
   ```
2. Fuerza Doze y observa la verdad:
   ```bash
   adb shell dumpsys deviceidle force-idle   # entra Doze
   adb shell dumpsys jobscheduler | grep -A5 tu_paquete  # tu trabajo: pendiente
   adb shell dumpsys deviceidle unforce      # sale: ahora sí corre
   ```
3. Escribe tu tabla personal: garantizado (constraints + reintento con backoff)
   vs mejor-esfuerzo (momento exacto, ejecución en Doze). Léela cada vez que
   diseñes algo periódico.
`Done =` log que demuestra diferido-bajo-Doze + ejecutado-al-salir.
`Trampa =` "mi servicio corre siempre" (fantasía; el SO manda).

## Días 44–46 — Bluetooth clásico SPP (pre-M2)

1. Lee `BluetoothSpp.kt` (M1) entero. Luego, SIN copiar, escribe en HolaDojo:
   lista de emparejados + conectar + enviar bytes + cerrar, contra un BT real
   (impresora, Arduino, ELM327, lo que tengas).
2. Reglas que el lab te debe grabar: `cancelDiscovery()` antes de conectar;
   `connect()` en `Dispatchers.IO` con timeout; `BLUETOOTH_CONNECT` en 12+
   (mapea `SecurityException` → permiso); cerrar SIEMPRE.
3. Ciclo brutal: conectar → enviar → cerrar ×20. Cero fugas (LeakCanary),
   cero ANR (StrictMode limpio).
`Done =` 20 ciclos limpios + 1 cicatriz anotada (el BT siempre da una).
`Trampa =` probar solo en un teléfono bueno (los baratos matan sockets).

## Días 47–49 — USB host (pre-M3)

1. Lee `UsbThermal.kt` (M1). En HolaDojo: enumera `usbManager.deviceList`
   (con adaptador OTG), pide permiso, reclama interfaz, bulk con timeout.
2. El gotcha que debes SUFRIR una vez: usa `FLAG_IMMUTABLE` primero, observa
   el "permiso colgado", luego corrige a `FLAG_MUTABLE`. Anótalo en cicatrices.
3. Deniega el permiso 3 veces seguidas: las 3 elegantes, cero crash.
`Done =` transferencia real + denegación ×3 sin crash + cicatriz del flag.
`Trampa =` asumir `bulkTransfer` envía todo (puede ser parcial o -1).
