// services/cierreExport.js
// Exportaciones CSV/PDF del cierre del día y del histórico de cierres.
// Funciones puras sobre los datos que ya arma cierreDiaController (sin acceso a BD).
'use strict';

const pdfTabla = require('./pdfTabla');

const BOM = String.fromCharCode(0xFEFF);
const CRLF = String.fromCharCode(13, 10);

/** Formatea un número para CSV con separador decimal coma (Excel es-ES). */
const csvNum = (v, dec = 2) => Number(v || 0).toFixed(dec).replace('.', ',');

/** Dinero como en las vistas ($ + es-ES). */
const dinero = v => '$' + Number(v || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const sinPuntoComa = s => String(s == null ? '' : s).replace(/[;\r\n]+/g, ' ');

/** Etiqueta de estado de pago, igual que los badges de la vista. */
function estadoPagoLabel(estado) {
    switch (estado) {
        case 'facturado': return 'Factura (CxC)';
        case 'pendiente_pago': return 'Pendiente Pago';
        case 'cortesia': return 'Cortesía';
        case 'pendiente': return 'En Consumo';
        default: return 'Pagado';
    }
}

/** Etiqueta del balance del arqueo, igual que los badges de la vista. */
function balanceLabel(estado) {
    switch (estado) {
        case 'cuadrado': return 'Cuadrado';
        case 'faltante': return 'Faltante';
        case 'sobrante': return 'Sobrante';
        default: return estado || '—';
    }
}

const fHora = f => {
    const d = f instanceof Date ? f : new Date(f);
    return !f || isNaN(d) ? 'En curso' : d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
};

const fFechaHora = f => {
    const d = f instanceof Date ? f : new Date(f);
    return !f || isNaN(d) ? '—' : d.toLocaleString('es-ES');
};

const fFecha = f => {
    const d = f instanceof Date ? f : new Date(f);
    return !f || isNaN(d) ? '—' : d.toLocaleDateString('es-ES');
};

// ---------------------------------------------------------------------------
// Cierre del día (turno activo)
// ---------------------------------------------------------------------------

/**
 * Exporta el cierre del día a CSV (separador ';' + BOM UTF-8).
 * @returns {{csv: string, filas: number}}
 */
function cierreACSV({ turno, pedidos, desglosePagos, resumen }) {
    const filas = [];
    filas.push('Cierre del día');
    filas.push(`Turno;#${turno && turno.id}`);
    filas.push(`Fecha;${new Date().toLocaleString('es-ES')}`);
    filas.push('');
    filas.push('Resumen');
    filas.push('Concepto;Valor');
    filas.push(`Cobrado en caja;${csvNum(resumen.total_cobrado_caja)}`);
    filas.push(`Propinas;${csvNum(resumen.total_propinas)}`);
    filas.push(`Efectivo total en caja;${csvNum(resumen.total_efectivo_total_caja)}`);
    filas.push(`Cuentas por cobrar (facturas);${csvNum(resumen.total_cxc_facturas)}`);
    filas.push(`Pendiente de pago;${csvNum(resumen.total_pendiente_pago)}`);
    filas.push(`Cortesías;${csvNum(resumen.total_cortesias)}`);
    filas.push(`Pedidos;${resumen.total_pedidos}`);
    filas.push(`Fondo de apertura;${csvNum(resumen.fondo_apertura)}`);
    filas.push(`Efectivo esperado en caja;${csvNum(resumen.total_en_caja_esperado)}`);
    filas.push('');
    filas.push('Pedidos del turno');
    filas.push('Orden;Mesa;Mesero;Monto;Propina;Estado;Hora');
    for (const p of pedidos) {
        filas.push([
            `#${p.id}`,
            sinPuntoComa(p.nombre_mesa),
            sinPuntoComa(p.mesero),
            csvNum(p.total),
            csvNum(p.propina),
            estadoPagoLabel(p.estado_pago),
            p.fecha_cierre ? fHora(p.fecha_cierre) : 'En curso'
        ].join(';'));
    }
    filas.push('');
    filas.push('Desglose de pagos');
    filas.push('Método;Moneda;Transacciones;Total origen;Total (CUP)');
    for (const d of desglosePagos) {
        filas.push([
            sinPuntoComa(d.metodo_pago),
            sinPuntoComa(d.codigo_moneda),
            d.total_transacciones,
            csvNum(d.total_origen),
            csvNum(d.total_local)
        ].join(';'));
    }
    return { csv: BOM + filas.join(CRLF) + CRLF, filas: pedidos.length };
}

/** PDF del cierre del día (gemelo de cierreACSV, carta apaisada). */
async function cierreAPDF({ turno, pedidos, desglosePagos, resumen }, meta = {}) {
    const negocio = (meta && meta.negocio) || 'Restaurante Bahía';
    const autor = (meta && meta.generadoPor) || 'Sistema';
    const filasPedidos = pedidos.map(p => [
        `#${p.id}`,
        p.nombre_mesa || '—',
        p.mesero || '—',
        dinero(p.total),
        dinero(p.propina),
        estadoPagoLabel(p.estado_pago),
        p.fecha_cierre ? fHora(p.fecha_cierre) : 'En curso'
    ]);
    const filasDesglose = desglosePagos.map(d => [
        d.metodo_pago,
        `${d.codigo_moneda} (${d.simbolo || '$'})`,
        String(d.total_transacciones),
        dinero(d.total_origen),
        dinero(d.total_local)
    ]);
    return pdfTabla.documentoPDF({
        titulo: `Cierre del día — Turno #${turno && turno.id}`,
        subtitulo: `${negocio} · ${pdfTabla.fmtFecha()} · Generado por ${autor}`,
        bloques: [
            { titulo: 'Resumen', columnas: [
                { titulo: 'Concepto', frac: 0.50 },
                { titulo: 'Valor', frac: 0.50, alinear: 'right' },
            ], filas: [
                ['Cobrado en caja', dinero(resumen.total_cobrado_caja)],
                ['Propinas', dinero(resumen.total_propinas)],
                ['Efectivo total en caja', dinero(resumen.total_efectivo_total_caja)],
                ['Cuentas por cobrar (facturas)', dinero(resumen.total_cxc_facturas)],
                ['Pendiente de pago', dinero(resumen.total_pendiente_pago)],
                ['Cortesías', dinero(resumen.total_cortesias)],
                ['Pedidos', String(resumen.total_pedidos)],
                ['Fondo de apertura', dinero(resumen.fondo_apertura)],
                ['Efectivo esperado en caja', dinero(resumen.total_en_caja_esperado)],
            ] },
            { titulo: `Pedidos del turno (${pedidos.length})`, columnas: [
                { titulo: 'Orden', frac: 0.08 },
                { titulo: 'Mesa', frac: 0.12 },
                { titulo: 'Mesero', frac: 0.24 },
                { titulo: 'Monto', frac: 0.13, alinear: 'right' },
                { titulo: 'Propina', frac: 0.12, alinear: 'right' },
                { titulo: 'Estado', frac: 0.16, alinear: 'center' },
                { titulo: 'Hora', frac: 0.15, alinear: 'center' },
            ], filas: filasPedidos.length ? filasPedidos : [['(Sin pedidos)', '', '', '', '', '', '']] },
            { titulo: 'Desglose de pagos', columnas: [
                { titulo: 'Método', frac: 0.24 },
                { titulo: 'Moneda', frac: 0.24 },
                { titulo: 'Transacciones', frac: 0.12, alinear: 'right' },
                { titulo: 'Total origen', frac: 0.20, alinear: 'right' },
                { titulo: 'Total (CUP)', frac: 0.20, alinear: 'right' },
            ], filas: filasDesglose.length ? filasDesglose : [['(Sin pagos)', '', '', '', '']] },
        ],
        pie: 'Restaurante Bahía — Cierre del día',
    });
}

// ---------------------------------------------------------------------------
// Histórico de cierres
// ---------------------------------------------------------------------------

/**
 * Exporta el histórico de cierres a CSV (separador ';' + BOM UTF-8).
 * @returns {{csv: string, filas: number}}
 */
function historicoACSV({ cierres, facturasPendientes, metricas }) {
    const filas = [];
    filas.push('Histórico de cierres y cuentas por cobrar');
    filas.push(`Fecha;${new Date().toLocaleString('es-ES')}`);
    filas.push('');
    filas.push('Cierres');
    filas.push('Turno;Fecha cierre;Abrió;Cerró;Cobrado;Propinas;Real;Esperado;Balance');
    for (const c of cierres) {
        filas.push([
            `#${c.turno_servicio_id}`,
            fFechaHora(c.fecha_cierre),
            sinPuntoComa(c.usuario_apertura),
            sinPuntoComa(c.usuario_cierre),
            csvNum(c.total_cobrado_caja),
            csvNum(c.total_propinas),
            csvNum(c.monto_real_entregado),
            csvNum(c.monto_esperado_caja),
            balanceLabel(c.balance_estado)
        ].join(';'));
    }
    filas.push('');
    filas.push('Facturas pendientes (CxC)');
    filas.push('Orden;Mesa;Mesero;Total;Fecha pedido;Turno origen');
    for (const f of facturasPendientes) {
        filas.push([
            `#${f.id}`,
            sinPuntoComa(f.nombre_mesa),
            sinPuntoComa(f.mesero),
            csvNum(f.total),
            fFecha(f.fecha_pedido),
            `#${f.turno_servicio_id}`
        ].join(';'));
    }
    filas.push('');
    filas.push('Métricas');
    filas.push(`Total cierres;${metricas.totalCierres}`);
    filas.push(`Total recaudado;${csvNum(metricas.totalRecaudado)}`);
    filas.push(`CxC pendiente;${csvNum(metricas.totalCxCPendiente)}`);
    filas.push(`Facturas pendientes;${metricas.cantidadFacturasPendientes}`);
    return { csv: BOM + filas.join(CRLF) + CRLF, filas: cierres.length };
}

/** PDF del histórico (gemelo de historicoACSV, carta apaisada). */
async function historicoAPDF({ cierres, facturasPendientes, metricas }, meta = {}) {
    const negocio = (meta && meta.negocio) || 'Restaurante Bahía';
    const autor = (meta && meta.generadoPor) || 'Sistema';
    const filasCierres = cierres.map(c => {
        const fila = [
            `#${c.turno_servicio_id}`,
            fFechaHora(c.fecha_cierre),
            c.usuario_apertura || '—',
            c.usuario_cierre || '—',
            dinero(c.total_cobrado_caja),
            dinero(c.total_propinas),
            dinero(c.monto_real_entregado),
            dinero(c.monto_esperado_caja),
            balanceLabel(c.balance_estado)
        ];
        return c.balance_estado === 'cuadrado' ? fila : { bold: true, c: fila };
    });
    const filasFacturas = facturasPendientes.map(f => [
        `#${f.id}`,
        f.nombre_mesa || '—',
        f.mesero || '—',
        dinero(f.total),
        `${fFecha(f.fecha_pedido)} · Turno #${f.turno_servicio_id}`
    ]);
    return pdfTabla.documentoPDF({
        titulo: 'Histórico de cierres y cuentas por cobrar',
        subtitulo: `${negocio} · ${pdfTabla.fmtFecha()} · Generado por ${autor}`,
        bloques: [
            { titulo: `Cierres (${cierres.length})`, columnas: [
                { titulo: 'Turno', frac: 0.07 },
                { titulo: 'Fecha cierre', frac: 0.15 },
                { titulo: 'Abrió', frac: 0.12 },
                { titulo: 'Cerró', frac: 0.12 },
                { titulo: 'Cobrado', frac: 0.12, alinear: 'right' },
                { titulo: 'Propinas', frac: 0.09, alinear: 'right' },
                { titulo: 'Real', frac: 0.11, alinear: 'right' },
                { titulo: 'Esperado', frac: 0.11, alinear: 'right' },
                { titulo: 'Balance', frac: 0.11, alinear: 'center' },
            ], filas: filasCierres.length ? filasCierres : [['(Sin cierres)', '', '', '', '', '', '', '', '']] },
            { titulo: `Facturas pendientes (${facturasPendientes.length})`, columnas: [
                { titulo: 'Orden', frac: 0.10 },
                { titulo: 'Mesa', frac: 0.14 },
                { titulo: 'Mesero', frac: 0.30 },
                { titulo: 'Total', frac: 0.16, alinear: 'right' },
                { titulo: 'Fecha · Turno origen', frac: 0.30 },
            ], filas: filasFacturas.length ? filasFacturas : [['(Sin facturas pendientes)', '', '', '', '']] },
            { titulo: 'Métricas', columnas: [
                { titulo: 'Concepto', frac: 0.50 },
                { titulo: 'Valor', frac: 0.50, alinear: 'right' },
            ], filas: [
                ['Total cierres', String(metricas.totalCierres)],
                ['Total recaudado', dinero(metricas.totalRecaudado)],
                ['CxC pendiente', dinero(metricas.totalCxCPendiente)],
                ['Facturas pendientes', String(metricas.cantidadFacturasPendientes)],
            ] },
        ],
        pie: 'Restaurante Bahía — Histórico de cierres',
    });
}

module.exports = { estadoPagoLabel, balanceLabel, cierreACSV, cierreAPDF, historicoACSV, historicoAPDF };
