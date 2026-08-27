// services/cajaService.js
// Clasificación de pagos para el arqueo: ZELLE siempre queda fuera del efectivo.
'use strict';

const db = require('../config/db');

function esZelle(pago) {
    return Boolean(pago && (
        Number(pago.es_zelle) === 1 ||
        String(pago.codigo_moneda || '').toUpperCase() === 'ZELLE' ||
        String(pago.carta || '').toUpperCase() === 'ZELLE'
    ));
}

function esEfectivoEnCaja(pago) {
    return String(pago && pago.metodo_pago || '').toLowerCase() === 'efectivo' && !esZelle(pago);
}

async function obtenerDesglosePagos(turnoId, connection = db) {
    const [rows] = await connection.query(`
        SELECT
            LOWER(pp.metodo_pago) AS metodo_pago,
            CASE
                WHEN UPPER(COALESCE(m.codigo, '')) = 'ZELLE'
                  OR UPPER(COALESCE(ms.carta, '')) = 'ZELLE' THEN 'ZELLE'
                ELSE COALESCE(m.codigo, 'CUP')
            END AS codigo_moneda,
            CASE
                WHEN UPPER(COALESCE(m.codigo, '')) = 'ZELLE'
                  OR UPPER(COALESCE(ms.carta, '')) = 'ZELLE'
                    THEN 'Zelle (transferencia extranjera)'
                ELSE COALESCE(m.nombre, 'Moneda Local')
            END AS nombre_moneda,
            COALESCE(m.simbolo, '$') AS simbolo,
            SUM(pp.monto_moneda_origen) AS total_origen,
            SUM(pp.monto_equivalente_local) AS total_local,
            COUNT(pp.id) AS total_transacciones,
            CASE
                WHEN UPPER(COALESCE(m.codigo, '')) = 'ZELLE'
                  OR UPPER(COALESCE(ms.carta, '')) = 'ZELLE' THEN 1
                ELSE 0
            END AS es_zelle
        FROM pagos_pedido pp
        INNER JOIN pedidos p ON pp.pedido_id = p.id
        LEFT JOIN mesas ms ON p.id_mesa = ms.id
        LEFT JOIN monedas m ON pp.moneda_id = m.id
        WHERE p.turno_servicio_id = ?
          AND pp.metodo_pago NOT IN ('factura', 'pendiente')
        GROUP BY LOWER(pp.metodo_pago), m.codigo, m.nombre, m.simbolo, ms.carta
        ORDER BY
            CASE
                WHEN UPPER(COALESCE(m.codigo, '')) = 'ZELLE'
                  OR UPPER(COALESCE(ms.carta, '')) = 'ZELLE' THEN 3
                WHEN LOWER(pp.metodo_pago) = 'efectivo' THEN 1
                ELSE 2
            END,
            total_local DESC
    `, [turnoId]);

    return rows.map(row => ({
        ...row,
        total_origen: Number(row.total_origen || 0),
        total_local: Number(row.total_local || 0),
        total_transacciones: Number(row.total_transacciones || 0),
        es_zelle: Number(row.es_zelle || 0),
        es_efectivo_caja: esEfectivoEnCaja(row) ? 1 : 0
    }));
}

function calcularResumenFinanciero(pedidos, desglosePagos, fondoApertura = 0) {
    let totalCxcFacturas = 0;
    let totalPendientePago = 0;
    let totalCortesias = 0;
    let totalPropinas = 0;

    (pedidos || []).forEach(pedido => {
        const total = Number(pedido.total || 0);
        if (pedido.estado_pago === 'facturado') totalCxcFacturas += total;
        if (pedido.estado_pago === 'pendiente_pago') totalPendientePago += total;
        if (pedido.estado_pago === 'cortesia') totalCortesias += Number(pedido.subtotal || 0);
        if (pedido.estado_pago === 'pagado') totalPropinas += Number(pedido.propina || 0);
    });

    const efectivo = (desglosePagos || [])
        .filter(esEfectivoEnCaja)
        .reduce((sum, pago) => sum + Number(pago.total_local || 0), 0);
    const zelle = (desglosePagos || [])
        .filter(esZelle)
        .reduce((sum, pago) => sum + Number(pago.total_local || 0), 0);
    const transferencias = (desglosePagos || [])
        .filter(pago => !esZelle(pago) && String(pago.metodo_pago || '').toLowerCase() === 'transferencia')
        .reduce((sum, pago) => sum + Number(pago.total_local || 0), 0);
    const tarjetas = (desglosePagos || [])
        .filter(pago => !esZelle(pago) && String(pago.metodo_pago || '').toLowerCase() === 'tarjeta')
        .reduce((sum, pago) => sum + Number(pago.total_local || 0), 0);

    const fondo = Number(fondoApertura || 0);
    const totalEfectivoCaja = efectivo + totalPropinas;
    return {
        total_cobrado_caja: efectivo,
        total_efectivo_total_caja: totalEfectivoCaja,
        total_zelle: zelle,
        total_transferencias: transferencias,
        total_tarjetas: tarjetas,
        total_no_efectivo: transferencias + tarjetas + zelle,
        total_cxc_facturas: totalCxcFacturas,
        total_pendiente_pago: totalPendientePago,
        total_cortesias: totalCortesias,
        total_propinas: totalPropinas,
        total_pedidos: (pedidos || []).length,
        fondo_apertura: fondo,
        total_en_caja_esperado: fondo + totalEfectivoCaja
    };
}

module.exports = { esZelle, esEfectivoEnCaja, obtenerDesglosePagos, calcularResumenFinanciero };
