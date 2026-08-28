// services/turnoService.js
const TurnoModel = require('../models/turnoModel');
const db = require('../config/db');
const CajaService = require('./cajaService');

class TurnoService {
    static async obtenerTurnoActivo() {
        return await TurnoModel.findActive();
    }

    static async obtenerDatosParaVista() {
        const turnoActivo = await TurnoModel.findActive();
        const historial = await TurnoModel.getHistorialCompleto(15);
        
        const [monedas] = await db.query(
            "SELECT id, codigo, nombre, simbolo, es_moneda_base, factor_cambio FROM monedas WHERE activo = 1 ORDER BY es_moneda_base DESC, codigo ASC"
        );
        
        return { turnoActivo, historial, monedas };
    }

    static async abrirNuevoTurno(usuarioId, montoApertura, observaciones, monedasTurno = []) {
        const turnoExistente = await TurnoModel.findActive();
        if (turnoExistente) {
            throw new Error("Operación denegada. Ya existe un turno de servicio activo.");
        }

        const turnoId = await TurnoModel.createAperturaConMonedas(usuarioId, montoApertura, observaciones, monedasTurno);
        return turnoId;
    }

    /**
     * Cierra el turno activo y genera la instantánea en cierres_servicio
     * Contempla cobros directos y cobros retroactivos en el mismo turno
     */
    static async cerrarTurnoActivo(usuarioCierreId, montoCierreReal, observacionesCierre) {
        const turnoActivo = await this.obtenerTurnoActivo();
        if (!turnoActivo) {
            throw new Error("No hay un turno de servicio activo para cerrar.");
        }

        const turnoId = turnoActivo.id;
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            // 1. Obtener todas las comandas asignadas a este turno
            const [pedidos] = await connection.query(`
                SELECT 
                    id, id_mesa, total, subtotal, descuento, propina, estado_pago, estado_pedido
                FROM pedidos 
                WHERE turno_servicio_id = ?
            `, [turnoId]);

            // 2. Desglose real por método y moneda. ZELLE se excluye del
            //    efectivo físico mediante CajaService.
            const desglosePagos = await CajaService.obtenerDesglosePagos(turnoId, connection);
            const resumenFinanciero = CajaService.calcularResumenFinanciero(
                pedidos,
                desglosePagos,
                turnoActivo.monto_apertura
            );

            const total_cobrado_caja = resumenFinanciero.total_cobrado_caja;
            const total_propinas = resumenFinanciero.total_propinas;
            const total_cxc_facturas = resumenFinanciero.total_cxc_facturas;
            const total_pendiente_pago = resumenFinanciero.total_pendiente_pago;
            const total_cortesias = resumenFinanciero.total_cortesias;
            const pedidos_pagados = pedidos.filter(p => p.estado_pago === 'pagado').length;
            const pedidos_facturados = pedidos.filter(p => p.estado_pago === 'facturado').length;
            const pedidos_pendientes = pedidos.filter(p => p.estado_pago === 'pendiente_pago').length;

            const fondoApertura = parseFloat(turnoActivo.monto_apertura || 0);
            const montoEsperado = resumenFinanciero.total_en_caja_esperado;
            const diferencia = parseFloat(montoCierreReal) - montoEsperado;
            const balanceEstado = Math.abs(diferencia) < 0.01
                ? 'cuadrado'
                : (diferencia > 0 ? 'sobrante' : 'faltante');

            // 4. Persistir la instantánea en cierres_servicio
            try {
                await connection.query(`
                    CREATE TABLE IF NOT EXISTS \`cierres_servicio\` (
                        \`id\` BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
                        \`turno_servicio_id\` BIGINT(20) UNSIGNED NOT NULL,
                        \`fecha_cierre\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP(),
                        \`usuario_cierre_id\` INT(11) NOT NULL,
                        \`fondo_apertura\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                        \`total_cobrado_caja\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                        \`total_propinas\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                        \`total_cxc_facturas\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                        \`total_pendiente_pago\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                        \`total_cortesias\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                        \`monto_esperado_caja\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                        \`monto_real_entregado\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                        \`diferencia\` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                        \`balance_estado\` ENUM('cuadrado','sobrante','faltante') NOT NULL DEFAULT 'cuadrado',
                        \`total_pedidos\` INT(11) NOT NULL DEFAULT 0,
                        \`pedidos_pagados\` INT(11) NOT NULL DEFAULT 0,
                        \`pedidos_facturados\` INT(11) NOT NULL DEFAULT 0,
                        \`pedidos_pendientes\` INT(11) NOT NULL DEFAULT 0,
                        \`desglose_monedas\` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
                        \`observaciones\` TEXT DEFAULT NULL,
                        \`creado_en\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
                        PRIMARY KEY (\`id\`),
                        UNIQUE KEY \`uk_cierre_turno\` (\`turno_servicio_id\`)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
                `);

                await connection.query(`
                    INSERT INTO cierres_servicio (
                        turno_servicio_id, usuario_cierre_id, fecha_cierre,
                        fondo_apertura, total_cobrado_caja, total_propinas,
                        total_cxc_facturas, total_pendiente_pago, total_cortesias,
                        monto_esperado_caja, monto_real_entregado, diferencia, balance_estado,
                        total_pedidos, pedidos_pagados, pedidos_facturados, pedidos_pendientes,
                        desglose_monedas, observaciones
                    ) VALUES (?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                        usuario_cierre_id = VALUES(usuario_cierre_id),
                        fondo_apertura = VALUES(fondo_apertura),
                        total_cobrado_caja = VALUES(total_cobrado_caja),
                        total_propinas = VALUES(total_propinas),
                        total_cxc_facturas = VALUES(total_cxc_facturas),
                        total_pendiente_pago = VALUES(total_pendiente_pago),
                        total_cortesias = VALUES(total_cortesias),
                        monto_esperado_caja = VALUES(monto_esperado_caja),
                        monto_real_entregado = VALUES(monto_real_entregado),
                        diferencia = VALUES(diferencia),
                        balance_estado = VALUES(balance_estado),
                        desglose_monedas = VALUES(desglose_monedas),
                        observaciones = VALUES(observaciones)
                `, [
                    turnoId,
                    usuarioCierreId,
                    fondoApertura,
                    total_cobrado_caja,
                    total_propinas,
                    total_cxc_facturas,
                    total_pendiente_pago,
                    total_cortesias,
                    montoEsperado,
                    montoCierreReal,
                    diferencia,
                    balanceEstado,
                    pedidos.length,
                    pedidos_pagados,
                    pedidos_facturados,
                    pedidos_pendientes,
                    JSON.stringify(desglosePagos),
                    observacionesCierre || null
                ]);
            } catch (errSnapshot) {
                console.warn('[TurnoService] Advertencia al persistir instantánea:', errSnapshot.message);
            }

            // 5. Cerrar el turno en turnos_servicio
            await connection.query(`
                UPDATE turnos_servicio 
                SET estado = 'cerrado',
                    usuario_cierre_id = ?,
                    fecha_cierre = NOW(),
                    monto_cierre_esperado = ?,
                    monto_cierre_real = ?,
                    observaciones = ?
                WHERE id = ?
            `, [
                usuarioCierreId,
                montoEsperado,
                montoCierreReal,
                observacionesCierre || null,
                turnoId
            ]);

            await connection.commit();

            return {
                turnoId,
                fondoApertura,
                totalCobrado: total_cobrado_caja,
                totalPropinas: total_propinas,
                totalZelle: resumenFinanciero.total_zelle,
                montoEsperado,
                montoReal: montoCierreReal,
                diferencia,
                balanceEstado
            };

        } catch (error) {
            await connection.rollback();
            console.error('Error en TurnoService.cerrarTurnoActivo:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    static async obtenerMonedasTurnoActivo() {
        const turnoActivo = await TurnoModel.findActive();
        if (!turnoActivo) {
            throw new Error("No hay un turno de servicio activo.");
        }

        // Si el snapshot del turno tuviera filas duplicadas por moneda (p. ej.
        // guardado dos veces), se toma SOLO la fila más reciente de cada
        // moneda. Sin esto el JOIN duplicaba cada moneda en los selects de
        // cobro/turnos.
        const query = `
            SELECT 
                m.id AS moneda_id,
                m.codigo,
                m.nombre,
                m.simbolo,
                m.es_moneda_base,
                COALESCE(mt.factor_cambio_turno, m.factor_cambio) AS factor_cambio
            FROM monedas m
            LEFT JOIN (
                SELECT t2.moneda_id, t2.factor_cambio_turno
                FROM monedas_turno t2
                INNER JOIN (
                    SELECT moneda_id, MAX(id) AS id_max
                    FROM monedas_turno
                    WHERE turno_servicio_id = ?
                    GROUP BY moneda_id
                ) latest ON latest.id_max = t2.id
                WHERE t2.turno_servicio_id = ?
            ) mt ON mt.moneda_id = m.id
            WHERE m.activo = 1
              AND (mt.moneda_id IS NOT NULL OR UPPER(m.codigo) = 'ZELLE')
        `;
        const [rows] = await db.query(query, [turnoActivo.id, turnoActivo.id]);
        const [[snapshot]] = await db.query(
            'SELECT COUNT(*) AS total FROM monedas_turno WHERE turno_servicio_id = ?',
            [turnoActivo.id]
        );

        // Compatibilidad con turnos antiguos sin snapshot: se muestran todas
        // las monedas activas. ZELLE se incluye además en los turnos nuevos.
        if (Number(snapshot?.total || 0) === 0) {
            const [monedasGlobales] = await db.query(
                "SELECT id AS moneda_id, codigo, nombre, simbolo, es_moneda_base, factor_cambio FROM monedas WHERE activo = 1"
            );
            return { turno_id: turnoActivo.id, monedas: monedasGlobales };
        }

        return { turno_id: turnoActivo.id, monedas: rows };
    }
}

module.exports = TurnoService;