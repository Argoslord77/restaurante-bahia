// controllers/fichaCostoController.js
// Ficha de costo de productos de almacén y propagación del cambio de precio
// a las tres cartas del menú (CUP, Comisión y Zelle).
'use strict';

const FichaCostoService = require('../services/fichaCostoService');
const Costeo = require('../services/costeoService');
const logger = require('../config/logger');

/** Listado de productos con el estado de su ficha de costo. */
exports.viewFichas = async (req, res) => {
    try {
        const filtros = {
            busqueda: req.query.busqueda || '',
            sinFicha: req.query.sinFicha || ''
        };
        const [productos, parametros] = await Promise.all([
            FichaCostoService.listarProductosConFicha(filtros),
            FichaCostoService.obtenerParametros()
        ]);

        return res.render('inventarios/fichas-costo', {
            pageTitle: 'Fichas de Costo de Insumos',
            view: 'fichas_costo',
            user: req.user || null,
            productos,
            filtros,
            parametros,
            referencias: Costeo.REFERENCIAS_FOOD_COST
        });
    } catch (error) {
        logger.error('Error al cargar las fichas de costo:', error);
        if (req.flash) req.flash('error_msg', 'No se pudieron cargar las fichas de costo.');
        return res.redirect('/admin/productos');
    }
};

/** Editor de la ficha de un producto concreto. */
exports.viewFichaProducto = async (req, res) => {
    try {
        const { productoId } = req.params;
        const [datos, parametros, historial, impacto] = await Promise.all([
            FichaCostoService.obtenerFicha(productoId),
            FichaCostoService.obtenerParametros(),
            FichaCostoService.historialFichas(productoId).catch(() => []),
            FichaCostoService.analizarImpacto(productoId).catch(() => ({ platillos: [], total: 0 }))
        ]);

        return res.render('inventarios/ficha-costo-editar', {
            pageTitle: `Ficha de Costo · ${datos.producto.nombre}`,
            view: 'fichas_costo',
            user: req.user || null,
            producto: datos.producto,
            ficha: datos.ficha,
            conceptos: datos.conceptos,
            parametros,
            historial,
            platillosAfectados: impacto.platillos || [],
            referencias: Costeo.REFERENCIAS_FOOD_COST
        });
    } catch (error) {
        logger.error('Error al cargar la ficha del producto:', error);
        if (req.flash) req.flash('error_msg', error.message || 'No se pudo cargar la ficha de costo.');
        return res.redirect('/admin/fichas-costo');
    }
};

/**
 * Previsualización del cálculo sin guardar nada.
 * La usa el editor para recalcular en vivo mientras el operario teclea.
 */
exports.apiPrevisualizar = async (req, res) => {
    try {
        const calculo = Costeo.calcularFichaCosto(req.body || {});
        return res.json({ success: true, calculo });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

/**
 * Impacto de un costo (real o simulado) sobre los platillos que usan el insumo.
 * Es lo que alimenta el diálogo de «¿deseas actualizar los precios de carta?».
 */
exports.apiImpacto = async (req, res) => {
    try {
        const { productoId } = req.params;
        const costoSimulado = req.query.costo !== undefined && req.query.costo !== ''
            ? Number(req.query.costo)
            : null;

        const resultado = await FichaCostoService.analizarImpacto(
            productoId,
            Number.isFinite(costoSimulado) ? costoSimulado : null
        );
        return res.json({ success: true, ...resultado });
    } catch (error) {
        logger.error('Error al analizar el impacto del costo:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Guarda la ficha de costo.
 *
 * NO toca los precios de la carta: devuelve el impacto para que el operario
 * decida. Cambiar precios de venta sin preguntar sería inaceptable en un
 * sistema de caja.
 */
exports.apiGuardar = async (req, res) => {
    try {
        const { productoId } = req.params;
        const usuarioId = (req.user && req.user.id) || (req.session && req.session.user ? req.session.user.id : null);

        const resultado = await FichaCostoService.guardarFicha(productoId, req.body || {}, usuarioId);

        // Con el costo ya guardado, se calcula el impacto real sobre las cartas
        const impacto = await FichaCostoService.analizarImpacto(productoId).catch(() => ({ platillos: [], total: 0 }));

        const variacion = resultado.variacion_porcentaje;
        const superaUmbral = variacion !== null && Math.abs(variacion) >= resultado.umbral_aviso;

        return res.json({
            success: true,
            message: `Ficha de costo guardada (versión ${resultado.version}).`,
            ficha_id: resultado.ficha_id,
            costo_anterior: resultado.costo_anterior,
            costo_nuevo: resultado.costo_nuevo,
            variacion_porcentaje: variacion,
            supera_umbral: superaUmbral,
            // El diálogo solo se ofrece si hay platillos que dependan del insumo
            requiere_revision_precios: impacto.total > 0 && (variacion === null || variacion !== 0),
            platillos: impacto.platillos || [],
            parametros: impacto.parametros || null
        });
    } catch (error) {
        logger.error('Error al guardar la ficha de costo:', error);
        return res.status(400).json({ success: false, message: error.message });
    }
};

/** Aplica los precios de carta que el operario haya confirmado. */
exports.apiAplicarPrecios = async (req, res) => {
    try {
        const usuarioId = (req.user && req.user.id) || (req.session && req.session.user ? req.session.user.id : null);
        const { cambios, producto_id } = req.body || {};

        if (!Array.isArray(cambios) || cambios.length === 0) {
            return res.status(400).json({ success: false, message: 'No se recibió ningún cambio de precio.' });
        }

        const resultado = await FichaCostoService.aplicarPrecios(cambios, producto_id || null, usuarioId);

        const totalCartas = resultado.detalle.reduce((n, d) => n + d.cartas.length, 0);
        return res.json({
            success: true,
            message: `Se actualizaron ${totalCartas} precio(s) en ${resultado.actualizados} platillo(s).`,
            ...resultado
        });
    } catch (error) {
        logger.error('Error al aplicar los precios de carta:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/** Panel de rentabilidad de la carta completa. */
exports.viewRentabilidad = async (req, res) => {
    try {
        const { parametros, platillos } = await FichaCostoService.resumenRentabilidad();

        const conPrecio = platillos.filter(p => p.food_cost_porcentaje !== null);
        const resumen = {
            total: platillos.length,
            sin_precio: platillos.length - conPrecio.length,
            incompletos: platillos.filter(p => p.ingredientes_sin_ficha > 0).length,
            criticos: conPrecio.filter(p => p.evaluacion.nivel === 'critico').length,
            food_cost_medio: conPrecio.length
                ? Costeo.redondear(conPrecio.reduce((s, p) => s + p.food_cost_porcentaje, 0) / conPrecio.length, 2)
                : null
        };

        return res.render('inventarios/rentabilidad-carta', {
            pageTitle: 'Rentabilidad de la Carta',
            view: 'fichas_costo',
            user: req.user || null,
            platillos,
            parametros,
            resumen,
            referencias: Costeo.REFERENCIAS_FOOD_COST
        });
    } catch (error) {
        logger.error('Error al cargar la rentabilidad de la carta:', error);
        if (req.flash) req.flash('error_msg', 'No se pudo cargar el análisis de rentabilidad.');
        return res.redirect('/admin/fichas-costo');
    }
};
