# Cuaderno de cicatrices (meta: ≥30 entradas al día 90)

Formato por entrada: **síntoma → causa raíz → vacuna**. Sin causa raíz no cuenta.

## Ejemplos reales (del proyecto CajaFácil — así se escribe una cicatriz)

1. **"El stock inicial se duplicaba (50 → 100)"** → causa: `productos.crear`
   insertaba la fila CON stock 50 y además registraba movimiento de entrada +50.
   Vacuna: el movimiento inicial se asienta con INSERT directo sin tocar stock
   (patrón de la web), y todo `crear` con stock pasa por test que lee el total.
2. **`ReferenceError: AjusteService is not defined` en 8 tests** → causa: el
   módulo usaba un nombre que no estaba en su destructuring de imports.
   Vacuna: correr jest antes de cada commit; jamás asumir que "ese archivo no lo toqué".
3. **"Permiso USB colgado, el callback jamás llega"** (clásico Android) →
   causa: `PendingIntent` con FLAG_IMMUTABLE en Android 12+; el sistema no
   puede rellenar el extra. Vacuna: FLAG_MUTABLE siempre en USB + test manual
   de denegar 3 veces en la matriz B.5.

## Mis cicatrices (Nivel 0 en adelante)

4. ...
