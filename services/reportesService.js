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
const CajaService = require('./cajaService');
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

// ── Ventas del turno ─────────────────────────────────────────────────────
const PAGOS_CERRADOS = ['pagado', 'facturado', 'cortesia'];
const PAGOS_ABIERTOS = ['pendiente', 'pendiente_pago'];

/**
 * Turnos para el selector del reporte: el que sigue abierto (si lo hay) más
 * los últimos 9 cerrados. Orden: más reciente primero (el abierto, que por
 * definición es el de mayor id, queda de primero).
 */
async function listarTurnos() {
    const [filas] = await db.query(`
        (
            SELECT ts.id, ts.estado, ts.fecha_apertura, ts.fecha_cierre,
                   TRIM(CONCAT(COALESCE(ua.nombre, ''), ' ', COALESCE(ua.apellidos, ''))) AS abierto_por,
                   (SELECT COUNT(*) FROM pedidos p WHERE p.turno_servicio_id = ts.id) AS pedidos
            FROM turnos_servicio ts
            LEFT JOIN usuarios ua ON ts.usuario_apertura_id = ua.id
            WHERE ts.estado = 'abierto'
            LIMIT 1
        )
        UNION ALL
        (
            SELECT ts.id, ts.estado, ts.fecha_apertura, ts.fecha_cierre,
                   TRIM(CONCAT(COALESCE(ua.nombre, ''), ' ', COALESCE(ua.apellidos, ''))) AS abierto_por,
                   (SELECT COUNT(*) FROM pedidos p WHERE p.turno_servicio_id = ts.id) AS pedidos
            FROM turnos_servicio ts
            LEFT JOIN usuarios ua ON ts.usuario_apertura_id = ua.id
            WHERE ts.estado = 'cerrado'
            ORDER BY ts.id DESC
            LIMIT 9
        )
        ORDER BY id DESC
    `);
    return filas.map(f => ({
        id: Number(f.id),
        estado: f.estado,
        en_curso: f.estado === 'abierto',
        fecha_apertura: f.fecha_apertura,
        fecha_cierre: f.fecha_cierre,
        abierto_por: String(f.abierto_por || '').trim() || 'N/D',
        pedidos: num(f.pedidos)
    }));
}

/** Duración legible del turno ("6 h 25 min"); si sigue abierto, hasta ahora. */
function duracionTurno(desde, hasta) {
    const ini = new Date(desde).getTime();
    const fin = hasta ? new Date(hasta).getTime() : Date.now();
    if (!Number.isFinite(ini) || !Number.isFinite(fin) || fin < ini) return '—';
    const min = Math.floor((fin - ini) / 60000);
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h <= 0) return `${m} min`;
    if (m <= 0) return `${h} h`;
    return `${h} h ${m} min`;
}

/**
 * Análisis de ventas de un turno específico (cerrado o en curso):
 * ranking de platillos y bebidas más vendidos con clasificación ABC por
 * aporte al ingreso, split comestibles vs bebidas, ventas por categoría,
 * hora, mesero y mesa, métodos de pago y cuentas abiertas en curso.
 *
 * Criterio: las cuentas cerradas (pagadas, facturadas y cortesías) forman
 * las ventas; las cortesías suman unidades pero $0 al ingreso; lo
 * cancelado queda fuera salvo conteo aparte. Devuelve null si no existe.
 */
