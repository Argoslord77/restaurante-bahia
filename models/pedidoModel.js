const db = require('../config/db');
const PrecioService = require('../services/precioService');

class Pedido {

    // ------------------------------------------------------------------------
    // MÉTODOS DE CONSULTA (LECTURA)
    // ------------------------------------------------------------------------

    // Obtener un pedido rápido por ID (Solo datos de la tabla pedidos)
    static async getById(id) {
        const [rows] = await db.query(
            `SELECT * FROM pedidos WHERE id = ?`,
            [id]
        );
        return rows[0] || null;
    }

    // Obtener todos los pedidos activos (Para el POS y monitores de piso)
    static async fetchAllActive() {
        const query = `
            SELECT p.*, m.numero AS numero_mesa, u.usuario AS mesero 
            FROM pedidos p
            INNER JOIN mesas m ON p.id_mesa = m.id
            LEFT JOIN usuarios u ON p.id_usuario_mesero = u.id
            WHERE p.fecha_cierre IS NULL
            ORDER BY p.id DESC
        `;
        const [rows] = await db.query(query);
        return rows;
    }

    // Obtener el pedido COMPLETO: Datos generales + Detalles + Modificadores por ítem
    static async findById(id) {
        // 1. Obtener cabecera del pedido
        const queryPedido = `
            SELECT p.*, m.numero AS numero_mesa, u.usuario AS mesero 
            FROM pedidos p
            INNER JOIN mesas m ON p.id_mesa = m.id
            LEFT JOIN usuarios u ON p.id_usuario_mesero = u.id
            WHERE p.id = ?
        `;
        const [pedido] = await db.query(queryPedido, [id]);
        
        if (pedido.length === 0) return null;

        // 2. Obtener los platillos (detalles) del pedido
        const queryDetalles = `
            SELECT dp.*, COALESCE(pd.nombre, pm.nombre) AS nombre_platillo,
                   COALESCE(pm.precio, pd.precio) AS precio_catalogo
            FROM detalles_pedido dp
            LEFT JOIN platillos_menu pm ON dp.id_platillo = pm.id AND dp.es_platillo_dia = 0
            LEFT JOIN platillos_dia pd ON dp.id_platillo = pd.id AND dp.es_platillo_dia = 1
            WHERE dp.id_pedido = ?
        `;
        const [detalles] = await db.query(queryDetalles, [id]);

        // 3. Obtener los modificadores asociados a este pedido (si los hay)
        if (detalles.length > 0) {
            const detallesIds = detalles.map(d => d.id);
            const queryModificadores = `
                SELECT dpm.*, mm.nombre, mm.tipo, mm.precio_adicional
                FROM detalles_pedido_modificadores dpm
                INNER JOIN modificadores_menu mm ON dpm.modificador_id = mm.id
                WHERE dpm.detalle_pedido_id IN (?)
            `;
            const [modificadores] = await db.query(queryModificadores, [detallesIds]);

            // Mapear los modificadores dentro de su respectivo platillo en el array
            detalles.forEach(detalle => {
                detalle.modificadores = modificadores.filter(
                    m => m.detalle_pedido_id === detalle.id
                );
            });
        }
        
        pedido[0].detalles = detalles;
        return pedido[0];
    }

    // Obtener un detalle específico por su ID
    static async getDetalleById(idDetalle) {
        const [rows] = await db.query(
            `SELECT * FROM detalles_pedido WHERE id = ?`,
            [idDetalle]
        );
        return rows[0] || null;
    }

    // ------------------------------------------------------------------------
    // MÉTODOS DE ACTUALIZACIÓN DE ESTADOS
    // ------------------------------------------------------------------------

    // Actualizar estado general del pedido (ej. 'RECIBIDO', 'EN_PREPARACION', 'LISTO')
    static async updateEstadoPedido(id, estado, connection = db) {
        const [result] = await connection.query(
            `UPDATE pedidos SET estado_pedido = ? WHERE id = ?`,
            [estado, id]
        );
        return result.affectedRows;
    }

