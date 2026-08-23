const db = require('../config/db');

const ReporteModel = {
  async getReporteKardexPos(turnoId) {
    const query = `
      SELECT 
        ts.nombre AS turno,
        p.id AS numero_pedido,
        m.numero AS mesa,
        pm.nombre AS platillo_vendido,
        dp.cantidad AS cantidad_platillos_vendidos,
        prod.codigo AS codigo_insumo,
        prod.nombre AS insumo_descontado,
        um.nombre AS unidad_medida,
        rd.cantidad AS consumo_base_unitario,
        rd.porcentaje_merma AS merma_operativa_pct,
        ROUND((rd.cantidad * dp.cantidad) * (1 + (rd.porcentaje_merma / 100)), 4) AS consumo_total_teorico,
        IFNULL((
            SELECT SUM(mi.cantidad) FROM movimientos_inventario mi 
            WHERE mi.referencia_tipo = 'PEDIDO' AND mi.referencia_id = p.id 
              AND mi.producto_id = prod.id AND mi.tipo_movimiento = 'CONSUMO_RECETA'
        ), 0.0000) AS consumo_real_kardex,
        ROUND(((rd.cantidad * dp.cantidad) * (1 + (rd.porcentaje_merma / 100))) * rd.costo_estimado, 2) AS costo_total_insumo
      FROM turnos_servicio ts
      INNER JOIN pedidos p ON ts.id = p.turno_servicio_id
      INNER JOIN mesas m ON p.id_mesa = m.id
      INNER JOIN detalles_pedido dp ON p.id = dp.id_pedido
      INNER JOIN platillos_menu pm ON dp.id_platillo = pm.id
      INNER JOIN recetas r ON pm.id = r.platillo_id AND r.activa = 1 AND r.tipo = 'VENTA'
      INNER JOIN receta_detalles rd ON r.id = rd.receta_id
      INNER JOIN productos prod ON rd.producto_id = prod.id
      INNER JOIN unidades_medida um ON prod.unidad_consumo_id = um.id
      WHERE p.estado_pago IN ('pagado', 'cortesia')
        AND dp.estado_item != 'cancelado' AND dp.afecta_inventario = 1
        ${turnoId ? 'AND ts.id = ?' : ''}
      ORDER BY p.id DESC, pm.nombre ASC, prod.nombre ASC;
    `;
    const params = turnoId ? [turnoId] : [];
    const [rows] = await db.query(query, params);
    return rows;
  }
};

module.exports = ReporteModel;