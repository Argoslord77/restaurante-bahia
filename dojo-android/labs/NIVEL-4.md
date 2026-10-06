# Nivel 4 — El build como producto (días 50–63)

> Compilar como empresa: flavors, versiones centralizadas, firma y CI honesto.

## Días 50–53 — Flavors white-label

1. Convierte HolaDojo en 2 productos (`flavorDimensions("cliente")`):
   ```kotlin
   productFlavors {
       create("demo") { dimension = "cliente"; applicationIdSuffix = ".demo" }
       create("acme") { dimension = "cliente"; applicationIdSuffix = ".acme"
           manifestPlaceholders["appName"] = "Acme Corp"
           buildConfigField("String", "API_URL", "\"https://acme.example\"") }
   }
   // res por flavor: app/src/acme/res/values/colors.xml, mipmap/...
   ```
   (`buildConfig = true` en buildFeatures si tu AGP lo exige.)
2. Instala AMBOS a la vez: icono, nombre y color distintos, cero `if` por
   cliente en el código. Si hay un `if (flavor)` en Kotlin, está mal diseñado.
`Done =` 2 APK instalados simultáneamente, distinguibles a simple vista.
`Trampa =` `if (cliente == ...)` regado en el código.

## Días 54–56 — Version catalog + convention plugin

1. Crea `gradle/libs.versions.toml` y mueve TODAS las versiones ahí.
2. Crea módulo `build-logic` (plugin `kotlin-dsl`) con tu convención:
   ```kotlin
   // build-logic/convention/src/main/kotlin/android-app-convention.gradle.kts
   plugins { id("com.android.application"); kotlin("android") }
   android { compileSdk = 34; defaultConfig { minSdk = 26 } /* + kotlinOptions, lint */ }
   ```
   Aplícalo en `:app`. Agrega un módulo `:core` vacío que lo use en <10 líneas.
`Done =` cambias 1 versión en el TOML y todo compila; módulo nuevo en <10 líneas.
`Trampa =` versiones repetidas en 5 gradles (deuda que cobra intereses).

## Días 57–60 — Firma y secretos

1. Genera tu keystore de pruebas (`keytool -genkeypair ... -keystore dojo.keystore`).
2. `keystore.properties` (storeFile/storePass/keyAlias/keyPass) + `.gitignore`.
   `signingConfigs.release` lo lee; `buildTypes.release` lo usa.
3. Verifica: `git status` limpio de secretos + `assembleRelease` firmada e
   instalable. Sube el repo a GitHub y confirma que el keystore NO viajó.
`Done =` release firmada + `git log --all -- keystore.properties` vacío.
`Trampa =` claves en el código, en el chat o "temporalmente" en git.

## Días 61–63 — CI honesto

1. `.github/workflows/android.yml`: checkout + JDK 17 + 
   `./gradlew --no-daemon lint testRelease assembleRelease`.
2. Rompe algo que pase en local y FALLE en CI (un test con zona horaria fija,
   un lint, un TODO que marcaste como error). Observa el rojo. Arréglalo.
3. Regla desde hoy: CI rojo = nadie mergea, nadie releasea.
`Done =` badge verde + 1 historia escrita "CI me atrapó en X".
`Trampa =` "en mi PC funciona" como argumento (la CI es el juez).
