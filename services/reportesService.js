// services/reportesService.js
// Reportes de control físico y financiero del negocio:
//  · saludInventario(): alertas de stock (bajo mínimo), lotes vencidos o por
//    vencer y capital detenido en productos sin rotación.
//  · margenPorPlatillo(): ventas reales del período vs costo estándar de
//    cada platillo (ficha de costo / receta), margen contribuido y food
//    cost real ponderado.
'use strict';

const db = require('../config/db');
const Costeo = require('./costeoService');

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

module.exports = { saludInventario, margenPorPlatillo, normalizarRango };
