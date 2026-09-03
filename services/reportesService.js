// services/reportesService.js
// Reportes de control físico y financiero del negocio:
//  · saludInventario(): alertas de stock (bajo mínimo), lotes vencidos o por
//    vencer y capital detenido en productos sin rotación.
//  · margenPorPlatillo(): ventas reales del período vs costo estándar de
//    cada platillo (ficha de costo / receta), margen contribuido y food
//    cost real ponderado.
//  · ventasPorMesero(): desempeño del personal de salón por período
//    (cuentas cobradas, ventas, ticket promedio, propinas y cortesías).
// Incluye los generadores de CSV (separador ';' + BOM UTF-8) para que el
// contador siga trabajando en Excel.
'use strict';

const db = require('../config/db');
const Costeo = require('./costeoService');
const ReporteModel = require('../models/reporteModel');
const InventarioService = require('./inventarioService');
const { TIPOS_ENTRADA, TIPOS_SALIDA, ETIQUETAS_MOVIMIENTO } = require('./kardexService');

/** Signo de un tipo de movimiento: +1 entrada, -1 salida, 0 informativo. */
const signoMovimiento = (tipo) => {
    if (TIPOS_ENTRADA.includes(tipo)) return 1;
    if (TIPOS_SALIDA.includes(tipo)) return -1;
    return 0;
};

const num = (v, dec = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? Number(n.toFixed(dec)) : 0;
};

/**
 * Radiografía del inventario para el control físico. Cuatro secciones:
 * bajo mínimo, lotes vencidos, lotes por vencer (7 días) y productos sin
 * movimiento en 30 días con existencia (capital detenido).
 */
async function saludInventario() {
    // 1) Productos en o por debajo del mínimo
    const [bajoMinimo] = await db.query(`
        SELECT p.id, p.codigo, p.nombre, p.stock_minimo,
               MAX(um.abreviatura) AS unidad,
               COALESCE(SUM(l.cantidad_actual), 0) AS stock_actual,
               GREATEST(p.stock_minimo - COALESCE(SUM(l.cantidad_actual), 0), 0) AS faltante,
               COALESCE(p.costo_promedio, 0) AS costo_promedio,
               GREATEST(p.stock_minimo - COALESCE(SUM(l.cantidad_actual), 0), 0)
                   * COALESCE(p.costo_promedio, 0) AS costo_reposicion
        FROM productos p
        LEFT JOIN unidades_medida um ON um.id = p.unidad_inventario_id
        LEFT JOIN lotes l ON l.producto_id = p.id AND l.cantidad_actual > 0
        WHERE p.activo = 1 AND p.stock_minimo > 0
        GROUP BY p.id, p.codigo, p.nombre, p.stock_minimo, p.costo_promedio
        HAVING stock_actual <= p.stock_minimo
        ORDER BY costo_reposicion DESC, faltante DESC
        LIMIT 100
    `);

    // 2) Lotes vencidos con existencia (pérdida financiera consumada)
    const [vencidos] = await db.query(`
        SELECT l.id, l.numero_lote, l.cantidad_actual, l.costo_unitario,
               l.fecha_vencimiento, p.id AS producto_id, p.codigo, p.nombre AS producto,
               MAX(a.nombre) AS almacen,
               (l.cantidad_actual * l.costo_unitario) AS valor_perdido
        FROM lotes l
        INNER JOIN productos p ON p.id = l.producto_id
        LEFT JOIN almacenes a ON a.id = l.almacen_id
        WHERE l.cantidad_actual > 0
          AND l.fecha_vencimiento IS NOT NULL
          AND l.fecha_vencimiento < CURDATE()
        GROUP BY l.id, l.numero_lote, l.cantidad_actual, l.costo_unitario,
                 l.fecha_vencimiento, p.id, p.codigo, p.nombre
        ORDER BY valor_perdido DESC
        LIMIT 100
    `);

    // 3) Lotes que vencen en los próximos 7 días (valor en riesgo)
    const [porVencer] = await db.query(`
        SELECT l.id, l.numero_lote, l.cantidad_actual, l.costo_unitario,
               l.fecha_vencimiento, p.id AS producto_id, p.codigo, p.nombre AS producto,
               MAX(a.nombre) AS almacen,
               DATEDIFF(l.fecha_vencimiento, CURDATE()) AS dias_restantes,
               (l.cantidad_actual * l.costo_unitario) AS valor_riesgo
        FROM lotes l
        INNER JOIN productos p ON p.id = l.producto_id
        LEFT JOIN almacenes a ON a.id = l.almacen_id
        WHERE l.cantidad_actual > 0
          AND l.fecha_vencimiento IS NOT NULL
          AND l.fecha_vencimiento >= CURDATE()
          AND l.fecha_vencimiento < DATE_ADD(CURDATE(), INTERVAL 8 DAY)
        GROUP BY l.id, l.numero_lote, l.cantidad_actual, l.costo_unitario,
                 l.fecha_vencimiento, p.id, p.codigo, p.nombre
        ORDER BY fecha_vencimiento ASC, valor_riesgo DESC
        LIMIT 100
    `);

    // 4) Capital detenido: existencia sin movimiento en los últimos 30 días
    const [sinMovimiento] = await db.query(`
        SELECT p.id, p.codigo, p.nombre,
               MAX(um.abreviatura) AS unidad,
               COALESCE(SUM(l.cantidad_actual), 0) AS stock_actual,
               COALESCE(SUM(l.cantidad_actual * l.costo_unitario), 0) AS valor_detenido
        FROM productos p
        LEFT JOIN unidades_medida um ON um.id = p.unidad_inventario_id
        INNER JOIN lotes l ON l.producto_id = p.id AND l.cantidad_actual > 0
        WHERE p.activo = 1
          AND NOT EXISTS (
              SELECT 1 FROM movimientos_inventario mi
              WHERE mi.producto_id = p.id
                AND mi.fecha_movimiento >= DATE_SUB(NOW(), INTERVAL 30 DAY)
          )
        GROUP BY p.id, p.codigo, p.nombre
        ORDER BY valor_detenido DESC
        LIMIT 100
    `);

    return {
        bajoMinimo: bajoMinimo.map(f => ({
            ...f,
            stock_actual: num(f.stock_actual, 3),
            stock_minimo: num(f.stock_minimo, 3),
            faltante: num(f.faltante, 3),
            costo_promedio: num(f.costo_promedio, 4),
            costo_reposicion: num(f.costo_reposicion, 2)
        })),
        vencidos: vencidos.map(f => ({ ...f, valor_perdido: num(f.valor_perdido, 2) })),
        porVencer: porVencer.map(f => ({
            ...f,
            valor_riesgo: num(f.valor_riesgo, 2),
            cantidad_actual: num(f.cantidad_actual, 3),
            dias_restantes: num(f.dias_restantes)
        })),
        sinMovimiento: sinMovimiento.map(f => ({
            ...f,
            stock_actual: num(f.stock_actual, 3),
            valor_detenido: num(f.valor_detenido, 2)
        })),
        totales: {
            bajo_minimo: bajoMinimo.length,
            vencidos: vencidos.length,
            valor_perdido: num(vencidos.reduce((s, f) => s + Number(f.valor_perdido || 0), 0), 2),
            por_vencer: porVencer.length,
            valor_riesgo: num(porVencer.reduce((s, f) => s + Number(f.valor_riesgo || 0), 0), 2),
            sin_movimiento: sinMovimiento.length,
            valor_detenido: num(sinMovimiento.reduce((s, f) => s + Number(f.valor_detenido || 0), 0), 2),
            costo_reposicion: num(bajoMinimo.reduce((s, f) => s + Number(f.costo_reposicion || 0), 0), 2)
        }
    };
}

const FECHA_OK = /^\d{4}-\d{2}-\d{2}$/;

/** Normaliza el rango del reporte de margen (por defecto: últimos 30 días). */
function normalizarRango(query = {}) {
    const hoy = new Date();
    const iso = d => d.toISOString().slice(0, 10);
    const hace30 = new Date(hoy.getTime() - 30 * 24 * 60 * 60 * 1000);
    let desde = String(query.desde || '').trim();
    let hasta = String(query.hasta || '').trim();
    if (!FECHA_OK.test(desde)) desde = iso(hace30);
    if (!FECHA_OK.test(hasta)) hasta = iso(hoy);
    if (desde > hasta) [desde, hasta] = [hasta, desde];
    return { desde, hasta };
}

/**
 * Ventas reales del período vs costo estándar por platillo: unidades,
 * ingreso, costo, margen contribuido y food cost real. Los platillos sin
 * ficha técnica activa se listan aparte (ingreso sin costo atribuido).
 */