    // Actualizar estado de un ítem individual en cocina (ej. 'PENDIENTE', 'PREPARADO')
    static async updateEstadoItem(idDetalle, estado, connection = db) {
        const [result] = await connection.query(
            `UPDATE detalles_pedido SET estado_item = ? WHERE id = ?`,
            [estado, idDetalle]
        );
        return result.affectedRows;
    }

    static async actualizarEstadoMesa(id_mesa, estado, connection = db) {
        const [result] = await connection.query(
            `UPDATE mesas SET estado = ? WHERE id = ?`,
            [estado, id_mesa]
        );
        return result.affectedRows;
    }

    // ------------------------------------------------------------------------
    // MÉTODOS TRANSACCIONALES (ESCRITURA / CREACIÓN)
    // ------------------------------------------------------------------------

    // Crear un nuevo pedido (Ahora soporta el turno_servicio_id obligatorio)
    static async create(id_mesa, id_usuario_mesero, turno_servicio_id, connection = db) {
        const [result] = await connection.query(
            `INSERT INTO pedidos (id_mesa, id_usuario_mesero, turno_servicio_id, creado_en) 
             VALUES (?, ?, ?, NOW())`,
            [id_mesa, id_usuario_mesero, turno_servicio_id]
        );
        return result.insertId;
    }

    // Método simple: Agregar un detalle sin modificadores
    static async addDetail(id_pedido, id_platillo, cantidad, connection = db) {
        const [result] = await connection.query(
            `INSERT INTO detalles_pedido (id_pedido, id_platillo, cantidad) VALUES (?, ?, ?)`,
            [id_pedido, id_platillo, cantidad]
        );
        return result.insertId;
    }

    /**
     * MÉTODOS NUEVO E IMPRESCINDIBLE PARA EL POS:
     * Agrega un platillo y le adjunta sus modificadores en la misma consulta
     * @param {Array} modificadores - Array de objetos: [{ id: 1, precio: 5.00 }, { id: 2, precio: 0.00 }]
     */
    static async addDetailWithModifiers(id_pedido, id_platillo, cantidad, modificadores = [], connection = db) {
        // Esta ruta legacy también debe respetar la carta de la mesa. El valor
        // recibido desde el navegador no se usa para determinar el precio.
        const [pedidoRows] = await connection.query(
            'SELECT id_mesa, turno_servicio_id FROM pedidos WHERE id = ? LIMIT 1',
            [id_pedido]
        );
        if (!pedidoRows.length) throw new Error('Pedido no encontrado.');

        const [platillos] = await connection.query(`
            SELECT id, nombre, precio, precio_alt, precio_usd
            FROM platillos_menu
            WHERE id = ? AND activo = 1
            LIMIT 1
        `, [id_platillo]);
        if (!platillos.length) throw new Error('El platillo no existe o está inactivo.');

        const contexto = await PrecioService.obtenerContextoCobro({
            idMesa: pedidoRows[0].id_mesa,
            turnoId: pedidoRows[0].turno_servicio_id,
            connection
        });
        const precio = PrecioService.validarPrecioConfigurado(platillos[0], contexto.carta);

        const [resDetalle] = await connection.query(
            `INSERT INTO detalles_pedido
             (id_pedido, id_platillo, es_platillo_dia, cantidad, precio_unitario, estado_item, afecta_inventario)
             VALUES (?, ?, 0, ?, ?, 'en_cocina', 1)`,
            [id_pedido, id_platillo, cantidad, precio]
        );
        const detalleId = resDetalle.insertId;

        if (modificadores && modificadores.length > 0) {
            const values = modificadores.map(mod => [detalleId, mod.id, mod.precio || 0.00]);
            await connection.query(
                `INSERT INTO detalles_pedido_modificadores
                 (detalle_pedido_id, modificador_id, precio_cobrado) VALUES ?`,
                [values]
            );
        }
        return detalleId;
    }

    // Cerrar el pedido al cobrar en caja
    static async cerrarPedido(id_pedido, id_cajero, connection = db) {
        const [result] = await connection.query(
            `UPDATE pedidos 
             SET fecha_cierre = NOW(), id_usuario_cajero = ?, estado_pago = 'PAGADO' 
             WHERE id = ?`,
            [id_cajero, id_pedido]
        );
        return result.affectedRows;
    }
}

module.exports = Pedido;