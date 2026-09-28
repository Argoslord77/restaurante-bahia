// controllers/clienteController.js
const SettingService = require('../services/settingService');
const platilloDiaModel = require('../models/platilloDiaModel');
const turnoService = require('../services/turnoService');
const PrecioService = require('../services/precioService');
const db = require('../config/db');

// B2: anti-abuso del circuito público QR. Cooldowns en memoria por
// mesa/pedido (mapa pequeño: una entrada por mesa activa) con purga
// perezosa y barrido periódico. Impide spam de llamadas y preórdenes.
const cooldowns = new Map();
function segundosRestantes(clave) {
    const vence = cooldowns.get(clave);
    if (!vence) return 0;
    if (vence <= Date.now()) { cooldowns.delete(clave); return 0; }
    return Math.ceil((vence - Date.now()) / 1000);
}
function marcarCooldown(clave, ms) { cooldowns.set(clave, Date.now() + ms); }
const barridoCooldowns = setInterval(() => {
    const ahora = Date.now();
    for (const [clave, vence] of cooldowns) {
        if (vence <= ahora) cooldowns.delete(clave);
    }
}, 10 * 60 * 1000);
if (barridoCooldowns.unref) barridoCooldowns.unref();

async function mesaExiste(idMesa) {
    const [rows] = await db.query('SELECT id FROM mesas WHERE id = ? LIMIT 1', [idMesa]);
    return rows && rows.length > 0;
}

