// controllers/reportesController.js
// Centro de reportes: punto de entrada único a la información de control
// físico y financiero del negocio. Incluye el hub, la salud del inventario,
// el margen real por platillo y la explosión de recetas (consumo teórico
// vs real, kardex vs POS).
'use strict';

const ReportesService = require('../services/reportesService');
const ReporteModel = require('../models/reporteModel');
const db = require('../config/db');

// Enlaces del hub: qué es, qué controla y a dónde lleva.
// `interno: true` son módulos ya existentes que se re-agrupan aquí.
const ENLACES = [
    {
        id: 'kardex',
        titulo: 'Kardex de inventario',
        descripcion: 'Tarjeta por producto: entradas, salidas y saldo corrido en unidades y valor. Exportable a CSV.',
        icono: 'fa-solid fa-clipboard-check',
        url: '/admin/kardex',
        grupo: 'Control físico',
        badge: 'NUEVO'
    },
    {
        id: 'explosion',
        titulo: 'Explosión de recetas',
        descripcion: 'Consumo teórico (ficha técnica) vs consumo real del kardex por venta. Detecta fugas y mermas anómalas.',
        icono: 'fa-solid fa-explosion',
        url: '/admin/reportes/explosion-recetas',
        grupo: 'Control físico',
        badge: 'NUEVO'
    },
    {
        id: 'salud',
        titulo: 'Salud del inventario',
        descripcion: 'Bajo mínimo, lotes vencidos, por vencer y capital detenido sin rotación, con su impacto en dinero.',
        icono: 'fa-solid fa-heart-pulse',
        url: '/admin/reportes/salud-inventario',
        grupo: 'Control físico',
        badge: 'NUEVO'
    },
    {
        id: 'valorizacion',
        titulo: 'Valorización de inventario',
        descripcion: 'Valor del stock por almacén y lote a costo unitario (Σ cantidad × costo).',
        icono: 'fa-solid fa-sack-dollar',
        url: '/admin/inventario/valorizacion',
        grupo: 'Control físico',
        interno: true
    },
    {
        id: 'margen',
        titulo: 'Margen real por platillo',
        descripcion: 'Ventas cobradas del período vs costo estándar: margen contribuido y food cost real ponderado.',
        icono: 'fa-solid fa-chart-line',
        url: '/admin/reportes/margen-platillos',
        grupo: 'Control financiero',
        badge: 'NUEVO'
    },
    {
        id: 'rentabilidad',
        titulo: 'Rentabilidad de la carta',
        descripcion: 'Food cost de cada platillo según su ficha de costo y precios sugeridos.',
        icono: 'fa-solid fa-calculator',
        url: '/admin/fichas-costo/rentabilidad',
        grupo: 'Control financiero',
        interno: true
    },
    {
        id: 'cierre',
        titulo: 'Cierre del día',
        descripcion: 'Cuadre de caja del día: ventas por método de pago, propinas y arqueos.',
        icono: 'fa-solid fa-cash-register',
        url: '/admin/cierre-dia',
        grupo: 'Control financiero',
        interno: true
    },
    {
        id: 'turnos',
        titulo: 'Turnos de servicio',
        descripcion: 'Histórico de turnos con sus ventas y cierres asociados.',
        icono: 'fa-solid fa-calendar-check',
        url: '/admin/turnos-servicio',
        grupo: 'Control financiero',
        interno: true
    },
    {
        id: 'auditoria',
        titulo: 'Auditoría del sistema',
        descripcion: 'Quién hizo qué y cuándo: accesos, cambios e impresiones sensibles.',
        icono: 'fa-solid fa-user-shield',
        url: '/admin/auditoria',
        grupo: 'Registros',
        interno: true
    }
];

