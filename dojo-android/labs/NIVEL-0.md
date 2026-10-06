# Nivel 0 — Fundamentos letales (días 1–7): guía ejecutable

> Objetivo: instalar los 3 reflejos (muerte, hilo sagrado, presupuestos).
> Proyecto de laboratorio: **HolaDojo** (app nueva, Compose, minSdk 26).
> Todo se valida en tu **teléfono de guerra**, no en el emulador.

## Día 1 — Entorno de guerra

1. Instala Android Studio (último estable) + crea proyecto *Empty Activity* (Compose):
   `HolaDojo`, paquete `com.tu.dojo`, minSdk 26, lenguaje Kotlin.
2. En tu teléfono físico: Ajustes → Acerca del teléfono → toca 7 veces
   *Número de compilación* → Opciones de desarrollador → activa:
   - **Depuración USB**
   - **Don't keep activities** (← desde hoy, para siempre)
   - *Profile GPU Rendering → On screen as bars* (día 3 lo usarás)
3. Conecta por USB, corre la app, anota en `plantillas/PRESUPUESTO.md`:
   modelo, RAM, versión Android.
4. Aprende tus 3 comandos (úsalos a diario desde hoy):
   ```bash
   adb devices                          # ¿ve tu teléfono?
   adb shell am kill com.tu.dojo        # ASESINAR el proceso (tu katana)
   adb shell am start -W -n com.tu.dojo/.MainActivity  # arranque en frío (TotalTime)
   ```
`Done =` app corriendo en físico + `PRESUPUESTO.md` con los datos del teléfono.

## Día 2 — La muerte como rutina

1. Agrega un formulario: 3 `TextField` + 1 contador con botón.
2. Llena todo → pulsa inicio → vuelve. **Observa cómo muere** (Don't keep
   activities lo asesina). Rota: muere otra vez. No lo "arregles" aún: míralo.
3. Arréglalo con estado restaurable:
   ```kotlin
   var nombre by rememberSaveable { mutableStateOf("") }  // sobrevive muerte+rotación
   var contador by rememberSaveable { mutableIntStateOf(0) }
   // En Views sería: onSaveInstanceState.putString(...) + leer en onCreate.
   ```
4. Verificación brutal: llena → inicio → `adb shell am kill com.tu.dojo` →
   vuelve desde recientes. Todo intacto = victoria.
`Done =` video 30s del paso 4 + frase escrita con tus palabras de por qué
el ViewModel solo NO basta (pista: sobrevive rotación, no muerte de proceso).
`Trampa =` "guardar en variables sueltas y creer que basta".

## Día 3–4 — El hilo principal es sagrado

1. Provoca jank DELIBERADO en el click del contador:
   ```kotlin
   // ❌ a propósito: 300ms congelando la UI
   Button(onClick = { Thread.sleep(300); contador++ }) { Text("...") }
   ```
   Mira las barras GPU: picos que cruzan la línea verde = frames muertos.
2. Instala el guardián en `MainActivity.onCreate` (debug):
   ```kotlin
   if (BuildConfig.DEBUG) StrictMode.setThreadPolicy(
       StrictMode.ThreadPolicy.Builder().detectDiskReads().detectDiskWrites()
           .detectNetwork().penaltyLog().penaltyFlashScreen().build())
   ```
   Repite el click: la pantalla parpadea en rojo. Ese parpadeo es tu maestro.
3. Corrige con corrutinas (agrega `kotlinx-coroutines-android`):
   ```kotlin
   val scope = rememberCoroutineScope()
   Button(onClick = { scope.launch { delay(300); contador++ } }) { ... }
   ```
   Barras verdes de nuevo.
`Done =` capturas antes/después de las barras + tu regla escrita:
"Main = solo UI · IO = red/disco/BT · Default = parseo/cómputo".
`Trampa =` "funciona, luego está bien" (sin medir frames).

## Día 5 — Memoria comunal

1. Fuga un contexto a propósito:
   ```kotlin
   object Holder { var ctx: Context? = null }  // ❌ retiene tu Activity
   // en onCreate: Holder.ctx = this; rota 5 veces → 5 activities zombis
   ```
2. Agrega `debugImplementation("com.squareup.leakcanary:leakcanary-android:2.14")`,
   corre, rota, espera: LeakCanary te muestra la traza del crimen.
3. Corrige: `Holder.ctx = applicationContext` (vive lo mismo que el proceso)
   o mejor: no retener nada. Rota 10 veces → 0 leaks.
`Done =` traza de LeakCanary (antes) + sesión limpia 10 rotaciones (después).
`Trampa =` singletons con Activity context ("total, es una sola activity").

## Día 6–7 — Tu primer presupuesto

1. Mide HolaDojo en tu teléfono de guerra:
   ```bash
   adb shell am start -W -n com.tu.dojo/.MainActivity   # TotalTime = arranque frío
   ls -la app/build/outputs/apk/debug/*.apk             # tamaño
   ```
   + jank: usa la app 2 min con las barras visibles, estima % sobre la línea.
2. Congela los 3 números en `plantillas/PRESUPUESTO.md` como techo:
   *"Ningún laboratorio futuro puede empeorar arranque >10% ni tamaño >1MB
   sin justificación escrita."*
3. Fírmalo con fecha. A partir de hoy, todo cambio se mide contra esto.
`Done =` `PRESUPUESTO.md` completo + 1ª entrada en `CUADERNO-CICATRICES.md`
(el bug que MÁS te dolió esta semana, con causa raíz).

---
Siguiente: Nivel 1 (días 8–21) en `ELITE-ANDROID-90-DIAS.md`. Los labs de los
niveles 1–5 se desbloquean igual: pide "siguiente nivel" y se generan con tus
números reales como base.
