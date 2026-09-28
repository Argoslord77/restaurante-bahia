#!/bin/bash
# ============================================================
# verificar_v14.sh - Restaurante Bahia (V14: puerta de apertura,
# calendario de reservas, pulido POS movil y monitores, Zelle r2)
# Comprueba que el codigo de la V14 este desplegado en la
# instalacion. Ejecutar en la raiz del proyecto:
#     bash scripts/verificar_v14.sh
# Codigo de salida 0 = todo OK; 1 = falta algo.
# ============================================================
cd "$(dirname "$0")/.." 2>/dev/null || { echo "Ejecutame desde el repo: bash scripts/verificar_v14.sh"; exit 1; }

OK=0; KO=0
chk() {
  if grep -q "$2" "$1" 2>/dev/null; then
    printf "  OK     %-42s (%s)\n" "$1" "$3"; OK=$((OK+1))
  else
    printf "  FALTA  %-42s (%s)\n" "$1" "$3"; KO=$((KO+1))
  fi
}
sintaxis() {
  if node --check "$1" 2>/dev/null; then
    printf "  OK     %-42s (sintaxis JS)\n" "$1"; OK=$((OK+1))
  else
    printf "  FALTA  %-42s (sintaxis JS)\n" "$1"; KO=$((KO+1))
  fi
}

echo "============================================================"
echo " Verificacion V14 (apertura + calendario + POS/monitor + Zelle)"
echo "============================================================"
echo ""
echo "-- Puerta de apertura (distribucion + reservadas) --"
chk services/aperturaMesaService.js         "SIN_DISTRIBUCION"   "servicio nuevo"
chk controllers/posController.js            "autorizarApertura"    "4 caminos POS"
chk services/pedidoService.js               "autorizarApertura"    "crearNuevoPedido"
chk services/reservaService.js              "hayDistribucion"      "llegada exige reparto"
chk views/dependiente/dashboard.ejs         "reserva_pendiente"    "tarjeta reservada"
echo ""
echo "-- Calendario de reservas --"
chk services/reservaService.js              "listarRango"          "rango semana/mes/dia"
chk routes/reservaRoutes.js                 "reservas/rango"       "endpoint JSON"
chk controllers/reservaController.js        "listarRango"          "controlador"
chk views/admin/reservas.ejs                "calCuerpo"            "vista calendario"
echo ""
echo "-- Pulido POS movil y monitores --"
chk views/pos.ejs                           "cart-item-nombre"     "ficha en pares"
chk views/monitor.ejs                       "sla-badge-alert"      "alerta legible"
echo ""
echo "-- Carta Zelle rev.2 (aplicar con mysql, ver LEEME-V14) --"
chk scripts/actualizar_precios_zelle_carta.sql "WHERE NOT EXISTS" "INSERTs protegidos"
echo ""
echo "-- Sintaxis JS (node --check, sin dependencias) --"
if command -v node >/dev/null 2>&1; then
  sintaxis services/aperturaMesaService.js
  sintaxis services/reservaService.js
  sintaxis services/pedidoService.js
  sintaxis controllers/posController.js
  sintaxis controllers/reservaController.js
  sintaxis controllers/dashboardDependienteController.js
  sintaxis routes/reservaRoutes.js
else
  echo "  (node no disponible en PATH, se omite)"
fi
echo ""
echo "============================================================"
if [ "$KO" -eq 0 ]; then
  echo "  $OK comprobaciones OK. V14 desplegada correctamente."
  echo "  Recuerde: copiar el SQL Zelle NO lo aplica; ejecútelo en"
  echo "  MySQL (LEEME-ACTUALIZACION-V14.txt paso 3) si aún no lo hizo."
  exit 0
else
  echo "  $KO comprobaciones FALLAN de $((OK+KO)). Revise el despliegue:"
  echo "  1) Descomprimió el zip V14 en la RAIZ del proyecto?"
  echo "  2) NO descomprima el acumulado Fase2 ENCIMA de la V14:"
  echo "     trae 6 archivos viejos (con los errores ya corregidos)."
  echo "     Si lo hizo, re-aplique el zip V14 y reinicie."
  echo "  3) Reinicie la app tras copiar (pm2 restart) y reintente."
  exit 1
fi