exports.viewHub = async (req, res) => {
    try {
        // Indicadores rápidos para las tarjetas del hub (no bloquean la
        // vista si fallan: el hub debe abrirse siempre).
        let indicadores = { valor_inventario: null, bajo_minimo: null, por_vencer: null, vencidos: null };
        try {
            const salud = await ReportesService.saludInventario();
            indicadores = {
                valor_inventario: null,
                bajo_minimo: salud.totales.bajo_minimo,
                por_vencer: salud.totales.por_vencer,
                vencidos: salud.totales.vencidos
            };
            const [valor] = await db.query(`
                SELECT COALESCE(SUM(l.cantidad_actual * l.costo_unitario), 0) AS total
                FROM lotes l
                WHERE l.cantidad_actual > 0
            `);
            if (valor && valor[0]) indicadores.valor_inventario = Number(valor[0].total || 0);
        } catch (_) { /* indicadores opcionales */ }

        return res.render('reportes/hub', {
            title: 'Centro de Reportes - Restaurante Bahía',
            view: 'reportes',
            enlaces: ENLACES,
            indicadores,
            user: req.user || null,
            success_msg: req.flash ? req.flash('success_msg') : null,
            error_msg: req.flash ? req.flash('error_msg') : null
        });
    } catch (error) {
        console.error('Error al cargar el centro de reportes:', error);
        return res.status(500).send('Error interno al cargar el centro de reportes');
    }
};

exports.viewSaludInventario = async (req, res) => {
    try {
        const salud = await ReportesService.saludInventario();
        return res.render('reportes/salud_inventario', {
            title: 'Salud del Inventario - Restaurante Bahía',
            view: 'salud_inventario',
            salud,
            user: req.user || null,
            success_msg: req.flash ? req.flash('success_msg') : null,
            error_msg: req.flash ? req.flash('error_msg') : null
        });
    } catch (error) {
        console.error('Error al cargar la salud del inventario:', error);
        return res.status(500).send('Error interno al generar el reporte');
    }
};

exports.viewMargenPlatillos = async (req, res) => {
    try {
        const rango = ReportesService.normalizarRango(req.query);
        const reporte = await ReportesService.margenPorPlatillo(rango);
        return res.render('reportes/margen_platillos', {
            title: 'Margen por Platillo - Restaurante Bahía',
            view: 'margen_platillos',
            rango,
            reporte,
            user: req.user || null,
            success_msg: req.flash ? req.flash('success_msg') : null,
            error_msg: req.flash ? req.flash('error_msg') : null
        });
    } catch (error) {
        console.error('Error al cargar el margen por platillo:', error);
        return res.status(500).send('Error interno al generar el reporte');
    }
};

exports.viewExplosionRecetas = async (req, res) => {
    try {
        const turnoId = parseInt(req.query.turno, 10) || null;

        const [turnos] = await db.query(`
            SELECT id, nombre, fecha_inicio
            FROM turnos_servicio
            ORDER BY id DESC
            LIMIT 30
        `).catch(() => [[]]);

        const datos = await ReporteModel.getReporteKardexPos(turnoId);

        // Resumen por insumo: teórico vs real y desviación
        const porInsumo = new Map();
        for (const fila of datos) {
            const clave = fila.codigo_insumo || fila.insumo_descontado;
            const ac = porInsumo.get(clave) || {
                insumo: fila.insumo_descontado,
                codigo: fila.codigo_insumo,
                unidad: fila.unidad_medida,
                teorico: 0, real: 0, costo: 0
            };
            ac.teorico += Number(fila.consumo_total_teorico || 0);
            ac.real += Number(fila.consumo_real_kardex || 0);
            ac.costo += Number(fila.costo_total_insumo || 0);
            porInsumo.set(clave, ac);
        }
        const resumenInsumos = [...porInsumo.values()].map(i => {
            const desviacion = i.real - i.teorico;
            return {
                ...i,
                teorico: Number(i.teorico.toFixed(3)),
                real: Number(i.real.toFixed(3)),
                desviacion: Number(desviacion.toFixed(3)),
                desviacion_pct: i.teorico > 0 ? Number(((desviacion / i.teorico) * 100).toFixed(1)) : null,
                costo: Number(i.costo.toFixed(2))
            };
        }).sort((a, b) => Math.abs(b.desviacion) - Math.abs(a.desviacion));

        return res.render('reportes/explosion', {
            title: 'Explosión de Recetas (Teórico vs Real) - Restaurante Bahía',
            view: 'explosion_recetas',
            filas: datos,
            resumenInsumos,
            turnos: turnos || [],
            turnoSeleccionado: turnoId,
            user: req.user || null,
            success_msg: req.flash ? req.flash('success_msg') : null,
            error_msg: req.flash ? req.flash('error_msg') : null
        });
    } catch (error) {
        console.error('Error al cargar la explosión de recetas:', error);
        return res.status(500).send('Error interno al generar el reporte');
    }
};
