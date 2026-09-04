// controllers/reportesController.js
// Centro de reportes: punto de entrada único a la información de control
// físico y financiero del negocio. Incluye el hub, la salud del inventario,
// el margen real por platillo y la explosión de recetas (consumo teórico
// vs real, kardex vs POS).
'use strict';

const ReportesService = require('../services/reportesService');
const ReporteModel = require('../models/reporteModel');
const Licencia = require('../services/licencia/licenciaService');
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
        descripcion: 'Consumo teórico (ficha técnica) vs consumo real del kardex por venta. Detecta fugas y mermas anómalas. Exportable a CSV.',
        icono: 'fa-solid fa-explosion',
        url: '/admin/reportes/explosion-recetas',
        grupo: 'Control físico',
        badge: 'NUEVO'
    },
    {
        id: 'salud',
        titulo: 'Salud del inventario',
        descripcion: 'Bajo mínimo, lotes vencidos, por vencer y capital detenido sin rotación, con su impacto en dinero. Exportable a CSV.',
        icono: 'fa-solid fa-heart-pulse',
        url: '/admin/reportes/salud-inventario',
        grupo: 'Control físico',
        badge: 'NUEVO'
    },
    {
        id: 'consumo-insumos',
        titulo: 'Consumo por insumo',
        descripcion: 'Por período: cuánto entró y salió de cada insumo y a qué se fue (venta, merma, ajuste), con su valor.',
        icono: 'fa-solid fa-arrows-turn-to-dots',
        url: '/admin/reportes/consumo-insumos',
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
        descripcion: 'Ventas cobradas del período vs costo estándar: margen contribuido y food cost real ponderado. Exportable a CSV.',
        icono: 'fa-solid fa-chart-line',
        url: '/admin/reportes/margen-platillos',
        grupo: 'Control financiero',
        badge: 'NUEVO'
    },
    {
        id: 'tendencias',
        titulo: 'Tendencias',
        descripcion: 'Hacia dónde va la venta: serie diaria/semanal, comparación contra el período anterior y tragos/platillos a la alza o baja. Exportable a CSV.',
        icono: 'fa-solid fa-arrow-trend-up',
        url: '/admin/reportes/tendencias',
        grupo: 'Control financiero',
        badge: 'NUEVO'
    },
    {
        id: 'ventas-turno',
        titulo: 'Ventas y consumo del turno',
        descripcion: 'Tragos y platillos vendidos en el turno con el movimiento de inventario que generaron (según licencia). Con detalle por trago/platillo. Exportable a CSV.',
        icono: 'fa-solid fa-utensils',
        url: '/admin/reportes/ventas-turno',
        grupo: 'Control financiero',
        badge: 'NUEVO'
    },
    {
        id: 'ventas-horas',
        titulo: 'Ventas por hora y día',
        descripcion: 'Distribución del tráfico por hora y día de la semana: cuándo se vende más, para dimensionar personal y turnos.',
        icono: 'fa-solid fa-clock',
        url: '/admin/reportes/ventas-horas',
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
        id: 'ventas-mesero',
        titulo: 'Ventas por mesero',
        descripcion: 'Desempeño del personal de salón por período: cuentas cobradas, ventas, ticket promedio y propinas.',
        icono: 'fa-solid fa-user-tie',
        url: '/admin/reportes/ventas-mesero',
        grupo: 'Control financiero',
        badge: 'NUEVO'
    },
    {
        id: 'pedidos-ventas',
        titulo: 'Ventas / Pedidos del período',
        descripcion: 'Cuenta por cuenta: turno, mesa y área, dependiente y cajero, importes desglosados por moneda, ítems entregados y cancelados y tiempo de entrega de cada plato.',
        icono: 'fa-solid fa-file-invoice-dollar',
        url: '/admin/pedidos',
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

exports.viewVentasMesero = async (req, res) => {
    try {
        const rango = ReportesService.normalizarRango(req.query);
        const reporte = await ReportesService.ventasPorMesero(rango);
        return res.render('reportes/ventas_mesero', {
            title: 'Ventas por Mesero - Restaurante Bahía',
            view: 'ventas_mesero',
            rango,
            reporte,
            user: req.user || null,
            success_msg: req.flash ? req.flash('success_msg') : null,
            error_msg: req.flash ? req.flash('error_msg') : null
        });
    } catch (error) {
        console.error('Error al cargar las ventas por mesero:', error);
        return res.status(500).send('Error interno al generar el reporte');
    }
};

// ── Ventas y movimiento de inventario del turno ───────────────────────────
// Qué tragos y platillos se vendieron en un turno y qué descontó el kardex
// por cada comanda cobrada. El desglose de inventario es información de
// control físico: solo se muestra si la licencia de la instalación incluye
// la función 'inventario'; sin ella el reporte sigue siendo útil en su
// mitad financiera (ventas y costo teórico de recetas).

/**
 * ¿Permite la licencia ver el movimiento de inventario? Un fallo del propio
 * sistema de licencias nunca debe bloquear una consulta (mismo criterio que
 * el middleware).
 */
async function permiteMovimientoInventario(req) {
    try {
        const evaluacion = req.licencia || await Licencia.evaluar();
        return Licencia.tieneFuncion(evaluacion, 'inventario');
    } catch (_) {
        return true;
    }
}

/** Parseo del filtro de turno: '' explícito = todos; ausente = el último. */
function leerFiltroTurno(req) {
    const bruto = req.query.turno;
    if (bruto === undefined) return { turnoId: null, porDefectoAlUltimo: true };
    const id = parseInt(bruto, 10);
    return { turnoId: Number.isFinite(id) && id > 0 ? id : null, porDefectoAlUltimo: false };
}

exports.viewVentasTurno = async (req, res) => {
    try {
        const { turnoId, porDefectoAlUltimo } = leerFiltroTurno(req);
        const incluirInventario = await permiteMovimientoInventario(req);
        const reporte = await ReportesService.ventasTurno({
            turnoId, incluirInventario, porDefectoAlUltimo
        });
        return res.render('reportes/ventas_turno', {
            title: 'Ventas y Consumo del Turno - Restaurante Bahía',
            view: 'ventas_turno',
            reporte,
            user: req.user || null,
            success_msg: req.flash ? req.flash('success_msg') : null,
            error_msg: req.flash ? req.flash('error_msg') : null
        });
    } catch (error) {
        console.error('Error al cargar las ventas del turno:', error);
        return res.status(500).send('Error interno al generar el reporte');
    }
};

exports.exportarVentasTurno = async (req, res) => {
    try {
        const { turnoId, porDefectoAlUltimo } = leerFiltroTurno(req);
        const incluirInventario = await permiteMovimientoInventario(req);
        const reporte = await ReportesService.ventasTurno({
            turnoId, incluirInventario, porDefectoAlUltimo
        });
        return responderCSV(req, res, 'ventas_y_consumo_turno',
            ReportesService.ventasTurnoACSV(reporte),
            reporte.platillos.length + reporte.cuentas.length);
    } catch (error) {
        console.error('Error al exportar las ventas del turno:', error);
        return res.redirect('/admin/reportes/ventas-turno');
    }
};

exports.viewVentasTurnoPlatillo = async (req, res) => {
    try {
        const platilloId = parseInt(req.params.platilloId, 10);
        if (!Number.isFinite(platilloId) || platilloId <= 0) {
            return res.redirect('/admin/reportes/ventas-turno');
        }
        const esDia = String(req.query.origen || '') === 'dia' ? 1 : 0;
        const { turnoId, porDefectoAlUltimo } = leerFiltroTurno(req);
        const incluirInventario = await permiteMovimientoInventario(req);

        const detalle = await ReportesService.detallePlatilloTurno({
            turnoId, platilloId, esDia, incluirInventario, porDefectoAlUltimo
        });
        if (!detalle) {
            if ((req.headers.accept || '').includes('application/json')) {
                return res.status(404).json({ success: false, message: 'Platillo no encontrado' });
            }
            req.flash && req.flash('error_msg', 'El platillo solicitado no existe.');
            return res.redirect('/admin/reportes/ventas-turno');
        }
        return res.render('reportes/ventas_turno_platillo', {
            title: `Detalle de ${detalle.platillo.nombre} - Restaurante Bahía`,
            view: 'ventas_turno',
            detalle,
            user: req.user || null,
            success_msg: req.flash ? req.flash('success_msg') : null,
            error_msg: req.flash ? req.flash('error_msg') : null
        });
    } catch (error) {
        console.error('Error al cargar el detalle del platillo:', error);
        return res.status(500).send('Error interno al generar el reporte');
    }
};

exports.exportarVentasTurnoPlatillo = async (req, res) => {
    try {
        const platilloId = parseInt(req.params.platilloId, 10);
        if (!Number.isFinite(platilloId) || platilloId <= 0) {
            return res.redirect('/admin/reportes/ventas-turno');
        }
        const esDia = String(req.query.origen || '') === 'dia' ? 1 : 0;
        const { turnoId, porDefectoAlUltimo } = leerFiltroTurno(req);
        const incluirInventario = await permiteMovimientoInventario(req);
        const detalle = await ReportesService.detallePlatilloTurno({
            turnoId, platilloId, esDia, incluirInventario, porDefectoAlUltimo
        });
        if (!detalle) return res.redirect('/admin/reportes/ventas-turno');
        const slug = String(detalle.platillo.nombre || 'platillo')
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase() || 'platillo';
        return responderCSV(req, res, `venta_${slug}`,
            ReportesService.platilloTurnoACSV(detalle),
            detalle.lineas.length + detalle.teorico.length + (detalle.real ? detalle.real.filas.length : 0));
    } catch (error) {
        console.error('Error al exportar el detalle del platillo:', error);
        return res.redirect('/admin/reportes/ventas-turno');
    }
};

// ── Exportaciones CSV ─────────────────────────────────────────────────────
// Todas responden text/csv (BOM + separador ';') para abrir en Excel. La
// auditoría las registra como EXPORTACION vía el catálogo.

function responderCSV(req, res, nombre, csv, filas) {
    const marca = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${nombre}_${marca}.csv"`);
    if (filas != null) res.setHeader('X-Reporte-Filas', String(filas));
    return res.send(csv);
}

exports.exportarMargenPlatillos = async (req, res) => {
    try {
        const rango = ReportesService.normalizarRango(req.query);
        const reporte = await ReportesService.margenPorPlatillo(rango);
        return responderCSV(req, res, 'margen_por_platillo',
            ReportesService.margenACSV(reporte), reporte.platillos.length);
    } catch (error) {
        console.error('Error al exportar el margen por platillo:', error);
        return res.redirect('/admin/reportes/margen-platillos');
    }
};

exports.exportarSaludInventario = async (req, res) => {
    try {
        const salud = await ReportesService.saludInventario();
        const filas = salud.bajoMinimo.length + salud.vencidos.length
            + salud.porVencer.length + salud.sinMovimiento.length;
        return responderCSV(req, res, 'salud_inventario',
            ReportesService.saludACSV(salud), filas);
    } catch (error) {
        console.error('Error al exportar la salud del inventario:', error);
        return res.redirect('/admin/reportes/salud-inventario');
    }
};

exports.exportarExplosionRecetas = async (req, res) => {
    try {
        const turnoId = parseInt(req.query.turno, 10) || null;
        const datos = await ReporteModel.getReporteKardexPos(turnoId);
        const csv = ReportesService.explosionACSV({ filas: datos, turnoSeleccionado: turnoId });
        return responderCSV(req, res, 'explosion_recetas', csv, datos.length);
    } catch (error) {
        console.error('Error al exportar la explosión de recetas:', error);
        return res.redirect('/admin/reportes/explosion-recetas');
    }
};

exports.exportarVentasMesero = async (req, res) => {
    try {
        const rango = ReportesService.normalizarRango(req.query);
        const reporte = await ReportesService.ventasPorMesero(rango);
        return responderCSV(req, res, 'ventas_por_mesero',
            ReportesService.ventasMeseroACSV(reporte), reporte.meseros.length);
    } catch (error) {
        console.error('Error al exportar las ventas por mesero:', error);
        return res.redirect('/admin/reportes/ventas-mesero');
    }
};

exports.exportarConsumoInsumos = async (req, res) => {
    try {
        const rango = ReportesService.normalizarRango(req.query);
        const almacen_id = parseInt(req.query.almacen_id, 10) || null;
        const reporte = await ReportesService.consumoPorInsumo({ ...rango, almacen_id });
        return responderCSV(req, res, 'consumo_por_insumo',
            ReportesService.consumoInsumosACSV(reporte), reporte.insumos.length);
    } catch (error) {
        console.error('Error al exportar el consumo por insumo:', error);
        return res.redirect('/admin/reportes/consumo-insumos');
    }
};

exports.exportarVentasHoras = async (req, res) => {
    try {
        const rango = ReportesService.normalizarRango(req.query);
        const reporte = await ReportesService.ventasPorHoras(rango);
        return responderCSV(req, res, 'ventas_por_hora_y_dia',
            ReportesService.ventasHorasACSV(reporte),
            reporte.horas.length + reporte.dias.length);
    } catch (error) {
        console.error('Error al exportar las ventas por hora:', error);
        return res.redirect('/admin/reportes/ventas-horas');
    }
};

exports.viewConsumoInsumos = async (req, res) => {
    try {
        const rango = ReportesService.normalizarRango(req.query);
        const almacen_id = parseInt(req.query.almacen_id, 10) || null;
        const reporte = await ReportesService.consumoPorInsumo({ ...rango, almacen_id });

        const [almacenes] = await db.query(
            'SELECT id, nombre FROM almacenes WHERE activo = 1 ORDER BY nombre ASC'
        ).catch(() => [[]]);

        return res.render('reportes/consumo_insumos', {
            title: 'Consumo por Insumo - Restaurante Bahía',
            view: 'consumo_insumos',
            rango,
            almacenId: almacen_id,
            almacenes: almacenes || [],
            reporte,
            user: req.user || null,
            success_msg: req.flash ? req.flash('success_msg') : null,
            error_msg: req.flash ? req.flash('error_msg') : null
        });
    } catch (error) {
        console.error('Error al cargar el consumo por insumo:', error);
        return res.status(500).send('Error interno al generar el reporte');
    }
};

exports.viewVentasHoras = async (req, res) => {
    try {
        const rango = ReportesService.normalizarRango(req.query);
        const reporte = await ReportesService.ventasPorHoras(rango);
        return res.render('reportes/ventas_horas', {
            title: 'Ventas por Hora y Día - Restaurante Bahía',
            view: 'ventas_horas',
            rango,
            reporte,
            user: req.user || null,
            success_msg: req.flash ? req.flash('success_msg') : null,
            error_msg: req.flash ? req.flash('error_msg') : null
        });
    } catch (error) {
        console.error('Error al cargar las ventas por hora:', error);
        return res.status(500).send('Error interno al generar el reporte');
    }
};

// ── Tendencias de venta ───────────────────────────────────────────────────
// Evolución del negocio en el tiempo: serie diaria/semanal de cuentas
// cobradas, comparación contra el período anterior de igual duración y qué
// tragos/platillos suben o bajan. Información financiera de venta: no toca
// el kardex, por lo que no depende de funciones de la licencia.

exports.viewTendencias = async (req, res) => {
    try {
        const rango = ReportesService.normalizarRango(req.query);
        const reporte = await ReportesService.tendencias(rango);
        return res.render('reportes/tendencias', {
            title: 'Tendencias de Venta - Restaurante Bahía',
            view: 'tendencias',
            rango,
            reporte,
            user: req.user || null,
            success_msg: req.flash ? req.flash('success_msg') : null,
            error_msg: req.flash ? req.flash('error_msg') : null
        });
    } catch (error) {
        console.error('Error al cargar las tendencias de venta:', error);
        return res.status(500).send('Error interno al generar el reporte');
    }
};

exports.exportarTendencias = async (req, res) => {
    try {
        const rango = ReportesService.normalizarRango(req.query);
        const reporte = await ReportesService.tendencias(rango);
        return responderCSV(req, res, 'tendencias_venta',
            ReportesService.tendenciasACSV(reporte),
            reporte.serie.length + reporte.tipos.length + reporte.categorias.length + reporte.platillos.length);
    } catch (error) {
        console.error('Error al exportar las tendencias de venta:', error);
        return res.redirect('/admin/reportes/tendencias');
    }
};

exports.viewExplosionRecetas = async (req, res) => {
    try {
        const turnoId = parseInt(req.query.turno, 10) || null;

        // turnos_servicio no tiene columna "nombre": se etiqueta con quien abrio el turno
        const [turnos] = await db.query(`
            SELECT ts.id,
                   COALESCE(CONCAT(ua.nombre, ' ', ua.apellidos), 'N/D') AS nombre,
                   ts.fecha_apertura AS fecha_inicio
            FROM turnos_servicio ts
            LEFT JOIN usuarios ua ON ts.usuario_apertura_id = ua.id
            ORDER BY ts.id DESC
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
