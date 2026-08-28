// services/fichaCostoService.js
// Persistencia de las fichas de costo y análisis del impacto que un cambio de
// precio de compra tiene sobre los platillos del menú y del día.
//
// El cálculo vive en costeoService.js (funciones puras); aquí solo se orquesta
// la base de datos.
'use strict';

const db = require('../config/db');
const logger = require('../config/logger');
const Costeo = require('./costeoService');
const SettingService = require('./settingService');

const CAMPOS_CARTA = Object.freeze({
    CUP: 'precio',
    COMISION: 'precio_alt',
    ZELLE: 'precio_usd'
});

/** Parámetros del módulo, con valores por defecto si no están configurados. */
async function obtenerParametros() {
    const leer = async (clave, porDefecto) => {
        try {
            const valor = await SettingService.get(clave, porDefecto);
            const n = Number(valor);
            return Number.isFinite(n) ? n : porDefecto;
        } catch (_) {
            return porDefecto;
        }
    };

    const [foodCostObjetivo, imprevistos, redondeo, umbral] = await Promise.all([
        leer('costo_food_cost_objetivo', 30),
        leer('costo_imprevistos_default', 5),
        leer('costo_redondeo_cup', 5),
        leer('costo_umbral_aviso_variacion', 10)
    ]);

    // Tasa de la moneda de la carta Zelle, para cuando un platillo aún no
    // tiene precio en esa carta y no hay proporción que conservar
    let tasaZelle = 1;
    try {
        const [rows] = await db.query(
            `SELECT factor_cambio FROM monedas
              WHERE UPPER(codigo) IN ('USD', 'ZELLE') AND activo = 1
              ORDER BY es_moneda_base ASC LIMIT 1`);
        if (rows.length && Number(rows[0].factor_cambio) > 0) tasaZelle = Number(rows[0].factor_cambio);
    } catch (_) { /* se queda en 1 */ }

    return { foodCostObjetivo, imprevistos, multiploRedondeo: redondeo, umbralAviso: umbral, tasaZelle };
}

// ── Fichas de costo ────────────────────────────────────────────────────────

/** Listado de productos de almacén con el estado de su ficha de costo. */
async function listarProductosConFicha(filtros = {}) {
    const where = ['p.activo = 1'];
    const params = [];

    if (filtros.busqueda && String(filtros.busqueda).trim()) {
        where.push('(p.nombre LIKE ? OR p.codigo LIKE ?)');
        const t = `%${String(filtros.busqueda).trim().slice(0, 100)}%`;
        params.push(t, t);
    }
    if (filtros.sinFicha === '1' || filtros.sinFicha === true) {
        where.push('f.id IS NULL');
    }

    const [rows] = await db.query(`
        SELECT
            p.id, p.codigo, p.nombre, p.tipo,
            p.costo_promedio,
            ui.abreviatura AS unidad_inventario,
            f.id AS ficha_id,
            f.precio_compra,
            f.porcentaje_merma,
            f.costo_final_unitario,
            f.rendimiento_porcentaje,
            f.actualizado_en AS ficha_actualizada,
            (SELECT COUNT(DISTINCT rd.receta_id) FROM receta_detalles rd
              WHERE rd.producto_id = p.id) AS recetas_afectadas
        FROM productos p
        LEFT JOIN fichas_costo_producto f ON f.producto_id = p.id AND f.vigente = 1
        LEFT JOIN unidades_medida ui ON ui.id = p.unidad_inventario_id
        WHERE ${where.join(' AND ')}
        ORDER BY (f.id IS NULL) DESC, p.nombre ASC
    `, params);

    return rows;
}

/** Ficha vigente de un producto, con sus conceptos libres. */
async function obtenerFicha(productoId) {
    const [[producto]] = await db.query(`
        SELECT p.*, ui.abreviatura AS unidad_inventario, uc.abreviatura AS unidad_compra
        FROM productos p
        LEFT JOIN unidades_medida ui ON ui.id = p.unidad_inventario_id
        LEFT JOIN unidades_medida uc ON uc.id = p.unidad_compra_id
        WHERE p.id = ?`, [productoId]);

    if (!producto) throw new Error('El producto indicado no existe.');

    const [[ficha]] = await db.query(
        'SELECT * FROM fichas_costo_producto WHERE producto_id = ? AND vigente = 1 LIMIT 1',
        [productoId]);

    let conceptos = [];
    if (ficha) {
        const [rows] = await db.query(
            'SELECT id, concepto, tipo, valor, orden FROM fichas_costo_conceptos WHERE ficha_id = ? ORDER BY orden, id',
            [ficha.id]);
        conceptos = rows;
    }

    return { producto, ficha: ficha || null, conceptos };
}

