#!/bin/bash
# ============================================================
# verificar_despliegue.sh - Restaurante Bahia (28-08-2026)
# Verifica que los ficheros del fix esten presentes y
# actualizados en la instalacion. Ejecutar en la raiz del repo:
#     bash scripts/verificar_despliegue.sh
# ============================================================
cd "$(dirname "$0")/.." 2>/dev/null || { echo "Ejecutame desde el repo: bash scripts/verificar_despliegue.sh"; exit 1; }

OK=0; KO=0
chk() {
  if grep -q "$2" "$1" 2>/dev/null; then
    printf "  OK     %-45s (%s)\n" "$1" "$3"; OK=$((OK+1))
  else
    printf "  FALTA  %-45s (%s)\n" "$1" "$3"; KO=$((KO+1))
  fi
}

echo "============================================================"
echo " Verificacion de despliegue - Fix POS 28-08-2026"
echo "============================================================"
echo ""
echo "-- Bug 3: ticket de orden en solitario (Cierre del Dia) --"
chk routes/cierreDiaRoutes.js            "ticket-pedido/:id_pedido" "ruta GET /admin/cierre-dia/ticket-pedido/:id"
chk controllers/cierreDiaController.js   "viewTicketPedido"         "controlador del ticket"
chk views/caja/ticket_pedido.ejs         "TICKET DE CONSUMO"        "vista nueva del ticket"
chk views/caja/cierre_dia.ejs            "ticket-pedido/"           "link Imprimir Ticket actualizado"
echo ""
echo "-- Bug 2: propina en cobro POS / Caja / Cierre --"
chk views/pos.ejs                        "swal-propina"             "campo Propina (\$) en el modal de cobro"
chk controllers/posController.js         "propina = ?"              "cobro guarda pedidos.propina"
chk models/turnoModel.js                 "total_propinas"           "propinas en historial de turnos"
chk views/caja/turnos.ejs                "data-propinas"            "propinas en la vista de Caja"
echo ""
echo "-- Bug 1: monedas duplicadas en el cobro --"
chk services/turnoService.js             "id_max"                   "dedup de monedas del turno"
chk models/turnoModel.js                 "DELETE FROM monedas_turno WHERE turno_servicio_id" "snapshot sin duplicados al abrir turno"
chk scripts/migracion_dedup_monedas_turno.sql "monedas_turno"       "migracion de duplicados existentes"
echo ""
echo "-- Fixes del servicio directo (paquete anterior) --"
chk controllers/dashboardDependienteController.js "estado_pedido != 'cancelado'" "dashboard: mesa entregada visible"
chk views/pos.ejs                        "JSON.parse(items)"       "POS: orden muestra su importe al recargar"
chk routes/authRoutes.js                 "resetKey"                 "rate-limiter de login"
echo ""
echo "-- Actualizacion 04-09-2026: Pedidos/Ventas + tiempos por item --"
chk services/ventasService.js              "listarVentas"                 "servicio del registro de pedidos y ventas"
chk services/itemTiemposService.js         "sellarItem"                   "sello de tiempo del ciclo de vida del item"
chk controllers/pedidoController.js        "ventasService"                "controlador enchufado al servicio nuevo"
chk routes/pedidoRoutes.js                 "pedidos/exportar"             "ruta de exportacion a CSV"
chk views/pedido/pedido.ejs                "fila-detalle"                 "vista con desglose de items por orden"
chk views/cliente/dashboard.ejs            "numero_mesa"                  "menu del cliente muestra el numero real de mesa"
chk controllers/monitorController.js       "ItemTiempos.sellarItem"       "monitor de cocina/bar registra quien preparo"
chk models/pedidoModel.js                  "ItemTiempos.sellarItem"       "modelo de pedido sella las transiciones"
chk scripts/migracion_tiempos_detalles_pedido.sql "entregado_en"          "MIGRACION de tiempos (hay que ejecutarla)"
echo ""
echo "============================================================"
if [ "$KO" -eq 0 ]; then
  echo "  Los $OK ficheros contienen el fix. El codigo esta OK."
  echo ""
  echo "  Si AUN ves 'Cannot GET /admin/cierre-dia/ticket-pedido/..' :"
  echo "  ==> la app sigue corriendo el codigo ANTERIOR. REINICIA:"
  echo "        pm2 restart all        (o: pm2 restart <nombre>)"
  echo "        # o como la ejecutes: kill del node viejo y arrancar de nuevo"
  echo ""
  echo "  Y para la propina: la tarjeta solo suma propinas de cobros"
  echo "  hechos CON el campo 'Propina (\$)' del modal (código nuevo)."
  echo "  Verifica que el modal de cobro ya tenga ese campo."
else
  echo "  $K fichero(s) NO tienen el fix: copialos de nuevo desde el"
  echo "  paquete (carpeta 'actualizados/', respetando rutas), luego:"
  echo "        pm2 restart all"
  echo ""
  echo "  Tambien ejecuta las migraciones si no las has corrido:"
  echo "        mysql -u<usuario> -p restaurante_db < scripts/migracion_dedup_monedas_turno.sql"
  echo "        mysql -u<usuario> -p restaurante_db < scripts/migracion_tiempos_detalles_pedido.sql"
fi
echo "============================================================"