const ClienteController = {
  /**
   * Carga el dashboard principal del cliente con el menú, platillos del día y consumos
   */
  async viewDashboard(req, res) {
    try {
      const { id_mesa } = req.params;
      if (!/^\d+$/.test(String(id_mesa || ''))) {
        return res.status(400).send('El identificador de mesa no es válido.');
      }

      const permitePrepedido = await SettingService.get('cliente_permite_prepedido', true);

      // La mesa determina la carta del menú público y el turno determina la
      // moneda base/tasa que debe mostrarse y registrarse.
      const [mesaRows] = await db.query(
        'SELECT id, numero, carta FROM mesas WHERE id = ? LIMIT 1',
        [id_mesa]
      );
      if (!mesaRows.length) return res.status(404).send('La mesa solicitada no existe.');

      const turnoActivo = await turnoService.obtenerTurnoActivo();
      const pricingContext = await PrecioService.obtenerContextoCobro({
        idMesa: mesaRows[0].id,
        turnoId: turnoActivo ? turnoActivo.id : null
      });

      const [menuCatalogo] = await db.query(`
        SELECT
            pm.id,
            pm.nombre,
            pm.descripcion,
            pm.precio,
            pm.precio_alt,
            pm.precio_usd,
            pm.foto,
            c.nombre AS categoria,
            0 AS es_platillo_dia
        FROM platillos_menu pm
        LEFT JOIN categorias_platillos c ON pm.categoria = c.id
        WHERE pm.activo = 1 AND (c.activo = 1 OR c.id IS NULL)
        ORDER BY c.nombre ASC, pm.nombre ASC
      `);
      const menu = PrecioService.aplicarPrecios(menuCatalogo, pricingContext);

      const platillosDiaRaw = turnoActivo
        ? await platilloDiaModel.getByTurno(turnoActivo.id)
        : [];
      const platillosDelDia = PrecioService.aplicarPrecios(platillosDiaRaw, pricingContext);

      let pedidos = [];
      if (turnoActivo) {
        [pedidos] = await db.query(`
          SELECT id, subtotal, total, estado_pedido
          FROM pedidos
          WHERE id_mesa = ? AND fecha_cierre IS NULL AND turno_servicio_id = ?
          ORDER BY id DESC
          LIMIT 1
        `, [id_mesa, turnoActivo.id]);
      }

      const pedidoActivo = pedidos[0] || null;
      let consumos = [];
      if (pedidoActivo) {
        const [detalles] = await db.query(`
          SELECT dp.id,
                 dp.id_platillo,
                 dp.es_platillo_dia,
                 dp.cantidad,
                 dp.precio_unitario,
                 dp.estado_item,
                 COALESCE(pd.nombre, pm.nombre, 'Platillo') AS nombre_platillo
          FROM detalles_pedido dp
          LEFT JOIN platillos_menu pm
            ON dp.id_platillo = pm.id AND (dp.es_platillo_dia = 0 OR dp.es_platillo_dia IS NULL)
          LEFT JOIN platillos_dia pd
            ON dp.id_platillo = pd.id AND dp.es_platillo_dia = 1
          WHERE dp.id_pedido = ? AND dp.estado_item != 'cancelado'
          ORDER BY dp.id ASC
        `, [pedidoActivo.id]);
        consumos = detalles;
      }

      return res.render('cliente/dashboard', {
        id_mesa: mesaRows[0].id,
        numero_mesa: mesaRows[0].numero,
        carta: pricingContext.carta,
        pricingContext,
        menu,
        platillosDelDia,
        pedidoActivo,
        consumos,
        permitePrepedido
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
      const { items } = req.body || {};
      if (!/^\d+$/.test(String(id_mesa || ''))) {
        return res.status(400).json({ success: false, message: 'La mesa indicada no es válida.' });
      }
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'No se enviaron ítems para procesar.' });
      }
      // B2: topes anti-abuso (cada ítem genera consultas): 50 ítems máximo.
      if (items.length > 50) {
        return res.status(400).json({ success: false, message: 'Demasiados ítems en una sola pre-orden (máximo 50).' });
      }
      if (!(await mesaExiste(id_mesa))) {
        return res.status(404).json({ success: false, message: 'La mesa indicada no existe.' });
      }
      const esperaPre = segundosRestantes(`preorden:${id_mesa}`);
      if (esperaPre > 0) {
        return res.status(429).json({ success: false, message: `Pre-orden ya enviada. Espera ${esperaPre} segundos antes de enviar otra.`, reintentar_en: esperaPre });
      }

      const turnoActivo = await turnoService.obtenerTurnoActivo();
      const pricingContext = await PrecioService.obtenerContextoCobro({
        idMesa: id_mesa,
        turnoId: turnoActivo ? turnoActivo.id : null
      });
      const values = [];

      for (const item of items) {
        const idPlatillo = item.id_platillo || item.id;
        const cantidad = parseInt(item.cantidad || 1, 10);
        const esDia = item.es_platillo_dia === true || item.es_platillo_dia === 1 || item.es_platillo_dia === '1' ? 1 : 0;
        if (!idPlatillo || !Number.isInteger(cantidad) || cantidad <= 0 || cantidad > 20) {
          return res.status(400).json({ success: false, message: 'Cada ítem debe tener un platillo y cantidad válidos (máximo 20).' });
        }

        let platillo;
        if (esDia) {
          if (!turnoActivo) return res.status(400).json({ success: false, message: 'No hay un turno activo para ese platillo del día.' });
          const [rows] = await db.query(`
            SELECT id, nombre, precio, precio_alt, precio_usd
            FROM platillos_dia
            WHERE id = ? AND turno_servicio_id = ? AND activo = 1
            LIMIT 1
          `, [idPlatillo, turnoActivo.id]);
          platillo = rows[0];
        } else {
          const [rows] = await db.query(`
            SELECT id, nombre, precio, precio_alt, precio_usd
            FROM platillos_menu
            WHERE id = ? AND activo = 1
            LIMIT 1
          `, [idPlatillo]);
          platillo = rows[0];
        }
        if (!platillo) return res.status(400).json({ success: false, message: `El platillo ${idPlatillo} no está disponible.` });
        PrecioService.validarPrecioConfigurado(platillo, pricingContext);
        values.push(id_mesa, idPlatillo, esDia, cantidad, item.notas_especiales || item.notas || null);
      }

      const placeholders = items.map(() => '(?, ?, ?, ?, ?)').join(', ');
      await db.query(
        `INSERT INTO pre_pedidos (id_mesa, id_platillo, es_platillo_dia, cantidad, notas_especiales) VALUES ${placeholders}`,
        values
      );

      marcarCooldown(`preorden:${id_mesa}`, 15 * 1000);
      return res.json({
        success: true,
        message: 'Pre-pedido enviado correctamente. El dependiente revisará su orden.'
      });
    } catch (error) {
      console.error('Error al registrar pre-pedido:', error);
      return res.status(400).json({ success: false, message: error.message || 'Error al procesar el pre-pedido.' });
    }
  },

  async callService(req, res) {
    try {
      const { id_mesa } = req.params;
      if (!/^\d+$/.test(String(id_mesa || ''))) {
        return res.status(400).json({ success: false, message: 'La mesa indicada no es válida.' });
      }
      if (!(await mesaExiste(id_mesa))) {
        return res.status(404).json({ success: false, message: 'La mesa indicada no existe.' });
      }
      // B2: una llamada por minuto y mesa; el dependiente ya fue avisado.
      const espera = segundosRestantes(`llamada:${id_mesa}`);
      if (espera > 0) {
        return res.status(429).json({ success: false, message: `El dependiente ya fue avisado. Puedes reintentar en ${espera} segundos.`, reintentar_en: espera });
      }
      await db.query(
        `INSERT INTO notificaciones_mesero (id_mesa, tipo, mensaje, leido) 
         VALUES (?, 'LLAMADA_SERVICIO', 'El cliente solicita atención en la mesa', 0)`,
        [id_mesa]
      );
      marcarCooldown(`llamada:${id_mesa}`, 60 * 1000);
      return res.json({ success: true, message: 'Llamado enviado al dependiente.' });
    } catch (error) {
      console.error('Error al llamar al servicio:', error);
      return res.status(500).json({ success: false, message: 'Error al enviar la solicitud.' });
    }
  },

  async cerrarCuenta(req, res) {
    try {
      const { id_pedido } = req.params;
      if (!/^\d+$/.test(String(id_pedido || ''))) {
        return res.status(400).json({ success: false, message: 'El pedido indicado no es válido.' });
      }
      const [pedidos] = await db.query(`SELECT id_mesa, fecha_cierre FROM pedidos WHERE id = ?`, [id_pedido]);
      if (pedidos.length === 0) {
        return res.status(404).json({ success: false, message: 'Pedido no encontrado.' });
      }
      // B2: solo se pide la cuenta de un pedido abierto, con pausa de
      // 2 minutos entre solicitudes.
      if (pedidos[0].fecha_cierre) {
        return res.status(410).json({ success: false, message: 'Este pedido ya está cerrado.' });
      }
      const esperaCierre = segundosRestantes(`cierre:${id_pedido}`);
      if (esperaCierre > 0) {
        return res.status(429).json({ success: false, message: `La cuenta ya fue solicitada. Puedes reintentar en ${esperaCierre} segundos.`, reintentar_en: esperaCierre });
      }
      const id_mesa = pedidos[0].id_mesa;
      await db.query(
        `INSERT INTO notificaciones_mesero (id_mesa, id_pedido, tipo, mensaje, leido) 
         VALUES (?, ?, 'SOLICITUD_CIERRE', 'El cliente ha solicitado la cuenta', 0)`,
        [id_mesa, id_pedido]
      );
      marcarCooldown(`cierre:${id_pedido}`, 120 * 1000);
      return res.json({ success: true, message: 'Solicitud de cierre enviada al dependiente.' });
    } catch (error) {
      console.error('Error al solicitar el cierre de cuenta:', error);
      return res.status(500).json({ success: false, message: 'Error al procesar la solicitud de cierre.' });
    }
  }
};

// Solo pruebas: reinicia los cooldowns en memoria entre casos.
ClienteController.__resetCooldowns = () => cooldowns.clear();

module.exports = ClienteController;