# Nivel 1 — Estado y arquitectura real (días 8–21)

> Proyecto: HolaDojo (el mismo del Nivel 0). Al final, "arquitectura" = código
> que sobrevive y se prueba, no diagramas.

## Días 8–11 — UI = f(state) + ViewModel testeable

1. Reescribe el formulario con flujo unidireccional (agrega
   `lifecycle-viewmodel-savedstate`, `lifecycle-runtime-compose`):
   ```kotlin
   data class FormUiState(val nombre: String = "", val contador: Int = 0)
   class FormViewModel(private val saved: SavedStateHandle) : ViewModel() {
       val uiState: StateFlow<FormUiState> = saved.getStateFlow("ui", FormUiState())
       fun onNombre(v: String) { saved["ui"] = uiState.value.copy(nombre = v) }
       fun onSumar() { val u = uiState.value; saved["ui"] = u.copy(contador = u.contador + 1) }
   }
   // UI: val u by vm.uiState.collectAsStateWithLifecycle()
   //     TextField(value = u.nombre, onValueChange = vm::onNombre)
   ```
   `SavedStateHandle` exige tipos parcelables: un data class de Strings/Ints
   funciona (usa el mismo mecanismo que rememberSaveable).
2. Mata la pantalla 10 veces (`am kill` + rotar + tema): cero pérdidas.
3. Test SIN Android (JUnit + `kotlinx-coroutines-test`):
   ```kotlin
   @Test fun sumar_incrementa() = runTest {
       val vm = FormViewModel(SavedStateHandle())
       vm.onSumar(); vm.onSumar()
       assertEquals(2, vm.uiState.value.contador)
   }
   ```
   Escribe 5 como este (nombre, sumar, restauración simulada re-creando el
   ViewModel con el mismo SavedStateHandle, etc.).
`Done =` 10 muertes limpias + 5 tests verdes.
`Trampa =` lógica en el Composable/Activity ("solo esta línea").

## Días 12–15 — Room como fuente única + migración con test

1. Agrega Room (`room-runtime`, `room-ktx`, ksp + `room-compiler`):
   entidad `Nota(id, texto, pendiente)`, DAO con `fun listar(): Flow<List<Nota>>`,
   `@Database(version = 1)`.
2. La UI observa `dao.listar()` — jamás una lista en memoria como verdad.
3. Migración v1→v2 (agrega `creada: Long` con default):
   ```kotlin
   val M1_2 = object : Migration(1, 2) {
       override fun migrate(db: SupportSQLiteDatabase) {
           db.execSQL("ALTER TABLE Nota ADD COLUMN creada INTEGER NOT NULL DEFAULT 0")
       }
   }
   ```
4. Test de migración (`room-testing`, `MigrationTestHelper`): crea v1 con datos,
   migra, verifica datos intactos + columna nueva.
`Done =` test de migración verde + actualización real v1→v2 sin perder notas.
`Trampa =` `fallbackToDestructiveMigration()` en release (borra datos del usuario).

## Días 16–18 — Navegación como narrativa

1. Navigation Compose: `inicio → lista → detalle/{id}`, cada profundo con deepLink:
   ```kotlin
   composable("detalle/{id}", deepLinks = listOf(navDeepLink { uriPattern = "holadojo://detalle/{id}" }))
   ```
2. Declara el intent-filter del scheme en el Manifest (el plugin de Navigation
   lo genera si usas `navDeepLink` + manifest placeholder; verifica a mano).
3. Prueba canónica con la app MUERTA:
   ```bash
   adb shell am force-stop com.tu.dojo
   adb shell am start -a android.intent.VIEW -d "holadojo://detalle/7"
   ```
   atrás → lista → atrás → inicio → atrás → sale. Si aterriza en el vacío o el
   atrás cierra la app desde detalle, la jerarquía está mal modelada.
`Done =` deep link en frío + viaje de regreso perfecto.
`Trampa =` pantallas sueltas sin startDestination claro.

## Días 19–21 — Offline-first en miniatura

1. Escritura: `dao.insertar(Nota(..., pendiente = true))`. La UI ya la muestra
   (Flow) sin esperar red.
2. Worker (`work-runtime-ktx`) con `Constraints(NetworkType.CONNECTED)`:
   lee pendientes, "sube" cada una con su UUID idempotente (simula servidor
   con un log; ignora UUID repetidos), marca `pendiente = false`.
3. Prueba: modo avión → crea 5 notas → apaga avión → worker corre →
   las 5 suben UNA vez aunque el worker se reintente (mata el proceso a mitad
   y verifica: sin duplicados).
`Done =` 5 min en avión → sync sin duplicados, con muerte a mitad incluida.
`Trampa =` "reintentar todo" sin idempotencia (= duplicados en producción).
