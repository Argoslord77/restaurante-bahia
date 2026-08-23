// controllers/cierreDiaController.js
const db = require('../config/db');
const turnoService = require('../services/turnoService');

const CierreDiaController = {
    /**
     * Renderiza la vista del Cierre del Día con totales, métricas y comandas del turno
     * GET /admin/cierre-dia
     */
    renderCierreDia: async (req, res) => {
        try {
            const turnoActivo = await turnoService.obtenerTurnoActivo();
            const turnoId = turnoActivo ? turnoActivo.id : null;

            if (!turnoId) {
                req.flash('error_msg', 'No hay un turno de servicio abierto actualmente.');
                return res.render('caja/cierre_dia', {
                    pageTitle: 'Cierre del Día y Auditoría de Cuentas',
                    turnoActivo: null,
                    user: req.user,
                    view: 'cierre-dia',
                    resumen: {
                        total_cobrado_caja: 0,
                        total_cxc_facturas: 0,
                        total_pendiente_pago: 0,
                        total_cortesias: 0,
                        total_propinas: 0,
                        total_pedidos: 0,
                        fondo_apertura: 0,
                        total_en_caja_esperado: 0
                    },
                    pedidosCuentas: [],
                    desgloseMonedas: []
                });
            }

            // 1. Obtener comandas del turno activo
            const [pedidos] = await db.query(`
                SELECT 
                    p.id,
                    p.id_mesa,
                    m.numero AS numero_mesa,
                    CONCAT('Mesa ', m.numero) AS nombre_mesa,
                    p.subtotal,
                    p.descuento,
                    p.impuesto,
                    p.total,
                    p.propina,
                    p.estado_pedido,
                    p.estado_pago,
                    p.creado_en AS fecha_apertura,
                    p.fecha_cierre,
                    CONCAT(u.nombre, ' ', u.apellidos) AS mesero,
                    u_caj.nombre AS cajero
                FROM pedidos p
                LEFT JOIN mesas m ON p.id_mesa = m.id
                LEFT JOIN usuarios u ON p.id_usuario_mesero = u.id
                LEFT JOIN usuarios u_caj ON p.id_usuario_cajero = u_caj.id
                WHERE p.turno_servicio_id = ?
                ORDER BY p.id DESC
            `, [turnoId]);

            // 2. Desglose detallado de pagos por Método (Efectivo / Transferencia / Tarjeta) y Moneda
            const [desglosePagos] = await db.query(`
                SELECT 
                    LOWER(pp.metodo_pago) AS metodo_pago,
                    COALESCE(m.codigo, 'CUP') AS codigo_moneda,
                    COALESCE(m.nombre, 'Moneda Local') AS nombre_moneda,
                    COALESCE(m.simbolo, '$') AS simbolo,
                    SUM(pp.monto_moneda_origen) AS total_origen,
                    SUM(pp.monto_equivalente_local) AS total_local,
                    COUNT(pp.id) AS total_transacciones
                FROM pagos_pedido pp
                INNER JOIN pedidos p ON pp.pedido_id = p.id
                LEFT JOIN monedas m ON pp.moneda_id = m.id
                WHERE p.turno_servicio_id = ?
                  AND pp.metodo_pago NOT IN ('factura', 'pendiente')
                GROUP BY LOWER(pp.metodo_pago), m.codigo, m.nombre, m.simbolo
                ORDER BY 
                    CASE 
                        WHEN LOWER(pp.metodo_pago) = 'efectivo' THEN 1
                        WHEN LOWER(pp.metodo_pago) = 'transferencia' THEN 2
                        ELSE 3
                    END ASC,
                    total_local DESC
            `, [turnoId]);

            // 3. Clasificación financiera
            let total_cobrado_caja = 0;   // Importe neto de las órdenes
            let total_cxc_facturas = 0;
            let total_pendiente_pago = 0;
            let total_cortesias = 0;
            let total_propinas = 0;        // Excedente / Propinas

            pedidos.forEach(p => {
                const total = parseFloat(p.total || 0);
                const propina = parseFloat(p.propina || 0);

                if (p.estado_pago === 'pagado') {
                    total_cobrado_caja += total;
                    total_propinas += propina;
                } else if (p.estado_pago === 'facturado') {
                    total_cxc_facturas += total;
                } else if (p.estado_pago === 'pendiente_pago') {
                    total_pendiente_pago += total;
                } else if (p.estado_pago === 'cortesia') {
                    total_cortesias += parseFloat(p.subtotal || 0);
                }
            });

            // Suma total del dinero cobrado en caja (Órdenes + Propinas/Excedente)
            const total_efectivo_total_caja = total_cobrado_caja + total_propinas;
            const fondoApertura = parseFloat(turnoActivo.monto_apertura || 0);

            const resumen = {
                total_cobrado_caja,
                total_propinas,
                total_efectivo_total_caja, // <--- TOTAL GENERAL DE CAJA
                total_cxc_facturas,
                total_pendiente_pago,
                total_cortesias,
                total_pedidos: pedidos.length,
                fondo_apertura: fondoApertura,
                total_en_caja_esperado: fondoApertura + total_efectivo_total_caja
            };

            res.render('caja/cierre_dia', {
                pageTitle: 'Cierre del Día y Auditoría de Cuentas',
                turnoActivo,
                user: req.user,
                view: 'cierre-dia',
                resumen,
                pedidosCuentas: pedidos,
                desgloseMonedas: desglosePagos
            });

        } catch (error) {
            console.error('Error al cargar vista de cierre del día:', error);
            req.flash('error_msg', 'Error al calcular el balance del día.');
            res.redirect('/admin/turnos-servicio');
        }
    },

    /**
     * Liquida una Cuenta por Cobrar (Factura) o una Cuenta Pendiente de Pago
     * POST /admin/cierre-dia/liquidar-cuenta/:id_pedido
     */
    liquidarCuenta: async (req, res) => {
        const { id_pedido } = req.params;
        const { 
            metodo_pago = 'efectivo', 
            moneda_id = 1,
            monto_origen,
            factor_cambio = 1.0000,
            referencia = 'LIQUIDACIÓN DE CUENTA' 
        } = req.body;
        
        const id_cajero = req.user?.id || 1;
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            const [filas] = await connection.query('SELECT * FROM pedidos WHERE id = ? FOR UPDATE', [id_pedido]);
            if (!filas || filas.length === 0) {
                await connection.rollback();
                return res.status(404).json({ success: false, message: 'La comanda no existe.' });
            }

            const pedido = filas[0];
            if (pedido.estado_pago === 'pagado') {
                await connection.rollback();
                return res.status(400).json({ success: false, message: 'Esta comanda ya figura como pagada.' });
            }

            // Obtener el turno de servicio activo
            const turnoActivo = await turnoService.obtenerTurnoActivo();
            if (!turnoActivo) {
                await connection.rollback();
                return res.status(400).json({ success: false, message: 'Debe abrir un turno de servicio antes de liquidar o cobrar cuentas.' });
            }
            const turnoCobroId = turnoActivo.id;

            const factor = parseFloat(factor_cambio || 1.0000);
            const montoOrig = parseFloat(monto_origen || pedido.total);
            const montoEquivLocal = montoOrig * factor;

            const refCompleta = `[LIQUIDACIÓN en Turno #${turnoCobroId}] ${referencia || ''}`.trim();

            // 1. Asentar el pago recibido
            await connection.query(`
                INSERT INTO pagos_pedido 
                (pedido_id, metodo_pago, moneda_id, factor_cambio_aplicado, monto_moneda_origen, monto_equivalente_local, referencia_transaccion, creado_en)
                VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
            `, [
                id_pedido, 
                metodo_pago, 
                moneda_id || 1, 
                factor, 
                montoOrig, 
                montoEquivLocal, 
                refCompleta
            ]);

            // 2. Actualizar estado y asignar al turno activo actual
            await connection.query(`
                UPDATE pedidos 
                SET estado_pago = 'pagado',
                    id_usuario_cajero = ?,
                    turno_servicio_id = ?,
                    fecha_cierre = NOW()
                WHERE id = ?
            `, [id_cajero, turnoCobroId, id_pedido]);

            await connection.commit();

            return res.json({
                success: true,
                message: `Comanda #${id_pedido} cobrada con éxito. El monto ($${montoEquivLocal.toFixed(2)}) ingresó a la caja del Turno #${turnoCobroId}.`
            });

        } catch (error) {
            await connection.rollback();
            console.error('Error al liquidar cuenta:', error);
            return res.status(500).json({ success: false, message: 'Error interno al asentar cobro.' });
        } finally {
            connection.release();
        }
    },

    /**
     * Lista los cierres históricos y facturas pendientes
     * GET /admin/cierres-historico
     */
    renderHistorialCierres: async (req, res) => {
        try {
            const turnoActivo = await turnoService.obtenerTurnoActivo();

            const [cierres] = await db.query(`
                SELECT 
                    cs.id,
                    cs.turno_servicio_id,
                    cs.fecha_cierre,
                    cs.fondo_apertura,
                    cs.total_cobrado_caja,
                    cs.total_propinas,
                    cs.total_cxc_facturas,
                    cs.total_pendiente_pago,
                    cs.total_cortesias,
                    cs.monto_esperado_caja,
                    cs.monto_real_entregado,
                    cs.diferencia,
                    cs.balance_estado,
                    cs.total_pedidos,
                    cs.pedidos_pagados,
                    cs.pedidos_facturados,
                    cs.pedidos_pendientes,
                    cs.desglose_monedas,
                    cs.observaciones,
                    ts.fecha_apertura,
                    CONCAT(u_ap.nombre, ' ', u_ap.apellidos) AS usuario_apertura,
                    CONCAT(u_cr.nombre, ' ', u_cr.apellidos) AS usuario_cierre
                FROM cierres_servicio cs
                INNER JOIN turnos_servicio ts ON cs.turno_servicio_id = ts.id
                LEFT JOIN usuarios u_ap ON ts.usuario_apertura_id = u_ap.id
                LEFT JOIN usuarios u_cr ON cs.usuario_cierre_id = u_cr.id
                ORDER BY cs.fecha_cierre DESC
            `);

            const cierresFormateados = cierres.map(c => ({
                ...c,
                desglose_monedas: typeof c.desglose_monedas === 'string' 
                    ? JSON.parse(c.desglose_monedas || '[]') 
                    : (c.desglose_monedas || [])
            }));

            const [facturasPendientes] = await db.query(`
                SELECT 
                    p.id,
                    p.id_mesa,
                    p.turno_servicio_id,
                    ts.fecha_apertura AS fecha_turno,
                    m.numero AS numero_mesa,
                    CONCAT('Mesa ', m.numero) AS nombre_mesa,
                    p.subtotal,
                    p.impuesto,
                    p.total,
                    p.creado_en AS fecha_pedido,
                    p.fecha_cierre,
                    CONCAT(u.nombre, ' ', u.apellidos) AS mesero
                FROM pedidos p
                INNER JOIN turnos_servicio ts ON p.turno_servicio_id = ts.id
                LEFT JOIN mesas m ON p.id_mesa = m.id
                LEFT JOIN usuarios u ON p.id_usuario_mesero = u.id
                WHERE p.estado_pago = 'facturado'
                ORDER BY p.id DESC
            `);

            const totalHistoricoRecaudado = cierresFormateados.reduce((sum, c) => sum + parseFloat(c.total_cobrado_caja || 0), 0);
            const totalCxCPendiente = facturasPendientes.reduce((sum, f) => sum + parseFloat(f.total || 0), 0);

            res.render('caja/cierres_historico', {
                pageTitle: 'Histórico de Cierres y Cuentas por Cobrar',
                user: req.user,
                view: 'cierres-historico',
                turnoActivo,
                cierres: cierresFormateados,
                facturasPendientes,
                metricas: {
                    totalCierres: cierresFormateados.length,
                    totalRecaudado: totalHistoricoRecaudado,
                    totalCxCPendiente,
                    cantidadFacturasPendientes: facturasPendientes.length
                }
            });
        } catch (error) {
            console.error('Error al listar cierres históricos:', error);
            req.flash('error_msg', 'No se pudo cargar el historial de cierres.');
            res.redirect('/admin/turnos-servicio');
        }
    },

    /**
     * API JSON para obtener la instantánea de un cierre
     * GET /api/admin/cierres-historico/:id
     */
    apiObtenerDetalleCierre: async (req, res) => {
        try {
            const { id } = req.params;
            const [filas] = await db.query(`
                SELECT 
                    cs.*,
                    ts.fecha_apertura,
                    CONCAT(u_ap.nombre, ' ', u_ap.apellidos) AS usuario_apertura,
                    CONCAT(u_cr.nombre, ' ', u_cr.apellidos) AS usuario_cierre
                FROM cierres_servicio cs
                INNER JOIN turnos_servicio ts ON cs.turno_servicio_id = ts.id
                LEFT JOIN usuarios u_ap ON ts.usuario_apertura_id = u_ap.id
                LEFT JOIN usuarios u_cr ON cs.usuario_cierre_id = u_cr.id
                WHERE cs.id = ? OR cs.turno_servicio_id = ?
                LIMIT 1
            `, [id, id]);

            if (filas.length === 0) {
                return res.status(404).json({ success: false, message: 'Cierre de servicio no encontrado.' });
            }

            const cierre = filas[0];
            cierre.desglose_monedas = typeof cierre.desglose_monedas === 'string' 
                ? JSON.parse(cierre.desglose_monedas || '[]') 
                : (cierre.desglose_monedas || []);

            return res.json({ success: true, cierre });
        } catch (error) {
            console.error('Error en apiObtenerDetalleCierre:', error);
            return res.status(500).json({ success: false, message: 'Error en el servidor.' });
        }
    }
};

module.exports = CierreDiaController;