async function ventasDelTurno(turnoId) {
    const id = Math.floor(Number(turnoId));
    if (!Number.isFinite(id) || id <= 0) return null;

    const [cab] = await db.query(`
        SELECT ts.id, ts.estado, ts.fecha_apertura, ts.fecha_cierre,
               COALESCE(ts.monto_apertura, 0) AS monto_apertura,
               TRIM(CONCAT(COALESCE(ua.nombre, ''), ' ', COALESCE(ua.apellidos, ''))) AS abierto_por,
               TRIM(CONCAT(COALESCE(uc.nombre, ''), ' ', COALESCE(uc.apellidos, ''))) AS cerrado_por
        FROM turnos_servicio ts
        LEFT JOIN usuarios ua ON ts.usuario_apertura_id = ua.id
        LEFT JOIN usuarios uc ON ts.usuario_cierre_id = uc.id
        WHERE ts.id = ?
    `, [id]);
    if (!cab.length) return null;
    const turno = cab[0];
    const enCurso = turno.estado === 'abierto';

    // Consultas independientes en paralelo; orden fijo (los tests lo usan).
    const [qResumen, qItems, qHoras, qMeseros, qMesas, qAbiertas, qCancel] = await Promise.all([
        db.query(`
            SELECT p.estado_pago, p.estado_pedido,
                   COUNT(*) AS cuentas,
                   COALESCE(SUM(p.total), 0) AS ventas,
                   COALESCE(SUM(p.subtotal), 0) AS subtotal,
                   COALESCE(SUM(p.descuento), 0) AS descuentos,
                   COALESCE(SUM(p.propina), 0) AS propinas,
                   COALESCE(SUM(p.comensales), 0) AS comensales
            FROM pedidos p
            WHERE p.turno_servicio_id = ?
            GROUP BY p.estado_pago, p.estado_pedido
        `, [id]),
        db.query(`
            SELECT dp.id_platillo, dp.es_platillo_dia,
                   COALESCE(pm.nombre, pd.nombre, 'Platillo') AS nombre,
                   COALESCE(cp.nombre, CASE WHEN dp.es_platillo_dia = 1 THEN 'Del día' ELSE 'Sin categoría' END) AS categoria,
                   CASE WHEN dp.es_platillo_dia = 1 THEN pd.tipo ELSE COALESCE(cp.tipo, 'SIN_CLASIFICAR') END AS tipo,
                   SUM(dp.cantidad) AS unidades,
                   SUM(CASE WHEN p.estado_pago = 'cortesia' THEN 0 ELSE dp.cantidad * dp.precio_unitario END) AS ingreso,
                   SUM(CASE WHEN p.estado_pago = 'cortesia' THEN dp.cantidad ELSE 0 END) AS unds_cortesia,
                   COUNT(DISTINCT p.id) AS cuentas
            FROM detalles_pedido dp
            INNER JOIN pedidos p ON p.id = dp.id_pedido
            LEFT JOIN platillos_menu pm
                ON dp.id_platillo = pm.id AND (dp.es_platillo_dia = 0 OR dp.es_platillo_dia IS NULL)
            LEFT JOIN platillos_dia pd ON dp.id_platillo = pd.id AND dp.es_platillo_dia = 1
            LEFT JOIN categorias_platillos cp ON pm.categoria = cp.id
            WHERE p.turno_servicio_id = ?
              AND p.estado_pedido != 'cancelado'
              AND p.estado_pago IN ('pagado', 'facturado', 'cortesia')
              AND dp.estado_item != 'cancelado'
            GROUP BY dp.id_platillo, dp.es_platillo_dia,
                     COALESCE(pm.nombre, pd.nombre, 'Platillo'),
                     COALESCE(cp.nombre, CASE WHEN dp.es_platillo_dia = 1 THEN 'Del día' ELSE 'Sin categoría' END),
                     CASE WHEN dp.es_platillo_dia = 1 THEN pd.tipo ELSE COALESCE(cp.tipo, 'SIN_CLASIFICAR') END
            ORDER BY unidades DESC, ingreso DESC
            LIMIT 200
        `, [id]),
        db.query(`
            SELECT HOUR(p.creado_en) AS hora,
                   COUNT(*) AS cuentas,
                   COALESCE(SUM(CASE WHEN p.estado_pago = 'cortesia' THEN 0 ELSE p.total END), 0) AS ventas
            FROM pedidos p
            WHERE p.turno_servicio_id = ?
              AND p.estado_pedido != 'cancelado'
              AND p.estado_pago IN ('pagado', 'facturado', 'cortesia')
            GROUP BY HOUR(p.creado_en)
            ORDER BY hora ASC
        `, [id]),
        db.query(`
            SELECT u.id,
                   CONCAT(u.nombre, ' ', COALESCE(u.apellidos, '')) AS mesero,
                   u.rol,
                   COUNT(p.id) AS cuentas,
                   SUM(CASE WHEN p.estado_pago = 'cortesia' THEN 1 ELSE 0 END) AS cortesias,
                   COALESCE(SUM(CASE WHEN p.estado_pago = 'cortesia' THEN 0 ELSE p.total END), 0) AS ventas,
                   COALESCE(SUM(p.propina), 0) AS propinas,
                   COALESCE(SUM(p.descuento), 0) AS descuentos
            FROM usuarios u
            INNER JOIN pedidos p ON p.id_usuario_mesero = u.id
                AND p.turno_servicio_id = ?
                AND p.estado_pedido != 'cancelado'
                AND p.estado_pago IN ('pagado', 'facturado', 'cortesia')
            GROUP BY u.id, u.nombre, u.apellidos, u.rol
            ORDER BY ventas DESC, cuentas DESC
        `, [id]),
        db.query(`
            SELECT m.id, m.numero, m.capacidad,
                   COUNT(p.id) AS cuentas,
                   COALESCE(SUM(CASE WHEN p.estado_pago = 'cortesia' THEN 0 ELSE p.total END), 0) AS ventas,
                   COALESCE(SUM(p.comensales), 0) AS comensales
            FROM mesas m
            INNER JOIN pedidos p ON p.id_mesa = m.id
                AND p.turno_servicio_id = ?
                AND p.estado_pedido != 'cancelado'
                AND p.estado_pago IN ('pagado', 'facturado', 'cortesia')
            GROUP BY m.id, m.numero, m.capacidad
            ORDER BY ventas DESC, cuentas DESC
        `, [id]),
        db.query(`
            SELECT p.id, p.creado_en, p.total, p.comensales, p.estado_pedido, p.estado_pago,
                   m.numero AS mesa,
                   TRIM(CONCAT(COALESCE(u.nombre, ''), ' ', COALESCE(u.apellidos, ''))) AS mesero,
                   (SELECT COALESCE(SUM(dp.cantidad), 0)
                    FROM detalles_pedido dp
                    WHERE dp.id_pedido = p.id AND dp.estado_item != 'cancelado') AS items
            FROM pedidos p
            INNER JOIN mesas m ON m.id = p.id_mesa
            LEFT JOIN usuarios u ON u.id = p.id_usuario_mesero
            WHERE p.turno_servicio_id = ?
              AND p.estado_pedido != 'cancelado'
              AND p.estado_pago IN ('pendiente', 'pendiente_pago')
            ORDER BY p.creado_en ASC
        `, [id]),
        db.query(`
            SELECT (SELECT COUNT(*) FROM pedidos p
                    WHERE p.turno_servicio_id = ? AND p.estado_pedido = 'cancelado') AS ordenes_canceladas,
                   (SELECT COALESCE(SUM(dp.cantidad), 0)
                    FROM detalles_pedido dp
                    INNER JOIN pedidos p ON p.id = dp.id_pedido
                    WHERE p.turno_servicio_id = ? AND dp.estado_item = 'cancelado') AS items_cancelados
        `, [id, id])
    ]);
    const [resumenPagos] = qResumen;
    const [items] = qItems;
    const [horas] = qHoras;
    const [meseros] = qMeseros;
    const [mesas] = qMesas;
    const [abiertas] = qAbiertas;
    const [cancel] = qCancel;
    const pagos = await CajaService.obtenerDesglosePagos(id);

    // 1) Resumen por estado: cerradas (cobro), abiertas (en curso), cortesías.
    let cuentasCerradas = 0, cuentasAbiertas = 0, ventas = 0, subtotal = 0;
    let descuentos = 0, propinas = 0, comensales = 0, consumoEnCurso = 0;
    let cortesias = 0, cortesiasValor = 0;
    for (const f of resumenPagos) {
        if (f.estado_pedido === 'cancelado') continue; // se cuenta aparte
        const n = num(f.cuentas);
        if (PAGOS_CERRADOS.includes(f.estado_pago)) {
            cuentasCerradas += n;
            if (f.estado_pago === 'cortesia') {
                cortesias += n;
                cortesiasValor += Number(f.subtotal || 0);
            } else {
                ventas += Number(f.ventas || 0);
            }
            subtotal += Number(f.subtotal || 0);
            descuentos += Number(f.descuentos || 0);
            propinas += Number(f.propinas || 0);
            comensales += Number(f.comensales || 0);
        } else if (PAGOS_ABIERTOS.includes(f.estado_pago)) {
            cuentasAbiertas += n;
            consumoEnCurso += Number(f.ventas || 0);
        }
    }

    // 2) Ranking + clasificación ABC por aporte al ingreso (Pareto 80/95).
    const claveItem = (it) => `${Number(it.es_platillo_dia) === 1 ? 'D' : 'M'}:${it.id_platillo}`;
    const ingresoItems = items.reduce((s, it) => s + Number(it.ingreso || 0), 0);
    const porIngreso = [...items].sort((a, b) => Number(b.ingreso || 0) - Number(a.ingreso || 0));
    let acumulado = 0;
    const claseABC = new Map();
    for (const it of porIngreso) {
        acumulado += Number(it.ingreso || 0);
        const pct = ingresoItems > 0 ? (acumulado / ingresoItems) * 100 : 100;
        claseABC.set(claveItem(it), pct <= 80 ? 'A' : pct <= 95 ? 'B' : 'C');
    }

    let totUnidades = 0, totCortesiaUnds = 0;
    const ranking = items.map(it => {
        const unidades = num(it.unidades);
        const undsCortesia = num(it.unds_cortesia);
        const ingreso = num(it.ingreso, 2);
        const dePago = unidades - undsCortesia;
        totUnidades += unidades;
        totCortesiaUnds += undsCortesia;
        return {
            id_platillo: it.id_platillo,
            es_platillo_dia: Number(it.es_platillo_dia) === 1,
            nombre: it.nombre || 'Platillo',
            categoria: it.categoria || 'Sin categoría',
            tipo: it.tipo || 'SIN_CLASIFICAR',
            cuentas: num(it.cuentas),
            unidades,
            unds_cortesia: undsCortesia,
            ingreso,
            precio_promedio: dePago > 0 ? num(ingreso / dePago, 2) : null,
            clase_abc: claseABC.get(claveItem(it)) || 'C'
        };
    }).sort((a, b) => (b.unidades - a.unidades) || (b.ingreso - a.ingreso));
    for (const r of ranking) {
        r.pct_unidades = totUnidades > 0 ? num((r.unidades / totUnidades) * 100, 1) : 0;
        r.pct_ingreso = ingresoItems > 0 ? num((r.ingreso / ingresoItems) * 100, 1) : 0;
    }

    // 3) Split comestibles vs bebidas + ventas por categoría (del ranking).
    const ETIQ_TIPO = { COMESTIBLES: 'Comestibles', BEBIDAS: 'Bebidas', SIN_CLASIFICAR: 'Sin clasificar' };
    const tipos = {};
    const porCat = new Map();
    for (const r of ranking) {
        const k = ETIQ_TIPO[r.tipo] ? r.tipo : 'SIN_CLASIFICAR';
        const t = tipos[k] || (tipos[k] = { tipo: k, etiqueta: ETIQ_TIPO[k], items: 0, unidades: 0, ingreso: 0 });
        t.items += 1;
        t.unidades += r.unidades;
        t.ingreso = num(t.ingreso + r.ingreso, 2);
        const c = porCat.get(r.categoria) || { categoria: r.categoria, items: 0, unidades: 0, ingreso: 0 };
        c.items += 1;
        c.unidades += r.unidades;
        c.ingreso = num(c.ingreso + r.ingreso, 2);
        porCat.set(r.categoria, c);
    }
    const splitTipos = Object.values(tipos).map(t => ({
        ...t,
        pct_unidades: totUnidades > 0 ? num((t.unidades / totUnidades) * 100, 1) : 0,
        pct_ingreso: ingresoItems > 0 ? num((t.ingreso / ingresoItems) * 100, 1) : 0
    })).sort((a, b) => b.ingreso - a.ingreso);
    const categorias = [...porCat.values()].map(c => ({
        ...c,
        pct_ingreso: ingresoItems > 0 ? num((c.ingreso / ingresoItems) * 100, 1) : 0
    })).sort((a, b) => b.ingreso - a.ingreso);

    // 4) Distribución por hora de apertura de cuenta + hora pico.
    const totVentasHoras = horas.reduce((s, h) => s + Number(h.ventas || 0), 0);
    const porHora = horas.map(h => ({
        hora: num(h.hora),
        etiqueta: `${String(h.hora).padStart(2, '0')}:00`,
        cuentas: num(h.cuentas),
        ventas: num(h.ventas, 2),
        pct_ventas: totVentasHoras > 0 ? num((Number(h.ventas || 0) / totVentasHoras) * 100, 1) : 0
    }));
    const maxHoraVentas = porHora.reduce((m, h) => Math.max(m, h.ventas), 0);
    const horaPico = porHora.reduce((a, b) => (b.ventas > (a ? a.ventas : -1) ? b : a), null);

    // 5) Desempeño por mesero y por mesa dentro del turno.
    const porMesero = meseros.map(f => {
        const cuentas = num(f.cuentas);
        const v = num(f.ventas, 2);
        return {
            id: f.id,
            mesero: String(f.mesero || '').trim() || 'Mesero',
            rol: f.rol,
            cuentas,
            cortesias: num(f.cortesias),
            ventas: v,
            propinas: num(f.propinas, 2),
            descuentos: num(f.descuentos, 2),
            ticket_promedio: cuentas > 0 ? num(v / cuentas, 2) : 0
        };
    });
    const porMesa = mesas.map(f => {
        const cuentas = num(f.cuentas);
        const v = num(f.ventas, 2);
        return {
            id: f.id,
            numero: f.numero,
            capacidad: num(f.capacidad),
            cuentas,
            ventas: v,
            comensales: num(f.comensales),
            ticket_promedio: cuentas > 0 ? num(v / cuentas, 2) : 0
        };
    });

    // 6) Cuentas abiertas (turno en curso): consumo pendiente de cobro.
    const ahora = Date.now();
    const detalleAbiertas = abiertas.map(f => {
        const ts = new Date(f.creado_en).getTime();
        return {
            id: f.id,
            mesa: f.mesa,
            mesero: String(f.mesero || '').trim() || '—',
            items: num(f.items),
            total: num(f.total, 2),
            comensales: num(f.comensales),
            estado_pedido: f.estado_pedido,
            estado_pago: f.estado_pago,
            creado_en: f.creado_en,
            antiguedad_min: Number.isFinite(ts) ? Math.max(0, Math.round((ahora - ts) / 60000)) : null
        };
    });

    // 7) Métodos de pago (mismo desglose del arqueo) + cancelados.
    const metodosPago = (pagos || []).map(p => ({
        metodo_pago: p.metodo_pago,
        codigo_moneda: p.codigo_moneda,
        nombre_moneda: p.nombre_moneda,
        simbolo: p.simbolo,
        total_origen: num(p.total_origen, 2),
        total_local: num(p.total_local, 2),
        total_transacciones: num(p.total_transacciones),
        es_zelle: Number(p.es_zelle || 0) === 1,
        es_efectivo_caja: Number(p.es_efectivo_caja || 0) === 1
    }));
    const cobradoTotal = metodosPago.reduce((s, p) => s + p.total_local, 0);
    const cobradoCaja = metodosPago.filter(p => p.es_efectivo_caja).reduce((s, p) => s + p.total_local, 0);
    const canc = (cancel && cancel[0]) || {};

    return {
        turno: {
            id,
            estado: turno.estado,
            en_curso: enCurso,
            fecha_apertura: turno.fecha_apertura,
            fecha_cierre: turno.fecha_cierre,
            duracion: duracionTurno(turno.fecha_apertura, turno.fecha_cierre),
            abierto_por: String(turno.abierto_por || '').trim() || 'N/D',
            cerrado_por: enCurso ? null : (String(turno.cerrado_por || '').trim() || 'N/D'),
            monto_apertura: num(turno.monto_apertura, 2)
        },
        ranking,
        tipos: splitTipos,
        categorias,
        horas: porHora,
        horaPico: horaPico || null,
        maxHoraVentas: num(maxHoraVentas, 2),
        meseros: porMesero,
        mesas: porMesa,
        pagos: metodosPago,
        abiertas: detalleAbiertas,
        totales: {
            ventas: num(ventas, 2),
            cuentas_cerradas: cuentasCerradas,
            cuentas_abiertas: cuentasAbiertas,
            ticket_promedio: cuentasCerradas > 0 ? num(ventas / cuentasCerradas, 2) : 0,
            unidades: totUnidades,
            ingreso_items: num(ingresoItems, 2),
            items_distintos: ranking.length,
            subtotal: num(subtotal, 2),
            descuentos: num(descuentos, 2),
            propinas: num(propinas, 2),
            comensales,
            consumo_en_curso: num(consumoEnCurso, 2),
            cortesias,
            cortesias_valor: num(cortesiasValor, 2),
            unds_cortesia: totCortesiaUnds,
            ordenes_canceladas: num(canc.ordenes_canceladas),
            items_cancelados: num(canc.items_cancelados),
            mesas_distintas: porMesa.length,
            rotacion: porMesa.length > 0 ? num(cuentasCerradas / porMesa.length, 1) : 0,
            cobrado_total: num(cobradoTotal, 2),
            cobrado_caja: num(cobradoCaja, 2)
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
    filas.push('Insumo;Codigo;Unidad;Entradas cant;Entradas valor;Salidas cant;Salidas valor;Salidas: venta;Salidas: merma/ajuste;Desglose de salidas');
    for (const i of reporte.insumos) {
        const desglose = i.detalle_salidas.map(d => `${d.etiqueta} ${csvNum(d.cantidad, 3)} ($${csvNum(d.valor)})`).join(' | ');
        filas.push([
            csvTexto(i.nombre), csvTexto(i.codigo), csvTexto(i.unidad),
            csvNum(i.entradas_cantidad, 3), csvNum(i.entradas_valor),
            csvNum(i.salidas_cantidad, 3), csvNum(i.salidas_valor),
            csvNum(i.venta_valor), csvNum(i.merma_valor), csvTexto(desglose)
        ].join(';'));
    }
    const t = reporte.totales;
    filas.push(`TOTALES;;;;${csvNum(t.entradas_valor)};;${csvNum(t.salidas_valor)};${csvNum(t.consumo_venta_valor)};${csvNum(t.merma_valor)};Insumos: ${csvNum(t.insumos, 0)}`);
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

/** CSV del análisis de ventas del turno, por secciones. */
function ventasTurnoACSV(reporte) {
    const filas = [];
    const t = reporte.turno;
    const tot = reporte.totales;
    filas.push(`Ventas del turno;#${t.id};${t.en_curso ? 'EN CURSO' : 'Cerrado'};Abierto por ${csvTexto(t.abierto_por)}`);
    filas.push('');
    filas.push('RESUMEN');
    filas.push('Indicador;Valor');
    filas.push(`Ventas cobradas;${csvNum(tot.ventas)}`);
    filas.push(`Cuentas cerradas;${csvNum(tot.cuentas_cerradas, 0)}`);
    filas.push(`Ticket promedio;${csvNum(tot.ticket_promedio)}`);
    filas.push(`Unidades vendidas;${csvNum(tot.unidades, 0)}`);
    filas.push(`Platos/bebidas distintos;${csvNum(tot.items_distintos, 0)}`);
    filas.push(`Consumo en curso;${csvNum(tot.consumo_en_curso)}`);
    filas.push(`Cuentas abiertas;${csvNum(tot.cuentas_abiertas, 0)}`);
    filas.push(`Propinas;${csvNum(tot.propinas)}`);
    filas.push(`Descuentos;${csvNum(tot.descuentos)}`);
    filas.push(`Cortesias;${csvNum(tot.cortesias, 0)}`);
    filas.push(`Valor cortesias;${csvNum(tot.cortesias_valor)}`);
    filas.push(`Ordenes canceladas;${csvNum(tot.ordenes_canceladas, 0)}`);
    filas.push(`Items cancelados;${csvNum(tot.items_cancelados, 0)}`);
    filas.push(`Mesas distintas;${csvNum(tot.mesas_distintas, 0)}`);
    filas.push(`Rotacion (cuentas/mesa);${csvNum(tot.rotacion, 1)}`);
    filas.push('');
    filas.push('RANKING DE PLATILLOS Y BEBIDAS');
    filas.push('Pos;Platillo;Del dia;Tipo;Categoria;Cuentas;Unidades;% unds.;Ingreso;% ingr.;Precio prom.;Clase ABC');
    reporte.ranking.forEach((r, i) => {
        filas.push([
            i + 1, csvTexto(r.nombre), r.es_platillo_dia ? 'Si' : 'No',
            csvTexto(r.tipo), csvTexto(r.categoria), csvNum(r.cuentas, 0),
            csvNum(r.unidades, 0), csvNum(r.pct_unidades, 1), csvNum(r.ingreso),
            csvNum(r.pct_ingreso, 1),
            r.precio_promedio != null ? csvNum(r.precio_promedio) : '', r.clase_abc
        ].join(';'));
    });
    filas.push('');
    filas.push('COMESTIBLES VS BEBIDAS');
    filas.push('Tipo;Items;Unidades;% unds.;Ingreso;% ingr.');
    for (const tp of reporte.tipos) {
        filas.push(`${csvTexto(tp.etiqueta)};${csvNum(tp.items, 0)};${csvNum(tp.unidades, 0)};${csvNum(tp.pct_unidades, 1)};${csvNum(tp.ingreso)};${csvNum(tp.pct_ingreso, 1)}`);
    }
    filas.push('');
    filas.push('POR CATEGORIA');
    filas.push('Categoria;Items;Unidades;Ingreso;% ingr.');
    for (const c of reporte.categorias) {
        filas.push(`${csvTexto(c.categoria)};${csvNum(c.items, 0)};${csvNum(c.unidades, 0)};${csvNum(c.ingreso)};${csvNum(c.pct_ingreso, 1)}`);
    }
    filas.push('');
    filas.push('POR HORA');
    filas.push('Hora;Cuentas;Ventas;% ventas');
    for (const h of reporte.horas) {
        filas.push(`${h.etiqueta};${csvNum(h.cuentas, 0)};${csvNum(h.ventas)};${csvNum(h.pct_ventas, 1)}`);
    }
    filas.push('');
    filas.push('POR MESERO');
    filas.push('Mesero;Rol;Cuentas;Cortesias;Ventas;Ticket promedio;Propinas;Descuentos');
    for (const m of reporte.meseros) {
        filas.push([
            csvTexto(m.mesero), csvTexto(m.rol), csvNum(m.cuentas, 0),
            csvNum(m.cortesias, 0), csvNum(m.ventas), csvNum(m.ticket_promedio),
            csvNum(m.propinas), csvNum(m.descuentos)
        ].join(';'));
    }
    filas.push('');
    filas.push('POR MESA');
    filas.push('Mesa;Capacidad;Cuentas;Ventas;Comensales;Ticket promedio');
    for (const m of reporte.mesas) {
        filas.push([
            csvTexto(m.numero), csvNum(m.capacidad, 0), csvNum(m.cuentas, 0),
            csvNum(m.ventas), csvNum(m.comensales, 0), csvNum(m.ticket_promedio)
        ].join(';'));
    }
    filas.push('');
    filas.push('METODOS DE PAGO');
    filas.push('Metodo;Moneda;Transacciones;Total origen;Total (moneda local)');
    for (const p of reporte.pagos) {
        filas.push([
            csvTexto(p.metodo_pago), csvTexto(`${p.codigo_moneda} ${p.nombre_moneda || ''}`.trim()),
            csvNum(p.total_transacciones, 0), csvNum(p.total_origen), csvNum(p.total_local)
        ].join(';'));
    }
    if (reporte.abiertas.length) {
        filas.push('');
        filas.push('CUENTAS ABIERTAS');
        filas.push('Pedido;Mesa;Mesero;Items;Total;Antiguedad (min)');
        for (const a of reporte.abiertas) {
            filas.push(`${a.id};${csvTexto(a.mesa)};${csvTexto(a.mesero)};${csvNum(a.items, 0)};${csvNum(a.total)};${a.antiguedad_min != null ? csvNum(a.antiguedad_min, 0) : ''}`);
        }
    }
    return '\uFEFF' + filas.join('\r\n') + '\r\n';
}

/**
 * C6: propinas del turno — por mesero (pool y promedios) + detalle por
 * cuenta. Base para transparencia y reparto de propinas.
 */
async function propinasDelTurno(turnoId) {
    const [turnoRows] = await db.query(`
        SELECT ts.id, ts.estado, ts.fecha_apertura, ts.fecha_cierre,
               TRIM(CONCAT(COALESCE(u.nombre, ''), ' ', COALESCE(u.apellidos, ''))) AS abierto_por
        FROM turnos_servicio ts
        LEFT JOIN usuarios u ON ts.usuario_apertura_id = u.id
        WHERE ts.id = ? LIMIT 1
    `, [turnoId]);
    if (!turnoRows.length) return null;
    const t = turnoRows[0];
    const turno = {
        id: Number(t.id),
        estado: t.estado,
        fecha_apertura: t.fecha_apertura,
        fecha_cierre: t.fecha_cierre,
        abierto_por: String(t.abierto_por || '').trim() || 'N/D',
        en_curso: t.estado === 'abierto'
    };

    const [meserosRows] = await db.query(`
        SELECT u.id,
               TRIM(CONCAT(COALESCE(u.nombre, ''), ' ', COALESCE(u.apellidos, ''))) AS mesero,
               COUNT(p.id) AS cuentas,
               COALESCE(SUM(p.total), 0) AS ventas,
               COALESCE(SUM(p.propina), 0) AS propinas
        FROM usuarios u
        INNER JOIN pedidos p ON p.id_usuario_mesero = u.id
            AND p.turno_servicio_id = ?
            AND p.fecha_cierre IS NOT NULL
            AND p.estado_pago IN ('pagado', 'facturado', 'cortesia')
        GROUP BY u.id, u.nombre, u.apellidos
        ORDER BY propinas DESC, cuentas DESC
    `, [turnoId]);

    const [cuentasRows] = await db.query(`
        SELECT p.id, p.total, p.propina, p.fecha_cierre, p.estado_pago,
               m.numero AS mesa,
               TRIM(CONCAT(COALESCE(u.nombre, ''), ' ', COALESCE(u.apellidos, ''))) AS mesero
        FROM pedidos p
        LEFT JOIN mesas m ON p.id_mesa = m.id
        LEFT JOIN usuarios u ON p.id_usuario_mesero = u.id
        WHERE p.turno_servicio_id = ?
          AND p.fecha_cierre IS NOT NULL
          AND p.estado_pago IN ('pagado', 'facturado', 'cortesia')
        ORDER BY p.fecha_cierre DESC, p.id DESC
    `, [turnoId]);

    const pool = meserosRows.reduce((acc, f) => acc + Number(f.propinas || 0), 0);
    const meseros = meserosRows.map(f => {
        const cuentas = num(f.cuentas);
        const propinas = num(f.propinas, 2);
        return {
            id: f.id,
            mesero: String(f.mesero || '').trim() || 'Mesero',
            cuentas,
            ventas: num(f.ventas, 2),
            propinas,
            propina_promedio: cuentas > 0 ? num(propinas / cuentas, 2) : 0,
            pct_pool: pool > 0 ? num(propinas / pool * 100, 1) : 0
        };
    });
    const cuentas = cuentasRows.map(x => ({
        id: x.id,
        mesa: x.mesa ?? '—',
        mesero: String(x.mesero || '').trim() || '—',
        total: num(x.total, 2),
        propina: num(x.propina, 2),
        estado_pago: x.estado_pago,
        fecha_cierre: x.fecha_cierre
    }));
    const totCuentas = meseros.reduce((acc, m) => acc + m.cuentas, 0);
    return {
        turno,
        meseros,
        cuentas,
        totales: {
            meseros: meseros.length,
            cuentas: totCuentas,
            ventas: num(meseros.reduce((acc, m) => acc + m.ventas, 0), 2),
            propinas: num(pool, 2),
            propina_promedio: totCuentas > 0 ? num(pool / totCuentas, 2) : 0
        }
    };
}

/** CSV de propinas del turno: resumen por mesero + detalle de cuentas. */
function propinasACSV(reporte) {
    const filas = [];
    const t = reporte.turno;
    filas.push(`Propinas del turno;#${t.id};${csvTexto(t.abierto_por)};${csvTexto(t.fecha_apertura ? String(t.fecha_apertura) : '')}`);
    filas.push('');
    filas.push('Mesero;Cuentas;Ventas;Propinas;Propina promedio;% del pool');
    for (const m of reporte.meseros) {
        filas.push([
            csvTexto(m.mesero), csvNum(m.cuentas, 0), csvNum(m.ventas),
            csvNum(m.propinas), csvNum(m.propina_promedio), csvNum(m.pct_pool, 1)
        ].join(';'));
    }
    const tot = reporte.totales;
    filas.push(`TOTALES;${csvNum(tot.cuentas, 0)};${csvNum(tot.ventas)};${csvNum(tot.propinas)};${csvNum(tot.propina_promedio)};100`);
    filas.push('');
    filas.push('Cuenta;Mesa;Mesero;Total;Propina;Estado;Fecha cierre');
    for (const c of reporte.cuentas) {
        filas.push([
            csvNum(c.id, 0), csvTexto(String(c.mesa)), csvTexto(c.mesero),
            csvNum(c.total), csvNum(c.propina), csvTexto(c.estado_pago),
            csvTexto(c.fecha_cierre ? String(c.fecha_cierre) : '')
        ].join(';'));
    }
    return '\uFEFF' + filas.join('\r\n') + '\r\n';
}

module.exports = {
    saludInventario,
    margenPorPlatillo,
    ventasPorMesero,
    consumoPorInsumo,
    ventasPorHoras,
    listarTurnos,
    ventasDelTurno,
    normalizarRango,
    margenACSV,
    saludACSV,
    explosionACSV,
    ventasMeseroACSV,
    consumoInsumosACSV,
    ventasHorasACSV,
    ventasTurnoACSV,
    propinasDelTurno,
    propinasACSV
};
