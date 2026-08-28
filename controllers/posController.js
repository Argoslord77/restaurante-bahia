const pool = require('../config/db');
const InventarioService = require('../services/inventarioService');
const SettingService = require('../services/settingService');
const PrecioService = require('../services/precioService');

module.exports = {
    // Vista Principal del TPV / POS
    viewPOS: async (req, res) => {
        try {
            const pedidoId = req.params.id_pedido || req.query.id_pedido || null;
            const habilitarMonitores = await SettingService.get('habilitar_monitores_elaboracion', true);
            const facturaImpuesto = parseFloat(await SettingService.get('factura_impuesto', 0) || 0);

            let idMesa = req.query.id_mesa || null;
            let turnoId = null;
            let nombreMesa = 'Mesa Activa';
            let detallesActuales = [];

            // Resolver primero la mesa/pedido para saber qué carta debe usarse
            // en todas las tarjetas del catálogo.
            if (pedidoId) {
                const [pedidos] = await pool.query(`
                    SELECT p.*, m.numero AS mesa_numero, m.ubicacion AS mesa_ubicacion,
                           m.carta, u.nombre AS mesero_nombre
                    FROM pedidos p
                    LEFT JOIN mesas m ON p.id_mesa = m.id
                    LEFT JOIN usuarios u ON p.id_usuario_mesero = u.id
                    WHERE p.id = ?
                    LIMIT 1
                `, [pedidoId]);

                if (pedidos.length > 0) {
                    const ped = pedidos[0];
                    idMesa = ped.id_mesa;
                    turnoId = ped.turno_servicio_id;
                    nombreMesa = ped.mesa_numero || nombreMesa;

                    const [detalles] = await pool.query(`
                        SELECT dp.id AS id_detalle,
                               dp.id_platillo,
                               dp.es_platillo_dia,
                               dp.cantidad,
                               dp.precio_unitario AS precio,
                               dp.notas_especiales AS notas,
                               dp.estado_item AS estado,
                               COALESCE(pd.nombre, pm.nombre, 'Platillo') AS nombre,
                               COALESCE(pd.tipo, cp.tipo, 'COMESTIBLES') AS tipo_categoria
                        FROM detalles_pedido dp
                        LEFT JOIN platillos_menu pm
                          ON dp.id_platillo = pm.id AND (dp.es_platillo_dia = 0 OR dp.es_platillo_dia IS NULL)
                        LEFT JOIN platillos_dia pd
                          ON dp.id_platillo = pd.id AND dp.es_platillo_dia = 1
                        LEFT JOIN categorias_platillos cp ON pm.categoria = cp.id
                        WHERE dp.id_pedido = ?
                        ORDER BY dp.id ASC
                    `, [pedidoId]);
                    detallesActuales = detalles;
                }
            }

            const pricingContext = await PrecioService.obtenerContextoCobro({ idMesa, turnoId });
            const [categorias] = await pool.query(
                'SELECT * FROM categorias_platillos WHERE activo = 1 ORDER BY nombre ASC'
            );
            const [menuRegular] = await pool.query(`
                SELECT pm.*,
                       cp.nombre AS nombre_categoria,
                       cp.tipo AS tipo_categoria,
                       0 AS es_platillo_dia
                FROM platillos_menu pm
                LEFT JOIN categorias_platillos cp ON pm.categoria = cp.id
                WHERE pm.activo = 1
                ORDER BY pm.nombre ASC
            `);

            const [platillosDia] = await pool.query(`
                SELECT pd.*,
                       'Platillo del Día' AS nombre_categoria,
                       pd.tipo AS tipo_categoria,
                       1 AS es_platillo_dia
                FROM platillos_dia pd
                WHERE pd.activo = 1
                  AND (? IS NOT NULL AND pd.turno_servicio_id = ?)
                ORDER BY pd.nombre ASC
            `, [turnoId, turnoId]);

            const platillos = PrecioService.aplicarPrecios(
                [...platillosDia, ...menuRegular],
                pricingContext
            );

            return res.render('pos', {
                pageTitle: `Terminal POS • Orden #${pedidoId || 'Nueva'}`,
                id_pedido: pedidoId || 0,
                id_mesa: idMesa,
                nombre_mesa: nombreMesa,
                carta: pricingContext.carta,
                pricingContext,
                // Se pasa el array como está: la vista lo serializa una sola
                // vez. Pasarlo ya con JSON.stringify producía un string
                // doble-serializado que la vista no parseaba y el POS cargaba
                // la orden sin historial ni importe.
                detallesActuales: detallesActuales,
                platillos,
                categorias,
                habilitarMonitores,
                facturaImpuesto,
                user: req.user || null
            });
        } catch (err) {
            console.error('Error al cargar vista POS:', err);
            res.status(500).send('Error interno en POS');
        }
    },

    // Verificación de stock antes de agregar al carrito
    apiVerifyStock: async (req, res) => {
        try {
            const platilloId = req.query.platillo_id || req.body.platillo_id;
            const cantidad = parseFloat(req.query.cantidad || req.body.cantidad || 1);
            const almacenId = req.query.almacen_id || req.body.almacen_id || null;

            if (!platilloId) {
                return res.status(400).json({ success: false, error: 'platillo_id requerido' });
            }

            const resultado = await InventarioService.verificarStockPlatillo(platilloId, cantidad, almacenId);
            res.json({ success: true, ...resultado });
        } catch (err) {
            console.error('Error en apiVerifyStock:', err);
            res.status(500).json({ success: false, error: err.message });
        }
    },

    // Guardar / Enviar ronda de comanda u orden
    apiSaveOrder: async (req, res) => {
        try {
            const body = req.body || {};
            const idPedidoSolicitado = body.id_pedido || body.pedido_id || null;
            const items = body.items || [];
            let idMesa = body.id_mesa || null;
            const meseroId = req.user ? req.user.id : 1;
            const habilitarMonitores = await SettingService.get('habilitar_monitores_elaboracion', true);

            if (!Array.isArray(items)) {
                return res.status(400).json({ success: false, message: 'El listado de ítems no es válido.' });
            }

            let currentPedidoId = idPedidoSolicitado;
            let turnoId = null;
            let pedidoExistente = null;

            if (currentPedidoId && Number(currentPedidoId) !== 0) {
                const [pedidos] = await pool.query(`
                    SELECT p.id, p.id_mesa, p.turno_servicio_id
                    FROM pedidos p
                    WHERE p.id = ?
                    LIMIT 1
                `, [currentPedidoId]);
                pedidoExistente = pedidos[0] || null;
            }

            if (pedidoExistente) {
                idMesa = pedidoExistente.id_mesa;
                turnoId = pedidoExistente.turno_servicio_id;
                currentPedidoId = pedidoExistente.id;
            } else {
                if (!idMesa) {
                    return res.status(400).json({ success: false, message: 'Se requiere una mesa para crear la orden.' });
                }
                const [mesaRows] = await pool.query(
                    'SELECT id FROM mesas WHERE id = ? LIMIT 1', [idMesa]
                );
                if (!mesaRows.length) {
                    return res.status(400).json({ success: false, message: 'La mesa indicada no existe.' });
                }
                const [turnos] = await pool.query(
                    "SELECT id FROM turnos_servicio WHERE estado = 'abierto' ORDER BY id DESC LIMIT 1"
                );
                if (!turnos.length) {
                    return res.status(400).json({ success: false, message: 'No hay un turno de servicio abierto.' });
                }
                turnoId = turnos[0].id;
            }

            const pricingContext = await PrecioService.obtenerContextoCobro({ idMesa, turnoId });
            const itemsVerificados = [];

            // El precio del cliente se ignora. Se vuelve a leer el catálogo en
            // el servidor y se elige precio/precio_alt/precio_usd según la mesa.
            for (const item of items) {
                const idPlatillo = item.id || item.id_platillo;
                const esDia = item.es_platillo_dia === true || item.es_platillo_dia === 1 || item.es_platillo_dia === '1' || item.es_dia === true || item.es_dia === 1 || item.es_dia === '1' ? 1 : 0;
                const cantidad = parseInt(item.cantidad || 1, 10);
                const notas = item.notas || item.notas_especiales || null;
                if (!idPlatillo || !Number.isInteger(cantidad) || cantidad <= 0) {
                    throw new Error('Cada ítem debe tener un platillo válido y una cantidad positiva.');
                }

                let platillo;
                if (esDia) {
                    const [rows] = await pool.query(`
                        SELECT id, nombre, precio, precio_alt, precio_usd, tipo
                        FROM platillos_dia
                        WHERE id = ? AND turno_servicio_id = ? AND activo = 1
                        LIMIT 1
                    `, [idPlatillo, turnoId]);
                    platillo = rows[0];
                } else {
                    const [rows] = await pool.query(`
                        SELECT pm.id, pm.nombre, pm.precio, pm.precio_alt, pm.precio_usd,
                               cp.tipo AS tipo_categoria
                        FROM platillos_menu pm
                        LEFT JOIN categorias_platillos cp ON pm.categoria = cp.id
                        WHERE pm.id = ? AND pm.activo = 1
                        LIMIT 1
                    `, [idPlatillo]);
                    platillo = rows[0];
                }
                if (!platillo) {
                    throw new Error(`El platillo con ID ${idPlatillo} no existe, está inactivo o no pertenece al turno.`);
                }

                const precio = PrecioService.validarPrecioConfigurado(platillo, pricingContext);
                const tipo = esDia ? platillo.tipo : platillo.tipo_categoria;
                const esBebida = String(tipo || '').toUpperCase() === 'BEBIDAS';
                let estadoInicial = esBebida ? 'en_bar' : 'en_cocina';
                if (!habilitarMonitores) estadoInicial = 'en_espera';
                itemsVerificados.push({ idPlatillo, esDia, cantidad, notas, nombre: platillo.nombre, precio, estadoInicial });
            }

            if (!pedidoExistente) {
                const [nuevo] = await pool.query(`
                    INSERT INTO pedidos (id_mesa, id_usuario_mesero, turno_servicio_id, estado_pedido, estado_pago)
                    VALUES (?, ?, ?, 'pendiente', 'pendiente')
                `, [idMesa, meseroId, turnoId]);
                currentPedidoId = nuevo.insertId;
                await pool.query("UPDATE mesas SET estado = 'ocupada' WHERE id = ?", [idMesa]);
            }

            const insertedItems = [];
            for (const item of itemsVerificados) {
                const [result] = await pool.query(`
                    INSERT INTO detalles_pedido (
                        id_pedido, id_platillo, es_platillo_dia, cantidad,
                        precio_unitario, notas_especiales, estado_item, afecta_inventario
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
                `, [currentPedidoId, item.idPlatillo, item.esDia, item.cantidad, item.precio, item.notas, item.estadoInicial]);
                insertedItems.push({
                    id_detalle: result.insertId,
                    id_platillo: item.idPlatillo,
                    es_platillo_dia: item.esDia,
                    nombre: item.nombre,
                    precio: item.precio,
                    precio_moneda: pricingContext.moneda_codigo,
                    cantidad: item.cantidad,
                    estado: item.estadoInicial,
                    notas: item.notas || ''
                });
            }

            if (insertedItems.length > 0) {
                const [totales] = await pool.query(`
                    SELECT COALESCE(SUM(cantidad * precio_unitario), 0) AS subtotal
                    FROM detalles_pedido
                    WHERE id_pedido = ? AND estado_item != 'cancelado'
                `, [currentPedidoId]);
                const subtotal = Number(totales[0]?.subtotal || 0);
                await pool.query('UPDATE pedidos SET subtotal = ?, total = ? WHERE id = ?', [subtotal, subtotal, currentPedidoId]);
            }

            return res.json({
                success: true,
                id_pedido: currentPedidoId,
                insertedItems,
                carta: pricingContext.carta,
                moneda_codigo: pricingContext.moneda_codigo,
                habilitarMonitores,
                message: habilitarMonitores ? 'Ronda enviada a cocina y bar' : 'Ronda guardada en modo directo'
            });
        } catch (err) {
            console.error('Error en apiSaveOrder:', err);
            return res.status(400).json({ success: false, error: err.message, message: err.message });
        }
    },

    // Actualizar estado de ítem (ej: entregado)
    apiActualizarEstadoItem: async (req, res) => {
        try {
            const { id_detalle, nuevo_estado } = req.body;
            if (!id_detalle || !nuevo_estado) {
                return res.status(400).json({ success: false, message: 'Parámetros incompletos' });
            }

            if (!pool) return res.json({ success: true });

            await pool.query('UPDATE detalles_pedido SET estado_item = ? WHERE id = ?', [nuevo_estado, id_detalle]);

            // Comprobar si todos los ítems fueron entregados
            const [rows] = await pool.query('SELECT id_pedido FROM detalles_pedido WHERE id = ?', [id_detalle]);
            if (rows.length > 0) {
                const pedidoId = rows[0].id_pedido;
                const [pendientes] = await pool.query(`
                    SELECT COUNT(*) AS total_pendientes
                    FROM detalles_pedido
                    WHERE id_pedido = ? AND estado_item NOT IN ('entregado', 'cancelado')
                `, [pedidoId]);

                if (pendientes[0].total_pendientes === 0) {
                    await pool.query("UPDATE pedidos SET estado_pedido = 'entregado' WHERE id = ?", [pedidoId]);
                }
            }

            res.json({
                success: true,
                id_detalle,
                nuevo_estado,
                message: `Ítem marcado como ${nuevo_estado}`
            });
        } catch (err) {
            console.error('Error en apiActualizarEstadoItem:', err);
            res.status(500).json({ success: false, error: err.message });
        }
    },

    // Entregar todos los ítems de un pedido (Modo Servicio Directo)
    apiEntregarTodos: async (req, res) => {
        try {
            const pedidoId = req.params.id_pedido || req.body.id_pedido;
            if (!pedidoId) {
                return res.status(400).json({ success: false, message: 'ID de pedido requerido' });
            }

            if (!pool) return res.json({ success: true });

            await pool.query(`
                UPDATE detalles_pedido 
                SET estado_item = 'entregado' 
                WHERE id_pedido = ? AND estado_item NOT IN ('entregado', 'cancelado')
            `, [pedidoId]);

            await pool.query("UPDATE pedidos SET estado_pedido = 'entregado' WHERE id = ?", [pedidoId]);

            res.json({
                success: true,
                pedido_id: pedidoId,
                message: 'Todos los productos han sido marcados como entregados.'
            });
        } catch (err) {
            console.error('Error en apiEntregarTodos:', err);
            res.status(500).json({ success: false, error: err.message });
        }
    },

    // Cancelar un ítem del pedido con motivo
    apiCancelarItem: async (req, res) => {
        try {
            const detalleId = req.params.id_detalle;
            const motivo = req.body.motivo || 'Cancelado por usuario';

            if (!pool) return res.json({ success: true });

            const [rows] = await pool.query('SELECT id_pedido, notas_especiales FROM detalles_pedido WHERE id = ?', [detalleId]);
            if (rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Ítem no encontrado' });
            }

            const item = rows[0];
            const notaActualizada = item.notas_especiales 
                ? `${item.notas_especiales} | CANCELADO: ${motivo}`
                : `CANCELADO: ${motivo}`;

            await pool.query(`
                UPDATE detalles_pedido 
                SET estado_item = 'cancelado', notas_especiales = ?, afecta_inventario = 0 
                WHERE id = ?
            `, [notaActualizada, detalleId]);

            // Recalcular total del pedido
            const [totales] = await pool.query(`
                SELECT SUM(cantidad * precio_unitario) AS subtotal
                FROM detalles_pedido
                WHERE id_pedido = ? AND estado_item != 'cancelado'
            `, [item.id_pedido]);

            const subtotal = totales[0]?.subtotal || 0;
            await pool.query('UPDATE pedidos SET subtotal = ?, total = ? WHERE id = ?', [subtotal, subtotal, item.id_pedido]);

            res.json({ success: true, message: 'Producto cancelado exitosamente' });
        } catch (err) {
            console.error('Error en apiCancelarItem:', err);
            res.status(500).json({ success: false, error: err.message });
        }
    },

    // Procesar Cobro Avanzado de Cuenta
    procesarCobroAvanzado: async (req, res) => {
        let connection = null;
        try {
            const pedidoId = req.params.id_pedido;
            const body = req.body || {};
            const pagos = body.pagos || [];
            const { es_cortesia, es_factura_credito, es_pendiente_pago, descuento, recargo, propina } = body;
            const cajeroId = req.user ? req.user.id : 1;

            if (!pedidoId) return res.status(400).json({ success: false, message: 'ID de pedido requerido.' });

            const [pedidoRows] = await pool.query(`
                SELECT p.*, m.carta, m.numero AS numero_mesa
                FROM pedidos p
                INNER JOIN mesas m ON p.id_mesa = m.id
                WHERE p.id = ?
                LIMIT 1
            `, [pedidoId]);
            if (!pedidoRows.length) return res.status(404).json({ success: false, message: 'Pedido no encontrado.' });
            const pedido = pedidoRows[0];

            const [pendientesEntrega] = await pool.query(`
                SELECT COUNT(*) AS total
                FROM detalles_pedido
                WHERE id_pedido = ? AND estado_item NOT IN ('entregado', 'cancelado')
            `, [pedidoId]);
            if (Number(pendientesEntrega[0].total) > 0) {
                return res.status(400).json({
                    success: false,
                    message: `No se puede cobrar: ${pendientesEntrega[0].total} producto(s) aún no han sido entregados al cliente.`
                });
            }

            const pricingContext = await PrecioService.obtenerContextoCobro({
                idMesa: pedido.id_mesa,
                turnoId: pedido.turno_servicio_id
            });

            const [totales] = await pool.query(`
                SELECT COALESCE(SUM(cantidad * precio_unitario), 0) AS subtotal
                FROM detalles_pedido
                WHERE id_pedido = ? AND estado_item != 'cancelado'
            `, [pedidoId]);
            const subtotal = Number(totales[0]?.subtotal || 0);
            const desc = Math.max(0, Number(descuento || 0));
            const rec = Math.max(0, Number(recargo || 0));
            const prop = Math.max(0, Number(propina || 0));
            const facturaImpuesto = parseFloat(await SettingService.get('factura_impuesto', 0) || 0);
            const impuesto = Number(Math.max(0, subtotal * facturaImpuesto / 100).toFixed(2));
            // Total de la orden (lo que factura la mesa). La propina NO va en
            // el total: se guarda separada en pedidos.propina y el cierre del
            // día la suma aparte al efectivo de caja (si se sumara aquí se
            // contaría doble en el cuadre).
            const totalOrden = es_cortesia ? 0 : Number(Math.max(0, subtotal + impuesto - desc + rec).toFixed(2));
            // Lo que el cliente debe abonar físicamente: orden + propina.
            const totalFinal = es_cortesia ? 0 : Number((totalOrden + prop).toFixed(2));

            let estadoPago = 'pagado';
            if (es_pendiente_pago) estadoPago = 'pendiente_pago';
            if (es_factura_credito) estadoPago = 'facturado';
            if (es_cortesia) estadoPago = 'cortesia';

            const pagosNormalizados = [];
            if (estadoPago === 'pagado') {
                if (!Array.isArray(pagos) || pagos.length === 0) {
                    return res.status(400).json({ success: false, message: 'Debe registrar al menos un pago.' });
                }

                for (const pago of pagos) {
                    const montoOrigen = Number(pago.monto_moneda_origen);
                    if (!Number.isFinite(montoOrigen) || montoOrigen <= 0) {
                        return res.status(400).json({ success: false, message: 'Cada pago debe tener un monto de origen positivo.' });
                    }

                    let moneda;
                    if (pricingContext.es_zelle) {
                        // Una carta ZELLE sólo puede liquidarse como transferencia
                        // extranjera. El cliente no puede convertirla en efectivo.
                        const monedaId = pricingContext.moneda_id || Number(pago.moneda_id) || null;
                        if (monedaId) {
                            const [rows] = await pool.query(`
                                SELECT m.id, m.codigo, m.simbolo,
                                       COALESCE(mt.factor_cambio_turno, m.factor_cambio) AS factor_cambio
                                FROM monedas m
                                LEFT JOIN monedas_turno mt
                                  ON mt.moneda_id = m.id AND mt.turno_servicio_id = ?
                                WHERE m.id = ? AND m.activo = 1
                                  AND UPPER(m.codigo) IN ('ZELLE', 'USD')
                                LIMIT 1
                            `, [pedido.turno_servicio_id, monedaId]);
                            moneda = rows[0];
                        }
                        if (!moneda) {
                            moneda = { id: null, codigo: 'ZELLE', simbolo: '$', factor_cambio: pricingContext.factor_cambio || 1 };
                        }
                    } else {
                        const monedaId = Number(pago.moneda_id || pricingContext.moneda_id || 0);
                        const [rows] = await pool.query(`
                            SELECT m.id, m.codigo, m.simbolo,
                                   COALESCE(mt.factor_cambio_turno, m.factor_cambio) AS factor_cambio
                            FROM monedas m
                            LEFT JOIN monedas_turno mt
                              ON mt.moneda_id = m.id AND mt.turno_servicio_id = ?
                            WHERE m.id = ? AND m.activo = 1
                            LIMIT 1
                        `, [pedido.turno_servicio_id, monedaId]);
                        moneda = rows[0];
                        if (!moneda) return res.status(400).json({ success: false, message: 'La moneda seleccionada no está activa para este turno.' });
                        if (String(moneda.codigo).toUpperCase() === 'ZELLE' && String(pago.metodo_pago || '').toLowerCase() === 'efectivo') {
                            return res.status(400).json({ success: false, message: 'ZELLE no puede registrarse como efectivo; debe asentarse como transferencia extranjera.' });
                        }
                    }

                    const metodosValidos = ['efectivo', 'tarjeta', 'transferencia'];
                    const metodoSolicitado = String(pago.metodo_pago || 'efectivo').toLowerCase();
                    if (!pricingContext.es_zelle && !metodosValidos.includes(metodoSolicitado)) {
                        return res.status(400).json({ success: false, message: 'Método de pago no válido.' });
                    }

                    const factor = Number(moneda.factor_cambio) || 1;
                    pagosNormalizados.push({
                        metodo_pago: pricingContext.es_zelle ? 'transferencia' : metodoSolicitado,
                        moneda_id: moneda.id || null,
                        factor_cambio_aplicado: factor,
                        monto_moneda_origen: Number(montoOrigen.toFixed(2)),
                        monto_equivalente_local: Number((montoOrigen * factor).toFixed(2)),
                        referencia_transaccion: pago.referencia_transaccion || null,
                        codigo_moneda: pricingContext.es_zelle ? 'ZELLE' : moneda.codigo
                    });
                }

                const totalAbonado = pagosNormalizados.reduce((sum, pago) => sum + (
                    pricingContext.es_zelle ? pago.monto_moneda_origen : pago.monto_equivalente_local
                ), 0);
                const diferencia = Number((totalAbonado - totalFinal).toFixed(2));
                if (diferencia < -0.01) {
                    return res.status(400).json({
                        success: false,
                        message: `El pago es insuficiente. Faltan ${Math.abs(diferencia).toFixed(2)} ${pricingContext.moneda_codigo}.`
                    });
                }
            }

            connection = await pool.getConnection();
            await connection.beginTransaction();
            await connection.query(`
                UPDATE pedidos
                SET estado_pago = ?, estado_pedido = 'entregado', fecha_cierre = NOW(),
                    id_usuario_cajero = ?, descuento = ?, impuesto = ?, propina = ?, total = ?
                WHERE id = ?
            `, [estadoPago, cajeroId, desc, impuesto, prop, totalOrden, pedidoId]);
            await connection.query(`
                UPDATE detalles_pedido SET estado_item = 'entregado'
                WHERE id_pedido = ? AND estado_item != 'cancelado'
            `, [pedidoId]);

            for (const pago of pagosNormalizados) {
                await connection.query(`
                    INSERT INTO pagos_pedido (
                        pedido_id, metodo_pago, moneda_id, factor_cambio_aplicado,
                        monto_moneda_origen, monto_equivalente_local, referencia_transaccion
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [pedidoId, pago.metodo_pago, pago.moneda_id, pago.factor_cambio_aplicado,
                    pago.monto_moneda_origen, pago.monto_equivalente_local, pago.referencia_transaccion]);
            }
            await connection.commit();
            connection.release();
            connection = null;

            // Un error de inventario no revierte el cobro; el servicio lo deja
            // en el resumen de faltantes/advertencias.
            try {
                await InventarioService.descontarInventarioPorPedido(pedidoId, cajeroId);
            } catch (invErr) {
                console.warn('Advertencia al descontar inventario:', invErr.message);
            }
            await pool.query("UPDATE mesas SET estado = 'libre' WHERE id = ?", [pedido.id_mesa]);

            return res.json({ success: true, carta: pricingContext.carta, moneda_codigo: pricingContext.moneda_codigo, total: totalFinal, total_orden: totalOrden, propina: prop, message: 'Mesa cobrada y liberada con éxito' });
        } catch (err) {
            if (connection) {
                try { await connection.rollback(); } catch (_) { /* noop */ }
                connection.release();
            }
            console.error('Error en procesarCobroAvanzado:', err);
            return res.status(500).json({ success: false, error: err.message, message: err.message });
        }
    },

    // Obtener ítems listos para el dependiente
    getItemsListos: async (req, res) => {
        try {
            const pedidoId = req.params.id_pedido;
            if (!pool) return res.json({ success: true, itemsListos: [] });

            const [items] = await pool.query(`
                SELECT dp.id AS id_detalle, dp.id_platillo, dp.cantidad, 
                       COALESCE(pd.nombre, pm.nombre, 'Platillo') AS nombre
                FROM detalles_pedido dp
                LEFT JOIN platillos_menu pm ON (dp.id_platillo = pm.id AND (dp.es_platillo_dia = 0 OR dp.es_platillo_dia IS NULL))
                LEFT JOIN platillos_dia pd ON (dp.id_platillo = pd.id AND dp.es_platillo_dia = 1)
                WHERE dp.id_pedido = ? AND dp.estado_item = 'listo'
            `, [pedidoId]);

            res.json({ success: true, itemsListos: items });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    },

    // Abrir o redireccionar al pedido de una mesa específica
    abrirOObtenerPedidoMesa: async (req, res) => {
        try {
            const idMesa = req.params.idMesa;
            if (!pool) return res.redirect('/pos');

            // Si la mesa tuviera varias órdenes pendientes, se abre la que
            // tiene más consumos vigentes (nunca una vacía con $0.00 cuando
            // existe otra con productos).
            const [pedidos] = await pool.query(`
                SELECT p.id, COUNT(dp.id) AS n_items
                FROM pedidos p
                LEFT JOIN detalles_pedido dp ON dp.id_pedido = p.id AND dp.estado_item != 'cancelado'
                WHERE p.id_mesa = ? AND p.estado_pago = 'pendiente'
                GROUP BY p.id
                ORDER BY n_items DESC, p.id DESC
                LIMIT 1
            `, [idMesa]);
            const prePedidoQuery = req.query.cargarPrePedido
                ? `?cargarPrePedido=${encodeURIComponent(req.query.cargarPrePedido)}`
                : '';

            if (pedidos.length > 0) {
                return res.redirect(`/pos/${pedidos[0].id}${prePedidoQuery}`);
            } else {
                const [turnos] = await pool.query("SELECT id FROM turnos_servicio WHERE estado = 'abierto' ORDER BY id DESC LIMIT 1");
                const turnoId = turnos.length > 0 ? turnos[0].id : 1;
                const meseroId = req.user ? req.user.id : 1;

                const [nuevo] = await pool.query(`
                    INSERT INTO pedidos (id_mesa, id_usuario_mesero, turno_servicio_id, estado_pedido, estado_pago)
                    VALUES (?, ?, ?, 'pendiente', 'pendiente')
                `, [idMesa, meseroId, turnoId]);

                await pool.query("UPDATE mesas SET estado = 'ocupada' WHERE id = ?", [idMesa]);
                return res.redirect(`/pos/${nuevo.insertId}${prePedidoQuery}`);
            }
        } catch (err) {
            console.error('Error en abrirOObtenerPedidoMesa:', err);
            res.redirect('/pos');
        }
    },

    // Inicialización manual de orden desde el Dashboard
    initOrderManual: async (req, res) => {
        try {
            const { id_mesa } = req.body;
            const meseroId = req.user ? req.user.id : 1;

            if (!id_mesa) {
                return res.status(400).json({ success: false, message: 'id_mesa es requerido' });
            }

            if (!pool) {
                return res.status(503).json({ success: false, message: 'La base de datos no está disponible. No se pudo abrir la mesa.' });
            }

            // Verificar si ya existe un pedido pendiente para esa mesa en el turno activo
            const [turnos] = await pool.query("SELECT id FROM turnos_servicio WHERE estado = 'abierto' ORDER BY id DESC LIMIT 1");
            if (turnos.length === 0) {
                return res.status(400).json({ success: false, message: 'No hay un turno de servicio abierto' });
            }
            const turnoId = turnos[0].id;

            // Mismo criterio que abrirOObtenerPedidoMesa: priorizar la orden
            // con más consumos vigentes para no abrir una vacía con $0.00.
            const [existentes] = await pool.query(`
                SELECT p.id, COUNT(dp.id) AS n_items
                FROM pedidos p
                LEFT JOIN detalles_pedido dp ON dp.id_pedido = p.id AND dp.estado_item != 'cancelado'
                WHERE p.id_mesa = ? AND p.estado_pago = 'pendiente' AND p.turno_servicio_id = ?
                GROUP BY p.id
                ORDER BY n_items DESC, p.id DESC
                LIMIT 1
            `, [id_mesa, turnoId]);

            let pedidoId;
            if (existentes.length > 0) {
                pedidoId = existentes[0].id;
            } else {
                const [nuevo] = await pool.query(`
                    INSERT INTO pedidos (id_mesa, id_usuario_mesero, turno_servicio_id, estado_pedido, estado_pago)
                    VALUES (?, ?, ?, 'pendiente', 'pendiente')
                `, [id_mesa, meseroId, turnoId]);

                pedidoId = nuevo.insertId;
                await pool.query("UPDATE mesas SET estado = 'ocupada' WHERE id = ?", [id_mesa]);
            }

            res.json({ success: true, pedidoId });
        } catch (err) {
            console.error('Error en initOrderManual:', err);
            res.status(500).json({ success: false, message: err.message });
        }
    },

    // Entrada automática por lectura de Código QR físico
    initOrderQR: async (req, res) => {
        try {
            const { hash } = req.params;
            if (!pool) return res.status(503).json({ success: false, message: 'La base de datos no está disponible.' });

            const [autoRows] = await pool.query('SELECT id_mesa FROM auto_creacion_orden WHERE auto_hash = ? LIMIT 1', [hash]);
            if (autoRows.length === 0) {
                return res.status(404).json({ success: false, message: 'QR no válido o expirado' });
            }

            const idMesa = autoRows[0].id_mesa;
            const meseroId = req.user ? req.user.id : 1;

            const [turnos] = await pool.query("SELECT id FROM turnos_servicio WHERE estado = 'abierto' ORDER BY id DESC LIMIT 1");
            if (turnos.length === 0) {
                return res.status(400).json({ success: false, message: 'No hay un turno de servicio abierto' });
            }
            const turnoId = turnos[0].id;

            const [existentes] = await pool.query(`
                SELECT id FROM pedidos 
                WHERE id_mesa = ? AND estado_pago = 'pendiente' AND turno_servicio_id = ?
                ORDER BY id DESC LIMIT 1
            `, [idMesa, turnoId]);

            let pedidoId;
            if (existentes.length > 0) {
                pedidoId = existentes[0].id;
            } else {
                const [nuevo] = await pool.query(`
                    INSERT INTO pedidos (id_mesa, id_usuario_mesero, turno_servicio_id, estado_pedido, estado_pago)
                    VALUES (?, ?, ?, 'pendiente', 'pendiente')
                `, [idMesa, meseroId, turnoId]);

                pedidoId = nuevo.insertId;
                await pool.query("UPDATE mesas SET estado = 'ocupada' WHERE id = ?", [idMesa]);
            }

            // Eliminar el hash usado para que no se reutilice
            await pool.query('DELETE FROM auto_creacion_orden WHERE auto_hash = ?', [hash]);

            res.json({ success: true, pedidoId });
        } catch (err) {
            console.error('Error en initOrderQR:', err);
            res.status(500).json({ success: false, message: err.message });
        }
    },

    // Obtener alertas pendientes (notificaciones de clientes y pre-pedidos)
    obtenerAlertasPendientes: async (req, res) => {
        try {
            if (!pool) {
                return res.json({ success: true, alertas: { notificaciones: [], prePedidos: [] } });
            }

            // Notificaciones no leídas (llamadas de servicio y solicitudes de cierre)
            const [notificaciones] = await pool.query(`
                SELECT n.id, n.id_mesa, n.id_pedido, n.tipo, n.mensaje, n.creado_en,
                       m.numero AS nombre_mesa
                FROM notificaciones_mesero n
                INNER JOIN mesas m ON n.id_mesa = m.id
                WHERE n.leido = 0
                  AND n.tipo IN ('LLAMADA_SERVICIO', 'SOLICITUD_CIERRE')
                ORDER BY n.creado_en DESC
                LIMIT 50
            `);

            // Pre-pedidos agrupados con datos del platillo
            const [prePedidos] = await pool.query(`
                SELECT pp.id, pp.id_mesa, pp.id_platillo, pp.es_platillo_dia, pp.cantidad, 
                       pp.notas_especiales, pp.creado_en,
                       m.numero,
                       m.carta,
                       COALESCE(pd.nombre, pm.nombre, 'Platillo') AS platillo,
                       CASE m.carta
                           WHEN 'ZELLE' THEN COALESCE(pd.precio_usd, pm.precio_usd, 0)
                           WHEN 'COMISION' THEN COALESCE(pd.precio_alt, pm.precio_alt, 0)
                           ELSE COALESCE(pd.precio, pm.precio, 0)
                       END AS precio
                FROM pre_pedidos pp
                INNER JOIN mesas m ON pp.id_mesa = m.id
                LEFT JOIN platillos_menu pm ON (pp.id_platillo = pm.id AND (pp.es_platillo_dia = 0 OR pp.es_platillo_dia IS NULL))
                LEFT JOIN platillos_dia pd ON (pp.id_platillo = pd.id AND pp.es_platillo_dia = 1)
                ORDER BY pp.creado_en ASC
            `);

            res.json({
                success: true,
                alertas: {
                    notificaciones,
                    prePedidos
                }
            });
        } catch (err) {
            console.error('Error en obtenerAlertasPendientes:', err);
            res.status(500).json({ success: false, message: err.message });
        }
    },

    // Marcar una notificación como leída
    marcarNotificacionLeida: async (req, res) => {
        try {
            const notifId = req.params.id;
            if (!pool) return res.json({ success: true });

            await pool.query('UPDATE notificaciones_mesero SET leido = 1 WHERE id = ?', [notifId]);

            res.json({ success: true });
        } catch (err) {
            console.error('Error en marcarNotificacionLeida:', err);
            res.status(500).json({ success: false, message: err.message });
        }
    },

    // Eliminar un pre-pedido individual
    eliminarPrePedido: async (req, res) => {
        try {
            const id = req.params.id;
            if (!pool) return res.json({ success: true });

            await pool.query('DELETE FROM pre_pedidos WHERE id = ?', [id]);

            res.json({ success: true });
        } catch (err) {
            console.error('Error en eliminarPrePedido:', err);
            res.status(500).json({ success: false, message: err.message });
        }
    },

    // Obtener pre-pedidos de una mesa específica
    obtenerPrePedidosMesa: async (req, res) => {
        try {
            const idMesa = req.params.idMesa;
            if (!pool) return res.json({ success: true, prePedidos: [] });

            const [prePedidos] = await pool.query(`
                SELECT pp.id, pp.id_mesa, pp.id_platillo, pp.es_platillo_dia, pp.cantidad, 
                       pp.notas_especiales, pp.creado_en,
                       COALESCE(pd.nombre, pm.nombre, 'Platillo') AS platillo,
                       CASE m.carta
                           WHEN 'ZELLE' THEN COALESCE(pd.precio_usd, pm.precio_usd, 0)
                           WHEN 'COMISION' THEN COALESCE(pd.precio_alt, pm.precio_alt, 0)
                           ELSE COALESCE(pd.precio, pm.precio, 0)
                       END AS precio
                FROM pre_pedidos pp
                INNER JOIN mesas m ON pp.id_mesa = m.id
                LEFT JOIN platillos_menu pm ON (pp.id_platillo = pm.id AND (pp.es_platillo_dia = 0 OR pp.es_platillo_dia IS NULL))
                LEFT JOIN platillos_dia pd ON (pp.id_platillo = pd.id AND pp.es_platillo_dia = 1)
                WHERE pp.id_mesa = ?
                ORDER BY pp.creado_en ASC
            `, [idMesa]);

            res.json({ success: true, prePedidos });
        } catch (err) {
            console.error('Error en obtenerPrePedidosMesa:', err);
            res.status(500).json({ success: false, message: err.message });
        }
    },

    // Limpiar todos los pre-pedidos de una mesa
    limpiarPrePedidosMesa: async (req, res) => {
        try {
            const idMesa = req.params.idMesa;
            if (!pool) return res.json({ success: true });

            await pool.query('DELETE FROM pre_pedidos WHERE id_mesa = ?', [idMesa]);

            res.json({ success: true });
        } catch (err) {
            console.error('Error en limpiarPrePedidosMesa:', err);
            res.status(500).json({ success: false, message: err.message });
        }
    },

    // Vista de pre-cuenta para impresión térmica
    viewPrecuenta: async (req, res) => {
        try {
            const pedidoId = req.params.id_pedido;
            if (!pool) return res.send('Precuenta');

            const [pedidos] = await pool.query(`
                SELECT p.*, m.numero AS mesa_numero, m.carta, u.nombre AS mesero_nombre
                FROM pedidos p
                LEFT JOIN mesas m ON p.id_mesa = m.id
                LEFT JOIN usuarios u ON p.id_usuario_mesero = u.id
                WHERE p.id = ?
            `, [pedidoId]);

            if (pedidos.length === 0) {
                return res.status(404).send('Pedido no encontrado');
            }

            const facturaImpuesto = parseFloat(await SettingService.get('factura_impuesto', 0) || 0);
            const pricingContext = await PrecioService.obtenerContextoCobro({
                idMesa: pedidos[0].id_mesa,
                turnoId: pedidos[0].turno_servicio_id
            });

            const [detalles] = await pool.query(`
                SELECT dp.id_platillo, dp.es_platillo_dia, dp.cantidad, dp.precio_unitario, dp.notas_especiales,
                       COALESCE(pd.nombre, pm.nombre, 'Platillo') AS nombre
                FROM detalles_pedido dp
                LEFT JOIN platillos_menu pm ON (dp.id_platillo = pm.id AND (dp.es_platillo_dia = 0 OR dp.es_platillo_dia IS NULL))
                LEFT JOIN platillos_dia pd ON (dp.id_platillo = pd.id AND dp.es_platillo_dia = 1)
                WHERE dp.id_pedido = ? AND dp.estado_item != 'cancelado'
                ORDER BY dp.id ASC
            `, [pedidoId]);

            res.render('precuenta', {
                id_pedido: pedidos[0].id,
                nombre_mesa: pedidos[0].mesa_numero || `Mesa ${pedidos[0].id_mesa || '-'}`,
                atendio: pedidos[0].mesero_nombre || null,
                pedido: pedidos[0],
                detalles,
                pricingContext,
                facturaImpuesto,
                pageTitle: `Precuenta #${pedidoId}`
            });
        } catch (err) {
            console.error('Error en viewPrecuenta:', err);
            res.status(500).send('Error al generar precuenta');
        }
    }
};
