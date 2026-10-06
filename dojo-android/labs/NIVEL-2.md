# Nivel 2 — Rendimiento y disciplina de release (días 22–35)

> Todo en el teléfono de guerra. Todo con números antes/después.

## Días 22–25 — Caza de jank + Perfetto

1. Pantalla con `LazyColumn` de 1000 filas + imágenes (Coil) + un buscador.
   Versión rota a propósito: sin `key`, estado leído arriba que recompone todo.
2. Mide jank real (`metrics-performance:JankStats` en la Activity):
   ```kotlin
   // log de frames con jank mientras scrolleas 30s; anota el %
   ```
3. Aplica las 4 curas, UNA por vez, midiendo cada una:
   - `items(lista, key = { it.id })`
   - estado al nivel más bajo (el buscador NO recompone las filas)
   - `derivedStateOf` para derivados (filtrados, contadores)
   - `key(id)` + `remember` en expansibles
4. Perfetto: Android Studio → Profiler → System Trace → scroll 10s →
   encuentra UN frame rojo y lee su causa (bind, inflate, GC). Márcalo.
`Done =` % jank antes/después + traza con el culpable identificado.
`Trampa =` "se siente bien" sin medir (tu dedo miente, la traza no).

## Días 26–28 — Arranque

1. Simula 3 SDK golosos en `Application.onCreate`: `Thread.sleep(150)` ×3.
   Mide: `adb shell am start -W` (TotalTime). Anota.
2. Aplica init diferido (`startup-runtime`): un `Initializer` solo con lo que
   la primera pantalla necesita; el resto a `lazy` / primera-uso.
   ```kotlin
   class CrucialInit : Initializer<Unit> {
       override fun create(ctx: Context) { /* solo lo crítico */ }
       override fun dependencies(): List<Class<out Initializer<*>>> = emptyList()
   }
   ```
3. Re-mide. Meta: recorte ≥50% del lastre.
`Done =` ms antes/después + `onCreate` con ≤10 líneas propias.
`Trampa =` "lo pongo en onCreate mientras tanto" (el mientras tanto es eterno).

## Días 29–31 — R8 rompe en silencio + Bundle real

1. `gradle.properties`: `android.enableR8.fullMode=true`. Release con
   `minifyEnabled = true`, `shrinkResources = true`.
2. Rompe a propósito: parsea un JSON con Gson/Moshi-reflect a un data class
   SIN reglas. Debug: funciona. Release: crash o nulos. **Míralo fallar.**
3. Escribe reglas mínimas (keep de modelos + lo que use reflection) y verifica
   el release. Luego genera el Bundle y pruébalo de verdad:
   ```bash
   ./gradlew bundleRelease
   bundletool build-apks --bundle=app-release.aab --output=app.apks --mode=universal ...
   bundletool install-apks --apks=app.apks
   ```
`Done =` checklist firmada: "probé el release instalado desde bundle" + tamaño.
`Trampa =` probar debug y "confiar" en release.

## Días 32–35 — Baseline Profiles + Macrobenchmark

1. Agrega el plugin `androidx.baselineprofile` + módulo `:benchmark`
   (`androidx.benchmark.macro`, `testBuildType = "release"`).
2. Generador: test que abre inicio → lista → detalle (el camino caliente).
3. Corre `./gradlew :benchmark:connectedCheck` (o regenera el perfil) y mide
   arranque con `CompilationMode.None()` vs `Partial()`:
   ```kotlin
   benchmarkRule.measureRepeated(packageName, metrics = listOf(StartupTimingMetric()),
       compilationMode = CompilationMode.Partial(), iterations = 5) { startActivityAndWait() }
   ```
`Done =` arranque sin perfil vs con perfil, en ms, en tu teléfono de guerra.
`Trampa =` medir en emulador x86 (números de fantasía).
