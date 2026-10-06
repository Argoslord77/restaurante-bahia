# Dojo Android — El camino del 0,1%
### Plan de 90 días + CajaFácil como campo de entrenamiento + las 5 dimensiones a nivel implementación

> **Cómo usar este documento.** No es para leer: es para ejecutar. Cada sección termina en un *criterio de Done verificable*. Si no lo puedes demostrar con un comando, una métrica o una prueba, no lo sabes todavía.
>
> Convenciones: `Done =` significa "cómo probar que lo dominas". `Trampa de novato =` el error que delata a quien no ha sufrido en producción.

**Materiales de trabajo:** labs/NIVEL-0.md (empieza aqui) - CHECKLIST-90-DIAS.md
(tu marcador) - plantillas/ (presupuesto, cicatrices, graduacion, ADR) -
adr/ADR-001-formato-transporte.md (decision real tomada).

**Índice**

- [Parte A — Plan de 90 días por niveles](#parte-a--plan-de-90-días-por-niveles)
- [Parte B — CajaFácil como dojo: primer módulo nativo real](#parte-b--cajafácil-como-dojo-primer-módulo-nativo-real)
- [Parte C — Las 5 dimensiones a nivel implementación](#parte-c--las-5-dimensiones-a-nivel-implementación)
  - [C-I. Esquemas cognitivos → código](#c-i-esquemas-cognitivos--código)
  - [C-II. Estructuras operativas → código](#c-ii-estructuras-operativas--código)
  - [C-III. Dinámicas de elección → marcos](#c-iii-dinámicas-de-elección--marcos)
  - [C-IV. Realidades secretas → contramedidas](#c-iv-realidades-secretas--contramedidas)
  - [C-V. Tácticas vanguardistas → recetas](#c-v-tácticas-vanguardistas--recetas)
- [Apéndice — Biblioteca mínima del 0,1%](#apéndice--biblioteca-mínima-del-01)

---

# Parte A — Plan de 90 días por niveles

## Reglas del dojo (rigen los 90 días)

1. **Teléfono de guerra.** Consigue el Android más barato y viejo que puedas (un gama baja con 2–3 GB de RAM es oro). Todo laboratorio se valida ahí, no en el emulador. *Done = lista de 2 dispositivos físicos con su RAM y versión de Android anotadas.*
2. **"Don't keep activities" siempre activado** en tu teléfono de desarrollo. Si tu app sobrevive a eso, sobrevive a la calle.
3. **Cuaderno de cicatrices.** Un archivo donde anotas cada bug real que te muerda, con causa raíz. Al día 90 debe tener ≥30 entradas. La élite colecciona cicatrices; los novatos coleccionan tutoriales.
4. **Mide o no ocurrió.** Cada laboratorio termina en un número (ms, MB, %).
5. **Prohibido copiar-pegar sin diseccionar.** Todo snippet que uses debes poder explicar línea por línea en voz alta.

---

## Nivel 0 — Fundamentos letales (días 1–7)

**Objetivo:** instalar los 3 reflejos que el 95% nunca desarrolla: muerte de proceso, hilo principal sagrado, presupuestos.

- **Día 1–2. La muerte como rutina.** Crea app mínima con un formulario (3 campos + contador). Activa *Don't keep activities*. Rota, minimiza, vuelve: observa cómo muere todo. Luego haz que sobreviva con estado guardado (en Compose: `rememberSaveable`; en Views: `onSaveInstanceState`). Mátala con `adb shell am kill <paquete>` tras ir a inicio y verifica restauración.
  `Done =` video de 30s: llenar → inicio → `am kill` → volver → todo intacto.
  `Trampa de novato =` "guardar en variables del Activity/ViewModel y creer que basta" (el ViewModel NO sobrevive a muerte de proceso; solo a rotación).
- **Día 3–4. El hilo principal es sagrado.** Provoca jank deliberado: carga una imagen pesada / parsea un JSON grande en el hilo principal. Mide con GPU rendering bars (opciones de desarrollador → *Profile GPU Rendering*) y luego con `StrictMode` (ver C-I.2). Corrige moviendo a corrutinas (`Dispatchers.IO` / `Default`).
  `Done =` captura antes/después de las barras GPU + regla personal escrita: "qué va en cada Dispatcher".
- **Día 5. Memoria comunal.** Fuga un `Activity context` a propósito (singleton que lo retiene, handler no limpiado). Detecta con LeakCanary. Corrige (usa `applicationContext`, limpia en `onDestroy`).
  `Done =` traza de LeakCanary antes + cero leaks después.
- **Día 6–7. Tu primer presupuesto.** Mide tu app mínima: arranque en frío (`adb shell am start -W`), tamaño APK, frames. Escríbelos como presupuesto máximo del resto del plan: *"ningún laboratorio futuro puede empeorar arranque >10% ni tamaño >1MB sin justificación escrita"*.
  `Done =` tabla de 3 números + archivo `PRESUPUESTO.md`.

## Nivel 1 — Estado y arquitectura real (días 8–21)

**Objetivo:** que "arquitectura" deje de ser diagrama y sea *supervivencia + testeabilidad*.

- **Día 8–11. UI = f(state).** Reescribe la app del Nivel 0 con flujo unidireccional: un `UiState` inmutable, eventos que suben, estado que baja. ViewModel + `StateFlow`, UI que solo renderiza (`collectAsStateWithLifecycle`). Estado persistente vía `SavedStateHandle` (ver C-I.1).
  `Done =` matar la pantalla 10 veces seguidas sin perder estado ni crashear; test unitario del ViewModel que prueba 5 transiciones sin Android.
  `Trampa de novato =` lógica en el Activity/Fragment/Composable ("solo esta vez").
- **Día 12–15. Fuente única de verdad local.** Room como SSOT: entidades, DAO con `Flow`, una migración real (v1→v2 agregando columna con valor por defecto). Aprende que **la migración es puerta de una vía** (C-III.1): escribe el test de migración (`MigrationTestHelper`).
  `Done =` test de migración en verde + app que actualiza de v1 a v2 sin perder datos.
- **Día 16–18. Navegación como narrativa.** 3 pantallas con Navigation: deep link que reconstruye la pila completa (detalle→lista→inicio), botón atrás predecible, argumentos tipados. Prueba: entrar por deep link con la app muerta.
  `Done =` `adb shell am start -a android.intent.VIEW -d tuejemplo://detalle/7` con app muerta → pila correcta + atrás correcto.
- **Día 19–21. Offline-first en miniatura.** La app funciona sin red: escribe local, marca "pendiente", sincroniza con WorkManager cuando hay red (ver C-I.7). Simula red intermitente (modo avión intermitente).
  `Done =` operar 5 min en avión → reconectar → todo sincronizado sin duplicados (idempotencia).

## Nivel 2 — Rendimiento y disciplina de release (días 22–35)

**Objetivo:** pensar en milisegundos, megabytes y builds release.

- **Día 22–25. Caza de jank.** Pantalla con lista de 1000 elementos + imágenes. Sin keys/estabilidad → mide jank (JankStats o GPU bars). Aplica: keys estables, lectura de estado en el nivel más bajo, `derivedStateOf`, carga diferida. Perfetto: captura una traza y encuentra UN frame asesino por su firma (ver C-V.2).
  `Done =` % de frames con jank antes/después + traza Perfetto con el culpable marcado.
- **Día 26–28. Arranque.** Agrega 3 SDK falsos pesados al `Application.onCreate` (simula con `Thread.sleep`). Mide arranque en frío. Aplica: init perezoso + App Startup (ver C-V.7). `Done =` ms antes/después (meta: recorte ≥50%).
- **Día 29–31. Release discipline.** Activa R8 full mode + `shrinkResources`. Rompe algo a propósito con reflection/serialización sin reglas → observa que **debug funciona y release falla**. Escribe reglas ProGuard mínimas. Genera App Bundle y pruébalo local con `bundletool` (ver C-II.5).
  `Done =` checklist firmada: "instalé y probé el release, no el debug" + tamaño AAB vs APK universal.
- **Día 32–35. Baseline Profiles + Macrobenchmark.** Genera perfil base de tu app de juguete, mide arranque con `CompilationMode.None()` vs `Partial()` (ver C-V.1).
  `Done =` números: arranque sin perfil vs con perfil en tu teléfono de guerra.

## Nivel 3 — Hardware y segundo plano (días 36–49)

**Objetivo:** negociar con el SO y el hardware como adulto. Preparación directa del módulo nativo (Parte B).

- **Día 36–39. Permisos como embudo.** App que pide cámara/ubicación/BT. Implementa: pedir en contexto (no al arranque), justificación previa (*rationale*), degradación elegante si niegan, reintento que lleva a ajustes si eligen "no volver a preguntar". Mide tu propia "conversión" con 3 personas reales.
  `Done =` matriz: permiso × momento × fallback escrito y probado.
- **Día 40–43. Segundo plano honesto.** Tarea periódica con WorkManager + constraints (red + batería). Prueba bajo Doze (`adb shell dumpsys deviceidle force-idle`). Aprende qué sobrevive y qué no. Lee C-IV.2 y escribe tu tabla personal "garantizado vs mejor-esfuerzo".
  `Done =` log que demuestra ejecución diferida bajo Doze y ejecución al salir.
- **Día 44–46. Bluetooth clásico SPP.** Laboratorio previo al dojo: app que lista dispositivos emparejados, conecta por SPP a un BT real (impresora, Arduino, ELM327 — lo que tengas), envía bytes y cierra. Aplica las reglas: cancelar discovery antes de conectar, conectar en hilo de fondo con timeout, cerrar socket siempre.
  `Done =` conectar → enviar → cerrar 20 veces seguidas sin fugas ni ANR.
- **Día 47–49. USB host.** Enumera dispositivos USB (con adaptador OTG), pide permiso con `PendingIntent` MUTABLE (Android 12+, ver B.4), reclama interfaz, transferencia bulk con timeout.
  `Done =` lectura/escritura USB funcionando + permiso denegado manejado con gracia.

## Nivel 4 — El build como producto (días 50–63)

**Objetivo:** compilar como empresa, no como estudiante.

- **Día 50–53. Flavors.** Convierte tu app de juguete en white-label: 2 flavors (clienteA/clienteB) con distinto `applicationId`, nombre, icono, color y endpoint (ver C-II.1 + B-Módulo-2). `Done =` ambos APK instalados **simultáneamente** en el mismo teléfono, distinguibles.
- **Día 54–56. Version catalog + convention plugin.** Centraliza versiones en `libs.versions.toml`; crea un plugin de convención que aplique compileSdk, Kotlin options y lint a todos los módulos (ver C-II.2). `Done =` cambiar una versión en UN lugar y que compile todo.
- **Día 57–60. Firma y secretos.** `keystore.properties` fuera de git, variables de entorno en local, APK firmada en release. `Done =` `git status` limpio de secretos + APK release firmada e instalable.
- **Día 61–63. CI honesto.** GitHub Actions: compila release + tests + lint en cada push (ver C-II.3). Rompe algo local que pase y en CI falle (un test dependiente de zona horaria, p.ej.). `Done =` badge verde + 1 historia de "CI me atrapó".

## Nivel 5 — Calidad de élite (días 64–77)

**Objetivo:** red de seguridad que permite moverse rápido sin miedo.

- **Día 64–67. Tests que importan.** 80/15/5 (ver C-II.4): tests del estado (ViewModel/casos de uso, ≥20), 2–3 tests de UI del camino crítico, 1 test de migración. `Done =` suite que corre en <3 min y atrapa una regresión que introduces a propósito.
- **Día 68–70. Screenshot tests.** Roborazzi/Paparazzi en 5 componentes clave; introduce un cambio visual y observa el diff (ver C-V.4). `Done =` 1 regresión visual atrapada por diff.
- **Día 71–73. Fuzzing de navegación.** Script que abre cada deep link con la app muerta, rota, cambia a modo oscuro, fuente máxima, multi-ventana (ver C-V.5). `Done =` matriz de 20 combinaciones sin crash (o lista de crashes encontrados y corregidos —mejor aún).
- **Día 74–77. Telemetría mínima.** Crash reporting + 3 métricas (arranque, camino crítico, tamaño). Define tus umbrales de "mal comportamiento" (ver C-II.6). `Done =` dashboard con 7 días de datos de tu propio uso.

## Nivel 6 — Capstone (días 78–90)

**Objetivo:** demostrar todo junto en código que le sirve a alguien real.

- **Día 78–88.** Construir el **Módulo 1 de la Parte B** (plugin nativo de impresión para CajaFácil) siguiendo sus hitos M1–M5, con presupuestos, tests y disciplina de release.
- **Día 89.** Publicación interna: AAB firmado, notas de versión, rollout a 2–3 usuarios reales (distribución interna / Firebase App Distribution).
- **Día 90.** Retrospectiva escrita: 10 cicatrices (bugs con causa raíz), 5 números (arranque, tamaño, jank, crash-free, cobertura de estado), 3 decisiones irreversibles que tomaste y por qué. Si puedes defenderlas en voz alta, graduaste.
  `Done =` documento `GRADUACION.md` + demo en video funcionando en el teléfono de guerra.

---

# Parte B — CajaFácil como dojo: primer módulo nativo real

## B.0 Por qué este módulo y no otro

Aplicando C-III.5 (nativo vs. híbrido por fricción con el hardware):

| Módulo CajaFácil | Fricción HW/SO | Veredicto |
|---|---|---|
| Catálogo, ventas, reportes | baja (UI + SQLite) | híbrido está bien, no tocar |
| Respaldo CSV / compartir | media (filesystem, intents) | híbrido + plugin maduro |
| **Impresión BT/USB/WiFi** | **máxima** (stacks BT por fabricante, USB host, permisos, sockets) | **→ NATIVO. Es el dojo perfecto** |
| Licencias | baja (cómputo + storage) | híbrido OK (ya funciona) |

Ya sufriste el síntoma: dependencia de un plugin de 0 estrellas con driver defensivo + fallback. La jugada de élite es **poseer la capa que toca el hardware**. No reescribes la app: construyes un **plugin Capacitor propio en Kotlin** (`CajaFacilPrinter`) que reemplaza al plugin débil, manteniendo la misma API JS. Riesgo acotado, aprendizaje máximo, valor real inmediato.

**Decisión arquitectónica clave (irreversible, piénsala):** el formato ESC/POS se queda en JS (`impresora.js` ya existe y funciona). El plugin nativo solo transporta bytes y reporta estado. Formato ≠ transporte. Cambiar de impresora no debe tocar Kotlin; cambiar de transporte no debe tocar JS.

## B.1 Contrato JS (lo que el plugin expone)

```ts
// Misma filosofía que el driver actual: base64 entra, estado sale.
interface CajaFacilPrinter {
  list(o: { transport: 'bluetooth' | 'usb' | 'wifi' }): Promise<{ devices: Device[] }>;
  print(o: { transport, address?: string, vendorId?: number, productId?: number,
             host?: string, port?: number, data: string /* base64 ESC/POS */,
             timeoutMs?: number }): Promise<{ bytes: number, ms: number }>;
  status(): Promise<{ bluetooth: boolean, usbHost: boolean, lastError?: string }>;
}
// Errores con código estable (los mismos que hoy): unavailable | not_found |
// permission_denied | connect_failed | write_failed | timeout
```

**Regla de élite:** los códigos de error son API pública. Se documentan, se congelan y jamás se renombran sin migración. Tu JS ya los consume; el plugin nativo debe devolver exactamente los mismos.

## B.2 Esqueleto Kotlin del plugin

Ubicación: `movil/android/app/src/main/java/<paquete>/printer/` (el proyecto `android/` ya existe por `cap sync`; **desde ahora es código fuente, no basura generable**: se respalda, se versiona tu plugin, y `cap sync` solo copia `www`).

```kotlin
@CapacitorPlugin(name = "CajaFacilPrinter")
class CajaFacilPrinter : Plugin() {
    // Alcance propio: se cancela en handleOnDestroy. NUNCA GlobalScope.
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val queue = PrintQueue() // cola FIFO: un trabajo a la vez por dispositivo

    @PluginMethod
    fun list(call: PluginCall) {
        // Llega en el hilo principal → despachar y volver de inmediato.
        scope.launch {
            try {
                val t = call.getString("transport") ?: return@launch call.retorno("transport requerido")
                val devs = when (t) {
                    "bluetooth" -> BluetoothSpp.list(context)   // solo emparejados
                    "usb"       -> UsbThermal.list(context)
                    "wifi"      -> WlanThermal.list(context)    // últimas usadas + descubrimiento opcional
                    else -> return@launch call.retorno("transport inválido")
                }
                call.resolve(JSObject().put("devices", JSArray(devs.map { it.toJson() })))
            } catch (e: SecurityException) { call.retorno("permission_denied") }
            catch (e: Exception) { call.retorno("unavailable") }
        }
    }

    @PluginMethod
    fun print(call: PluginCall) {
        scope.launch {
            val t0 = SystemClock.elapsedRealtime()
            try {
                val bytes = Base64.decode(call.getString("data") ?: "", Base64.DEFAULT)
                require(bytes.isNotEmpty() && bytes.size <= MAX_JOB) { "invalid_data" }
                val target = Target.from(call) // transport + dirección + timeoutMs
                val n = queue.enqueue(target) { Transport.open(target).use { it.write(bytes) } }
                call.resolve(JSObject().put("bytes", n)
                    .put("ms", SystemClock.elapsedRealtime() - t0))
            } catch (e: PrintError) { call.retorno(e.code) }       // taxonomía propia
            catch (e: Exception) { call.retorno("write_failed") }
        }
    }

    override fun handleOnDestroy() { scope.cancel(); queue.cancelAll() }
}
```

**Puntos que delatan élite en este esqueleto (memorízalos):**

1. **Cola FIFO por dispositivo.** Dos tickets simultáneos al mismo BT sin cola = bytes entrelazados = basura impresa. El novato abre el socket en cada llamada; la élite serializa.
2. **`use {}` (Closeable) en el transporte.** Socket/claim USB que no se cierra = descriptor fugado = la 5ª impresión falla misteriosamente. El `finally` no es opcional.
3.. **Límite de tamaño de trabajo** (`MAX_JOB`, p.ej. 256 KB). Sin él, un ticket corrupto intenta imprimir megabytes y cuelga el hilo BT.
4. **Timeout en TODO** (connect + write). BT sin timeout = ANR potencial si el hilo equivocado espera.
5. **Taxonomía de errores propia** (`PrintError(code)`) mapeada 1:1 a los códigos JS. Jamás filtrar `e.message` crudo al JS (fuga detalles, rompe i18n, inestable).

## B.3 Los tres transportes (lo que el hardware te va a enseñar)

### Bluetooth clásico SPP — `BluetoothSpp.kt`

```kotlin
object BluetoothSpp {
    private val SPP = UUID.fromString("[UUID_PLACEHOLDER_1]")
    fun open(address: String, timeoutMs: Int): Transport {
        val adapter = BluetoothAdapter.getDefaultAdapter() ?: throw PrintError("unavailable")
        if (!adapter.isEnabled) throw PrintError("unavailable")
        adapter.cancelDiscovery() // OBLIGATORIO: discovery activo sabotaje el connect
        val device = try { adapter.getRemoteDevice(address) }
                     catch (e: IllegalArgumentException) { throw PrintError("not_found") }
        val sock = device.createRfcommSocketToServiceRecord(SPP)
        try {
            // connect() bloquea: corre en Dispatchers.IO + timeout con Future
            runWithTimeout(timeoutMs) { sock.connect() }
        } catch (e: Exception) { sock.closeQuietly(); throw PrintError("connect_failed") }
        return SocketTransport(sock)
    }
}
```

**Cicatrices que te esperan (anótalas cuando lleguen):**
- En Android 12+ necesitas `BLUETOOTH_CONNECT` en runtime; sin él, `getRemoteDevice` lanza `SecurityException` → mapear a `permission_denied`.
- Algunos Xiaomi/Huawei matan el socket si la app pasa a fondo durante la impresión: imprime con pantalla encendida o adquiere la impresión completa en <10s.
- Hay impresoras chinas que solo aceptan un connect cada ~2s: la cola + pequeño retardo entre trabajos (`delay(300)`) evita `connect_failed` fantasma.
- `createInsecureRfcommSocketToServiceRecord` como fallback si el seguro falla (muchas térmicas viejas no emparejan bien con secure). Intenta seguro → fallback inseguro → error. Documenta que lo haces.

### USB host — `UsbThermal.kt`

```kotlin
// Descubrir: usbManager.deviceList → filtrar clase printer (7) o VID/PID conocidos.
// Permiso: requestPermission(device, PendingIntent con FLAG_MUTABLE en API 31+).
// Recibir: BroadcastReceiver ACTION_USB_PERMISSION → granted? abrir : permission_denied.
// Abrir: connection = usbManager.openDevice(dev); claimInterface(iface, true).
// Escribir: bulkTransfer(endpointOut, chunk, len, timeout) en trozos ≤16KB; verificar len retornado.
// Cerrar: releaseInterface + connection.close() SIEMPRE (use/finally).
```

**Cicatrices USB:**
- `FLAG_MUTABLE` obligatorio en el `PendingIntent` del permiso desde Android 12. Con `IMMUTABLE` el callback jamás llega y parece "permiso colgado". Este bug ha quemado semanas a equipos enteros.
- Si el usuario marca "usar por defecto", el sistema puede auto-conceder después: aun así, pide siempre y maneja denegación.
- `bulkTransfer` puede retornar menos bytes de los pedidos o `-1`: reintentar el resto, no asumir éxito.
- OTG + hub + impresora hambrienta de energía = desconexiones aleatorias: reporta `write_failed`, no `success` parcial.

### WiFi — `WlanThermal.kt`

```kotlin
// Socket(); connect(InetSocketAddress(host, port), timeoutMs); soTimeout = timeoutMs.
// out.write en trozos de 8KB con flush por trozo; medir ms reales.
// Cerrar en finally. Reintento: 1 solo, con backoff de 500ms (las térmicas WiFi
// baratas cierran conexiones inactivas agresivamente).
```

## B.4 Hitos del módulo (tu Nivel 6, días 78–88)

| Hito | Contenido | Done verificable |
|---|---|---|
| **M1** Día 78–79 | Esqueleto + `list()` BT/USB + contrato JS + taxonomía errores | `list()` real en teléfono de guerra; 9+ tests (11 jest puente JS + JVM: Target.parse, cola) |
| **M2** Día 80–81 | BT SPP `print()` + cola + timeouts | 20 impresiones seguidas a BT real, 0 fugas (LeakCanary), 0 ANR (StrictMode limpio) |
| **M3** Día 82–83 | USB host + permiso + bulk chunked | Imprime por OTG; denegar permiso 3 veces → `permission_denied` elegante, sin crash |
| **M4** Día 84–85 | WiFi + reintento + métricas (bytes/ms) | Imprime por WiFi; `status()` reporta los 3 transportes; jank=0 durante impresión |
| **M5** Día 86–88 | Integración CajaFácil + release | `impresora.js` usa el plugin nativo con fallback al viejo; AAB release probado; matriz de pruebas (B.5) en verde |

## B.5 Matriz de pruebas del módulo (la red que te hace élite)

| # | Prueba | Cómo | Pasa si |
|---|---|---|---|
| 1 | Muerte durante impresión | imprime → inicio → `am kill` → volver | app viva, error reportado, sin socket colgado |
| 2 | BT apagado a mitad | apaga BT durante trabajo | `connect_failed`/`write_failed`, cola se vacía con error, no cuelga |
| 3 | Permiso negado ×2 | niega, niega ("no preguntar") | guía a ajustes, jamás crash |
| 4 | Impresora equivocada | MAC inexistente | `not_found` en <timeoutMs, sin ANR |
| 5 | Doble ticket simultáneo | 2 `print()` al mismo BT | ambos íntegros, en orden (cola) |
| 6 | Ticket gigante | 1 MB base64 | rechazado client-side (`invalid_data`), sin OOM |
| 7 | Rotación imprimiendo | rota 3 veces durante trabajo | termina OK (el trabajo vive en el plugin, no en la UI) |
| 8 | Release ofuscado | instala AAB release | imprime igual (reglas R8 cubren plugin/JS bridge) |
| 9 | Teléfono de guerra | todo lo anterior en gama baja | sin ANR ni regresión >20% en ms |

## B.6 Módulo 2 (siguiente dojo, opcional): flavors por cliente

Cuando el plugin respire, el siguiente multiplicador de negocio: **un APK por cliente desde el mismo código**.

```kotlin
// android/app/build.gradle.kts (sketch)
flavorDimensions += "cliente"
productFlavors {
    create("demo")     { dimension = "cliente"; applicationIdSuffix = ".demo" }
    create("lupita")   { dimension = "cliente"  // cliente real
        manifestPlaceholders["appName"] = "Abarrotes Lupita"
        buildConfigField("String", "LIC_PUB_DEFAULT", "\"<pub...>\"")
        buildConfigField("String", "SOPORTE_WA", "\"+53...\"") }
}
// res por flavor: app/src/lupita/res/ (icono, colores) — cero ifs en código.
```

`Done =` `assembleLupitaRelease` + `assembleDemoRelease` instalados a la vez, cada uno con su nombre, icono y clave pública precargada. Cero `if (cliente==...)` en el código: **si hay un if por cliente, el flavor está mal diseñado.**

---

# Parte C — Las 5 dimensiones a nivel implementación

## C-I. Esquemas cognitivos → código

### C-I.1 Muerte de proceso: el estado que no se restaura no existe

```kotlin
// ViewModel: lo efímero-visual en StateFlow, lo restaurable en SavedStateHandle.
class CobroViewModel(private val saved: SavedStateHandle) : ViewModel() {
    val ticketId: StateFlow<String?> = saved.getStateFlow("ticketId", null)
    fun setTicket(id: String) { saved["ticketId"] = id } // sobrevive a am kill
}
// Compose: rememberSaveable para lo visual (texto escrito, scroll, selección).
// Regla: pregúntate ante cada dato: "si mato el proceso, ¿debe seguir?" → sí: SavedState/DB.
```

Verificación (memoriza estos 3 comandos; son tu cinturón negro):
```bash
adb shell am kill <paquete>                 # matar proceso en fondo
adb shell cmd appops set <paquete> RUN_ANY_IN_BACKGROUND ignore  # simular/Knox agresivo
# + "Don't keep activities" activado + rota + cambia tema + fuente máxima
```
`Done =` matriz 5 agresiones × 3 pantallas sin pérdida ni crash.

### C-I.2 Hilo principal: StrictMode + JankStats como religión

```kotlin
// Solo debug. En release, StrictMode APAGADO (penaltyLog en release = spam + costo).
if (BuildConfig.DEBUG) {
    StrictMode.setThreadPolicy(StrictMode.ThreadPolicy.Builder()
        .detectDiskReads().detectDiskWrites().detectNetwork()
        .penaltyLog().penaltyFlashScreen().build())
    StrictMode.setVmPolicy(StrictMode.VmPolicy.Builder()
        .detectLeakedClosableObjects().detectLeakedRegistrationObjects()
        .penaltyLog().build())
}
// Regla de Dispatchers (pégala en tu monitor):
// Main: solo setear UI. IO: red/disco/BT/USB/sockets. Default: parseo/cómputo/JSON/base64.
```

Jank medido, no sentido: `androidx.metrics:metrics-performance` (`JankStats`) en la Activity principal, log de frames >700ms... no: frames que exceden su deadline. Meta élite: **<5% jank en listas, 0 ANR**.

### C-I.3 Activity hostil: cero lógica en componentes con ciclo de vida

```kotlin
// La UI observa y emite; jamás decide ni guarda.
// ❌ novato: var total = 0.0 en el Fragment; llamada a BD en onCreateView.
// ✅ élite: val uiState by vm.uiState.collectAsStateWithLifecycle()
//          Button(onClick = { vm.onEvent(CobroEvent.Cobrar) })
```
`Done =` `grep -r "android\." tu-paquete-ui/ | grep -v import` casi vacío de lógica: la UI no conoce BD, red ni hardware.

### C-I.4 Memoria comunal: las 4 fugas clásicas y su vacuna

1. **Context fugado** → vacuna: singletons solo con `applicationContext`.
2. **Listener/receiver no desregistrado** → vacuna: registrar/desregistrar en pares simétricos (`onStart/onStop`), o `LifecycleObserver`.
3. **Handler/Runnable huérfano** → vacuna: corrutinas con scope cancelable en vez de `postDelayed` eterno.
4. **Bitmap/lista sin reciclar** → vacuna: Coil/Glide + tamaños declarados, `RecyclerView`/`LazyList` con keys.
LeakCanary: `debugImplementation("com.squareup.leakcanary:leakcanary-android:2.x")` — cero configuración, te grita solo. `Done =` sesión de 10 min de uso caótico con 0 leaks.

### C-I.5 Back stack narrativa: deep links que reconstruyen historia

```kotlin
// Navigation: cada destino profundo declara su deep link + la pila se construye sola
// si modelas la jerarquía (startDestination → lista → detalle), no pantallas sueltas.
// Prueba canónica: app MUERTA + deep link → atrás lleva a lista → atrás a inicio → atrás sale.
```
`Done =` script con todos tus deep links (ver C-V.5) en verde.

### C-I.6 Init diferido: `Application.onCreate` casi vacío

```kotlin
// ❌ 8 SDKs init en onCreate (cada uno 50-200ms → +1s de arranque).
// ✅ App Startup Initializer por SDK diferible + lazy manual para el resto:
class CrucialInit : Initializer<Unit> { /* solo lo que la primera pantalla necesita */ }
// Regla: si la primera pantalla no lo necesita en sus primeros 2s, NO va en arranque.
```
Mide con `adb shell am start -W -n <pkg>/<act>` (TotalTime) antes/después.

### C-I.7 Offline-first: Room manda, la red obedece

```kotlin
// Patrón: UI ← Flow(Room) ← Worker sync → API. La UI NUNCA lee la red directo.
// Escritura: Room + flag pendiente → Worker(idempotentKey) → marca sincronizado.
// Idempotencia: cada operación lleva UUID; el servidor/algoritmo ignora repetidos.
// Conflicto: last-write-wins con timestamp de confianza, o cola de operaciones (mejor).
```
`Done =` laboratorio Nivel 1 (5 min avión → sync sin duplicados).

### C-I.8 Presupuestos de élite (números de referencia, ajusta a tu mercado)

| Presupuesto | Meta gama baja | Dónde se mide |
|---|---|---|
| Arranque en frío | <2s (élite <1s) | `am start -W` / Macrobenchmark |
| Jank en listas | <5% frames | JankStats |
| ANR | 0 (Play castiga >0.47%) | Play Console / vitals |
| Crash-free | >99.5% sesiones | crash reporting |
| Tamaño descarga | cada MB cuenta donde datos caros | APK Analyzer / Bundle |
| Permisos | mínimo viable, todos con fallback | matriz C-IV.6 |

---

## C-II. Estructuras operativas → código

### C-II.1 Flavors = estrategia de negocio (ver también B.6)

```kotlin
// Claves/secretos: NUNCA en git. keystore.properties + env vars:
val ksProps = java.util.Properties().apply {
    rootProject.file("keystore.properties").takeIf { it.exists() }?.inputStream()?.use(::load)
}
signingConfigs { create("release") {
    storeFile = file(ksProps["storeFile"] as String); storePassword = ksProps["storePass"] as String
    keyAlias = ksProps["keyAlias"] as String; keyPassword = ksProps["keyPass"] as String } }
```
`Done =` `git log --all -- keystore.properties` vacío + release firmada instalada.

### C-II.2 Version catalog + convention plugin (esqueleto)

```toml
# gradle/libs.versions.toml — UN lugar para todas las versiones
[versions] agp="8.5.2"; kotlin="2.0.20"; coroutines="1.9.0"
[libraries] coroutines-core={module="org.jetbrains.kotlinx:kotlinx-coroutines-core",version.ref="coroutines"}
[plugins] android-app={id="com.android.application",version.ref="agp"}
```

```kotlin
// build-logic/convention/src/main/kotlin/android-app-convention.gradle.kts
plugins { id("com.android.application"); kotlin("android") }
android { compileSdk = 34
    defaultConfig { minSdk = 26; testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner" }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    kotlinOptions { jvmTarget = "17"; freeCompilerArgs += "-Xexplicit-backing-fields" } }
```
`Done =` agregar un módulo nuevo en <10 líneas de gradle (todo heredado del convention).

### C-II.3 CI honesto (GitHub Actions, esqueleto)

```yaml
# .github/workflows/android.yml
jobs: { build: { runs-on: ubuntu-latest, steps: [
  {uses: actions/checkout@v4},
  {uses: actions/setup-java@v4, with: {java-version: '17', distribution: temurin}},
  {run: ./gradlew --no-daemon lint testRelease assembleRelease}] } }
```
Regla: **CI compila release**, no debug. Si CI está rojo, nadie mergea. `Done =` 1 atrapada documentada ("CI me salvó de X").

### C-II.4 Pirámide real 80/15/5

```kotlin
// 80%: estado sin Android (JUnit + Turbine para Flows):
@Test fun `cobrar con ticket vacío emite error`() = runTest {
    vm.onEvent(Cobrar); vm.uiState.test { assertEquals(ErrorVacio, awaitItem().error) } }
// 15%: UI camino crítico (Espresso/Compose Test): cobrar, imprimir, login.
// 5%: resto + 1 migración Room (MigrationTestHelper) + screenshot tests (C-V.4).
```
`Done =` suite <3 min que atrapa regresión introducida a propósito.

### C-II.5 Release discipline: R8 + Bundle + bundletool

```properties
# gradle.properties
android.enableR8.fullMode=true
```

```proguard
# Reglas mínimas típicas: modelos serializados + bridge JS + plugin
-keep class <tu>.licencia.** { *; }
-keep class <tu>.printer.** { *; }   # el bridge Capacitor usa reflection
-keepnames class * implements android.os.Parcelable
```

```bash
./gradlew bundleRelease
bundletool build-apks --bundle=app/build/outputs/bundle/release/app-release.aab \
  --output=app.apks --mode=universal --ks=tu.keystore --ks-key-alias=tu-alias
bundletool install-apks --apks=app.apks   # probar el release REAL en el teléfono
```
`Done =` checklist firmada por release: instalado desde bundle, camino crítico OK, tamaño anotado.

### C-II.6 Telemetría mínima que manda

Crash-free sessions, ANR rate, arranque p50/p90, tamaño por versión, 1 evento de negocio (tickets cobrados). Umbrales escritos en `PRESUPUESTO.md`. Sin dashboard no hay élite: hay opiniones. Privacidad: sin PII en eventos, opt-out documentado.

---

## C-III. Dinámicas de elección → marcos

### C-III.1 Puertas de una vía vs. dos vías (tabla de deliberación)

| Decisión | Tipo | Deliberación correcta |
|---|---|---|
| Esquema BD + migraciones | una vía | máxima: prototipa migración antes de mergear |
| `applicationId`, content providers, deeplink scheme | una vía | congela temprano, documenta |
| Clave/formato de licencia | una vía | congela formato (ya lo hiciste en CajaFácil ✅) |
| Framework UI, librería de red/imagen | dos vías | decide en 1 día, abstrae detrás de interfaz |
| Estructura de paquetes | dos vías | refactoriza sin permiso ni culpa |

**Regla:** si es una vía, escribe un ADR (Architecture Decision Record, ½ página: contexto → decisión → consecuencias). 10 ADRs valen más que 100 reuniones.

### C-III.2 Dieta de dependencias (scorecard: puntúa 1–5 cada fila, <18 = rechaza o aísla)

| Criterio | Cómo verificar |
|---|---|
| Mantenimiento | último commit <6 meses, issues respondidos |
| Bus factor | ≥2 mantenedores activos, o empresa detrás |
| Peso transitivo | `./gradlew :app:dependencies` + APK Analyzer (¿cuántos MB suma de verdad?) |
| Superficie API | ¿toca red/disco/permisos? → audita el código, es TU código en runtime |
| Salida | ¿puedes reemplazarla en 1 día tras interfaz propia? Si no, crea la interfaz ANTES |

El caso del plugin de impresora (0 estrellas): score bajo → **se adoptó aislado tras driver propio + fallback + plan de reemplazo (Parte B)**. Esa es la plantilla para toda dependencia débil.

### C-III.3 Compose vs. Views (matriz, no religión)

| Contexto | Gana |
|---|---|
| Codebase Views grande + equipo que lo domina | Views + Compose islas (interop) |
| App nueva + equipo Kotlin sólido | Compose |
| Lista crítica 60fps en gama baja + equipo junior | Views (RecyclerView dominado) o Compose con perf review senior |
| Acceso a APIs nuevas rápid
...[truncated 14288 chars]