/** Historial de versiones de la ficha de un producto. */
async function historialFichas(productoId, limite = 20) {
    const [rows] = await db.query(`
        SELECT id, version, precio_compra, porcentaje_merma, costo_final_unitario,
               vigente, creado_en, actualizado_en
        FROM fichas_costo_producto
        WHERE producto_id = ?
        ORDER BY version DESC
        LIMIT ?`, [productoId, Math.min(100, Math.max(1, parseInt(limite, 10) || 20))]);
    return rows;
}

/**
 * Guarda la ficha de costo creando una versión nueva y archivando la anterior.
 *
 * Versionar en vez de sobrescribir permite reconstruir con qué costo se calculó
 * el precio de un platillo en una fecha dada, que es justo lo que se necesita
 * cuando alguien pregunta por qué subió la carta.
 *
 * @returns {object} { ficha_id, calculo, costo_anterior, variacion_porcentaje }
 */
async function guardarFicha(productoId, datos, usuarioId = null) {
    const parametros = await obtenerParametros();

    const entrada = {
        precio_compra: datos.precio_compra,
        cantidad_presentacion: datos.cantidad_presentacion,
        porcentaje_merma: datos.porcentaje_merma,
        costo_flete: datos.costo_flete,
        costo_envase: datos.costo_envase,
        costo_mano_obra: datos.costo_mano_obra,
        otros_costos: datos.otros_costos,
        porcentaje_imprevistos: datos.porcentaje_imprevistos !== undefined && datos.porcentaje_imprevistos !== ''
            ? datos.porcentaje_imprevistos
            : parametros.imprevistos,
        conceptos: Array.isArray(datos.conceptos) ? datos.conceptos : []
    };

    const calculo = Costeo.calcularFichaCosto(entrada);

    const conexion = await db.getConnection();
    try {
        await conexion.beginTransaction();

        const [[anterior]] = await conexion.query(
            'SELECT id, version, costo_final_unitario FROM fichas_costo_producto WHERE producto_id = ? AND vigente = 1 LIMIT 1',
            [productoId]);

        const costoAnterior = anterior ? Number(anterior.costo_final_unitario) : null;
        const version = anterior ? Number(anterior.version) + 1 : 1;

        if (anterior) {
            await conexion.query('UPDATE fichas_costo_producto SET vigente = 0 WHERE id = ?', [anterior.id]);
        }

        const [resultado] = await conexion.query(`
            INSERT INTO fichas_costo_producto (
                producto_id, version, vigente, precio_compra, cantidad_presentacion,
                unidad_compra_id, unidad_inventario_id, proveedor, porcentaje_merma,
                costo_flete, costo_envase, costo_mano_obra, otros_costos, porcentaje_imprevistos,
                costo_unitario_bruto, costo_unitario_neto, costo_final_unitario,
                rendimiento_porcentaje, factor_rendimiento, observaciones, creada_por
            ) VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                productoId, version,
                calculo.precio_compra, calculo.cantidad_presentacion,
                datos.unidad_compra_id || null, datos.unidad_inventario_id || null,
                datos.proveedor ? String(datos.proveedor).slice(0, 150) : null,
                calculo.porcentaje_merma,
                Math.max(0, Number(datos.costo_flete) || 0),
                Math.max(0, Number(datos.costo_envase) || 0),
                Math.max(0, Number(datos.costo_mano_obra) || 0),
                Math.max(0, Number(datos.otros_costos) || 0),
                calculo.porcentaje_imprevistos,
                calculo.costo_unitario_bruto, calculo.costo_unitario_neto, calculo.costo_final_unitario,
                calculo.rendimiento_porcentaje, calculo.factor_rendimiento,
                datos.observaciones ? String(datos.observaciones).slice(0, 2000) : null,
                usuarioId
            ]);

        const fichaId = resultado.insertId;

        // Conceptos libres del operario
        if (entrada.conceptos.length) {
            const valores = entrada.conceptos
                .filter(c => c && c.concepto && String(c.concepto).trim())
                .map((c, i) => [
                    fichaId,
                    String(c.concepto).trim().slice(0, 120),
                    String(c.tipo).toUpperCase() === 'PORCENTAJE' ? 'PORCENTAJE' : 'FIJO',
                    Number(c.valor) || 0,
                    i + 1
                ]);
            if (valores.length) {
                await conexion.query(
                    'INSERT INTO fichas_costo_conceptos (ficha_id, concepto, tipo, valor, orden) VALUES ?',
                    [valores]);
            }
        }

        // El costo final de la ficha pasa a ser el costo de referencia del
        // producto: es lo que consumen las recetas y los informes existentes.
        await conexion.query('UPDATE productos SET costo_promedio = ? WHERE id = ?',
            [calculo.costo_final_unitario, productoId]);

        const variacion = costoAnterior && costoAnterior > 0
            ? ((calculo.costo_final_unitario - costoAnterior) / costoAnterior) * 100
            : null;

        await conexion.query(`
            INSERT INTO historial_precios_producto
                (producto_id, ficha_id, costo_anterior, costo_nuevo, variacion_porcentaje, motivo, usuario_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [productoId, fichaId, costoAnterior, calculo.costo_final_unitario,
             variacion === null ? null : Costeo.redondear(variacion, 3),
             datos.motivo ? String(datos.motivo).slice(0, 255) : 'Actualización de ficha de costo',
             usuarioId]);

        await conexion.commit();

        return {
            ficha_id: fichaId,
            version,
            calculo,
            costo_anterior: costoAnterior,
            costo_nuevo: calculo.costo_final_unitario,
            variacion_porcentaje: variacion === null ? null : Costeo.redondear(variacion, 2),
            umbral_aviso: parametros.umbralAviso
        };
    } catch (error) {
        await conexion.rollback();
        logger.error('Error al guardar la ficha de costo:', error);
        throw error;
    } finally {
        conexion.release();
    }
}

// ── Impacto sobre los platillos ────────────────────────────────────────────

/**
 * Platillos (del menú y del día) cuyas recetas usan un insumo determinado,
 * con su costo recalculado y los precios sugeridos para las tres cartas.
 *
 * Es la consulta que alimenta el diálogo «¿deseas actualizar los precios?».
 *
 * @param {number} productoId Insumo cuyo costo cambió
 * @param {number|null} costoSimulado Costo a considerar para ese insumo; si se
 *        omite se usa el vigente. Permite previsualizar antes de guardar.
 */
async function analizarImpacto(productoId, costoSimulado = null) {
    const parametros = await obtenerParametros();

    // Recetas que contienen el insumo, con el platillo al que dan lugar
    const [recetas] = await db.query(`
        SELECT DISTINCT
            r.id AS receta_id, r.nombre AS receta_nombre, r.rendimiento,
            r.platillo_id,
            pm.nombre AS platillo_nombre,
            pm.precio AS precio_cup, pm.precio_alt AS precio_comision, pm.precio_usd AS precio_zelle
        FROM receta_detalles rd
        INNER JOIN recetas r ON r.id = rd.receta_id
        LEFT JOIN platillos_menu pm ON pm.id = r.platillo_id
        WHERE rd.producto_id = ? AND r.activa = 1
        ORDER BY pm.nombre, r.nombre`, [productoId]);

    if (!recetas.length) return { parametros, platillos: [], total: 0 };

    const ids = recetas.map(r => r.receta_id);

    // Todos los ingredientes de esas recetas, con el costo vigente de cada uno
    const [ingredientes] = await db.query(`
        SELECT rd.receta_id, rd.producto_id, rd.cantidad, rd.porcentaje_merma,
               p.nombre AS producto_nombre,
               COALESCE(f.costo_final_unitario, p.costo_promedio, 0) AS costo_unitario
        FROM receta_detalles rd
        INNER JOIN productos p ON p.id = rd.producto_id
        LEFT JOIN fichas_costo_producto f ON f.producto_id = p.id AND f.vigente = 1
        WHERE rd.receta_id IN (?)`, [ids]);

    const porReceta = new Map();
    for (const ing of ingredientes) {
        if (!porReceta.has(ing.receta_id)) porReceta.set(ing.receta_id, []);
        porReceta.get(ing.receta_id).push(ing);
    }

    const platillos = recetas.map(receta => {
        const lista = porReceta.get(receta.receta_id) || [];

        // Costo actual (con el costo vigente del insumo)
        const actual = Costeo.calcularCostoPlatillo(lista, { rendimiento: receta.rendimiento });

        // Costo simulado (sustituyendo el costo del insumo que cambia)
        const listaSimulada = costoSimulado === null ? lista : lista.map(i =>
            i.producto_id === Number(productoId)
                ? { ...i, costo_unitario: costoSimulado }
                : i);
        const nuevo = Costeo.calcularCostoPlatillo(listaSimulada, { rendimiento: receta.rendimiento });

        const preciosActuales = {
            CUP: Number(receta.precio_cup) || 0,
            COMISION: Number(receta.precio_comision) || 0,
            ZELLE: Number(receta.precio_zelle) || 0
        };

        const sugerencias = Costeo.sugerirPreciosCartas(nuevo.costo_por_porcion, preciosActuales, {
            foodCostObjetivo: parametros.foodCostObjetivo,
            multiploRedondeo: parametros.multiploRedondeo,
            tasaZelle: parametros.tasaZelle
        });

        const variacionCosto = actual.costo_por_porcion > 0
            ? ((nuevo.costo_por_porcion - actual.costo_por_porcion) / actual.costo_por_porcion) * 100
            : null;

        return {
            receta_id: receta.receta_id,
            receta_nombre: receta.receta_nombre,
            platillo_id: receta.platillo_id,
            platillo_nombre: receta.platillo_nombre || receta.receta_nombre,
            tiene_platillo: Boolean(receta.platillo_id),
            porciones: nuevo.porciones,
            costo_actual: actual.costo_por_porcion,
            costo_nuevo: nuevo.costo_por_porcion,
            variacion_costo: variacionCosto === null ? null : Costeo.redondear(variacionCosto, 2),
            ingredientes_sin_ficha: nuevo.ingredientes_sin_ficha,
            precios_actuales: preciosActuales,
            sugerencias,
            // Semáforo con el precio que hoy tiene la carta CUP y el costo nuevo
            evaluacion: Costeo.evaluarFoodCost(
                sugerencias.CUP.indicadores_actual.food_cost_porcentaje,
                parametros.foodCostObjetivo)
        };
    });

    return { parametros, platillos, total: platillos.length };
}

/**
 * Aplica los precios elegidos por el operario sobre las tres cartas.
 *
 * @param {Array} cambios [{platillo_id, es_platillo_dia, cartas: {CUP: 120, ...}}]
 * @param {number|null} productoOrigenId Insumo que originó la revisión
 */
async function aplicarPrecios(cambios = [], productoOrigenId = null, usuarioId = null) {
    if (!Array.isArray(cambios) || cambios.length === 0) {
        return { actualizados: 0, detalle: [] };
    }

    const conexion = await db.getConnection();
    try {
        await conexion.beginTransaction();
        const detalle = [];

        for (const cambio of cambios) {
            const platilloId = Number(cambio.platillo_id);
            if (!platilloId) continue;

            const esDia = cambio.es_platillo_dia === true || cambio.es_platillo_dia === 1 ||
                          cambio.es_platillo_dia === '1';
            const tabla = esDia ? 'platillos_dia' : 'platillos_menu';

            const [[actual]] = await conexion.query(
                `SELECT precio, precio_alt, precio_usd FROM ${tabla} WHERE id = ? LIMIT 1`, [platilloId]);
            if (!actual) continue;

            const asignaciones = [];
            const valores = [];
            const registros = [];

            for (const [carta, campo] of Object.entries(CAMPOS_CARTA)) {
                const nuevo = cambio.cartas ? cambio.cartas[carta] : undefined;
                if (nuevo === undefined || nuevo === null || nuevo === '') continue;

                const valor = Number(nuevo);
                if (!Number.isFinite(valor) || valor < 0) continue;

                const anterior = Number(actual[campo]) || null;
                // No se registra un cambio que no cambia nada
                if (anterior !== null && Math.abs(anterior - valor) < 0.005) continue;

                asignaciones.push(`${campo} = ?`);
                valores.push(valor);
                registros.push({ carta, anterior, nuevo: valor });
            }

            if (!asignaciones.length) continue;

            await conexion.query(
                `UPDATE ${tabla} SET ${asignaciones.join(', ')} WHERE id = ?`,
                [...valores, platilloId]);

            for (const r of registros) {
                await conexion.query(`
                    INSERT INTO historial_precios_platillo
                        (platillo_id, es_platillo_dia, origen_producto_id, carta,
                         precio_anterior, precio_nuevo, costo_platillo,
                         food_cost_anterior, food_cost_nuevo, usuario_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [platilloId, esDia ? 1 : 0, productoOrigenId, r.carta,
                     r.anterior, r.nuevo,
                     cambio.costo_platillo !== undefined ? Number(cambio.costo_platillo) : null,
                     r.anterior ? Costeo.calcularIndicadores(cambio.costo_platillo, r.anterior).food_cost_porcentaje : null,
                     Costeo.calcularIndicadores(cambio.costo_platillo, r.nuevo).food_cost_porcentaje,
                     usuarioId]);
            }

            detalle.push({ platillo_id: platilloId, es_platillo_dia: esDia, cartas: registros });
        }

        // Se anota en el historial del insumo cuántos precios acabaron moviéndose
        if (productoOrigenId && detalle.length) {
            await conexion.query(`
                UPDATE historial_precios_producto
                   SET precios_actualizados = ?, platillos_afectados = ?
                 WHERE producto_id = ?
                 ORDER BY id DESC LIMIT 1`,
                [detalle.reduce((n, d) => n + d.cartas.length, 0), detalle.length, productoOrigenId]);
        }

        await conexion.commit();
        return { actualizados: detalle.length, detalle };
    } catch (error) {
        await conexion.rollback();
        logger.error('Error al aplicar los precios de carta:', error);
        throw error;
    } finally {
        conexion.release();
    }
}

/** Panel de rentabilidad: todos los platillos con receta y su food cost. */
async function resumenRentabilidad() {
    const parametros = await obtenerParametros();

    const [recetas] = await db.query(`
        SELECT r.id AS receta_id, r.nombre AS receta_nombre, r.rendimiento, r.platillo_id,
               pm.nombre AS platillo_nombre,
               pm.precio AS precio_cup, pm.precio_alt AS precio_comision, pm.precio_usd AS precio_zelle
        FROM recetas r
        LEFT JOIN platillos_menu pm ON pm.id = r.platillo_id
        WHERE r.activa = 1
        ORDER BY pm.nombre, r.nombre`);

    if (!recetas.length) return { parametros, platillos: [] };

    const [ingredientes] = await db.query(`
        SELECT rd.receta_id, rd.producto_id, rd.cantidad, rd.porcentaje_merma,
               p.nombre AS producto_nombre,
               COALESCE(f.costo_final_unitario, p.costo_promedio, 0) AS costo_unitario
        FROM receta_detalles rd
        INNER JOIN productos p ON p.id = rd.producto_id
        LEFT JOIN fichas_costo_producto f ON f.producto_id = p.id AND f.vigente = 1
        WHERE rd.receta_id IN (?)`, [recetas.map(r => r.receta_id)]);

    const porReceta = new Map();
    for (const ing of ingredientes) {
        if (!porReceta.has(ing.receta_id)) porReceta.set(ing.receta_id, []);
        porReceta.get(ing.receta_id).push(ing);
    }

    const platillos = recetas.map(r => {
        const costo = Costeo.calcularCostoPlatillo(porReceta.get(r.receta_id) || [],
            { rendimiento: r.rendimiento });
        const indicadores = Costeo.calcularIndicadores(costo.costo_por_porcion, Number(r.precio_cup) || 0);
        return {
            receta_id: r.receta_id,
            platillo_id: r.platillo_id,
            nombre: r.platillo_nombre || r.receta_nombre,
            costo: costo.costo_por_porcion,
            ingredientes_sin_ficha: costo.ingredientes_sin_ficha,
            precio_cup: Number(r.precio_cup) || null,
            precio_comision: Number(r.precio_comision) || null,
            precio_zelle: Number(r.precio_zelle) || null,
            ...indicadores,
            sugerido: Costeo.precioSugerido(costo.costo_por_porcion,
                parametros.foodCostObjetivo, parametros.multiploRedondeo).precio_redondeado,
            evaluacion: Costeo.evaluarFoodCost(indicadores.food_cost_porcentaje, parametros.foodCostObjetivo)
        };
    });

    return { parametros, platillos };
}

module.exports = {
    CAMPOS_CARTA,
    obtenerParametros,
    listarProductosConFicha,
    obtenerFicha,
    historialFichas,
    guardarFicha,
    analizarImpacto,
    aplicarPrecios,
    resumenRentabilidad
};
