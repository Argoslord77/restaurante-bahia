const MenuModel = require('../models/menuModel');
const db = require('../config/db');

const ClienteController = {
  /**
   * Carga el dashboard principal del cliente con el menú y los consumos
   */
  async viewDashboard(req, res) {
    try {
      const { id_mesa } = req.params;

      // 1. Obtener los platillos activos del menú
      const menu = await MenuModel.getAll();

      // 2. Consultar si existe la mesa
      const [mesa] = await db.query(
        `SELECT id, numero 
         FROM mesas 
         WHERE id = ? 
         LIMIT 1`,
        [id_mesa]
      );

      if(!mesa){
        throw new Error("La mesa solicitada no existe.");
      }

      // 3. Consultar si existe un pedido activo asociado a la mesa
      const [pedidos] = await db.query(
        `SELECT id, subtotal, total, estado_pedido 
         FROM pedidos 
         WHERE id_mesa = ? AND fecha_cierre IS NULL 
         LIMIT 1`,
        [id_mesa]
      );

      let pedidoActivo = pedidos[0] || null;
      let consumos = [];

      // 3. Si hay un pedido activo, obtener sus detalles
      if (pedidoActivo) {
        const [detalles] = await db.query(
          `SELECT dp.id, dp.cantidad, dp.precio_unitario, dp.estado_item, pm.nombre AS nombre_platillo
           FROM detalles_pedido dp
           INNER JOIN platillos_menu pm ON dp.id_platillo = pm.id
           WHERE dp.id_pedido = ? AND dp.estado_item != 'cancelado'`,
          [pedidoActivo.id]
        );
        consumos = detalles;
      }

      // 4. Renderizar la vista pasando los datos requeridos
      return res.render('cliente/dashboard', {
        id_mesa,
        menu,
        pedidoActivo,
        consumos
      });
    } catch (error) {
      console.error('Error al cargar el dashboard de cliente:', error);
      return res.status(500).send('Error interno del servidor');
    }
  },

  /**
   * Guarda los ítems seleccionados en la tabla temporal 'pre_pedidos' vinculada a la mesa
   */
    async agregarAPreorden(req, res) {
    try {
      const { id_mesa } = req.params;
      const { items } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'No se enviaron ítems para procesar.' });
      }

      const placeholders = items.map(() => '(?, ?, ?, ?)').join(', ');
      const values = [];

      items.forEach(item => {
        values.push(id_mesa, item.id_platillo, item.cantidad || 1, item.notas_especiales || null);
      });

      await db.query(
        `INSERT INTO pre_pedidos (id_mesa, id_platillo, cantidad, notas_especiales) VALUES ${placeholders}`,
        values
      );

      return res.json({
        success: true,
        message: 'Pre-pedido enviado correctamente. El dependiente revisará su orden.'
      });
    } catch (error) {
      console.error('Error al registrar pre-pedido:', error);
      return res.status(500).json({ success: false, message: 'Error al procesar el pre-pedido.' });
    }
  },

  /**
   * Genera una notificación de asistencia para el dependiente asignado a la mesa
   */
  async callService(req, res) {
    try {
      const { id_mesa } = req.params;

      await db.query(
        `INSERT INTO notificaciones_mesero (id_mesa, tipo, mensaje, leido) 
         VALUES (?, 'LLAMADA_SERVICIO', 'El cliente solicita atención en la mesa', 0)`,
        [id_mesa]
      );

      return res.json({
        success: true,
        message: 'Llamado enviado al dependiente.'
      });
    } catch (error) {
      console.error('Error al llamar al servicio:', error);
      return res.status(500).json({ success: false, message: 'Error al enviar la solicitud.' });
    }
  },

  /**
   * Solicita el cierre de la cuenta y notifica al dependiente
   */
  async cerrarCuenta(req, res) {
    try {
      const { id_pedido } = req.params;

      // Obtener el id_mesa del pedido para registrar la notificación
      const [pedidos] = await db.query(`SELECT id_mesa FROM pedidos WHERE id = ?`, [id_pedido]);

      if (pedidos.length === 0) {
        return res.status(404).json({ success: false, message: 'Pedido no encontrado.' });
      }

      const id_mesa = pedidos[0].id_mesa;

      // Registrar notificación de cierre para el dependiente
      await db.query(
        `INSERT INTO notificaciones_mesero (id_mesa, id_pedido, tipo, mensaje, leido) 
         VALUES (?, ?, 'SOLICITUD_CIERRE', 'El cliente ha solicitado la cuenta', 0)`,
        [id_mesa, id_pedido]
      );

      return res.json({
        success: true,
        message: 'Solicitud de cierre enviada al dependiente.'
      });
    } catch (error) {
      console.error('Error al solicitar el cierre de cuenta:', error);
      return res.status(500).json({ success: false, message: 'Error al procesar la solicitud de cierre.' });
    }
  }
};

module.exports = ClienteController;