async function margenPorPlatillo(rango) {
    const { desde, hasta } = rango;

    // 1) Ventas cobradas del período agrupadas por platillo
    const [ventas] = await db.query(`
        SELECT dp.id_platillo, dp.es_platillo_dia,
               COALESCE(pm.nombre, pd.nombre, 'Platillo') AS nombre,
               SUM(dp.cantidad) AS unidades,
               SUM(dp.cantidad * dp.precio_unitario) AS ingreso
        FROM detalles_pedido dp
        INNER JOIN pedidos p ON p.id = dp.id_pedido
        LEFT JOIN platillos_menu pm
            ON dp.id_platillo = pm.id AND (dp.es_platillo_dia = 0 OR dp.es_platillo_dia IS NULL)
        LEFT JOIN platillos_dia pd ON dp.id_platillo = pd.id AND dp.es_platillo_dia = 1
        WHERE p.fecha_cierre IS NOT NULL
          AND p.estado_pago IN ('pagado', 'facturado', 'cortesia')
          AND dp.estado_item != 'cancelado'
          AND p.fecha_cierre >= ? AND p.fecha_cierre < DATE_ADD(?, INTERVAL 1 DAY)
        GROUP BY dp.id_platillo, dp.es_platillo_dia, COALESCE(pm.nombre, pd.nombre, 'Platillo')
        ORDER BY ingreso DESC
        LIMIT 200
    `, [desde, hasta]);

    if (!ventas.length) {
        return { desde, hasta, platillos: [], sinReceta: [], totales: null };
    }

    // 2) Costo estándar por platillo: receta activa de venta + fichas de costo
    const [recetas] = await db.query(`
        SELECT r.id AS receta_id, r.platillo_id, r.rendimiento
        FROM recetas r
        WHERE r.activa = 1 AND r.tipo = 'VENTA' AND r.platillo_id IS NOT NULL
    `);

    const costoPorPlatillo = new Map();
    if (recetas.length) {
        const [ingredientes] = await db.query(`
            SELECT rd.receta_id, rd.producto_id, rd.cantidad, rd.porcentaje_merma,
                   COALESCE(f.costo_final_unitario, p2.costo_promedio, 0) AS costo_unitario
            FROM receta_detalles rd
            INNER JOIN productos p2 ON p2.id = rd.producto_id
            LEFT JOIN fichas_costo_producto f ON f.producto_id = rd.producto_id AND f.vigente = 1
            WHERE rd.receta_id IN (?)
        `, [recetas.map(r => r.receta_id)]);

        const porReceta = new Map();
        for (const ing of ingredientes) {
            if (!porReceta.has(ing.receta_id)) porReceta.set(ing.receta_id, []);
            porReceta.get(ing.receta_id).push(ing);
        }
        for (const r of recetas) {
            const costo = Costeo.calcularCostoPlatillo(porReceta.get(r.receta_id) || [], {
                rendimiento: r.rendimiento
            });
            costoPorPlatillo.set(r.platillo_id, num(costo.costo_por_porcion, 4));
        }
    }

    // 3) Cruce ventas × costo estándar
    let totIngreso = 0, totCosto = 0, totUnidades = 0;
    const platillos = [], sinReceta = [];

    for (const v of ventas) {
        const ingreso = num(v.ingreso, 2);
        const unidades = num(v.unidades);
        totIngreso += ingreso;
        totUnidades += unidades;

        const costoUnitario = costoPorPlatillo.get(v.id_platillo);
        if (costoUnitario == null) {
            sinReceta.push({
                nombre: v.nombre,
                unidades,
                ingreso,
                motivo: 'Sin ficha técnica activa'
            });
            continue;
        }

        const costoTotal = num(costoUnitario * unidades, 2);
        const margen = num(ingreso - costoTotal, 2);
        const foodCost = ingreso > 0 ? num((costoTotal / ingreso) * 100, 1) : null;
        totCosto += costoTotal;

        platillos.push({
            nombre: v.nombre,
            unidades,
            ingreso,
            costo_unitario: num(costoUnitario, 4),
            costo_total: costoTotal,
            margen,
            margen_unitario: unidades > 0 ? num(margen / unidades, 2) : 0,
            food_cost: foodCost
        });
    }

    platillos.sort((a, b) => b.margen - a.margen);

    return {
        desde,
        hasta,
        platillos,
        sinReceta,
        totales: {
            unidades: num(totUnidades),
            ingreso: num(totIngreso, 2),
            costo: num(totCosto, 2),
            margen: num(totIngreso - totCosto, 2),
            food_cost: totIngreso > 0 ? num((totCosto / totIngreso) * 100, 1) : 0,
            platillos_sin_receta: sinReceta.length
        }
    };
}

/**
 * Desempeño del personal de salón en el período: cuentas cobradas,
 * ventas, ticket promedio, propinas, descuentos y cortesías por mesero.
 */
async function ventasPorMesero(rango) {
    const { desde, hasta } = rango;

    const [filas] = await db.query(`
        SELECT u.id,
               CONCAT(u.nombre, ' ', COALESCE(u.apellidos, '')) AS mesero,
               u.rol,
               COUNT(p.id) AS cuentas,
               SUM(CASE WHEN p.estado_pago = 'cortesia' THEN 1 ELSE 0 END) AS cortesias,
               COALESCE(SUM(p.total), 0) AS ventas,
               COALESCE(SUM(p.propina), 0) AS propinas,
               COALESCE(SUM(p.descuento), 0) AS descuentos,
               COALESCE(AVG(NULLIF(p.total, 0)), 0) AS ticket_promedio
        FROM usuarios u
        INNER JOIN pedidos p ON p.id_usuario_mesero = u.id
            AND p.fecha_cierre IS NOT NULL
            AND p.estado_pago IN ('pagado', 'facturado', 'cortesia')
            AND p.fecha_cierre >= ? AND p.fecha_cierre < DATE_ADD(?, INTERVAL 1 DAY)
        GROUP BY u.id, u.nombre, u.apellidos, u.rol
        ORDER BY ventas DESC, cuentas DESC
    `, [desde, hasta]);

    let totCuentas = 0, totCortesias = 0, totVentas = 0, totPropinas = 0, totDescuentos = 0;
    const meseros = filas.map(f => {
        const cuentas = num(f.cuentas);
        const cortesias = num(f.cortesias);
        const ventas = num(f.ventas, 2);
        const propinas = num(f.propinas, 2);
        const descuentos = num(f.descuentos, 2);
        totCuentas += cuentas; totCortesias += cortesias;
        totVentas += ventas; totPropinas += propinas; totDescuentos += descuentos;
        return {
            id: f.id,
            mesero: String(f.mesero || '').trim() || 'Mesero',
            rol: f.rol,
            cuentas,
            cortesias,
            ventas,
            propinas,
            descuentos,
            ticket_promedio: num(f.ticket_promedio, 2),
            ticket_promedio_real: cuentas > 0 ? num(ventas / cuentas, 2) : 0
        };
    });

    return {
        desde,
        hasta,
        meseros,
        totales: {
            meseros: meseros.length,
            cuentas: num(totCuentas),
            cortesias: num(totCortesias),
            ventas: num(totVentas, 2),
            propinas: num(totPropinas, 2),
            descuentos: num(totDescuentos, 2),
            ticket_promedio: totCuentas > 0 ? num(totVentas / totCuentas, 2) : 0
        }
    };
}

/**
 * Movimientos del período agrupados por insumo: cuánto entró, cuánto salió
 * y a qué se fue cada salida (venta, merma, ajuste...), con su valor.
 * Es la versión de rango libre del resumen que usa el cierre del día.
 */
async function consumoPorInsumo(filtros) {
    const { desde, hasta, almacen_id } = filtros;
    const cond = ['mi.fecha_movimiento >= ?', 'mi.fecha_movimiento < DATE_ADD(?, INTERVAL 1 DAY)'];
    const params = [desde, hasta];
    if (almacen_id) { cond.push('mi.almacen_id = ?'); params.push(almacen_id); }

    const [filas] = await db.query(`
        SELECT mi.producto_id, p.codigo, p.nombre,
               MAX(um.abreviatura) AS unidad,
               mi.tipo_movimiento,
               SUM(mi.cantidad) AS cantidad,
               SUM(COALESCE(NULLIF(mi.costo_total, 0), mi.cantidad * mi.costo_unitario, 0)) AS valor
        FROM movimientos_inventario mi
        INNER JOIN productos p ON p.id = mi.producto_id
        LEFT JOIN unidades_medida um ON um.id = p.unidad_inventario_id
        WHERE ${cond.join(' AND ')}
        GROUP BY mi.producto_id, p.codigo, p.nombre, mi.tipo_movimiento
        ORDER BY p.nombre ASC
    `, params);

    const porInsumo = new Map();
    for (const f of filas) {
        const signo = signoMovimiento(f.tipo_movimiento);
        if (signo === 0) continue; // conteos físicos: informativos
        const insumo = porInsumo.get(f.producto_id) || {
            id: f.producto_id, codigo: f.codigo, nombre: f.nombre, unidad: f.unidad || '',
            entradas_cantidad: 0, entradas_valor: 0,
            salidas_cantidad: 0, salidas_valor: 0,
            detalle_salidas: new Map()
        };
        const cantidad = Number(f.cantidad || 0);
        const valor = Number(f.valor || 0);
        if (signo > 0) {
            insumo.entradas_cantidad += cantidad;
            insumo.entradas_valor += valor;
        } else {
            insumo.salidas_cantidad += cantidad;
            insumo.salidas_valor += valor;
            const etiqueta = ETIQUETAS_MOVIMIENTO[f.tipo_movimiento] || f.tipo_movimiento;
            const previo = insumo.detalle_salidas.get(etiqueta) || { cantidad: 0, valor: 0 };
            previo.cantidad += cantidad;
            previo.valor += valor;
            insumo.detalle_salidas.set(etiqueta, previo);
        }
        porInsumo.set(f.producto_id, insumo);
    }

    // Stock vigente de cada insumo en TODOS los almacenes (logísticos y de
    // producción): suma de los lotes activos, independiente del filtro de
    // almacén aplicado a los movimientos del período.
    const stockPorProducto = new Map();
    if (porInsumo.size > 0) {
        const idsProductos = [...porInsumo.keys()];
        const [stockFilas] = await db.query(`
            SELECT l.producto_id,
                   COALESCE(a.nombre, 'Sin almacén') AS almacen,
                   a.categoria,
                   COALESCE(SUM(l.cantidad_actual), 0) AS cantidad
            FROM lotes l
            LEFT JOIN almacenes a ON a.id = l.almacen_id
            WHERE l.producto_id IN (${idsProductos.map(() => '?').join(', ')})
              AND l.estado = 'ACTIVO' AND l.cantidad_actual > 0
            GROUP BY l.producto_id, a.nombre, a.categoria
            ORDER BY a.nombre ASC
        `, idsProductos);

        for (const s of stockFilas) {
            const entrada = stockPorProducto.get(s.producto_id) || { total: 0, almacenes: [] };
            const cantidad = Number(s.cantidad || 0);
            entrada.total += cantidad;
            entrada.almacenes.push({
                almacen: s.almacen,
                categoria: s.categoria || null,
                cantidad: num(cantidad, 3)
            });
            stockPorProducto.set(s.producto_id, entrada);
        }
    }

    let totEntV = 0, totSalV = 0, totVentaV = 0, totMermaV = 0;
    const insumos = [...porInsumo.values()].map(i => {
        const detalle = [...i.detalle_salidas.entries()]
            .map(([etiqueta, d]) => ({ etiqueta, cantidad: num(d.cantidad, 3), valor: num(d.valor, 2) }))
            .sort((a, b) => b.valor - a.valor);
        // Salidas "normales" (venta/consumo) vs pérdidas (merma/ajuste/devolución)
        const ventaV = detalle.filter(d => /venta/i.test(d.etiqueta)).reduce((s, d) => s + d.valor, 0);
        const mermaV = detalle.filter(d => /merma|ajuste|devoluci/i.test(d.etiqueta)).reduce((s, d) => s + d.valor, 0);
        totEntV += i.entradas_valor; totSalV += i.salidas_valor;
        totVentaV += ventaV; totMermaV += mermaV;
        return {
            id: i.id, codigo: i.codigo, nombre: i.nombre, unidad: i.unidad,
            entradas_cantidad: num(i.entradas_cantidad, 3),
            entradas_valor: num(i.entradas_valor, 2),
            salidas_cantidad: num(i.salidas_cantidad, 3),
            salidas_valor: num(i.salidas_valor, 2),
            stock_total: num(stockPorProducto.get(i.id)?.total || 0, 3),
            stock_almacenes: stockPorProducto.get(i.id)?.almacenes || [],
            venta_valor: num(ventaV, 2),
            merma_valor: num(mermaV, 2),
            detalle_salidas: detalle
        };
    }).sort((a, b) => b.salidas_valor - a.salidas_valor);

    return {
        desde, hasta, almacen_id,
        insumos,
        totales: {
            insumos: insumos.length,
            entradas_valor: num(totEntV, 2),
            salidas_valor: num(totSalV, 2),
            consumo_venta_valor: num(totVentaV, 2),
            merma_valor: num(totMermaV, 2)
        }
    };
}

