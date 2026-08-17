// services/turnoService.js
const TurnoModel = require('../models/turnoModel');
const db = require('../config/db');

class TurnoService {
    /**
     * Retorna el turno activo actual
     */
    static async obtenerTurnoActivo() {
        return await TurnoModel.findActive();
    }

    /**
     * Retorna el conjunto del historial junto con el estado del turno actual y monedas disponibles
     */
    static async obtenerDatosParaVista() {
        const turnoActivo = await TurnoModel.findActive();
        const historial = await TurnoModel.getHistorialCompleto(15);
        
        // Obtener catálogo de monedas activas para el panel de apertura
        const [monedas] = await db.query("SELECT id, codigo, nombre, simbolo, es_moneda_base, factor_cambio FROM monedas WHERE activo = 1 ORDER BY es_moneda_base DESC, codigo ASC");
        
        return { turnoActivo, historial, monedas };
    }

    /**
     * Gestiona las reglas para abrir un turno nuevo guardando el snapshot de tasas
     */
    static async abrirNuevoTurno(usuarioId, montoApertura, observaciones, monedasTurno = []) {
        // Validar si ya existe uno abierto
        const turnoExistente = await TurnoModel.findActive();
        if (turnoExistente) {
            throw new Error("Operación denegada. Ya existe un turno de servicio activo.");
        }

        const turnoId = await TurnoModel.createAperturaConMonedas(usuarioId, montoApertura, observaciones, monedasTurno);
        return turnoId;
    }

    /**
     * Cierra el turno activo y guarda la instantánea en cierres_servicio
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

            // 1. Obtener todas las comandas del turno
            const [pedidos] = await connection.query(`
                SELECT 
                    id, id_mesa, total, subtotal, descuento, propina, estado_pago, estado_pedido
                FROM pedidos 
                WHERE turno_servicio_id = ?
            `, [turnoId]);

            // 2. Obtener el desglose de pagos multimoneda
            const [desglosePagos] = await connection.query(`
                SELECT 
                    pp.metodo_pago,
                    COALESCE(m.codigo, 'CUP') AS codigo_moneda,
                    COALESCE(m.simbolo, '$') AS simbolo,
                    SUM(pp.monto_moneda_origen) AS total_origen,
                    SUM(pp.monto_equivalente_local) AS total_local
                FROM pagos_pedido pp
                INNER JOIN pedidos p ON pp.pedido_id = p.id
                LEFT JOIN monedas m ON pp.moneda_id = m.id
                WHERE p.turno_servicio_id = ?
                  AND pp.metodo_pago NOT IN ('factura', 'pendiente')
                GROUP BY pp.metodo_pago, m.codigo, m.simbolo
            `, [turnoId]);

            // 3. Cálculos del consolidado
            let total_cobrado_caja = 0;
            let total_propinas = 0;
            let total_cxc_facturas = 0;
            let total_pendiente_pago = 0;
            let total_cortesias = 0;
            let pedidos_pagados = 0;
            let pedidos_facturados = 0;
            let pedidos_pendientes = 0;

            pedidos.forEach(p => {
                const tot = parseFloat(p.total || 0);
                const prop = parseFloat(p.propina || 0);

                if (p.estado_pago === 'pagado') {
                    total_cobrado_caja += tot;
                    total_propinas += prop;
                    pedidos_pagados++;
                } else if (p.estado_pago === 'facturado') {
                    total_cxc_facturas += tot;
                    pedidos_facturados++;
                } else if (p.estado_pago === 'pendiente_pago') {
                    total_pendiente_pago += tot;
                    pedidos_pendientes++;
                } else if (p.estado_pago === 'cortesia') {
                    total_cortesias += parseFloat(p.subtotal || 0);
                }
            });

            const fondoApertura = parseFloat(turnoActivo.monto_apertura || 0);
            const montoEsperado = fondoApertura + total_cobrado_caja + total_propinas;
            const diferencia = parseFloat(montoCierreReal) - montoEsperado;
            const balanceEstado = Math.abs(diferencia) < 0.01 ? 'cuadrado' : (diferencia > 0 ? 'sobrante' : 'faltante');

            // 4. Insertar la instantánea en 'cierres_servicio'
            await connection.query(`
                INSERT INTO cierres_servicio (
                    turno_servicio_id, usuario_cierre_id, fecha_cierre,
                    fondo_apertura, total_cobrado_caja, total_propinas,
                    total_cxc_facturas, total_pendiente_pago, total_cortesias,
                    monto_esperado_caja, monto_real_entregado, diferencia, balance_estado,
                    total_pedidos, pedidos_pagados, pedidos_facturados, pedidos_pendientes,
                    desglose_monedas, observaciones
                ) VALUES (?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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

            // 5. Actualizar el estado del turno a 'cerrado' en 'turnos_servicio'
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
                montoEsperado,
                montoReal: montoCierreReal,
                diferencia,
                balanceEstado
            };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Obtiene las monedas habilitadas y sus tasas congeladas para el turno activo actual
     */
    static async obtenerMonedasTurnoActivo() {
        const turnoActivo = await TurnoModel.findActive();
        if (!turnoActivo) {
            throw new Error("No hay un turno de servicio activo.");
        }

        // Consulta las monedas vinculadas al turno activo
        const query = `
            SELECT 
                m.id AS moneda_id,
                m.codigo,
                m.nombre,
                m.simbolo,
                m.es_moneda_base,
                COALESCE(mt.factor_cambio_turno, m.factor_cambio) AS factor_cambio
            FROM monedas_turno mt
            INNER JOIN monedas m ON mt.moneda_id = m.id
            WHERE mt.turno_servicio_id = ? AND m.activo = 1
        `;
        const [rows] = await db.query(query, [turnoActivo.id]);

        // Fallback de seguridad: Si el turno fue abierto antes de la tabla monedas_turno
        if (rows.length === 0) {
            const [monedasGlobales] = await db.query(
                "SELECT id AS moneda_id, codigo, nombre, simbolo, es_moneda_base, factor_cambio FROM monedas WHERE activo = 1"
            );
            return { turno_id: turnoActivo.id, monedas: monedasGlobales };
        }

        return { turno_id: turnoActivo.id, monedas: rows };
    }
}

module.exports = TurnoService;