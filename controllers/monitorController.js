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

    const userRole = (req.user && req.user.rol) ? req.user.rol.toLowerCase() : '';

    // Solo usuarios permitidos
    const rolesPermitidos = [
        'superadministrador', 'administrador', 'jefe-cocina', 
        'cocinero', 'bartender', 'luncher', 'porcionador', 'ayudante-cocina'
    ];
    if (!rolesPermitidos.includes(userRole)) {
        return res.redirect('/logout');
    }

    // Restricción por rol de área
    if (['jefe-cocina', 'cocinero', 'luncher', 'porcionador', 'ayudante-cocina'].includes(userRole) && area === 'bar') {
        return res.redirect('/monitor/cocina');
    }
    if (['bartender'].includes(userRole) && area === 'cocina') {
        return res.redirect('/monitor/bar');
    }

    // --- LÓGICA DE NAVEGACIÓN Y ROL ADMINISTRATIVO ---
    const adminRoles = ['superadministrador', 'administrador', 'jefe-cocina'];
    const isAdministrative = adminRoles.includes(userRole);
    const exitUrl = isAdministrative ? '/admin/dashboard' : '/logout';

    try {
        // Determinación del estado a filtrar según el área elegida
        const estadoFiltro = area === 'cocina' 
            ? (STATUS.ITEM.EN_COCINA || 'en_cocina') 
            : (STATUS.ITEM.EN_BAR || 'en_bar');

        // QUERY OPTIMIZADA CON SEGURIDAD PARA MULTI-RONDAS:
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
            WHERE LOWER(pd.estado_item) = LOWER(?)
              AND LOWER(p.estado_pedido) NOT IN ('cerrado', 'pagado', 'cancelado')
            ORDER BY p.creado_en ASC, pd.id ASC
        `;
        
        const [items] = await db.query(query, [estadoFiltro]);

        // Agrupación de ítems en sus respectivas comandas
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
            view: area === 'cocina' ? 'monitor_cocina' : 'monitor_bar',
            user: req.user || { nombre: 'Monitor', rol: 'personal' },
            isAdministrative,
            exitUrl
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
    const estadosPermitidos = [STATUS.ITEM.LISTO, STATUS.ITEM.CANCELADO, 'entregado'];
    
    if (!estadosPermitidos.includes(nuevo_estado)) {
        return res.status(400).json({ success: false, message: 'Estado de destino no válido para el monitor.' });
    }

    try {
        const [detalle] = await db.query('SELECT id_pedido FROM detalles_pedido WHERE id = ?', [detalle_id]);
        if (!detalle.length) {
            return res.status(404).json({ success: false, message: 'Ítem no encontrado.' });
        }
        const id_pedido = detalle[0].id_pedido;

        // Actualizar estado del renglón en detalles_pedido
        await db.query(
            'UPDATE detalles_pedido SET estado_item = ? WHERE id = ?',
            [nuevo_estado, detalle_id]
        );

        // Verificar si quedan más ítems en cocina o bar para esta comanda
        const [pendientes] = await db.query(
            `SELECT COUNT(*) as restantes 
             FROM detalles_pedido 
             WHERE id_pedido = ? AND LOWER(estado_item) IN ('en_cocina', 'en_bar')`,
            [id_pedido]
        );

        // Si ya no quedan platillos por preparar en esta ronda, marcar el pedido global como 'listo'
        if (pendientes[0].restantes === 0) {
            await db.query(
                'UPDATE pedidos SET estado_pedido = ? WHERE id = ?',
                [STATUS.PEDIDO.LISTO || 'listo', id_pedido]
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

/**
 * API para obtener la lista de comandas activas en formato JSON (Polling Asíncrono)
 */
exports.getComandasAPI = async (req, res) => {
    const area = req.query.area || 'cocina';

    if (!['cocina', 'bar'].includes(area)) {
        return res.status(400).json({ success: false, message: 'Área no válida.' });
    }

    try {
        const estadoFiltro = area === 'cocina' 
            ? (STATUS.ITEM.EN_COCINA || 'en_cocina') 
            : (STATUS.ITEM.EN_BAR || 'en_bar');

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
            WHERE LOWER(pd.estado_item) = LOWER(?)
              AND LOWER(p.estado_pedido) NOT IN ('cerrado', 'pagado', 'cancelado')
            ORDER BY p.creado_en ASC, pd.id ASC
        `;
        
        const [items] = await db.query(query, [estadoFiltro]);

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

        return res.status(200).json({
            success: true,
            comandas: Object.values(comandas)
        });
    } catch (error) {
        console.error(`Error al consultar comandas vía API (${area}):`, error);
        return res.status(500).json({ success: false, message: 'Error al consultar datos.' });
    }
};