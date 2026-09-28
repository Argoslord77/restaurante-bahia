#!/bin/bash
# ============================================================
# verificar_fase2.sh - Restaurante Bahia (Fase 2: V11+V12+V13)
# Comprueba que el codigo de la Fase 2 este desplegado en la
# instalacion. Ejecutar en la raiz del proyecto:
#     bash scripts/verificar_fase2.sh
# Codigo de salida 0 = todo OK; 1 = falta algo.
# ============================================================
cd "$(dirname "$0")/.." 2>/dev/null || { echo "Ejecutame desde el repo: bash scripts/verificar_fase2.sh"; exit 1; }

OK=0; KO=0
chk() {
  if grep -q "$2" "$1" 2>/dev/null; then
    printf "  OK     %-42s (%s)\n" "$1" "$3"; OK=$((OK+1))
  else
    printf "  FALTA  %-42s (%s)\n" "$1" "$3"; KO=$((KO+1))
  fi
}
existe() {
  if [ -f "$1" ]; then
    printf "  OK     %-42s (archivo presente)\n" "$1"; OK=$((OK+1))
  else
    printf "  FALTA  %-42s (archivo presente)\n" "$1"; KO=$((KO+1))
  fi
}

echo "============================================================"
echo " Verificacion Fase 2 (V11 retiros/SLA/propinas/ciego +"
echo " V12 reservas/cuentas + V13 proveedores/sugerido)"
echo "============================================================"
echo ""
echo "-- Migraciones presentes (aplicar con mysql, ver guia) --"
existe scripts/migracion_retiros_efectivo.sql
existe scripts/migracion_reservas_cuentas.sql
existe scripts/migracion_proveedores_compras.sql
echo ""
echo "-- V11: caja y cocina --"
chk routes/turnoRoutes.js               "turno/retiros"            "C4 rutas de retiros"
chk controllers/turnoController.js      "registrarRetiro"          "C4 controlador"
chk services/turnoService.js            "totalRetirosVigentes"     "C4 servicio"
chk views/caja/turnos.ejs               "Retiros de Efectivo"      "C4 tarjeta en vista"
chk controllers/monitorController.js    "leerSlaMin"               "C5 SLA cocina/bar"
chk views/monitor.ejs                   "RETRASADO"                "C5 insignia monitor"
chk views/admin/settings.ejs            "sla_cocina_min"           "C5 Opcion 6"
chk routes/reporteRoutes.js             "reportes/propinas"        "C6 ruta propinas"
chk views/reportes/propinas.ejs         "Propinas del Turno"       "C6 vista"
chk views/caja/turnos.ejs               "abiertas.cuentas"         "C7 aviso abiertas"
echo ""
echo "-- V12: sala y cuentas (CRITICO: montajes en app.js) --"
chk app.js                              "app.use('/admin', reservaRoutes)" "montaje reservas (faltaba en zip V12)"
chk app.js                              "app.use('/admin', cuentaRoutes)"  "montaje cuentas (faltaba en zip V12)"
chk routes/reservaRoutes.js             "/reservas/:id/llegada"    "C2 rutas"
chk controllers/reservaController.js    "renderReservas"           "C2 controlador"
chk views/admin/reservas.ejs            "Nueva reserva"            "C2 vista"
chk routes/cuentaRoutes.js              "/cuentas/:id/dividir"     "C3 rutas"
chk services/cuentaService.js           "DIVIDIR_CUENTA"           "C3 servicio + auditoria"
chk views/caja/cuentas.ejs              "Dividir cuenta"           "C3 vista"
echo ""
echo "-- V13: compras y sugerido --"
chk app.js                              "app.use('/admin', proveedorRoutes)" "montaje proveedores"
chk routes/proveedorRoutes.js           "/proveedores/:id/estado"  "C1 rutas"
chk models/entradaModel.js              "l.proveedor_id"           "C1 lote con proveedor"
chk views/inventarios/entradas.ejs      "proveedor_id"             "C1 select en entradas"
chk views/inventarios/proveedores.ejs   "Nuevo proveedor"          "C1 vista catalogo"
chk routes/reporteRoutes.js             "sugerido-compra"          "C8 ruta"
chk services/reportesService.js         "sugeridoCompra"           "C8 servicio"
chk views/reportes/sugerido_compra.ejs  "Sugerido de Compra"       "C8 vista"
echo ""
echo "-- Humo de Node (si node disponible) --"
if command -v node >/dev/null 2>&1; then
  if node -e "['./routes/reservaRoutes.js','./routes/cuentaRoutes.js','./routes/proveedorRoutes.js','./services/cuentaService.js','./services/reservaService.js','./services/proveedorService.js','./services/compraService.js'].forEach(f=>require(f));console.log('  OK     requires Fase 2 cargan sin errores')" 2>/dev/null; then
    OK=$((OK+1))
  else
    echo "  FALTA  requires Fase 2 (algun modulo no carga)"; KO=$((KO+1))
  fi
else
  echo "  (node no disponible en PATH, se omite)"
fi
echo ""
echo "============================================================"
if [ "$KO" -eq 0 ]; then
  echo "  $OK comprobaciones OK. Fase 2 desplegada correctamente."
  echo "  Siguiente paso: aplicar las 3 migraciones (GUIA-DESPLIEGUE"
  echo "  en parche/) si aun no se aplicaron, reiniciar y abrir /salud."
  exit 0
else
  echo "  $KO comprobaciones FALLAN de $((OK+KO)). Revise el despliegue:"
  echo "  1) Descomprimio los 3 zips (V11, V12, V13) en la RAIZ?"
  echo "  2) El zip V13 trae el app.js bueno (montajes V12+V13)."
  echo "  3) Reinicie la app tras copiar (pm2 restart) y reintente."
  exit 1
fi
