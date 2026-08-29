// controllers/kardexController.js
// Vistas del módulo de kardex: índice con el resumen por producto y la
// tarjeta completa de un producto (entradas/salidas/saldo corrido), más la
// exportación a CSV para el control contable externo.
'use strict';

const KardexService = require('../services/kardexService');
const db = require('../config/db');

exports.viewKardex = async (req, res) => {
    try {
        const filtros = KardexService.normalizarFiltros(req.query);
        filtros.q = String(req.query.q || '').trim().slice(0, 60);
        const pagina = Math.max(1, parseInt(req.query.pagina, 10) || 1);
        const productoId = parseInt(req.query.producto, 10) || null;

        // Almacenes para el filtro (mismo criterio que el resto del módulo)
        const [almacenes] = await db.query(
            'SELECT id, nombre FROM almacenes WHERE activo = 1 ORDER BY nombre ASC'
        ).catch(() => [[]]);

        // Sin producto elegido: índice con el resumen del período
        if (!productoId) {
            const listado = await KardexService.listarProductos(filtros, { pagina });
            return res.render('inventarios/kardex', {
                title: 'Kardex de Inventario - Restaurante Bahía',
                view: 'kardex',
                filtros,
                almacenes: almacenes || [],
                etiquetasMovimiento: KardexService.ETIQUETAS_MOVIMIENTO,
                modo: 'indice',
                listado,
                tarjeta: null,
                user: req.user || null,
                success_msg: req.flash ? req.flash('success_msg') : null,
                error_msg: req.flash ? req.flash('error_msg') : null
            });
        }

        // Con producto: la tarjeta completa
        try {
            const tarjeta = await KardexService.obtenerTarjeta(productoId, filtros);
            return res.render('inventarios/kardex', {
                title: `Kardex ${tarjeta.producto.nombre} - Restaurante Bahía`,
                view: 'kardex',
                filtros,
                almacenes: almacenes || [],
                etiquetasMovimiento: KardexService.ETIQUETAS_MOVIMIENTO,
                modo: 'tarjeta',
                listado: null,
                tarjeta,
                user: req.user || null,
                success_msg: req.flash ? req.flash('success_msg') : null,
                error_msg: req.flash ? req.flash('error_msg') : null
            });
        } catch (err) {
            if (err.status === 404 || err.status === 400) {
                req.flash && req.flash('error_msg', err.message);
                return res.redirect('/admin/kardex');
            }
            throw err;
        }
    } catch (error) {
        console.error('Error al cargar el kardex:', error);
        return res.status(500).send('Error interno al generar el kardex');
    }
};

exports.exportarKardex = async (req, res) => {
    try {
        const filtros = KardexService.normalizarFiltros(req.query);
        const productoId = parseInt(req.query.producto, 10) || null;
        if (!productoId) {
            return res.redirect('/admin/kardex');
        }
        const tarjeta = await KardexService.obtenerTarjeta(productoId, filtros);
        const { csv, filas } = KardexService.tarjetaACSV(tarjeta);

        const marca = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
        const slug = String(tarjeta.producto.nombre || 'producto')
            .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'producto';
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="kardex_${slug}_${marca}.csv"`);
        res.setHeader('X-Kardex-Filas', String(filas));
        return res.send(csv);
    } catch (error) {
        console.error('Error al exportar el kardex:', error);
        return res.redirect('/admin/kardex');
    }
};
