const pool = require('../config/db');
const SettingService = require('../services/settingService');

module.exports = {
    // Vista del Monitor Digital de Cocina / Bar
    viewMonitor: async (req, res) => {
        try {
            const rawArea = req.params.area || 'cocina';
            const areaKey = rawArea.toLowerCase() === 'bar' ? 'bar' : 'cocina';
            const area = areaKey.toUpperCase();
            const habilitarMonitores = await SettingService.get('habilitar_monitores_elaboracion', true);

            const isAdministrative = req.user && ['superadministrador', 'administrador', 'capitan'].includes(req.user.rol);
            const exitUrl = isAdministrative ? '/admin/dashboard' : '/logout';

            let comandas = [];
            if (habilitarMonitores && pool) {
                // Consulta de comandas activas
                let tipoFilter = '';
                if (areaKey === 'cocina') {
                    tipoFilter = "AND (COALESCE(pd.tipo, cp.tipo, 'COMESTIBLES') = 'COMESTIBLES' OR cp.tipo = 'cocina' OR cp.tipo IS NULL OR cp.tipo = '')";
                } else if (areaKey === 'bar') {
                    tipoFilter = "AND (COALESCE(pd.tipo, cp.tipo, '') = 'BEBIDAS' OR cp.tipo = 'bar')";
                }

                const [items] = await pool.query(`
                    SELECT dp.id AS detalle_id, dp.id_pedido, dp.cantidad, dp.notas_especiales, 
                           dp.estado_item, p.creado_en AS fecha_item,
                           COALESCE(pd.nombre, pm.nombre, 'Platillo') AS nombre_platillo,
                           pm.categoria AS categoria_id,
                           COALESCE(cp.nombre, 'Oferta Especial') AS categoria_nombre,
                           COALESCE(pd.tipo, cp.tipo, 'COMESTIBLES') AS categoria_tipo,
                           p.id_mesa, m.numero AS numero_mesa, m.ubicacion AS mesa_ubicacion,
                           u.nombre AS mesero_nombre, p.creado_en AS fecha_pedido
                    FROM detalles_pedido dp
                    INNER JOIN pedidos p ON dp.id_pedido = p.id
                    LEFT JOIN mesas m ON p.id_mesa = m.id
                    LEFT JOIN usuarios u ON p.id_usuario_mesero = u.id
                    LEFT JOIN platillos_menu pm ON (dp.id_platillo = pm.id AND (dp.es_platillo_dia = 0 OR dp.es_platillo_dia IS NULL))
                    LEFT JOIN platillos_dia pd ON (dp.id_platillo = pd.id AND dp.es_platillo_dia = 1)
                    LEFT JOIN categorias_platillos cp ON pm.categoria = cp.id
                    WHERE p.estado_pago = 'pendiente'
                      AND dp.estado_item IN ('en_cocina', 'en_bar', 'en_espera', 'en_preparacion')
                      ${tipoFilter}
                    ORDER BY dp.id ASC
                `);

                // Agrupar items por pedido / comanda
                const comandasMap = new Map();
                for (const row of items) {
                    if (!comandasMap.has(row.id_pedido)) {
                        comandasMap.set(row.id_pedido, {
                            id_pedido: row.id_pedido,
                            id_mesa: row.id_mesa,
                            numero_mesa: row.numero_mesa || `${row.id_mesa}`,
                            mesa_ubicacion: row.mesa_ubicacion,
                            mesero_nombre: row.mesero_nombre || 'Mesero',
                            fecha_pedido: row.fecha_pedido,
                            items: []
                        });
                    }
                    comandasMap.get(row.id_pedido).items.push({
                        detalle_id: row.detalle_id,
                        nombre_platillo: row.nombre_platillo,
                        cantidad: row.cantidad,
                        notas_especiales: row.notas_especiales,
                        estado_item: row.estado_item,
                        categoria_tipo: row.categoria_tipo,
                        fecha_item: row.fecha_item
                    });
                }

                comandas = Array.from(comandasMap.values());
            }

            res.render('monitor', {
                pageTitle: `Monitor de ${area} • Restaurante Bahía`,
                area,
                areaKey,
                habilitarMonitores,
                comandas,
                isAdministrative,
                exitUrl,
                user: req.user || null
            });
        } catch (err) {
            console.error('Error al cargar monitor:', err);
            res.status(500).send('Error interno en Monitor');
        }
    },

    // API de Polling de comandas activas
    getComandasAPI: async (req, res) => {
        try {
            const rawArea = req.query.area || 'cocina';
            const areaKey = rawArea.toLowerCase() === 'bar' ? 'bar' : 'cocina';
            const habilitarMonitores = await SettingService.get('habilitar_monitores_elaboracion', true);

            if (!habilitarMonitores) {
                return res.json({
                    success: true,
                    habilitarMonitores: false,
                    message: 'Monitores de elaboración deshabilitados en Opciones Generales',
                    comandas: []
                });
            }

            if (!pool) return res.json({ success: true, habilitarMonitores: true, comandas: [] });

            let tipoFilter = '';
            if (areaKey === 'cocina') {
                tipoFilter = "AND (COALESCE(pd.tipo, cp.tipo, 'COMESTIBLES') = 'COMESTIBLES' OR cp.tipo = 'cocina' OR cp.tipo IS NULL OR cp.tipo = '')";
            } else if (areaKey === 'bar') {
                tipoFilter = "AND (COALESCE(pd.tipo, cp.tipo, '') = 'BEBIDAS' OR cp.tipo = 'bar')";
            }

            const [items] = await pool.query(`
                SELECT dp.id AS detalle_id, dp.id_pedido, dp.cantidad, dp.notas_especiales, 
                       dp.estado_item, p.creado_en AS fecha_item,
                       COALESCE(pd.nombre, pm.nombre, 'Platillo') AS nombre_platillo,
                       pm.categoria AS categoria_id,
                       COALESCE(cp.nombre, 'Oferta Especial') AS categoria_nombre,
                       COALESCE(pd.tipo, cp.tipo, 'COMESTIBLES') AS categoria_tipo,
                       p.id_mesa, m.numero AS numero_mesa, m.ubicacion AS mesa_ubicacion,
                       u.nombre AS mesero_nombre, p.creado_en AS fecha_pedido
                FROM detalles_pedido dp
                INNER JOIN pedidos p ON dp.id_pedido = p.id
                LEFT JOIN mesas m ON p.id_mesa = m.id
                LEFT JOIN usuarios u ON p.id_usuario_mesero = u.id
                LEFT JOIN platillos_menu pm ON (dp.id_platillo = pm.id AND (dp.es_platillo_dia = 0 OR dp.es_platillo_dia IS NULL))
                LEFT JOIN platillos_dia pd ON (dp.id_platillo = pd.id AND dp.es_platillo_dia = 1)
                LEFT JOIN categorias_platillos cp ON pm.categoria = cp.id
                WHERE p.estado_pago = 'pendiente'
                  AND dp.estado_item IN ('en_cocina', 'en_bar', 'en_espera', 'en_preparacion')
                  ${tipoFilter}
                ORDER BY dp.id ASC
            `);

            const comandasMap = new Map();
            for (const row of items) {
                if (!comandasMap.has(row.id_pedido)) {
                    comandasMap.set(row.id_pedido, {
                        id_pedido: row.id_pedido,
                        id_mesa: row.id_mesa,
                        numero_mesa: row.numero_mesa || `${row.id_mesa}`,
                        mesa_ubicacion: row.mesa_ubicacion,
                        mesero_nombre: row.mesero_nombre || 'Mesero',
                        fecha_pedido: row.fecha_pedido,
                        items: []
                    });
                }
                comandasMap.get(row.id_pedido).items.push({
                    detalle_id: row.detalle_id,
                    nombre_platillo: row.nombre_platillo,
                    cantidad: row.cantidad,
                    notas_especiales: row.notas_especiales,
                    estado_item: row.estado_item,
                    categoria_tipo: row.categoria_tipo,
                    fecha_item: row.fecha_item
                });
            }

            res.json({
                success: true,
                habilitarMonitores: true,
                total_comandas: comandasMap.size,
                comandas: Array.from(comandasMap.values())
            });
        } catch (err) {
            console.error('Error en getComandasAPI:', err);
            res.status(500).json({ success: false, error: err.message });
        }
    },

    // Actualizar estado de ítem desde el monitor (ej: marcar como 'listo')
    apiActualizarEstadoItem: async (req, res) => {
        try {
            const { detalle_id, id_detalle, nuevo_estado } = req.body;
            const targetId = detalle_id || id_detalle;
            const targetEstado = nuevo_estado || 'listo';

            if (!targetId) {
                return res.status(400).json({ success: false, message: 'Falta detalle_id' });
            }

            if (!pool) return res.json({ success: true, message: 'Estado actualizado' });

            await pool.query('UPDATE detalles_pedido SET estado_item = ? WHERE id = ?', [targetEstado, targetId]);

            // Actualizar estado general del pedido si aplica
            const [rows] = await pool.query('SELECT id_pedido FROM detalles_pedido WHERE id = ?', [targetId]);
            if (rows.length > 0) {
                const pedidoId = rows[0].id_pedido;
                if (targetEstado === 'en_preparacion') {
                    await pool.query("UPDATE pedidos SET estado_pedido = 'preparando' WHERE id = ? AND estado_pedido = 'pendiente'", [pedidoId]);
                }
            }

            res.json({
                success: true,
                detalle_id: targetId,
                nuevo_estado: targetEstado,
                message: `Estado actualizado a "${targetEstado}"`
            });
        } catch (err) {
            console.error('Error en monitor apiActualizarEstadoItem:', err);
            res.status(500).json({ success: false, error: err.message });
        }
    }
};
