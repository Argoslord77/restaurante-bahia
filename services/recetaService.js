// services/recetaService.js - Servicio para gestión de recetas
const Receta = require('../models/recetaModel');
const UnidadMedida = require('../models/unidadMedidaModel');
const Producto = require('../models/productoModel'); 
const MenuModel = require('../models/menuModel');
const db = require('../config/db');
const logger = require('../config/logger');

const RecetaService = {
    // Catálogos agrupados concurrentemente para renderizar la UI
    obtenerCatalogosAdministracion: async () => {
        try {
            const [recetas, platillos, unidades] = await Promise.all([
                Receta.getAll(),
                MenuModel.getAll(),
                UnidadMedida.getActivas() 
            ]);
            return { recetas: recetas || [], platillos: platillos || [], unidades: unidades || [] };
        } catch (error) {
            logger.error('Error al compilar catálogos de recetas:', error);
            return { recetas: [], platillos: [], unidades: [] };
        }
    },

    // Obtener todos los ingredientes de una receta
    obtenerPorPlatillo: async (recetaId) => {
        try {
            return await Receta.getByPlatillo(recetaId);
        } catch (error) {
            logger.error('Error al obtener receta por platillo:', error);
            throw new Error('Error al obtener la receta');
        }
    },

    // Obtener la estructura Maestro-Detalle unificada para modales de edición
    obtenerRecetaCompleta: async (id) => {
        try {
            const maestro = await Receta.getById(id);
            if (!maestro) return null;
            
            const detalles = await Receta.getByPlatillo(id);
            return { ...maestro, detalles };
        } catch (error) {
            logger.error(`Error al empaquetar estructura de receta ${id}:`, error);
            throw new Error('Error al recuperar datos integrales de la ficha técnica');
        }
    },

    // Obtener receta con stock disponible por almacén
    obtenerPorPlatilloYAlmacen: async (recetaId, almacenId) => {
        try {
            return await Receta.getByPlatilloAndAlmacen(recetaId, almacenId);
        } catch (error) {
            logger.error('Error al obtener receta por platillo y almacén:', error);
            throw new Error('Error al obtener la receta con stock');
        }
    },

    // Obtener todas las recetas
    listarTodas: async () => {
        try {
            return await Receta.getAll();
        } catch (error) {
            logger.error('Error al listar recetas:', error);
            throw new Error('Error al listar las recetas');
        }
    },

    // Validar disponibilidad de código de receta de forma asíncrona
    verificarCodigoDisponible: async (codigo, excludeId = null) => {
        if (!codigo || !codigo.toString().trim()) {
            return { disponible: false, message: 'El código de receta no puede estar vacío' };
        }
        const codigoLimpio = codigo.toString().trim().toUpperCase();
        const existe = await Receta.getByCodigo(codigoLimpio, excludeId ? parseInt(excludeId, 10) : null);
        if (existe) {
            return {
                disponible: false,
                message: `El código "${codigoLimpio}" ya está registrado en la ficha técnica "${existe.nombre}". No se permiten códigos duplicados.`,
                recetaExistente: { id: existe.id, nombre: existe.nombre, codigo: existe.codigo }
            };
        }
        return { disponible: true, message: 'Código disponible' };
    },

    // Crear nueva receta Maestro-Detalle con control atómico de transacciones
    crearReceta: async (recetaData) => {
        if (!recetaData.codigo) throw new Error('El código de la receta es obligatorio');
        if (!recetaData.nombre) throw new Error('El nombre de la receta es obligatorio');
        if (!recetaData.platillo_id) throw new Error('El producto resultante es obligatorio');
        if (!recetaData.unidad_rendimiento) throw new Error('La unidad de rendimiento es obligatoria');

        const codigoLimpio = recetaData.codigo.toString().trim().toUpperCase();
        recetaData.codigo = codigoLimpio;

        // Validar unicidad del código antes de insertar
        const existeCodigo = await Receta.getByCodigo(codigoLimpio);
        if (existeCodigo) {
            throw new Error(`El código "${codigoLimpio}" ya está en uso por la ficha técnica "${existeCodigo.nombre}". Por favor asigne un código único.`);
        }

        if (!db) return 1;
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // 1. Guardar Cabecera
            const id = await Receta.createTransactional(connection, recetaData);

            // 2. Guardar listado de ingredientes si vienen adjuntos
            if (recetaData.detalles && recetaData.detalles.length > 0) {
                await Receta.insertDetallesTransactional(connection, id, recetaData.detalles);
            }

            await connection.commit();
            logger.info(`Ficha técnica transaccional creada: ${recetaData.nombre} (ID: ${id})`);
            return id;
        } catch (error) {
            await connection.rollback();
            logger.error('Error de rollback al crear receta maestro-detalle:', error);
            if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
                throw new Error(`El código "${codigoLimpio}" ya existe en la base de datos.`);
            }
            throw error;
        } finally {
            connection.release();
        }
    },

    // Actualizar receta Maestro-Detalle con reemplazo seguro de ingredientes
    actualizarReceta: async (id, recetaData) => {
        if (!recetaData.nombre) throw new Error('El nombre de la receta es obligatorio');

        if (recetaData.codigo) {
            const codigoLimpio = recetaData.codigo.toString().trim().toUpperCase();
            recetaData.codigo = codigoLimpio;
            // Validar unicidad del código excluyendo la receta actual
            const existeCodigo = await Receta.getByCodigo(codigoLimpio, id);
            if (existeCodigo) {
                throw new Error(`El código "${codigoLimpio}" ya está en uso por la ficha técnica "${existeCodigo.nombre}". No se pueden duplicar códigos.`);
            }
        }

        if (!db) return;
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // 1. Actualizar datos de cabecera
            await Receta.updateTransactional(connection, id, recetaData);

            // 2. Remover ingredientes previos
            await Receta.deleteDetallesTransactional(connection, id);

            // 3. Escribir nuevos ingredientes
            if (recetaData.detalles && recetaData.detalles.length > 0) {
                await Receta.insertDetallesTransactional(connection, id, recetaData.detalles);
            }

            await connection.commit();
            logger.info(`Receta Integral ${id} actualizada con éxito.`);
        } catch (error) {
            await connection.rollback();
            logger.error(`Error de rollback al actualizar receta ${id}:`, error);
            if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
                throw new Error(`El código "${recetaData.codigo}" ya existe en la base de datos.`);
            }
            throw error;
        } finally {
            connection.release();
        }
    },

    // Eliminar receta DEFINITIVAMENTE de la base de datos (Hard Delete)
    eliminarReceta: async (id) => {
        try {
            await Receta.delete(id);
            logger.info(`Receta ${id} eliminada definitivamente de la BD con sus ingredientes`);
        } catch (error) {
            logger.error('Error al eliminar receta definitivamente:', error);
            throw new Error('Error al eliminar la receta de la base de datos');
        }
    },

    // Verificar si hay suficiente stock para preparar platillos (Tomando en cuenta mermas)
    verificarStockParaPedido: async (items, almacenId) => {
        try {
            const errores = [];

            for (const item of items) {
                const recetaId = item.id_platillo || item.platillo_id; 
                const cantidad = item.cantidad || 1;

                const ingredientes = await Receta.getByPlatilloAndAlmacen(recetaId, almacenId);

                for (const ingrediente of ingredientes) {
                    const factorMerma = ingrediente.porcentaje_merma > 0 ? (1 + (ingrediente.porcentaje_merma / 100)) : 1;
                    const cantidadRequerida = ingrediente.cantidad_requerida * cantidad * factorMerma;

                    // SI EL STOCK ES INSUFICIENTE: Solo agregamos error si el ingrediente ES INDISPENSABLE (es_opcional === 0)
                    if (ingrediente.stock_disponible < cantidadRequerida) {
                        if (!ingrediente.es_opcional) {
                            errores.push({
                                platillo: ingrediente.receta_id,
                                ingrediente: ingrediente.producto_nombre,
                                disponible: parseFloat(ingrediente.stock_disponible),
                                requerido: parseFloat(cantidadRequerida.toFixed(4))
                            });
                        }
                    }
                }
            }

            if (errores.length > 0) {
                return { suficiente: false, errores };
            }

            return { suficiente: true };
        } catch (error) {
            logger.error('Error al verificar stock para pedido:', error);
            throw new Error('Error al verificar el stock disponible');
        }
    },

    // Descontar stock de ingredientes al cerrar pedido con CONTROL DE TRANSACCIONES
    descontarStockPedido: async (items, almacenId, idPedido = null, usuarioId = null) => {
        if (!db) return { success: true, movimientos: [] };
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction(); 
            const movimientos = [];

            for (const item of items) {
                const recetaId = item.id_platillo || item.platillo_id;
                const cantidad = item.cantidad || 1;

                const ingredientes = await Receta.getByPlatilloAndAlmacen(recetaId, almacenId);

                for (const ingrediente of ingredientes) {
                    const factorMerma = ingrediente.porcentaje_merma > 0 ? (1 + (ingrediente.porcentaje_merma / 100)) : 1;
                    const cantidadRequerida = ingrediente.cantidad_requerida * cantidad * factorMerma;

                    const lotesQuery = `
                        SELECT id, cantidad_actual, fecha_vencimiento
                        FROM lotes
                        WHERE producto_id = ? 
                        AND almacen_id = ? 
                        AND cantidad_actual > 0
                        ORDER BY 
                            CASE WHEN fecha_vencimiento IS NOT NULL THEN fecha_vencimiento ELSE '9999-12-31' END ASC,
                            id ASC
                    `;
                    const [lotes] = await connection.query(lotesQuery, [ingrediente.producto_id, almacenId]);

                    let cantidadPendiente = cantidadRequerida;

                    for (const lote of lotes) {
                        if (cantidadPendiente <= 0) break;

                        const cantidadADescontar = Math.min(lote.cantidad_actual, cantidadPendiente);

                        await connection.query(
                            'UPDATE lotes SET cantidad_actual = cantidad_actual - ? WHERE id = ?',
                            [cantidadADescontar, lote.id]
                        );

                        await connection.query(
                            `INSERT INTO movimientos_inventario 
                            (producto_id, almacen_id, lote_id, tipo_movimiento, referencia_tipo, referencia_id, cantidad, usuario_id, observaciones, documento_numero) 
                            VALUES (?, ?, ?, 'CONSUMO_RECETA', 'PEDIDO', ?, ?, ?, 'Consumo por venta de receta', ?)`,
                            [
                                ingrediente.producto_id,
                                almacenId,
                                lote.id,
                                idPedido,
                                cantidadADescontar,
                                usuarioId,
                                idPedido ? `PED-${idPedido}` : `REC-${Date.now()}`
                            ]
                        );

                        movimientos.push({
                            lote_id: lote.id,
                            producto: ingrediente.producto_nombre,
                            cantidad: cantidadADescontar
                        });

                        cantidadPendiente -= cantidadADescontar;
                    }

                    if (cantidadPendiente > 0.0001) { 
                        if (!ingrediente.es_opcional) {
                            throw new Error(`Inconsistencia de inventario: Stock insuficiente para el insumo indispensable "${ingrediente.producto_nombre}". Faltaron ${cantidadPendiente.toFixed(3)} unidades.`);
                        } else {
                            logger.warn(`Ingrediente opcional "${ingrediente.producto_nombre}" agotado parcialmente en almacén ${almacenId}. Se descontó solo el stock disponible.`);
                        }
                    }
                }
            }

            await connection.commit(); 
            logger.info(`Stock rebajado de manera exitosa para el pedido. Movimientos generados: ${movimientos.length}`);
            return { success: true, movimientos };

        } catch (error) {
            await connection.rollback(); 
            logger.error('Error crítico detectado al descontar stock (Se aplicó Rollback):', error);
            throw error;
        } finally {
            connection.release();
        }
    },

    // Obtener platillos que usan un producto
    obtenerPlatillosPorProducto: async (productoId) => {
        try {
            return await Receta.getPlatillosByProducto(productoId);
        } catch (error) {
            logger.error('Error al obtener platillos por producto:', error);
            throw new Error('Error al obtener los platillos que usan este producto');
        }
    },

    // Activar o desactivar estado de receta
    cambiarEstado: async (id, activa) => {
        try {
            await Receta.updateEstado(id, activa);
        } catch (error) {
            logger.error('Error al actualizar estado:', error);
            throw new Error('Error al actualizar el estado de la receta');
        }
    },

    // Eliminar un ingrediente puntual de la receta
    eliminarIngrediente: async (detalleId) => {
        try {
            return await Receta.deleteDetalle(detalleId);
        } catch (error) {
            logger.error('Error al eliminar ingrediente:', error);
            throw new Error('Error al eliminar el ingrediente de la receta');
        }
    },

    // Agregar un ingrediente puntual a la receta
    agregarIngrediente: async (detalleData) => {
        try {
            return await Receta.addDetalle(detalleData);
        } catch (error) {
            logger.error('Error al agregar ingrediente:', error);
            throw new Error('Error al registrar el ingrediente en la receta');
        }
    }
};

module.exports = RecetaService;
