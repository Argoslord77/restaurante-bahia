// services/dashboardService.js
const db = require('../config/db');

class DashboardService {
    /**
     * Obtiene métricas en tiempo real, distribución de mesas y últimas actividades
     */
    async getMetrics(turnoId = null) {
        try {
            // 1. Total de mesas y mesas ocupadas en tiempo real
            const [mesasRes] = await db.query(`
                SELECT 
                    COUNT(m.id) AS total_mesas,
                    SUM(CASE WHEN m.estado = 'ocupada' OR p.id IS NOT NULL THEN 1 ELSE 0 END) AS mesas_ocupadas
                FROM mesas m
                LEFT JOIN pedidos p ON m.id = p.id_mesa 
                    AND p.estado_pago = 'pendiente' 
                    AND p.estado_pedido NOT IN ('cancelado', 'entregado')
            `);

            const mesasTotales = parseInt(mesasRes[0]?.total_mesas || 0);
            const mesasOcupadas = parseInt(mesasRes[0]?.mesas_ocupadas || 0);

            // 2. Pedidos o ítems pendientes en preparación (Cocina y Bar)
            const [cocinaRes] = await db.query(`
                SELECT COUNT(dp.id) AS pendientes_cocina
                FROM detalles_pedido dp
                INNER JOIN pedidos p ON dp.id_pedido = p.id
                WHERE dp.estado_item IN ('en_espera', 'en_cocina', 'en_bar')
                  AND p.estado_pedido NOT IN ('cancelado')
            `);

            const pedidosCocina = parseInt(cocinaRes[0]?.pendientes_cocina || 0);

            // 3. Ventas totales del turno activo (o del día de hoy si no hay turno)
            let queryVentas = `
                SELECT COALESCE(SUM(total), 0) AS total_ventas
                FROM pedidos 
                WHERE estado_pago IN ('pagado', 'cortesia', 'facturado')
            `;
            let paramsVentas = [];

            if (turnoId) {
                queryVentas += ` AND turno_servicio_id = ?`;
                paramsVentas.push(turnoId);
            } else {
                queryVentas += ` AND DATE(creado_en) = CURDATE()`;
            }

            const [ventasRes] = await db.query(queryVentas, paramsVentas);
            const ventasDia = parseFloat(ventasRes[0]?.total_ventas || 0).toFixed(2);

            // 4. Personal registrado activo en el restaurante
            const [personalRes] = await db.query(`
                SELECT COUNT(id) AS total_personal
                FROM usuarios
                WHERE activo = 1 AND usuario != '_default_user_'
            `);

            const totalPersonal = parseInt(personalRes[0]?.total_personal || 0);

            // 5. Lista de todas las mesas con su estado dinámico
            const [salondMesas] = await db.query(`
                SELECT 
                    m.id,
                    m.numero,
                    m.capacidad,
                    m.ubicacion,
                    m.estado AS estado_mesa_db,
                    p.id AS pedido_activo_id,
                    p.estado_pedido,
                    p.total AS total_pedido,
                    CONCAT(u.nombre, ' ', u.apellidos) AS mesero
                FROM mesas m
                LEFT JOIN pedidos p ON m.id = p.id_mesa 
                    AND p.estado_pago = 'pendiente' 
                    AND p.estado_pedido NOT IN ('cancelado')
                LEFT JOIN usuarios u ON p.id_usuario_mesero = u.id
                ORDER BY CAST(m.numero AS UNSIGNED) ASC
            `);

            // 6. Últimas acciones / Notificaciones recientes (Log de actividad en vivo)
            const [ultimasAcciones] = await db.query(`
                SELECT 
                    n.id,
                    n.tipo,
                    n.mensaje,
                    n.creado_en,
                    m.numero AS numero_mesa
                FROM notificaciones_mesero n
                LEFT JOIN mesas m ON n.id_mesa = m.id
                ORDER BY n.creado_en DESC
                LIMIT 6
            `);

            return {
                mesasTotales,
                mesasOcupadas,
                pedidosCocina,
                ventasDia,
                totalPersonal,
                salondMesas,
                ultimasAcciones
            };

        } catch (error) {
            console.error('Error en DashboardService.getMetrics:', error);
            return {
                mesasTotales: 0,
                mesasOcupadas: 0,
                pedidosCocina: 0,
                ventasDia: '0.00',
                totalPersonal: 0,
                salondMesas: [],
                ultimasAcciones: []
            };
        }
    }
}

module.exports = new DashboardService();