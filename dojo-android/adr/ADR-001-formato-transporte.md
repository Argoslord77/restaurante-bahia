# ADR-001: el formato ESC/POS vive en JS; el plugin nativo solo transporta bytes

Fecha: 2026-10-06 Estado: aceptada

## Contexto
El plugin nativo CajaFacilPrinter (M1, Parte B) reemplaza al plugin débil de
impresión. Había que decidir dónde vive el formato del ticket: ¿Kotlin o JS?

## Decisión
El formato (escpos.js) se queda en JS. El plugin expone list/print/status y
recibe bytes en base64. Formato ≠ transporte.

## Consecuencias
- A favor: cambiar de impresora no toca Kotlin; cambiar de transporte no toca
  JS; el JS se prueba con jest sin Android; el Kotlin se prueba sin tickets.
- En contra: el bridge cruza base64 (+33% tamaño; un ticket pesa <20KB, irrelevante).
- Irreversible porque: los códigos de error y el contrato print() son API
  pública consumida por impresora.js; cambiarlos rompe clientes desplegados.

## Alternativas descartadas
- Formato en Kotlin: duplicaba escpos.js (ya probado) y ataba tickets a releases del APK.
- Plugin todo-en-uno (formato+transporte): acoplaba dos ritmos de cambio distintos.
