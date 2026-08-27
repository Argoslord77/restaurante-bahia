// services/dashboardService.js
'use strict';

const db = require('../config/db');

const ESTADOS_MESA_ACTIVA = new Set(['ocupada', 'desocupandose']);

function esOperacionExitosa(valor) {
    return valor === true || Number(valor) === 1;
}

function normalizarEstadoMesa(estado, estadoMesaDb, pedidoActivoId) {
    const estadoBase = String(estadoMesaDb || estado || 'libre').trim().toLowerCase();

    // Mantenimiento y "por cobrar" son estados explícitos de la mesa y no
    // deben ser reemplazados por el estado genérico del pedido.
    if (estadoBase === 'mantenimiento') return 'mantenimiento';
    if (estadoBase === 'desocupandose') return 'desocupandose';
    if (pedidoActivoId !== null && pedidoActivoId !== undefined) return 'ocupada';
    if (estadoBase === 'reservada') return 'reservada';
    if (estadoBase === 'ocupada') return 'ocupada';
    return 'libre';
}

function nombreUsuarioDeLog(log) {
    const nombre = String(log.usuario_nombre || '').trim();
    if (nombre) return nombre;
    return String(log.usuario_rol || '').toLowerCase() === 'publico'
        ? 'Visitante'
        : 'Usuario no identificado';
}

function convertirLogAAccion(log) {
    const usuario = nombreUsuarioDeLog(log);
    const accion = String(log.accion || '').trim() || `${log.metodo_http || 'GET'} ${log.ruta || '/'}`;
    const ruta = `${log.metodo_http || 'GET'} ${log.ruta || '/'}`.trim();
    const exitosa = esOperacionExitosa(log.operacion_exitosa);
    const estadoHttp = log.estado_http === null || log.estado_http === undefined
        ? ''
        : `HTTP ${log.estado_http}`;

    return {
        id: Number(log.id),
        usuario_id: log.usuario_id === null || log.usuario_id === undefined ? null : Number(log.usuario_id),
        usuario_nombre: usuario,
        usuario_rol: log.usuario_rol || 'publico',
        metodo_http: log.metodo_http || 'GET',
        ruta: log.ruta || '/',
        accion,
        texto: `${usuario}: ${accion}`,
        detalle: [ruta, estadoHttp].filter(Boolean).join(' · '),
        color: exitosa ? 'text-success' : 'text-danger',
        operacion_exitosa: exitosa,
        estado_http: log.estado_http,
        creado_en: log.creado_en,
        duracion_ms: log.duracion_ms
    };
}

class DashboardService {
    /**
     * Obtiene las mesas y calcula su estado operativo actual.
     *
     * Se considera pedido activo el último pedido no cerrado de la mesa cuyo
     * pago siga pendiente. La subconsulta evita duplicar una mesa cuando hay
     * más de un pedido histórico que todavía cumple parcialmente el filtro.
     */
    async obtenerEstadosMesas() {
        const [rows] = await db.query(`
            SELECT
                m.id,
                m.numero,
                m.capacidad,
                m.ubicacion,
                m.carta,
                m.estado AS estado_mesa_db,
                p.id AS pedido_activo_id,
                p.estado_pedido,
                p.estado_pago,
                p.total AS total_pedido,
                p.creado_en AS pedido_creado_en,
                CASE
                    WHEN m.estado = 'mantenimiento' THEN 'mantenimiento'
                    WHEN m.estado = 'desocupandose' THEN 'desocupandose'
                    WHEN p.id IS NOT NULL THEN 'ocupada'
                    WHEN m.estado = 'reservada' THEN 'reservada'
                    ELSE 'libre'
                END AS estado,
                CASE
                    WHEN u.id IS NULL THEN NULL
                    ELSE COALESCE(NULLIF(TRIM(CONCAT_WS(' ', u.nombre, u.apellidos)), ''), u.usuario)
                END AS mesero
            FROM mesas m
            LEFT JOIN (
                SELECT
                    p1.id,
                    p1.id_mesa,
                    p1.estado_pedido,
                    p1.estado_pago,
                    p1.total,
                    p1.id_usuario_mesero,
                    p1.creado_en
                FROM pedidos p1
                INNER JOIN (
                    SELECT id_mesa, MAX(id) AS pedido_id
                    FROM pedidos
                    WHERE fecha_cierre IS NULL
                      AND estado_pago IN ('pendiente', 'pendiente_pago')
                      AND estado_pedido <> 'cancelado'
                    GROUP BY id_mesa
                ) ultimo ON ultimo.pedido_id = p1.id
            ) p ON p.id_mesa = m.id
            LEFT JOIN usuarios u ON u.id = p.id_usuario_mesero
            ORDER BY CAST(m.numero AS UNSIGNED) ASC, m.numero ASC
        `);

        return rows.map(row => ({
            ...row,
            estado: normalizarEstadoMesa(row.estado, row.estado_mesa_db, row.pedido_activo_id),
            pedido_activo_id: row.pedido_activo_id === null || row.pedido_activo_id === undefined
                ? null
                : Number(row.pedido_activo_id),
            total_pedido: row.total_pedido === null || row.total_pedido === undefined
                ? null
                : Number(row.total_pedido)
        }));
    }