// Días de la semana tal como los devuelve DAYOFWEEK (1 = domingo)
const NOMBRES_DIA = [null, 'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

/**
 * Distribución de las cuentas cobradas del período por hora y por día de
 * la semana (según la APERTURA de la cuenta): dónde está el tráfico y
 * cuándo se vende más, para dimensionar personal y turnos.
 */
async function ventasPorHoras(rango) {
    const { desde, hasta } = rango;
    const cond = `
        p.fecha_cierre IS NOT NULL
        AND p.estado_pago IN ('pagado', 'facturado', 'cortesia')
        AND p.creado_en >= ? AND p.creado_en < DATE_ADD(?, INTERVAL 1 DAY)
    `;

    const [porHora] = await db.query(`
        SELECT HOUR(p.creado_en) AS hora, COUNT(*) AS cuentas,
               COALESCE(SUM(p.total), 0) AS ventas,
               COALESCE(SUM(p.propina), 0) AS propinas
        FROM pedidos p
        WHERE ${cond}
        GROUP BY HOUR(p.creado_en)
        ORDER BY hora ASC
    `, [desde, hasta]);

    const [porDia] = await db.query(`
        SELECT DAYOFWEEK(p.creado_en) AS dia, COUNT(*) AS cuentas,
               COALESCE(SUM(p.total), 0) AS ventas,
               COALESCE(SUM(p.propina), 0) AS propinas
        FROM pedidos p
        WHERE ${cond}
        GROUP BY DAYOFWEEK(p.creado_en)
        ORDER BY FIELD(dia, 2, 3, 4, 5, 6, 7, 1)
    `, [desde, hasta]);

    let totCuentas = 0, totVentas = 0, totPropinas = 0;
    const horas = porHora.map(h => {
        const cuentas = num(h.cuentas); const ventas = num(h.ventas, 2);
        totCuentas += cuentas; totVentas += ventas; totPropinas += num(h.propinas, 2);
        return { hora: num(h.hora), etiqueta: `${String(h.hora).padStart(2, '0')}:00`, cuentas, ventas, propinas: num(h.propinas, 2) };
    });
    // El día pico se mide sobre el orden devuelto (lunes primero)
    const dias = porDia.map(d => ({
        dia: num(d.dia), nombre: NOMBRES_DIA[d.dia] || '—',
        cuentas: num(d.cuentas), ventas: num(d.ventas, 2), propinas: num(d.propinas, 2)
    }));

    const maxHoraVentas = horas.reduce((m, h) => Math.max(m, h.ventas), 0);
    const maxDiaVentas = dias.reduce((m, d) => Math.max(m, d.ventas), 0);
    const horaPico = horas.reduce((a, b) => (b.ventas > (a ? a.ventas : -1) ? b : a), null);
    const diaPico = dias.reduce((a, b) => (b.ventas > (a ? a.ventas : -1) ? b : a), null);

    return {
        desde, hasta,
        horas, dias,
        maxHoraVentas: num(maxHoraVentas, 2),
        maxDiaVentas: num(maxDiaVentas, 2),
        horaPico: horaPico || null,
        diaPico: diaPico || null,
        totales: {
            cuentas: num(totCuentas),
            ventas: num(totVentas, 2),
            propinas: num(totPropinas, 2),
            ticket_promedio: totCuentas > 0 ? num(totVentas / totCuentas, 2) : 0
        }
    };
}

// ── Tendencias de venta ──────────────────────────────────────────────────
// Hacia dónde va el negocio: evolución diaria (o semanal) de las cuentas
// cobradas, comparación contra el período anterior de igual duración y qué
// tragos/platillos suben o bajan. Es información financiera de venta (caja
// y carta), no de inventario: no depende de funciones de la licencia.
//
// Criterios compartidos con los demás reportes financieros:
//  · "Venta cobrada" = pedidos con fecha_cierre y estado pagado, facturado
//    o cortesía, por p.total (igual que ventas por mesero y por hora).
//  · "Venta en carta" por producto = Σ cantidad × precio_unitario de líneas
//    no canceladas (igual que margen por platillo), por eso puede diferir
//    de la venta cobrada (impuestos, descuentos, modificadores).

const DIA_MS = 86400000;
const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** '2026-09-03' → ms UTC del día (evita desplazamientos de zona horaria). */
const utcDia = (s) => {
    const [y, m, d] = String(s).split('-').map(Number);
    return Date.UTC(y, m - 1, d);
};
const isoDeUtc = (ms) => new Date(ms).toISOString().slice(0, 10);

/** Cambio porcentual cur vs prev; null si no hay base de comparación. */
const pctDelta = (cur, prev) => (Number(prev) > 0 ? num(((Number(cur) - Number(prev)) / Number(prev)) * 100, 1) : null);

/** Clasificación de la tendencia de un producto entre dos períodos. */
function estadoTendencia(cur, prev) {
    if (cur > 0 && prev <= 0) return 'nuevo';
    if (cur <= 0 && prev > 0) return 'sin-ventas';
    const d = pctDelta(cur, prev);
    if (d == null) return 'estable';
    if (d >= 10) return 'sube';
    if (d <= -10) return 'baja';
    return 'estable';
}

const ETIQUETA_TENDENCIA = {
    'sube': 'A la alza',
    'baja': 'A la baja',
    'nuevo': 'Nuevo en el período',
    'sin-ventas': 'Sin ventas actuales',
    'estable': 'Estable'
};

/**
 * Reporte de tendencias: serie temporal de ventas, comparativa contra el
 * período anterior equivalente y tendencia por producto/categoría.
 *
 * @param {object} rango { desde, hasta } normalizado con normalizarRango().
 */
async function tendencias(rango) {
    const { desde, hasta } = rango;
    const dias = Math.max(1, Math.round((utcDia(hasta) - utcDia(desde)) / DIA_MS) + 1);

    // Período anterior de la MISMA duración, inmediatamente previo.
    const prevHasta = isoDeUtc(utcDia(desde) - DIA_MS);
    const prevDesde = isoDeUtc(utcDia(desde) - dias * DIA_MS);

    // 1) Serie diaria de cuentas cobradas: período actual + anterior en una
    //    sola pasada; la serie del actual se rellena día por día (los días
    //    sin venta también cuentan).
    const [filasDia] = await db.query(`
        SELECT DATE_FORMAT(p.fecha_cierre, '%Y-%m-%d') AS dia,
               COUNT(*) AS cuentas,
               COALESCE(SUM(p.total), 0) AS venta
        FROM pedidos p
        WHERE p.fecha_cierre IS NOT NULL
          AND p.estado_pago IN ('pagado', 'facturado', 'cortesia')
          AND p.fecha_cierre >= ? AND p.fecha_cierre < DATE_ADD(?, INTERVAL 1 DAY)
        GROUP BY DATE_FORMAT(p.fecha_cierre, '%Y-%m-%d')
    `, [prevDesde, hasta]);

    const porDia = new Map(filasDia.map(f => [f.dia, f]));
    const serieCruda = [];
    for (let i = 0; i < dias; i++) {
        const dia = isoDeUtc(utcDia(desde) + i * DIA_MS);
        const f = porDia.get(dia);
        serieCruda.push({
            dia,
            dia_semana: DIAS_SEMANA[new Date(`${dia}T00:00:00Z`).getUTCDay()],
            cuentas: num(f ? f.cuentas : 0),
            venta: num(f ? f.venta : 0, 2)
        });
    }
    const serieAnterior = [];
    for (let i = 0; i < dias; i++) {
        const dia = isoDeUtc(utcDia(prevDesde) + i * DIA_MS);
        const f = porDia.get(dia);
        serieAnterior.push({
            dia,
            cuentas: num(f ? f.cuentas : 0),
            venta: num(f ? f.venta : 0, 2)
        });
    }

    // 2) Productos vendidos: actual vs anterior con agregación condicional
    const [filasProd] = await db.query(`
        SELECT dp.id_platillo, dp.es_platillo_dia,
               COALESCE(pm.nombre, pd.nombre, 'Platillo eliminado') AS nombre,
               CASE WHEN dp.es_platillo_dia = 1
                    THEN COALESCE(pd.tipo, 'COMESTIBLES')
                    ELSE COALESCE(cp.tipo, 'COMESTIBLES') END AS tipo,
               cp.nombre AS categoria,
               SUM(CASE WHEN p.fecha_cierre >= ? THEN dp.cantidad ELSE 0 END) AS unidades_cur,
               SUM(CASE WHEN p.fecha_cierre >= ? THEN dp.cantidad * dp.precio_unitario ELSE 0 END) AS venta_cur,
               SUM(CASE WHEN p.fecha_cierre < ? THEN dp.cantidad ELSE 0 END) AS unidades_prev,
               SUM(CASE WHEN p.fecha_cierre < ? THEN dp.cantidad * dp.precio_unitario ELSE 0 END) AS venta_prev
        FROM detalles_pedido dp
        INNER JOIN pedidos p ON p.id = dp.id_pedido
        LEFT JOIN platillos_menu pm
            ON (dp.es_platillo_dia = 0 OR dp.es_platillo_dia IS NULL) AND pm.id = dp.id_platillo
        LEFT JOIN platillos_dia pd ON dp.es_platillo_dia = 1 AND pd.id = dp.id_platillo
        LEFT JOIN categorias_platillos cp ON cp.id = pm.categoria
        WHERE p.fecha_cierre IS NOT NULL
          AND p.estado_pago IN ('pagado', 'facturado', 'cortesia')
          AND dp.estado_item != 'cancelado'
          AND p.fecha_cierre >= ? AND p.fecha_cierre < DATE_ADD(?, INTERVAL 1 DAY)
        GROUP BY dp.id_platillo, dp.es_platillo_dia,
                 COALESCE(pm.nombre, pd.nombre, 'Platillo eliminado'),
                 CASE WHEN dp.es_platillo_dia = 1
                      THEN COALESCE(pd.tipo, 'COMESTIBLES')
                      ELSE COALESCE(cp.tipo, 'COMESTIBLES') END,
                 cp.nombre
        ORDER BY venta_cur DESC, venta_prev DESC
        LIMIT 300
    `, [desde, desde, desde, desde, prevDesde, hasta]);

    // 3) Categorías (y el corte tragos vs comestibles)
    const [filasCat] = await db.query(`
        SELECT CASE WHEN dp.es_platillo_dia = 1
                    THEN COALESCE(pd.tipo, 'COMESTIBLES')
                    ELSE COALESCE(cp.tipo, 'COMESTIBLES') END AS tipo,
               cp.nombre AS categoria,
               SUM(CASE WHEN p.fecha_cierre >= ? THEN dp.cantidad ELSE 0 END) AS unidades_cur,
               SUM(CASE WHEN p.fecha_cierre >= ? THEN dp.cantidad * dp.precio_unitario ELSE 0 END) AS venta_cur,
               SUM(CASE WHEN p.fecha_cierre < ? THEN dp.cantidad ELSE 0 END) AS unidades_prev,
               SUM(CASE WHEN p.fecha_cierre < ? THEN dp.cantidad * dp.precio_unitario ELSE 0 END) AS venta_prev
        FROM detalles_pedido dp
        INNER JOIN pedidos p ON p.id = dp.id_pedido
        LEFT JOIN platillos_menu pm
            ON (dp.es_platillo_dia = 0 OR dp.es_platillo_dia IS NULL) AND pm.id = dp.id_platillo
        LEFT JOIN platillos_dia pd ON dp.es_platillo_dia = 1 AND pd.id = dp.id_platillo
        LEFT JOIN categorias_platillos cp ON cp.id = pm.categoria
        WHERE p.fecha_cierre IS NOT NULL
          AND p.estado_pago IN ('pagado', 'facturado', 'cortesia')
          AND dp.estado_item != 'cancelado'
          AND p.fecha_cierre >= ? AND p.fecha_cierre < DATE_ADD(?, INTERVAL 1 DAY)
        GROUP BY CASE WHEN dp.es_platillo_dia = 1
                      THEN COALESCE(pd.tipo, 'COMESTIBLES')
                      ELSE COALESCE(cp.tipo, 'COMESTIBLES') END,
                 cp.nombre
    `, [desde, desde, desde, desde, prevDesde, hasta]);

    // ── Serie mostrada: diaria si el alcance es corto, semanal si es largo ──
    const agrupacion = dias > 45 ? 'semanal' : 'diaria';
    let serie;
    if (agrupacion === 'diaria') {
        let ventaAnteriorDia = null;
        serie = serieCruda.map(d => {
            const fila = {
                ...d,
                etiqueta: `${d.dia_semana.charAt(0).toUpperCase() + d.dia_semana.slice(1)} ${d.dia.slice(8, 10)}/${d.dia.slice(5, 7)}`,
                delta_pct: ventaAnteriorDia != null && ventaAnteriorDia > 0
                    ? num(((d.venta - ventaAnteriorDia) / ventaAnteriorDia) * 100, 1) : null,
                es_max: false
            };
            ventaAnteriorDia = d.venta;
            return fila;
        });
    } else {
        // Semanas ISO (lunes a domingo) dentro del alcance
        const porSemana = new Map();
        const orden = [];
        for (const d of serieCruda) {
            const lunes = isoDeUtc(utcDia(d.dia) - ((new Date(`${d.dia}T00:00:00Z`).getUTCDay() + 6) % 7) * DIA_MS);
            if (!porSemana.has(lunes)) {
                porSemana.set(lunes, { lunes, cuentas: 0, venta: 0 });
                orden.push(lunes);
            }
            const acc = porSemana.get(lunes);
            acc.cuentas += d.cuentas;
            acc.venta += d.venta;
        }
        let ventaAnteriorSemana = null;
        serie = orden.map(lunes => {
            const acc = porSemana.get(lunes);
            const fin = isoDeUtc(utcDia(lunes) + 6 * DIA_MS);
            const fila = {
                dia: lunes,
                etiqueta: `Semana del ${lunes.slice(8, 10)}/${lunes.slice(5, 7)}${fin <= hasta ? ` al ${fin.slice(8, 10)}/${fin.slice(5, 7)}` : ''}`,
                dia_semana: 'semana',
                cuentas: num(acc.cuentas),
                venta: num(acc.venta, 2),
                delta_pct: ventaAnteriorSemana != null && ventaAnteriorSemana > 0
                    ? num(((acc.venta - ventaAnteriorSemana) / ventaAnteriorSemana) * 100, 1) : null,
                es_max: false
            };
            ventaAnteriorSemana = acc.venta;
            return fila;
        });
    }
    const maxVentaSerie = serie.reduce((m, d) => Math.max(m, d.venta), 0);
    for (const d of serie) d.es_max = d.venta > 0 && d.venta === maxVentaSerie;

    // ── Totales de caja: actual vs período anterior ──
    const ventaCur = num(serieCruda.reduce((s, d) => s + d.venta, 0), 2);
    const ventaPrev = num(serieAnterior.reduce((s, d) => s + d.venta, 0), 2);
    const cuentasCur = num(serieCruda.reduce((s, d) => s + d.cuentas, 0));
    const cuentasPrev = num(serieAnterior.reduce((s, d) => s + d.cuentas, 0));
    const ticketCur = cuentasCur > 0 ? num(ventaCur / cuentasCur, 2) : 0;
    const ticketPrev = cuentasPrev > 0 ? num(ventaPrev / cuentasPrev, 2) : 0;

    // Ritmo del período: promedio diario de la 2.ª mitad vs 1.ª mitad
    const mitad = Math.ceil(serieCruda.length / 2);
    const prom = (arr) => arr.length ? arr.reduce((s, d) => s + d.venta, 0) / arr.length : 0;
    const ritmoDelta = pctDelta(prom(serieCruda.slice(mitad)), prom(serieCruda.slice(0, mitad)));
    const ritmo = {
        delta_pct: ritmoDelta,
        direccion: ritmoDelta == null ? 'sin-datos' : (ritmoDelta >= 5 ? 'acelerando' : (ritmoDelta <= -5 ? 'frenando' : 'estable'))
    };

    // ── Productos ──
    const platillos = filasProd.map(f => {
        const unidadesCur = num(f.unidades_cur, 0);
        const unidadesPrev = num(f.unidades_prev, 0);
        const ventaCurP = num(f.venta_cur, 2);
        const ventaPrevP = num(f.venta_prev, 2);
        const estado = estadoTendencia(unidadesCur, unidadesPrev);
        return {
            id: f.id_platillo,
            es_dia: Number(f.es_platillo_dia) === 1,
            nombre: f.nombre,
            etiqueta: etiquetaTipo(f.tipo),
            categoria: f.categoria || 'Sin categoría',
            unidades_cur: unidadesCur,
            unidades_prev: unidadesPrev,
            venta_cur: ventaCurP,
            venta_prev: ventaPrevP,
            unidades_delta_pct: pctDelta(unidadesCur, unidadesPrev),
            venta_delta_pct: pctDelta(ventaCurP, ventaPrevP),
            estado,
            tendencia: ETIQUETA_TENDENCIA[estado]
        };
    });

    const ordenAlza = (a, b) => {
        if (a.estado === 'nuevo' && b.estado !== 'nuevo') return -1;
        if (b.estado === 'nuevo' && a.estado !== 'nuevo') return 1;
        if (a.estado === 'nuevo' && b.estado === 'nuevo') return b.unidades_cur - a.unidades_cur;
        return (b.unidades_delta_pct ?? -Infinity) - (a.unidades_delta_pct ?? -Infinity);
    };
    const ordenBaja = (a, b) => {
        if (a.estado === 'sin-ventas' && b.estado !== 'sin-ventas') return -1;
        if (b.estado === 'sin-ventas' && a.estado !== 'sin-ventas') return 1;
        if (a.estado === 'sin-ventas' && b.estado === 'sin-ventas') return b.venta_prev - a.venta_prev;
        return (a.unidades_delta_pct ?? -Infinity) - (b.unidades_delta_pct ?? -Infinity);
    };

    const alza = platillos.filter(p => p.estado === 'sube' || p.estado === 'nuevo').sort(ordenAlza).slice(0, 5);
    const baja = platillos.filter(p => p.estado === 'baja' || p.estado === 'sin-ventas').sort(ordenBaja).slice(0, 5);

    // ── Categorías y corte por tipo ──
    const categorias = filasCat
        .filter(f => f.categoria)
        .map(f => {
            const unidadesCur = num(f.unidades_cur, 0);
            const unidadesPrev = num(f.unidades_prev, 0);
            return {
                etiqueta: f.categoria,
                tipo: etiquetaTipo(f.tipo),
                unidades_cur: unidadesCur,
                unidades_prev: unidadesPrev,
                venta_cur: num(f.venta_cur, 2),
                venta_prev: num(f.venta_prev, 2),
                unidades_delta_pct: pctDelta(unidadesCur, unidadesPrev),
                estado: estadoTendencia(unidadesCur, unidadesPrev)
            };
        })
        .sort((a, b) => (b.venta_cur + b.venta_prev) - (a.venta_cur + a.venta_prev))
        .slice(0, 12);

    const tipos = ['BEBIDAS', 'COMESTIBLES'].map(t => {
        const filas = filasCat.filter(f => String(f.tipo || '').toUpperCase() === t);
        const unidadesCur = num(filas.reduce((s, f) => s + Number(f.unidades_cur || 0), 0), 0);
        const unidadesPrev = num(filas.reduce((s, f) => s + Number(f.unidades_prev || 0), 0), 0);
        return {
            etiqueta: t === 'BEBIDAS' ? 'Tragos' : 'Platillos',
            unidades_cur: unidadesCur,
            unidades_prev: unidadesPrev,
            venta_cur: num(filas.reduce((s, f) => s + Number(f.venta_cur || 0), 0), 2),
            venta_prev: num(filas.reduce((s, f) => s + Number(f.venta_prev || 0), 0), 2),
            unidades_delta_pct: pctDelta(unidadesCur, unidadesPrev),
            estado: estadoTendencia(unidadesCur, unidadesPrev)
        };
    }).filter(t => t.unidades_cur > 0 || t.unidades_prev > 0);

    return {
        desde,
        hasta,
        prevDesde,
        prevHasta,
        dias,
        agrupacion,
        serie,
        serieMax: num(maxVentaSerie, 2),
        platillos,
        alza,
        baja,
        categorias,
        tipos,
        ritmo,
        totales: {
            venta: ventaCur,
            venta_prev: ventaPrev,
            venta_delta_pct: pctDelta(ventaCur, ventaPrev),
            cuentas: cuentasCur,
            cuentas_prev: cuentasPrev,
            cuentas_delta_pct: pctDelta(cuentasCur, cuentasPrev),
            ticket: ticketCur,
            ticket_prev: ticketPrev,
            ticket_delta_pct: pctDelta(ticketCur, ticketPrev),
            unidades: num(platillos.reduce((s, p) => s + p.unidades_cur, 0), 0),
            unidades_prev: num(platillos.reduce((s, p) => s + p.unidades_prev, 0), 0),
            productos: platillos.length,
            alza: platillos.filter(p => p.estado === 'sube' || p.estado === 'nuevo').length,
            baja: platillos.filter(p => p.estado === 'baja' || p.estado === 'sin-ventas').length
        }
    };
}

/** CSV del reporte de tendencias: resumen, serie, tipos/categorías y productos. */
function tendenciasACSV(reporte) {
    const filas = [];
    filas.push(`Tendencias de venta;${reporte.desde};a;${reporte.hasta};comparado con;${reporte.prevDesde};a;${reporte.prevHasta}`);
    filas.push(`Granularidad;${reporte.agrupacion === 'semanal' ? 'Semanal' : 'Diaria'};Dias del periodo;${reporte.dias}`);
    filas.push('');
    filas.push('RESUMEN');
    filas.push('Concepto;Actual;Anterior;Cambio %');
    const t = reporte.totales;
    filas.push(`Venta cobrada;${csvNum(t.venta)};${csvNum(t.venta_prev)};${t.venta_delta_pct != null ? csvNum(t.venta_delta_pct, 1) : ''}`);
    filas.push(`Cuentas cobradas;${csvNum(t.cuentas, 0)};${csvNum(t.cuentas_prev, 0)};${t.cuentas_delta_pct != null ? csvNum(t.cuentas_delta_pct, 1) : ''}`);
    filas.push(`Ticket promedio;${csvNum(t.ticket)};${csvNum(t.ticket_prev)};${t.ticket_delta_pct != null ? csvNum(t.ticket_delta_pct, 1) : ''}`);
    filas.push(`Unidades vendidas;${csvNum(t.unidades, 0)};${csvNum(t.unidades_prev, 0)};`);
    filas.push('');
    filas.push(`SERIE ${reporte.agrupacion === 'semanal' ? 'SEMANAL' : 'DIARIA'}`);
    filas.push('Periodo;Cuentas;Venta;Cambio % vs anterior');
    for (const d of reporte.serie) {
        filas.push([csvTexto(d.etiqueta), csvNum(d.cuentas, 0), csvNum(d.venta), d.delta_pct != null ? csvNum(d.delta_pct, 1) : ''].join(';'));
    }
    filas.push('');
    filas.push('POR TIPO Y CATEGORIA');
    filas.push('Nivel;Nombre;Unid. act.;Unid. ant.;Venta act.;Venta ant.;Cambio unidades %;Tendencia');
    for (const tp of reporte.tipos) {
        filas.push([csvTexto('Tipo'), csvTexto(tp.etiqueta), csvNum(tp.unidades_cur, 0), csvNum(tp.unidades_prev, 0),
            csvNum(tp.venta_cur), csvNum(tp.venta_prev),
            tp.unidades_delta_pct != null ? csvNum(tp.unidades_delta_pct, 1) : '', csvTexto(tp.tendencia || '')].join(';'));
    }
    for (const c of reporte.categorias) {
        filas.push([csvTexto('Categoria'), csvTexto(c.etiqueta), csvNum(c.unidades_cur, 0), csvNum(c.unidades_prev, 0),
            csvNum(c.venta_cur), csvNum(c.venta_prev),
            c.unidades_delta_pct != null ? csvNum(c.unidades_delta_pct, 1) : '', csvTexto(ETIQUETA_TENDENCIA[c.estado] || '')].join(';'));
    }
    filas.push('');
    filas.push('PRODUCTOS');
    filas.push('Producto;Tipo;Categoria;Unid. act.;Unid. ant.;Venta act.;Venta ant.;Cambio unidades %;Tendencia');
    for (const p of reporte.platillos) {
        filas.push([
            csvTexto(p.nombre), csvTexto(p.etiqueta), csvTexto(p.categoria),
            csvNum(p.unidades_cur, 0), csvNum(p.unidades_prev, 0),
            csvNum(p.venta_cur), csvNum(p.venta_prev),
            p.unidades_delta_pct != null ? csvNum(p.unidades_delta_pct, 1) : '',
            csvTexto(p.tendencia)
        ].join(';'));
    }
    return '\uFEFF' + filas.join('\r\n') + '\r\n';
}

// ── Generadores de CSV ───────────────────────────────────────────────────
// Qué tragos y platillos se vendieron en un turno de servicio y qué
// movimiento de inventario generaron (kardex por comanda cobrada).
//
// El desglose de inventario (consumo real, movimientos) es información de
// control físico: solo se calcula cuando la licencia de la instalación
// incluye la función 'inventario'. El controlador decide `incluirInventario`
// con licenciaService.tieneFuncion(); el servicio simplemente obedece.

const CLAVE_PLATILLO = (id, esDia) => `${id}|${Number(esDia) === 1 ? 1 : 0}`;

/** Fórmula del motor de descuento: cantidad bruta por merma operativa. */
const cantidadBruta = (cantidad, mermaPct) => {
    const m = Number(mermaPct || 0);
    const bruta = (m > 0 && m < 100)
        ? Number(cantidad) / (1 - (m / 100))
        : Number(cantidad);
    return Number.isFinite(bruta) ? Number(bruta.toFixed(6)) : 0;
};

/** Etiqueta corta del tipo de platillo para filtros y tablas. */
const etiquetaTipo = (tipo) => (String(tipo || '').toUpperCase() === 'BEBIDAS' ? 'Trago' : 'Platillo');

/**
 * Reporte del turno: tragos y platillos vendidos con su costo teórico de
 * receta y, si la licencia lo permite, el consumo real descontado del
 * kardex y el resumen de movimientos de la ventana del turno.
 *
 * @param {object} opciones { turnoId (null = todos los turnos recientes),
 *                            incluirInventario (gate de licencia),
 *                            porDefectoAlUltimo (sin filtro explícito usa el
 *                            turno más reciente, que es el caso de uso natural) }
 */
async function ventasTurno({ turnoId = null, incluirInventario = true, porDefectoAlUltimo = false } = {}) {
    const turnos = await ReporteModel.getTurnosRecientes(30);
    let turnoSel = turnoId ? turnos.find(t => t.id === Number(turnoId)) || null : null;
    if (!turnoSel && porDefectoAlUltimo && turnos.length) turnoSel = turnos[0];
    const filtroTurno = turnoSel ? turnoSel.id : null;

    const [ventas, platillosPorPedido, teoricoFilas, cuentas] = await Promise.all([
        ReporteModel.getVentasTurno(filtroTurno),
        ReporteModel.getPlatillosPorPedido(filtroTurno),
        ReporteModel.getTeoricoPorPlatillo(filtroTurno),
        ReporteModel.getCuentasTurno(filtroTurno)
    ]);

    // Comandas que contienen cada platillo (para atribuirle el kardex)
    const pedidosDePlatillo = new Map();
    for (const f of platillosPorPedido) {
        const clave = CLAVE_PLATILLO(f.id_platillo, f.es_platillo_dia);
        if (!pedidosDePlatillo.has(clave)) pedidosDePlatillo.set(clave, new Set());
        pedidosDePlatillo.get(clave).add(Number(f.pedido_id));
    }

    // Consumo teórico por platillo (receta activa × unidades vendidas)
    const teoricoPorPlatillo = new Map();
    for (const f of teoricoFilas) {
        const clave = CLAVE_PLATILLO(f.id_platillo, f.es_platillo_dia);
        if (!teoricoPorPlatillo.has(clave)) {
            teoricoPorPlatillo.set(clave, { insumos: new Set(), costo: 0 });
        }
        const acc = teoricoPorPlatillo.get(clave);
        acc.insumos.add(Number(f.insumo_id));
        acc.costo += Number(f.costo_teorico || 0);
    }

    // Consumo real del kardex: por comanda → insumo, y resumen por insumo
    let realPorPedido = new Map();
    let insumos = [];
    let movimientosPorCuenta = new Map();
    let movimientosTurno = null;

    if (incluirInventario) {
        const [realFilas, cuentasMov] = await Promise.all([
            ReporteModel.getRealPorPedido(filtroTurno),
            ReporteModel.getMovimientosPorCuenta(filtroTurno)
        ]);

        for (const f of realFilas) {
            const pid = Number(f.pedido_id);
            if (!realPorPedido.has(pid)) realPorPedido.set(pid, new Map());
            realPorPedido.get(pid).set(Number(f.insumo_id), {
                nombre: f.insumo,
                codigo: f.codigo_insumo,
                unidad: f.unidad,
                cantidad: Number(f.consumo_real || 0),
                costo: Number(f.costo_real || 0),
                movimientos: Number(f.movimientos || 0)
            });
        }

        movimientosPorCuenta = new Map(cuentasMov.map(f => [Number(f.pedido_id), {
            movimientos: Number(f.movimientos || 0),
            insumos: Number(f.insumos || 0),
            cantidad_descontada: Number(f.cantidad_descontada || 0),
            costo_descontado: Number(f.costo_descontado || 0)
        }]));

        // Resumen del kardex en la ventana del turno (mismo criterio que Caja)
        if (turnoSel) {
            try {
                movimientosTurno = await InventarioService.movimientosPorTurno(turnoSel);
            } catch (_) {
                movimientosTurno = null; // la sección simplemente no se muestra
            }
        }

        // Agregado de consumo real por insumo (todas las comandas del alcance)
        const porInsumo = new Map();
        for (const [, insumosPedido] of realPorPedido) {
            for (const [iid, v] of insumosPedido) {
                if (!porInsumo.has(iid)) {
                    porInsumo.set(iid, {
                        id: iid, insumo: v.nombre, codigo: v.codigo, unidad: v.unidad,
                        cantidad: 0, costo: 0, movimientos: 0, comandas: 0
                    });
                }
                const acc = porInsumo.get(iid);
                acc.cantidad += v.cantidad;
                acc.costo += v.costo;
                acc.movimientos += v.movimientos;
                acc.comandas += 1;
            }
        }
        insumos = [...porInsumo.values()].map(i => ({
            ...i,
            cantidad: num(i.cantidad, 3),
            costo: num(i.costo, 2),
            movimientos: num(i.movimientos, 0),
            comandas: num(i.comandas, 0)
        })).sort((a, b) => b.costo - a.costo);
    }

    // Fila por platillo vendido
    const platillos = ventas.map(v => {
        const esDia = Number(v.es_platillo_dia) === 1;
        const clave = CLAVE_PLATILLO(v.id_platillo, v.es_platillo_dia);
        const teo = teoricoPorPlatillo.get(clave) || null;

        let costoReal = null;
        let insumosReales = 0;
        if (incluirInventario) {
            costoReal = 0;
            const pedidos = pedidosDePlatillo.get(clave) || new Set();
            for (const pid of pedidos) {
                const insumosPedido = realPorPedido.get(pid);
                if (!insumosPedido) continue;
                for (const [, dato] of insumosPedido) {
                    costoReal += dato.costo;
                    insumosReales += dato.movimientos;
                }
            }
        }

        const tieneReceta = Boolean(teo);
        const costoTeorico = tieneReceta ? num(teo.costo, 2) : null;

        return {
            id: v.id_platillo,
            es_dia: esDia,
            nombre: v.nombre,
            tipo: v.tipo,
            etiqueta: etiquetaTipo(v.tipo),
            categoria: v.categoria || 'Sin categoría',
            cuentas: num(v.cuentas, 0),
            unidades: num(v.unidades, 0),
            venta: num(v.venta, 2),
            tiene_receta: tieneReceta,
            insumos_teoricos: teo ? teo.insumos.size : 0,
            costo_teorico: costoTeorico,
            costo_real: costoReal == null ? null : num(costoReal, 2),
            insumos_reales: num(insumosReales, 0),
            desviacion: (costoTeorico != null && costoReal != null)
                ? num(costoReal - costoTeorico, 2) : null
        };
    });

    // Cuentas con su movimiento de inventario fusionado
    const cuentasConMov = cuentas.map(c => {
        const mov = incluirInventario ? movimientosPorCuenta.get(Number(c.id)) : null;
        return {
            ...c,
            venta: num(c.venta, 2),
            total: num(c.total, 2),
            lineas: num(c.lineas, 0),
            unidades: num(c.unidades, 0),
            movimientos: mov ? mov.movimientos : null,
            costo_descontado: mov ? num(mov.costo_descontado, 2) : null
        };
    });

    const totales = {
        platillos: platillos.length,
        cuentas: cuentasConMov.length,
        unidades: num(platillos.reduce((s, p) => s + p.unidades, 0), 0),
        tragos: num(platillos.filter(p => p.etiqueta === 'Trago').reduce((s, p) => s + p.unidades, 0), 0),
        platillos_comestibles: num(platillos.filter(p => p.etiqueta === 'Platillo').reduce((s, p) => s + p.unidades, 0), 0),
        venta: num(platillos.reduce((s, p) => s + p.venta, 0), 2),
        costo_teorico: num(platillos.reduce((s, p) => s + (p.costo_teorico || 0), 0), 2),
        costo_real: incluirInventario
            ? num(platillos.reduce((s, p) => s + (p.costo_real || 0), 0), 2)
            : null,
        costo_descontado: incluirInventario
            ? num(cuentasConMov.reduce((s, c) => s + (c.costo_descontado || 0), 0), 2)
            : null
    };
    totales.desviacion = incluirInventario ? num(totales.costo_real - totales.costo_teorico, 2) : null;

    return {
        turnos,
        turnoSeleccionado: turnoSel ? turnoSel.id : null,
        turno: turnoSel,
        incluirInventario: Boolean(incluirInventario),
        platillos,
        cuentas: cuentasConMov,
        insumos,
        movimientosTurno,
        totales
    };
}

/**
 * Detalle de UN trago/platillo dentro del alcance del turno: sus líneas de
 * venta por comanda, el consumo teórico de su receta escalado a lo vendido
 * y, si la licencia lo permite, los movimientos reales del kardex de las
 * comandas que lo incluyeron.
 */
async function detallePlatilloTurno({ turnoId = null, platilloId, esDia = 0, incluirInventario = true, porDefectoAlUltimo = false } = {}) {
    const platillo = await ReporteModel.getPlatilloInfo(platilloId, esDia);
    if (!platillo) return null;

    const turnos = await ReporteModel.getTurnosRecientes(30);
    let turnoSel = turnoId ? turnos.find(t => t.id === Number(turnoId)) || null : null;
    if (!turnoSel && porDefectoAlUltimo && turnos.length) turnoSel = turnos[0];
    const filtroTurno = turnoSel ? turnoSel.id : null;

    const lineas = await ReporteModel.getVentasPlatillo(filtroTurno, platilloId, esDia);
    const unidades = num(lineas.reduce((s, l) => s + Number(l.cantidad || 0), 0), 0);
    const venta = num(lineas.reduce((s, l) => s + Number(l.importe || 0), 0), 2);

    // Receta unitaria (los platillos del día no tienen: no descuentan inventario)
    const recetaUnitaria = Number(esDia) === 1 ? [] : await ReporteModel.getRecetaPlatillo(platilloId);

    // Teórico escalado a las unidades vendidas del alcance
    const teorico = recetaUnitaria.map(r => {
        const brutaUnitaria = cantidadBruta(r.cantidad_unitaria, r.porcentaje_merma);
        const total = Number((brutaUnitaria * unidades).toFixed(6));
        return {
            insumo_id: r.insumo_id,
            insumo: r.insumo,
            codigo: r.codigo_insumo,
            unidad: r.unidad,
            cantidad_unitaria: num(r.cantidad_unitaria, 4),
            merma_pct: num(r.porcentaje_merma || 0, 2),
            bruta_unitaria: num(brutaUnitaria, 4),
            total: num(total, 3),
            costo_unitario: num(r.costo_estimado, 4),
            costo_total: num(total * Number(r.costo_estimado || 0), 2)
        };
    });

    // Real: movimientos de kardex de las comandas que incluyeron el platillo.
    // El kardex se registra por COMANDA: si la cuenta trajo más platillos,
    // sus descuentos aparecen aquí también (se aclara en la vista).
    let real = null;
    if (incluirInventario) {
        const pedidoIds = [...new Set(lineas.map(l => Number(l.pedido_id)))];
        const filas = await ReporteModel.getMovimientosDeCuentas(pedidoIds);

        const porInsumo = new Map();
        for (const f of filas) {
            const iid = Number(f.insumo_id);
            if (!porInsumo.has(iid)) {
                porInsumo.set(iid, {
                    insumo_id: iid, insumo: f.insumo, codigo: f.codigo_insumo, unidad: f.unidad,
                    cantidad: 0, costo: 0, movimientos: 0
                });
            }
            const acc = porInsumo.get(iid);
            acc.cantidad += Number(f.cantidad || 0);
            acc.costo += Number(f.costo_total || 0);
            acc.movimientos += 1;
        }

        const teoricoPorId = new Map(teorico.map(t => [t.insumo_id, t]));
        const porInsumoArr = [...porInsumo.values()].map(i => {
            const teo = teoricoPorId.get(i.insumo_id) || null;
            const total = num(i.cantidad, 3);
            return {
                ...i,
                cantidad: total,
                costo: num(i.costo, 2),
                movimientos: num(i.movimientos, 0),
                teorico_total: teo ? teo.total : null,
                desviacion: teo ? num(total - teo.total, 3) : null,
                en_receta: Boolean(teo)
            };
        }).sort((a, b) => Math.abs(b.desviacion || 0) - Math.abs(a.desviacion || 0) || b.costo - a.costo);

        real = {
            filas,
            porInsumo: porInsumoArr,
            totales: {
                movimientos: filas.length,
                insumos: porInsumoArr.length,
                cantidad: num(filas.reduce((s, f) => s + Number(f.cantidad || 0), 0), 3),
                costo: num(filas.reduce((s, f) => s + Number(f.costo_total || 0), 0), 2)
            }
        };
    }

    const costoTeorico = num(teorico.reduce((s, t) => s + t.costo_total, 0), 2);
    return {
        platillo: {
            ...platillo,
            etiqueta: etiquetaTipo(platillo.tipo)
        },
        turnos,
        turnoSeleccionado: turnoSel ? turnoSel.id : null,
        turno: turnoSel,
        incluirInventario: Boolean(incluirInventario),
        tiene_receta: recetaUnitaria.length > 0,
        lineas: lineas.map(l => ({
            ...l,
            importe: num(l.importe, 2),
            precio_unitario: num(l.precio_unitario, 2),
            cantidad: num(l.cantidad, 0)
        })),
        unidades,
        venta,
        teorico,
        real,
        totales: {
            lineas: lineas.length,
            unidades,
            venta,
            costo_teorico: costoTeorico,
            costo_real: real ? real.totales.costo : null,
            desviacion: real ? num(real.totales.costo - costoTeorico, 2) : null
        }
    };
}

// ── Generadores de CSV ───────────────────────────────────────────────────
// Mismo formato que el kardex: separador ';', decimales con coma y BOM
// UTF-8 para que Excel lo abra directamente.

const csvNum = (v, dec = 2) => Number(v || 0).toFixed(dec).replace('.', ',');
const csvTexto = (v) => String(v == null ? '' : v).replace(/[;\r\n]+/g, ' ');
const csvFecha = (v) => (v instanceof Date
    ? v.toISOString().slice(0, 16).replace('T', ' ')
    : String(v || '').slice(0, 16));

/** CSV del reporte de margen por platillo. */
function margenACSV(reporte) {
    const filas = [];
    filas.push(`Margen real por platillo;${reporte.desde};a;${reporte.hasta}`);
    filas.push('');
    filas.push('Platillo;Unidades;Ingreso;Costo unit.;Costo total;Margen;Margen por unidad;Food cost %');
    for (const p of reporte.platillos) {
        filas.push([
            csvTexto(p.nombre), csvNum(p.unidades, 0), csvNum(p.ingreso),
            csvNum(p.costo_unitario, 4), csvNum(p.costo_total), csvNum(p.margen),
            csvNum(p.margen_unitario), p.food_cost != null ? csvNum(p.food_cost, 1) : ''
        ].join(';'));
    }
    if (reporte.totales) {
        const t = reporte.totales;
        filas.push(`TOTALES;${csvNum(t.unidades, 0)};${csvNum(t.ingreso)};;${csvNum(t.costo)};${csvNum(t.margen)};;${csvNum(t.food_cost, 1)}`);
    }
    for (const s of reporte.sinReceta) {
        filas.push(`SIN FICHA TECNICA;${csvTexto(s.nombre)};${csvNum(s.unidades, 0)};${csvNum(s.ingreso)}`);
    }
    return '\uFEFF' + filas.join('\r\n') + '\r\n';
}

/** CSV de la salud del inventario (una sección tras otra). */
function saludACSV(salud) {
    const filas = [];
    filas.push('Salud del inventario');
    filas.push('');
    filas.push('SECCION;Producto;Codigo;Detalle;Cantidad;Valor');
    for (const p of salud.bajoMinimo) {
        filas.push(`Bajo minimo;${csvTexto(p.nombre)};${csvTexto(p.codigo)};Minimo ${csvNum(p.stock_minimo, 3)} / Faltante ${csvNum(p.faltante, 3)};${csvNum(p.stock_actual, 3)};${csvNum(p.costo_reposicion)}`);
    }
    for (const l of salud.vencidos) {
        filas.push(`Vencido;${csvTexto(l.producto)};${csvTexto(l.codigo)};Lote ${csvTexto(l.numero_lote)} vencio ${csvFecha(l.fecha_vencimiento)};${csvNum(l.cantidad_actual, 3)};${csvNum(l.valor_perdido)}`);
    }
    for (const l of salud.porVencer) {
        filas.push(`Por vencer;${csvTexto(l.producto)};${csvTexto(l.codigo)};Lote ${csvTexto(l.numero_lote)} vence en ${l.dias_restantes} dia(s);${csvNum(l.cantidad_actual, 3)};${csvNum(l.valor_riesgo)}`);
    }
    for (const p of salud.sinMovimiento) {
        filas.push(`Sin rotacion 30 dias;${csvTexto(p.nombre)};${csvTexto(p.codigo)};Sin movimientos;${csvNum(p.stock_actual, 3)};${csvNum(p.valor_detenido)}`);
    }
    const t = salud.totales;
    filas.push('');
    filas.push(`RESUMEN;Productos bajo minimo;${csvNum(t.bajo_minimo, 0)};Costo de reposicion;${csvNum(t.costo_reposicion)}`);
    filas.push(`RESUMEN;Lotes vencidos;${csvNum(t.vencidos, 0)};Perdida consumada;${csvNum(t.valor_perdido)}`);
    filas.push(`RESUMEN;Lotes por vencer;${csvNum(t.por_vencer, 0)};Valor en riesgo;${csvNum(t.valor_riesgo)}`);
    filas.push(`RESUMEN;Sin rotacion 30 dias;${csvNum(t.sin_movimiento, 0)};Capital detenido;${csvNum(t.valor_detenido)}`);
    return '\uFEFF' + filas.join('\r\n') + '\r\n';
}

/** CSV de la explosión de recetas: resumen por insumo + detalle por venta. */
function explosionACSV({ resumenInsumos = [], filas = [], turnoSeleccionado = null } = {}) {
    const salida = [];
    salida.push(`Explosion de recetas (teorico vs real);${turnoSeleccionado ? 'Turno ' + turnoSeleccionado : 'Todos los turnos'}`);
    salida.push('');
    salida.push('RESUMEN POR INSUMO');
    salida.push('Insumo;Codigo;Unidad;Consumo teorico;Consumo real;Desviacion;Desviacion %;Costo teorico');
    for (const i of resumenInsumos) {
        salida.push([
            csvTexto(i.insumo), csvTexto(i.codigo), csvTexto(i.unidad),
            csvNum(i.teorico, 3), csvNum(i.real, 3), csvNum(i.desviacion, 3),
            i.desviacion_pct != null ? csvNum(i.desviacion_pct, 1) : '', csvNum(i.costo)
        ].join(';'));
    }
    salida.push('');
    salida.push('DETALLE POR VENTA');
    salida.push('Turno;Pedido;Mesa;Platillo;Unid.;Insumo;Teorico;Real;Costo teorico');
    for (const f of filas) {
        salida.push([
            csvTexto(f.turno), csvTexto(f.numero_pedido), csvTexto(f.mesa),
            csvTexto(f.platillo_vendido), csvNum(f.cantidad_platillos_vendidos, 0),
            csvTexto(f.insumo_descontado),
            csvNum(f.consumo_total_teorico, 3), csvNum(f.consumo_real_kardex, 3),
            csvNum(f.costo_total_insumo)
        ].join(';'));
    }
    return '\uFEFF' + salida.join('\r\n') + '\r\n';
}

/** CSV del reporte de ventas por mesero. */
function ventasMeseroACSV(reporte) {
    const filas = [];
    filas.push(`Ventas por mesero;${reporte.desde};a;${reporte.hasta}`);
    filas.push('');
    filas.push('Mesero;Rol;Cuentas;Cortesias;Ventas;Ticket promedio;Propinas;Descuentos');
    for (const m of reporte.meseros) {
        filas.push([
            csvTexto(m.mesero), csvTexto(m.rol), csvNum(m.cuentas, 0),
            csvNum(m.cortesias, 0), csvNum(m.ventas), csvNum(m.ticket_promedio),
            csvNum(m.propinas), csvNum(m.descuentos)
        ].join(';'));
    }
    const t = reporte.totales;
    filas.push(`TOTALES;;${csvNum(t.cuentas, 0)};${csvNum(t.cortesias, 0)};${csvNum(t.ventas)};${csvNum(t.ticket_promedio)};${csvNum(t.propinas)};${csvNum(t.descuentos)}`);
    return '\uFEFF' + filas.join('\r\n') + '\r\n';
}

/** CSV del consumo por insumo con el desglose de salidas. */
function consumoInsumosACSV(reporte) {
    const filas = [];
    filas.push(`Consumo por insumo;${reporte.desde};a;${reporte.hasta}${reporte.almacen_id ? ';Almacen ' + reporte.almacen_id : ''}`);
    filas.push('');
    filas.push('Insumo;Codigo;Unidad;Entradas cant;Entradas valor;Salidas cant;Salidas valor;Stock total (todos los almacenes);Stock por almacen;Salidas: venta;Salidas: merma/ajuste;Desglose de salidas');
    for (const i of reporte.insumos) {
        const desglose = i.detalle_salidas.map(d => `${d.etiqueta} ${csvNum(d.cantidad, 3)} ($${csvNum(d.valor)})`).join(' | ');
        const stockAlmacenes = (i.stock_almacenes || [])
            .map(s => `${s.almacen} ${csvNum(s.cantidad, 3)}`).join(' | ');
        filas.push([
            csvTexto(i.nombre), csvTexto(i.codigo), csvTexto(i.unidad),
            csvNum(i.entradas_cantidad, 3), csvNum(i.entradas_valor),
            csvNum(i.salidas_cantidad, 3), csvNum(i.salidas_valor),
            csvNum(i.stock_total, 3), csvTexto(stockAlmacenes),
            csvNum(i.venta_valor), csvNum(i.merma_valor), csvTexto(desglose)
        ].join(';'));
    }
    const t = reporte.totales;
    filas.push(`TOTALES;;;;${csvNum(t.entradas_valor)};;${csvNum(t.salidas_valor)};;;${csvNum(t.consumo_venta_valor)};${csvNum(t.merma_valor)};Insumos: ${csvNum(t.insumos, 0)}`);
    return '\uFEFF' + filas.join('\r\n') + '\r\n';
}

/** CSV de la distribución por hora y día de la semana. */
function ventasHorasACSV(reporte) {
    const filas = [];
    filas.push(`Ventas por hora y dia;${reporte.desde};a;${reporte.hasta}`);
    filas.push('');
    filas.push('POR HORA');
    filas.push('Hora;Cuentas;Ventas;Propinas');
    for (const h of reporte.horas) {
        filas.push(`${h.etiqueta};${csvNum(h.cuentas, 0)};${csvNum(h.ventas)};${csvNum(h.propinas)}`);
    }
    filas.push('');
    filas.push('POR DIA DE LA SEMANA');
    filas.push('Dia;Cuentas;Ventas;Propinas');
    for (const d of reporte.dias) {
        filas.push(`${csvTexto(d.nombre)};${csvNum(d.cuentas, 0)};${csvNum(d.ventas)};${csvNum(d.propinas)}`);
    }
    const t = reporte.totales;
    filas.push('');
    filas.push(`TOTALES;;${csvNum(t.cuentas, 0)};${csvNum(t.ventas)};${csvNum(t.propinas)}`);
    return '\uFEFF' + filas.join('\r\n') + '\r\n';
}

/** Etiqueta legible del alcance del reporte de turno. */
const etiquetaAlcanceTurno = (reporte) => (reporte.turno
    ? `Turno #${reporte.turno.id} (${reporte.turno.nombre})`
    : 'Todos los turnos');

/** CSV del reporte de ventas y consumo del turno. */
function ventasTurnoACSV(reporte) {
    const filas = [];
    filas.push(`Ventas y consumo del turno;${etiquetaAlcanceTurno(reporte)}`);
    if (reporte.turno) {
        filas.push(`Apertura;${csvFecha(reporte.turno.fecha_apertura)};Cierre;${reporte.turno.fecha_cierre ? csvFecha(reporte.turno.fecha_cierre) : 'Turno abierto'};Estado;${reporte.turno.estado}`);
    }
    filas.push('');
    filas.push('RESUMEN');
    const t = reporte.totales;
    filas.push(`Cuentas cobradas;${csvNum(t.cuentas, 0)}`);
    filas.push(`Tragos vendidos (unid.);${csvNum(t.tragos, 0)}`);
    filas.push(`Platillos vendidos (unid.);${csvNum(t.platillos_comestibles, 0)}`);
    filas.push(`Venta;${csvNum(t.venta)}`);
    filas.push(`Costo teorico (recetas);${csvNum(t.costo_teorico)}`);
    if (reporte.incluirInventario) {
        filas.push(`Consumo real (kardex);${csvNum(t.costo_real)}`);
        filas.push(`Desviacion (real - teorico);${csvNum(t.desviacion)}`);
    } else {
        filas.push('Consumo real (kardex);Requiere licencia con la funcion inventario');
    }
    filas.push('');
    filas.push('TRAGOS Y PLATILLOS VENDIDOS');
    filas.push('Tipo;Platillo;Categoria;Unidades;Cuentas;Venta;Insumos de receta;Costo teorico;'
        + (reporte.incluirInventario ? 'Consumo real (kardex);Desviacion' : ''));
    for (const p of reporte.platillos) {
        filas.push([
            csvTexto(p.etiqueta), csvTexto(p.nombre), csvTexto(p.categoria),
            csvNum(p.unidades, 0), csvNum(p.cuentas, 0), csvNum(p.venta),
            p.tiene_receta ? csvNum(p.insumos_teoricos, 0) : 'sin receta',
            p.costo_teorico != null ? csvNum(p.costo_teorico) : '',
            reporte.incluirInventario ? (p.costo_real != null ? csvNum(p.costo_real) : '') : '',
            (reporte.incluirInventario && p.desviacion != null) ? csvNum(p.desviacion) : ''
        ].join(';'));
    }
    if (reporte.incluirInventario) {
        filas.push('');
        filas.push('CONSUMO REAL POR INSUMO (KARDEX)');
        filas.push('Insumo;Codigo;Unidad;Cantidad;Movimientos;Comandas;Costo');
        for (const i of reporte.insumos) {
            filas.push([
                csvTexto(i.insumo), csvTexto(i.codigo), csvTexto(i.unidad),
                csvNum(i.cantidad, 3), csvNum(i.movimientos, 0), csvNum(i.comandas, 0), csvNum(i.costo)
            ].join(';'));
        }
        if (reporte.movimientosTurno) {
            filas.push('');
            filas.push('MOVIMIENTO DE INVENTARIO DEL TURNO (POR TIPO)');
            filas.push('Tipo de movimiento;Movimientos;Productos;Costo');
            for (const m of reporte.movimientosTurno.resumenTipos) {
                filas.push([csvTexto(m.etiqueta), csvNum(m.movimientos, 0), csvNum(m.productos, 0), csvNum(m.costo_total)].join(';'));
            }
        }
    }
    filas.push('');
    filas.push('CUENTAS DEL ALCANCE');
    filas.push('Pedido;Mesa;Mesero;Apertura;Cierre;Estado de pago;Lineas;Unidades;Venta;'
        + (reporte.incluirInventario ? 'Movimientos de inventario;Costo descontado' : ''));
    for (const c of reporte.cuentas) {
        filas.push([
            csvTexto(c.id), csvTexto(c.mesa), csvTexto(c.mesero),
            csvFecha(c.creado_en), c.fecha_cierre ? csvFecha(c.fecha_cierre) : '',
            csvTexto(c.estado_pago), csvNum(c.lineas, 0), csvNum(c.unidades, 0), csvNum(c.venta),
            reporte.incluirInventario
                ? `${c.movimientos != null ? csvNum(c.movimientos, 0) : ''};${c.costo_descontado != null ? csvNum(c.costo_descontado) : ''}`
                : ''
        ].join(';'));
    }
    return '\uFEFF' + filas.join('\r\n') + '\r\n';
}

/** CSV del detalle de un trago/platillo en el alcance del turno. */
function platilloTurnoACSV(detalle) {
    const filas = [];
    const p = detalle.platillo;
    filas.push(`Detalle de ${csvTexto(p.etiqueta.toLowerCase())};${csvTexto(p.nombre)};${etiquetaAlcanceTurno(detalle)}`);
    filas.push(`Categoria;${csvTexto(p.categoria)};Precio actual;${csvNum(p.precio)}`);
    filas.push(`Unidades vendidas;${csvNum(detalle.unidades, 0)};Venta;${csvNum(detalle.venta)}`);
    filas.push('');
    filas.push('VENTAS POR COMANDA');
    filas.push('Pedido;Mesa;Mesero;Cantidad;Precio unitario;Importe;Estado item;Estado de pago;Apertura cuenta');
    for (const l of detalle.lineas) {
        filas.push([
            csvTexto(l.pedido_id), csvTexto(l.mesa), csvTexto(l.mesero),
            csvNum(l.cantidad, 0), csvNum(l.precio_unitario), csvNum(l.importe),
            csvTexto(l.estado_item), csvTexto(l.estado_pago), csvFecha(l.creado_en)
        ].join(';'));
    }
    filas.push('');
    filas.push('CONSUMO TEORICO (RECETA × UNIDADES VENDIDAS)');
    filas.push(detalle.tiene_receta
        ? 'Insumo;Codigo;Unidad;Cantidad unitaria;Merma %;Cantidad bruta unitaria;Total teorico;Costo unitario est.;Costo total'
        : 'Sin receta activa: el platillo no descuenta inventario');
    for (const t of detalle.teorico) {
        filas.push([
            csvTexto(t.insumo), csvTexto(t.codigo), csvTexto(t.unidad),
            csvNum(t.cantidad_unitaria, 4), csvNum(t.merma_pct, 2), csvNum(t.bruta_unitaria, 4),
            csvNum(t.total, 3), csvNum(t.costo_unitario, 4), csvNum(t.costo_total)
        ].join(';'));
    }
    if (detalle.real) {
        filas.push('');
        filas.push('CONSUMO REAL (KARDEX) DE LAS COMANDAS QUE INCLUYEN EL PLATILLO');
        filas.push('Insumo;Codigo;Unidad;Cantidad real;Teorico;Desviacion;Movimientos;Costo real');
        for (const i of detalle.real.porInsumo) {
            filas.push([
                csvTexto(i.insumo), csvTexto(i.codigo), csvTexto(i.unidad),
                csvNum(i.cantidad, 3),
                i.teorico_total != null ? csvNum(i.teorico_total, 3) : 'no esta en la receta',
                i.desviacion != null ? csvNum(i.desviacion, 3) : '',
                csvNum(i.movimientos, 0), csvNum(i.costo)
            ].join(';'));
        }
        filas.push('');
        filas.push('MOVIMIENTOS DE INVENTARIO');
        filas.push('Fecha;Pedido;Documento;Tipo;Insumo;Lote;Almacen;Cantidad;Stock resultante;Costo');
        for (const f of detalle.real.filas) {
            filas.push([
                csvFecha(f.fecha_movimiento), csvTexto(f.pedido_id), csvTexto(f.documento_numero),
                csvTexto(ETIQUETAS_MOVIMIENTO[f.tipo_movimiento] || f.tipo_movimiento),
                csvTexto(f.insumo), csvTexto(f.numero_lote || ''), csvTexto(f.almacen),
                csvNum(f.cantidad, 3), csvNum(f.stock_nuevo, 3),
                csvNum(f.costo_total || (Number(f.cantidad || 0) * Number(f.costo_unitario || 0)))
            ].join(';'));
        }
    } else {
        filas.push('');
        filas.push('CONSUMO REAL (KARDEX);Requiere licencia con la funcion inventario');
    }
    return '\uFEFF' + filas.join('\r\n') + '\r\n';
}

module.exports = {
    saludInventario,
    margenPorPlatillo,
    ventasPorMesero,
    consumoPorInsumo,
    ventasPorHoras,
    ventasTurno,
    detallePlatilloTurno,
    tendencias,
    normalizarRango,
    margenACSV,
    saludACSV,
    explosionACSV,
    ventasMeseroACSV,
    consumoInsumosACSV,
    ventasHorasACSV,
    ventasTurnoACSV,
    platilloTurnoACSV,
    tendenciasACSV
};
