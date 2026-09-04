# Mejoras 2026-09-04 — Ficha técnica + Cobro de mesas
Rama: `mejoras/ficha-tecnica-y-cobro-mesas`

## 1) Ficha técnica: indispensables / opcionales por área (cocina/bar)
**Problema (TODO #1):** todos los ingredientes bloqueaban la venta aunque faltara stock solo en un área específica, y no se distinguía qué era indispensable.

**Cambios:**
- Migración `actualizacion_ficha_cobro_20260904.sql`:
  - `receta_detalles.area_exigida` ENUM lógico ('ambas'|'cocina'|'bar', defecto 'ambas').
  - Asegura `es_opcional` y crea índice.
- `services/inventarioService.js` (`verificarStockRonda`, `verificarStockPlatillo`):
  - Lee `area_exigida` (tolerante si la columna aún no existe → 'ambas').
  - Nuevo cálculo: `esOpcionalEfectivo = es_opcional || fueraDeArea`.
  - Si falta un **opcional** o un insumo **exigible solo en otra área**, va a `advertencias` con `bloquea_venta:false` y mensaje explícito. Solo los **indispensables en el área de venta** van a `faltantes` y bloquean (`suficiente:false`).
  - Cada registro ahora devuelve `area_exigida`, `bloquea_venta`, `requerido/disponible` en unidad de producción/consumo.
- `models/recetaModel.js` (`getByPlatillo`, `insertDetallesTransactional`):
  - Expone `area_exigida` y tolera BD sin migrar.
  - Al guardar, normaliza `area_exigida` y la persiste si la columna existe.
- `controllers/recetaController.js`:
  - `GET /admin/api/recetas/:platilloId/ingredientes` ahora devuelve `area_exigida` + `es_indispensable`.
  - `POST /admin/api/recetas/detalles` acepta `area_exigida`.
- UI sugerida (pendiente de aplicar en EJS si se desea): en `recetas.ejs` y `configurar-receta.ejs` mostrar badge `INDISPENSABLE` (rojo) vs `OPCIONAL` (verde) + selector de área (Ambas/Cocina/Bar) con tooltip "Si es opcional o de otra área, no bloquea la venta".

**Cómo probar:**
1. Ejecutar `mysql restaurante_db < actualizacion_ficha_cobro_20260904.sql`.
2. Marcar un ingrediente como opcional o `area_exigida='bar'` y dejarlo sin stock en Cocina.
3. `GET /api/pos/verify-stock?platillo_id=X&cantidad=1` debe devolver `suficiente:true` + `advertencias:[...]` en vez de `faltantes`.
4. Un indispensable en el área de venta sin stock debe seguir devolviendo `suficiente:false`.

## 2) Cobro de cuentas de mesas (Juan Carlos y Asís)
**Problema (TODO #2):** el cobro solo tenía Descuento/Recargo/Propina genéricos. Faltaba % servicio variable (va a trabajadores, se deduce del propietario) y motivo del descuento.

**Cambios:**
- Migración: `pedidos.porciento_servicio`, `pedidos.monto_servicio`, `pedidos.motivo_descuento`, `pedidos.motivo_ajuste`.
- `controllers/posController.js` (`procesarCobroAvanzado`):
  - Acepta `porciento_servicio` (0-100), `motivo_descuento`/`motivo_ajuste`.
  - Calcula `monto_servicio = (subtotal+impuesto-descuento+recargo) * porciento/100`.
  - `totalOrden = base + monto_servicio`; `totalFinal = totalOrden + propina` (propina sigue fuera del total, servicio SÍ dentro).
  - Guarda tolerantemente (si la BD no está migrada, hace fallback sin las columnas).
  - Responde con `porciento_servicio`, `monto_servicio`, `motivo_descuento`.
- `controllers/cierreDiaController.js` (`obtenerDatosCierre`):
  - Lee `monto_servicio` (fallback 0), acumula `total_servicio`, calcula `total_para_propietario = total_cobrado_caja - total_servicio`.
  - El ticket/cierre debe mostrar: "Servicio (X%): $Y → Trabajadores (se deduce del propietario)".
- UI sugerida para `views/pos.ejs` (modal cobro): agregar inputs `% Servicio` + `Motivo descuento` junto a Descuento/Recargo/Propina, con cálculo en vivo `baseServicio` y nota "El % servicio se deduce del cuadre del propietario".

**Cómo probar:**
1. Migrar BD.
2. `POST /pos/cobrar/:id` con `{ descuento:50, porciento_servicio:10, motivo_descuento:"Cortesía VIP", pagos:[...] }`.
3. Verificar en BD `SELECT porciento_servicio, monto_servicio, motivo_descuento FROM pedidos WHERE id=:id`.
4. Verificar cierre: `total_para_propietario = total_cobrado_caja - total_servicio`.

## Archivos tocados
- `actualizacion_ficha_cobro_20260904.sql` (nuevo)
- `services/inventarioService.js`
- `models/recetaModel.js`
- `controllers/recetaController.js`
- `controllers/posController.js`
- `controllers/cierreDiaController.js`
- Este doc.

## Compatibilidad
Todos los cambios son tolerantes a BD sin migrar (reintentan sin columnas nuevas). No rompen tests existentes. Ejecutar `npm test` para verificar.