    /**
     * Lee las últimas operaciones de auditoría. El dashboard no depende de
     * notificaciones del mesero: esta sección muestra el registro real de
     * auditoria_usuarios, incluyendo usuario, operación y resultado HTTP.
     */
    async obtenerUltimasAcciones(limite = 6) {
        try {
            const [rows] = await db.query(`
                SELECT
                    id,
                    usuario_id,
                    usuario_nombre,
                    usuario_rol,
                    metodo_http,
                    ruta,
                    accion,
                    estado_http,
                    operacion_exitosa,
                    duracion_ms,
                    creado_en
                FROM auditoria_usuarios
                ORDER BY creado_en DESC, id DESC
                LIMIT ?
            `, [Math.min(20, Math.max(1, Number(limite) || 6))]);

            return rows.map(convertirLogAAccion);
        } catch (error) {
            // La tabla se crea al iniciar la aplicación. Se tolera que una BD
            // antigua aún no la tenga para que el resto del dashboard siga
            // mostrando datos reales de mesas y métricas.
            if (error.code !== 'ER_NO_SUCH_TABLE') {
                console.error('Error al obtener últimas acciones de auditoría:', error);
            }
            return [];
        }
    }

    /**
     * Obtiene métricas en tiempo real, estados de mesas y últimas acciones.
     */
    async getMetrics(turnoId = null) {
        let distribucionMesas = [];
        try {
            distribucionMesas = await this.obtenerEstadosMesas();
        } catch (error) {
            console.error('Error al obtener estados de mesas del dashboard:', error);
        }

        const mesasTotales = distribucionMesas.length;
        const mesasOcupadas = distribucionMesas.filter(mesa => ESTADOS_MESA_ACTIVA.has(mesa.estado)).length;

        let pedidosCocina = 0;
        try {
            const [cocinaRes] = await db.query(`
                SELECT COUNT(DISTINCT dp.id) AS pendientes_cocina
                FROM detalles_pedido dp
                INNER JOIN pedidos p ON dp.id_pedido = p.id
                WHERE dp.estado_item IN ('en_espera', 'en_cocina', 'en_bar')
                  AND p.fecha_cierre IS NULL
                  AND p.estado_pago IN ('pendiente', 'pendiente_pago')
                  AND p.estado_pedido <> 'cancelado'
            `);
            pedidosCocina = parseInt(cocinaRes[0]?.pendientes_cocina || 0, 10);
        } catch (error) {
            console.error('Error al obtener pedidos pendientes del dashboard:', error);
        }

        let ventasDia = '0.00';
        try {
            let queryVentas = `
                SELECT COALESCE(SUM(total), 0) AS total_ventas
                FROM pedidos
                WHERE estado_pago IN ('pagado', 'cortesia', 'facturado')
            `;
            const paramsVentas = [];

            if (turnoId) {
                queryVentas += ' AND turno_servicio_id = ?';
                paramsVentas.push(turnoId);
            } else {
                queryVentas += ' AND DATE(creado_en) = CURDATE()';
            }

            const [ventasRes] = await db.query(queryVentas, paramsVentas);
            ventasDia = parseFloat(ventasRes[0]?.total_ventas || 0).toFixed(2);
        } catch (error) {
            console.error('Error al obtener ventas del dashboard:', error);
        }

        let totalPersonal = 0;
        try {
            const [personalRes] = await db.query(`
                SELECT COUNT(id) AS total_personal
                FROM usuarios
                WHERE activo = 1 AND usuario != '_default_user_'
            `);
            totalPersonal = parseInt(personalRes[0]?.total_personal || 0, 10);
        } catch (error) {
            console.error('Error al obtener personal del dashboard:', error);
        }

        const ultimasAcciones = await this.obtenerUltimasAcciones(6);

        return {
            mesasTotales,
            mesasOcupadas,
            pedidosCocina,
            ventasDia,
            totalPersonal,
            // El nombre que consume la vista se mantiene explícito. Se deja
            // también el alias anterior para no romper otros consumidores.
            distribucionMesas,
            salondMesas: distribucionMesas,
            ultimasAcciones
        };
    }
}

module.exports = new DashboardService();
