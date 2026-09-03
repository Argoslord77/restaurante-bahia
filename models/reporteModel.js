const db = require('../config/db');

// Expresión de costo de un movimiento: usa el costo ASENTADO en el
// movimiento (los descuentos por venta lo graban desde el lote afectado).
// El costo del lote queda como fallback para movimientos históricos que
// nacieron sin costo. Mismo criterio que kardexService e
// inventarioService.movimientosPorTurno.
const COSTO_MOVIMIENTO = `COALESCE(NULLIF(mi.costo_total, 0), mi.cantidad * l.costo_unitario, 0)`;

// Tipos de movimiento que nacen de una venta cobrada (POS / receta).
const TIPOS_VENTA_SQL = `('VENTA', 'CONSUMO_RECETA')`;

// El kardex registra el consumo por COMANDA (pedido), no por platillo:
// referencia_tipo se ha escrito en ambos casos ('pedido' desde
// inventarioService y 'PEDIDO' desde recetaService).
const REFERENCIA_PEDIDO_SQL = `mi.referencia_tipo IN ('pedido', 'PEDIDO')`;

const ReporteModel = {
  // ── Reporte histórico POS vs kardex (explosión de recetas) ──────────────
  async getReporteKardexPos(turnoId) {
    const query = `
      SELECT 
        CONCAT('Turno #', ts.id, ' · ', COALESCE(ua.nombre, 'N/D'), ' · ',
                DATE_FORMAT(ts.fecha_apertura, '%d/%m %H:%i')) AS turno,
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
      LEFT JOIN usuarios ua ON ts.usuario_apertura_id = ua.id
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
  },

  // ── Ventas y movimiento de inventario del turno ─────────────────────────
  //
  // Notas de criterio (compartidas por todas las consultas de esta sección):
  //  · "Vendido" = líneas no canceladas de cuentas ya cobradas del turno
  //    (pagado, facturado o cortesía). Lo pendiente de pago aún no es venta.
  //  · Los platillos del día (platillos_dia) se venden sin receta y viven en
  //    otra tabla con IDs que pueden colisionar con platillos_menu: siempre
  //    se distingue por dp.es_platillo_dia.
  //  · El consumo real se toma del kardex (movimientos_inventario) por
  //    referencia a la comanda, aceptando los dos tipos y los dos casos
  //    que ha escrito el sistema ('VENTA'/'pedido' y 'CONSUMO_RECETA'/'PEDIDO').

  /** Turnos recientes para el selector (etiquetados con quien abrió). */
  async getTurnosRecientes(limite = 30) {
    const [rows] = await db.query(`
        SELECT ts.id, ts.fecha_apertura, ts.fecha_cierre, ts.estado,
               COALESCE(CONCAT(ua.nombre, ' ', ua.apellidos), 'N/D') AS nombre
        FROM turnos_servicio ts
        LEFT JOIN usuarios ua ON ts.usuario_apertura_id = ua.id
        ORDER BY ts.id DESC
        LIMIT ?
    `, [Number(limite) || 30]);
    return rows;
  },

  /** Tragos y platillos vendidos del turno, agregados por platillo. */
  async getVentasTurno(turnoId) {
    const [rows] = await db.query(`
        SELECT dp.id_platillo, dp.es_platillo_dia,
               COALESCE(pm.nombre, pd.nombre, 'Platillo eliminado') AS nombre,
               CASE WHEN dp.es_platillo_dia = 1
                    THEN COALESCE(pd.tipo, 'COMESTIBLES')
                    ELSE COALESCE(cp.tipo, 'COMESTIBLES') END AS tipo,
               cp.nombre AS categoria,
               COUNT(DISTINCT p.id) AS cuentas,
               SUM(dp.cantidad) AS unidades,
               SUM(dp.cantidad * dp.precio_unitario) AS venta
        FROM pedidos p
        INNER JOIN detalles_pedido dp ON dp.id_pedido = p.id
        LEFT JOIN platillos_menu pm
            ON (dp.es_platillo_dia = 0 OR dp.es_platillo_dia IS NULL) AND pm.id = dp.id_platillo
        LEFT JOIN platillos_dia pd ON dp.es_platillo_dia = 1 AND pd.id = dp.id_platillo
        LEFT JOIN categorias_platillos cp ON cp.id = pm.categoria
        WHERE p.estado_pago IN ('pagado', 'facturado', 'cortesia')
          AND dp.estado_item != 'cancelado'
          ${turnoId ? 'AND p.turno_servicio_id = ?' : ''}
        GROUP BY dp.id_platillo, dp.es_platillo_dia,
                 COALESCE(pm.nombre, pd.nombre, 'Platillo eliminado'),
                 CASE WHEN dp.es_platillo_dia = 1
                      THEN COALESCE(pd.tipo, 'COMESTIBLES')
                      ELSE COALESCE(cp.tipo, 'COMESTIBLES') END,
                 cp.nombre
        ORDER BY venta DESC, unidades DESC
    `, turnoId ? [turnoId] : []);
    return rows;
  },

  /** Par (comanda, platillo) del turno: atribuye consumo real a cada platillo. */
  async getPlatillosPorPedido(turnoId) {
    const [rows] = await db.query(`
        SELECT p.id AS pedido_id, dp.id_platillo, dp.es_platillo_dia, dp.cantidad
        FROM pedidos p
        INNER JOIN detalles_pedido dp ON dp.id_pedido = p.id
        WHERE p.estado_pago IN ('pagado', 'facturado', 'cortesia')
          AND dp.estado_item != 'cancelado'
          ${turnoId ? 'AND p.turno_servicio_id = ?' : ''}
    `, turnoId ? [turnoId] : []);
    return rows;
  },

  /** Cuentas cobradas del turno con su venta (para la tabla de comandas). */
  async getCuentasTurno(turnoId) {
    const [rows] = await db.query(`
        SELECT p.id, m.numero AS mesa,
               COALESCE(CONCAT(u.nombre, ' ', u.apellidos), 'N/D') AS mesero,
               p.estado_pago, p.creado_en, p.fecha_cierre, p.total,
               COUNT(dp.id) AS lineas,
               COALESCE(SUM(dp.cantidad), 0) AS unidades,
               COALESCE(SUM(dp.cantidad * dp.precio_unitario), 0) AS venta
        FROM pedidos p
        INNER JOIN mesas m ON m.id = p.id_mesa
        LEFT JOIN usuarios u ON u.id = p.id_usuario_mesero
        LEFT JOIN detalles_pedido dp ON dp.id_pedido = p.id AND dp.estado_item != 'cancelado'
        WHERE p.estado_pago IN ('pagado', 'facturado', 'cortesia')
          ${turnoId ? 'AND p.turno_servicio_id = ?' : ''}
        GROUP BY p.id, m.numero, COALESCE(CONCAT(u.nombre, ' ', u.apellidos), 'N/D'),
                 p.estado_pago, p.creado_en, p.fecha_cierre, p.total
        ORDER BY p.id DESC
    `, turnoId ? [turnoId] : []);
    return rows;
  },

  /**
   * Consumo TEÓRICO por (platillo, insumo) según la receta activa de venta.
   * Usa la MISMA fórmula del motor de descuento (inventarioService:
   * cantidad / (1 - merma/100), cantidad bruta) para que el teórico sea
   * comparable contra el kardex.
   */
  async getTeoricoPorPlatillo(turnoId) {
    const [rows] = await db.query(`
        SELECT dp.id_platillo, dp.es_platillo_dia,
               prod.id AS insumo_id, prod.codigo AS codigo_insumo,
               prod.nombre AS insumo,
               COALESCE(um.abreviatura, um.nombre, '') AS unidad,
               rd.cantidad AS cantidad_unitaria,
               rd.porcentaje_merma,
               rd.costo_estimado,
               SUM(dp.cantidad) AS unidades_vendidas,
               SUM(dp.cantidad * rd.cantidad
                   / (CASE WHEN rd.porcentaje_merma > 0 AND rd.porcentaje_merma < 100
                           THEN (1 - (rd.porcentaje_merma / 100)) ELSE 1 END)) AS consumo_teorico,
               SUM(dp.cantidad * rd.cantidad
                   / (CASE WHEN rd.porcentaje_merma > 0 AND rd.porcentaje_merma < 100
                           THEN (1 - (rd.porcentaje_merma / 100)) ELSE 1 END) * rd.costo_estimado) AS costo_teorico
        FROM pedidos p
        INNER JOIN detalles_pedido dp ON dp.id_pedido = p.id
        INNER JOIN recetas r ON r.activa = 1 AND r.tipo = 'VENTA'
            AND (dp.es_platillo_dia = 0 OR dp.es_platillo_dia IS NULL)
            AND r.platillo_id = dp.id_platillo
        INNER JOIN receta_detalles rd ON rd.receta_id = r.id
        INNER JOIN productos prod ON prod.id = rd.producto_id
        LEFT JOIN unidades_medida um ON um.id = prod.unidad_inventario_id
        WHERE p.estado_pago IN ('pagado', 'facturado', 'cortesia')
          AND dp.estado_item != 'cancelado'
          AND (dp.afecta_inventario = 1 OR dp.afecta_inventario IS NULL)
          ${turnoId ? 'AND p.turno_servicio_id = ?' : ''}
        GROUP BY dp.id_platillo, dp.es_platillo_dia, prod.id, prod.codigo, prod.nombre,
                 COALESCE(um.abreviatura, um.nombre, ''), rd.cantidad, rd.porcentaje_merma, rd.costo_estimado
    `, turnoId ? [turnoId] : []);
    return rows;
  },

  /**
   * Consumo REAL registrado en el kardex por (comanda, insumo) para los
   * pedidos del turno: los movimientos que nacieron al cobrar cada cuenta.
   */
  async getRealPorPedido(turnoId) {
    const filtroTurno = turnoId
        ? `AND mi.referencia_id IN (SELECT id FROM pedidos WHERE turno_servicio_id = ?)`
        : '';
    const [rows] = await db.query(`
        SELECT mi.referencia_id AS pedido_id, mi.producto_id AS insumo_id,
               prod.codigo AS codigo_insumo, prod.nombre AS insumo,
               COALESCE(MAX(um.abreviatura), MAX(um.nombre), '') AS unidad,
               COUNT(*) AS movimientos,
               SUM(mi.cantidad) AS consumo_real,
               SUM(${COSTO_MOVIMIENTO}) AS costo_real
        FROM movimientos_inventario mi
        INNER JOIN productos prod ON prod.id = mi.producto_id
        LEFT JOIN unidades_medida um ON um.id = prod.unidad_inventario_id
        LEFT JOIN lotes l ON l.id = mi.lote_id
        WHERE mi.tipo_movimiento IN ${TIPOS_VENTA_SQL}
          AND ${REFERENCIA_PEDIDO_SQL}
          ${filtroTurno}
        GROUP BY mi.referencia_id, mi.producto_id, prod.codigo, prod.nombre
    `, turnoId ? [turnoId] : []);
    return rows;
  },

  /**
   * Resumen de kardex por comanda: cuántos movimientos de venta generó el
   * cobro de cada cuenta y a cuánto ascendió el costo descontado.
   */
  async getMovimientosPorCuenta(turnoId) {
    const filtroTurno = turnoId
        ? `AND mi.referencia_id IN (SELECT id FROM pedidos WHERE turno_servicio_id = ?)`
        : '';
    const [rows] = await db.query(`
        SELECT mi.referencia_id AS pedido_id,
               COUNT(*) AS movimientos,
               COUNT(DISTINCT mi.producto_id) AS insumos,
               SUM(mi.cantidad) AS cantidad_descontada,
               SUM(${COSTO_MOVIMIENTO}) AS costo_descontado
        FROM movimientos_inventario mi
        LEFT JOIN lotes l ON l.id = mi.lote_id
        WHERE mi.tipo_movimiento IN ${TIPOS_VENTA_SQL}
          AND ${REFERENCIA_PEDIDO_SQL}
          ${filtroTurno}
        GROUP BY mi.referencia_id
    `, turnoId ? [turnoId] : []);
    return rows;
  },

  /** Filas de kardex (movimientos de venta) de una lista de comandas. */
  async getMovimientosDeCuentas(pedidosIds) {
    if (!Array.isArray(pedidosIds) || pedidosIds.length === 0) return [];
    const [rows] = await db.query(`
        SELECT mi.id, mi.fecha_movimiento, mi.tipo_movimiento, mi.cantidad,
               mi.costo_unitario, mi.costo_total, mi.stock_anterior, mi.stock_nuevo,
               mi.documento_numero, mi.observaciones,
               mi.referencia_id AS pedido_id,
               prod.id AS insumo_id, prod.codigo AS codigo_insumo, prod.nombre AS insumo,
               COALESCE(um.abreviatura, um.nombre, '') AS unidad,
               COALESCE(a.nombre, 'N/D') AS almacen,
               l.numero_lote
        FROM movimientos_inventario mi
        INNER JOIN productos prod ON prod.id = mi.producto_id
        LEFT JOIN unidades_medida um ON um.id = prod.unidad_inventario_id
        LEFT JOIN almacenes a ON a.id = mi.almacen_id
        LEFT JOIN lotes l ON l.id = mi.lote_id
        WHERE mi.tipo_movimiento IN ${TIPOS_VENTA_SQL}
          AND ${REFERENCIA_PEDIDO_SQL}
          AND mi.referencia_id IN (?)
        ORDER BY mi.referencia_id DESC, mi.fecha_movimiento ASC, mi.id ASC
    `, [pedidosIds]);
    return rows;
  },

  /** Ficha del platillo vendido (de carta o del día). */
  async getPlatilloInfo(platilloId, esDia = 0) {
    if (Number(esDia) === 1) {
      const [rows] = await db.query(`
          SELECT pd.id, pd.nombre, pd.precio, pd.tipo, pd.foto,
                 'Platillo del día' AS categoria, 1 AS es_platillo_dia
          FROM platillos_dia pd WHERE pd.id = ?
      `, [platilloId]);
      return rows[0] || null;
    }
    const [rows] = await db.query(`
        SELECT pm.id, pm.nombre, pm.precio, pm.foto,
               COALESCE(cp.nombre, 'Sin categoría') AS categoria,
               COALESCE(cp.tipo, 'COMESTIBLES') AS tipo, 0 AS es_platillo_dia
        FROM platillos_menu pm
        LEFT JOIN categorias_platillos cp ON cp.id = pm.categoria
        WHERE pm.id = ?
    `, [platilloId]);
    return rows[0] || null;
  },

  /** Líneas de venta de UN platillo dentro del turno (por comanda). */
  async getVentasPlatillo(turnoId, platilloId, esDia = 0) {
    const [rows] = await db.query(`
        SELECT p.id AS pedido_id, m.numero AS mesa,
               COALESCE(CONCAT(u.nombre, ' ', u.apellidos), 'N/D') AS mesero,
               dp.cantidad, dp.precio_unitario,
               (dp.cantidad * dp.precio_unitario) AS importe,
               dp.estado_item, dp.notas_especiales,
               p.estado_pago, p.creado_en, p.fecha_cierre
        FROM pedidos p
        INNER JOIN detalles_pedido dp ON dp.id_pedido = p.id
            AND dp.id_platillo = ? AND dp.es_platillo_dia = ?
        INNER JOIN mesas m ON m.id = p.id_mesa
        LEFT JOIN usuarios u ON u.id = p.id_usuario_mesero
        WHERE p.estado_pago IN ('pagado', 'facturado', 'cortesia')
          AND dp.estado_item != 'cancelado'
          ${turnoId ? 'AND p.turno_servicio_id = ?' : ''}
        ORDER BY p.id DESC
    `, turnoId ? [platilloId, Number(esDia) === 1 ? 1 : 0, turnoId] : [platilloId, Number(esDia) === 1 ? 1 : 0]);
    return rows;
  },

  /** Receta activa de venta del platillo (consumo unitario teórico). */
  async getRecetaPlatillo(platilloId) {
    const [rows] = await db.query(`
        SELECT prod.id AS insumo_id, prod.codigo AS codigo_insumo, prod.nombre AS insumo,
               COALESCE(um.abreviatura, um.nombre, '') AS unidad,
               rd.cantidad AS cantidad_unitaria, rd.porcentaje_merma, rd.costo_estimado
        FROM recetas r
        INNER JOIN receta_detalles rd ON rd.receta_id = r.id
        INNER JOIN productos prod ON prod.id = rd.producto_id
        LEFT JOIN unidades_medida um ON um.id = prod.unidad_inventario_id
        WHERE r.activa = 1 AND r.tipo = 'VENTA' AND r.platillo_id = ?
        ORDER BY rd.orden_preparacion ASC, prod.nombre ASC
    `, [platilloId]);
    return rows;
  }
};

module.exports = ReporteModel;
