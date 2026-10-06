# Checklist 90 días — marca solo con evidencia (comando, métrica o prueba)

## Reglas del dojo
- [ ] Teléfono de guerra anotado (modelo/RAM/Android)
- [ ] Don't keep activities activado para siempre
- [ ] Cuaderno de cicatrices abierto (meta ≥30)
- [ ] Todo laboratorio termina en un número

## Nivel 0 (días 1–7) — guía: labs/NIVEL-0.md
- [ ] D1: HolaDojo corriendo en físico + adb kill funciona
- [ ] D2: video 30s sobreviviendo a `am kill` + frase del ViewModel
- [ ] D3–4: capturas GPU antes/después + regla de Dispatchers escrita
- [ ] D5: traza LeakCanary + 10 rotaciones limpias
- [ ] D6–7: PRESUPUESTO.md con 3 techos firmados + cicatriz #1

## Nivel 1 (días 8–21)
- [ ] UDF + SavedStateHandle: 10 muertes seguidas sin pérdida ni crash
- [ ] Test del ViewModel: 5 transiciones sin Android
- [ ] Room v1→v2 con test de migración en verde
- [ ] Deep link con app muerta → pila + atrás correctos
- [ ] 5 min en avión → sync sin duplicados (idempotencia)

## Nivel 2 (días 22–35)
- [ ] Jank % antes/después + traza Perfetto con culpable marcado
- [ ] Arranque ms antes/después (recorte ≥50% del lastre simulado)
- [ ] Release con R8: roto en release/funciona en debug → reglas → verde
- [ ] bundletool: release instalado desde bundle + tamaño anotado
- [ ] Baseline Profile: arranque None vs Partial en teléfono de guerra

## Nivel 3 (días 36–49)
- [ ] Matriz permiso × momento × fallback probada
- [ ] WorkManager bajo Doze: diferido + ejecutado (log)
- [ ] BT SPP: 20 ciclos conectar→enviar→cerrar sin fugas ni ANR
- [ ] USB OTG: permiso MUTABLE + bulk OK + denegación elegante

## Nivel 4 (días 50–63)
- [ ] 2 flavors instalados a la vez, distinguibles
- [ ] Version catalog: 1 cambio de versión compila todo
- [ ] keystore.properties fuera de git + release firmada instalable
- [ ] CI verde + 1 historia "CI me atrapó"

## Nivel 5 (días 64–77)
- [ ] Suite <3 min que atrapa regresión sembrada
- [ ] 1 regresión visual atrapada por screenshot diff
- [ ] Matriz 20 combinaciones (fuzzing) sin crash
- [ ] Dashboard con 7 días de métricas propias

## Nivel 6 (días 78–90) — M1–M5 en ELITE-ANDROID-90-DIAS.md Parte B
- [ ] M1: list() real + 9 tests (puente JS listo ✅ — ver tests/printer-nativo.test.js)
- [ ] M2: 20 impresiones BT seguidas, 0 fugas, StrictMode limpio
- [ ] M3: USB OTG + denegación ×3 elegante
- [ ] M4: WiFi + status() 3 transportes + jank 0
- [ ] M5: impresora.js en nativo + AAB release + matriz B.5 verde
- [ ] D89: AAB + notas + 2–3 usuarios reales
- [ ] D90: GRADUACION.md defendido en voz alta 🎓
