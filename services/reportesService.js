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

module.exports = {
    saludInventario,
    margenPorPlatillo,
    ventasPorMesero,
    consumoPorInsumo,
    ventasPorHoras,
    normalizarRango,
    margenACSV,
    saludACSV,
    explosionACSV,
    ventasMeseroACSV,
    consumoInsumosACSV,
    ventasHorasACSV
};
