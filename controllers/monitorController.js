const db = require('../config/db');
const STATUS = require('../config/orderStatus');

/**
 * Renderiza la vista del monitor según el área (cocina o bar)
 */
exports.viewMonitor = async (req, res) => {
    const { area } = req.params; // 'cocina' o 'bar'
    
    if (!['cocina', 'bar'].includes(area)) {
        return res.status(400).send('Área de monitor no válida.');
    }

    try {
        // En tu SQL, el estado del ítem se mapea a través de STATUS.ITEM
        const estadoFiltro = area === 'cocina' ? STATUS.ITEM.EN_COCINA : STATUS.ITEM.EN_BAR;

        // CONSULTA AJUSTADA: Usamos platillos_menu, estado_item y notas_especiales
        const query = `
            SELECT 
                pd.id AS detalle_id,
                pd.id_pedido,
                pd.cantidad,
                pd.notas_especiales,
                pd.estado_item,
                p.id_mesa,
                m.numero AS numero_mesa,
                pl.nombre AS nombre_platillo
            FROM detalles_pedido pd
            JOIN pedidos p ON pd.id_pedido = p.id
            JOIN mesas m ON p.id_mesa = m.id
            JOIN platillos_menu pl ON pd.id_platillo = pl.id
            WHERE pd.estado_item = ?
              AND p.estado_pedido IN (?, ?)
            ORDER BY p.creado_en ASC, pd.id ASC
        `;
        
        const [items] = await db.query(query, [
            estadoFiltro, 
            STATUS.PEDIDO.PENDIENTE, 
            STATUS.PEDIDO.PREPARANDO
        ]);

        // Agrupar los ítems por pedido para mostrarlos como "comandas"
        const comandas = {};
        items.forEach(item => {
            if (!comandas[item.id_pedido]) {
                comandas[item.id_pedido] = {
                    id_pedido: item.id_pedido,
                    numero_mesa: item.numero_mesa,
                    items: []
                };
            }
            comandas[item.id_pedido].items.push(item);
        });

        res.render('monitor', {
            area: area.toUpperCase(),
            areaKey: area,
            comandas: Object.values(comandas),
            pageTitle: `Monitor de ${area.charAt(0).toUpperCase() + area.slice(1)} - Restaurante Bahía`,
            view: area === 'cocina' ? 'monitor_cocina' : 'monitor_bar', // <-- NUEVO: Vinculación con sidebarmenu
            user: req.user || { nombre: 'Monitor', rol: 'personal' }
        });
    } catch (error) {
        console.error(`Error al cargar el monitor de ${area}:`, error);
        res.status(500).send('Error interno al cargar la pantalla de producción.');
    }
};

/**
 * API para actualizar el estado de preparación de un ítem individual
 */
exports.apiActualizarEstadoItem = async (req, res) => {
    const { detalle_id, nuevo_estado } = req.body;
    const estadosPermitidos = [STATUS.ITEM.LISTO, STATUS.ITEM.CANCELADO];
    
    if (!estadosPermitidos.includes(nuevo_estado)) {
        return res.status(400).json({ success: false, message: 'Estado de destino no válido para el monitor.' });
    }

    try {
        // 1. Obtener id_pedido antes de actualizar
        const [detalle] = await db.query('SELECT id_pedido FROM detalles_pedido WHERE id = ?', [detalle_id]);
        if (!detalle.length) {
            return res.status(404).json({ success: false, message: 'Ítem no encontrado.' });
        }
        const id_pedido = detalle[0].id_pedido;

        // 2. Actualizar estado del ítem
        await db.query(
            'UPDATE detalles_pedido SET estado_item = ? WHERE id = ?',
            [nuevo_estado, detalle_id]
        );

        // 3. Verificar si quedan ítems en cocina/bar para este pedido
        const [pendientes] = await db.query(
            `SELECT COUNT(*) as restantes 
             FROM detalles_pedido 
             WHERE id_pedido = ? AND estado_item IN (?, ?)`,
            [id_pedido, STATUS.ITEM.EN_COCINA, STATUS.ITEM.EN_BAR]
        );

        // Si ya no hay más elementos en preparación, marcar el pedido global como LISTO
        if (pendientes[0].restantes === 0) {
            await db.query(
                'UPDATE pedidos SET estado_pedido = ? WHERE id = ?',
                [STATUS.PEDIDO.LISTO, id_pedido]
            );
        }

        return res.status(200).json({
            success: true,
            message: `El producto ha sido marcado como: ${nuevo_estado}.`
        });
    } catch (error) {
        console.error('Error al actualizar estado del ítem:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
};