# Nivel 5 — Calidad de élite (días 64–77)

> La red que te deja moverte rápido sin miedo: tests que importan,
> regresiones visuales, fuzzing y telemetría mínima.

## Días 64–67 — Pirámide real 80/15/5

1. 80% estado: ≥20 tests de ViewModels/casos de uso (patrón del Nivel 1).
   Deben correr en <3 min en tu PC.
2. 15% UI crítica: 2–3 tests del camino feliz (formulario→guardar→ver)
   con Compose Test (`createComposeRule`, `onNodeWithText().performClick()`).
3. 5%: 1 test de migración (Nivel 1) + 1 screenshot (siguiente lab).
4. Siembra una regresión a propósito (invierte una validación): la suite debe
   ponerse roja en <3 min. Si no la atrapa, escribe el test que faltaba.
`Done =` suite <3 min que atrapa regresión sembrada.
`Trampa =` 200 tests de getters + 0 del camino crítico.

## Días 68–70 — Screenshot tests

1. Agrega Roborazzi (`io.github.takahirom.roborazzi`) y escribe 5 captures de
   tus componentes clave (claro/oscuro):
   ```kotlin
   @Test fun boton_capture() { captureRoboImage(renderComposable { MiBoton() }) }
   ```
2. Graba goldens, luego cambia un padding/color a propósito: el diff debe
   gritar. Decide: ¿regresión o nuevo golden? (Ese juicio ES el lab.)
`Done =` 1 regresión visual atrapada por diff + criterio escrito de cuándo
actualizar goldens (nunca a ciegas).
`Trampa =` actualizar goldens para "que pase" sin mirar el diff.

## Días 71–73 — Fuzzing de navegación

Script `fuzz.sh` (adáptalo a tus deep links):
```bash
#!/usr/bin/env bash
PKG=com.tu.dojo
for link in "holadojo://inicio" "holadojo://lista" "holadojo://detalle/7"; do
  adb shell am force-stop $PKG
  adb shell am start -a android.intent.VIEW -d "$link"  # app muerta
  sleep 2
done
adb shell cmd uimode night yes        # modo oscuro
adb shell "settings put system font_scale 1.5"  # fuente máxima (rompe layouts)
# multi-ventana y rotación: a mano, 5 min de caos deliberado
adb shell cmd uimode night no; adb shell "settings put system font_scale 1.0"
```
Matriz: 3 links × {frío, oscuro, fuente grande, rotado} = 12+ combinaciones.
Cada crash = cicatriz + fix. Listo cuando la matriz pasa limpia.
`Done =` matriz verde (o lista de crashes encontrados y corregidos: mejor).
`Trampa =` probar solo el camino feliz en un Pixel con todo por defecto.

## Días 74–77 — Telemetría mínima que manda

1. Agrega crash reporting (Firebase Crashlytics o el que uses) + 3 señales:
   arranque en frío (medido a mano con timestamp en `Application` vs primera
   pantalla), camino crítico (formulario guardado OK/fracaso), tamaño por versión.
2. Define umbrales en `PRESUPUESTO.md` (crash-free >99.5%, ANR 0, arranque techo).
3. Usa TU app 7 días como usuario real. Sin PII en eventos (regla de privacidad).
`Done =` dashboard con 7 días de datos propios + 1 decisión tomada por métricas.
`Trampa =` telemetría que nadie mira (si no hay ritual semanal, no existe).
