// services/recetaService.js - Servicio para gestión de recetas
const Receta = require('../models/recetaModel');
const UnidadMedida = require('../models/unidadMedidaModel');
const Producto = require('../models/productoModel'); // Tu ProductoModel original
const db = require('../config/db');
const logger = require('../config/logger');

const RecetaService = {
    // Catálogos agrupados concurrentemente para renderizar la UI
    obtenerCatalogosAdministracion: async () => {
        try {
            const [recetas, productos, unidades] = await Promise.all([
                Receta.getAll(),
                Producto.getPreparados(),         // <-- MANTENIDO: Usa tu método real getPreparados() para listar solo productos con receta
                UnidadMedida.getActivas() 
            ]);
            return { recetas, productos, unidades };
        } catch (error) {
            logger.error('Error al compilar catálogos de recetas:', error);
            throw new Error('Error al recopilar los catálogos de base de datos');
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

    // NUEVO: Obtener la estructura Maestro-Detalle unificada para modales de edición
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

    // AJUSTADO: Crear nueva receta Maestro-Detalle con control atómico de transacciones
    crearReceta: async (recetaData) => {
        if (!recetaData.codigo) throw new Error('El código de la receta es obligatorio');
        if (!recetaData.nombre) throw new Error('El nombre de la receta es obligatorio');
        if (!recetaData.producto_resultante_id) throw new Error('El producto resultante es obligatorio');
        if (!recetaData.unidad_rendimiento) throw new Error('La unidad de rendimiento es obligatoria');

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
            throw error;
        } finally {
            connection.release();
        }
    },

    // AJUSTADO: Actualizar receta Maestro-Detalle con reemplazo seguro de ingredientes
    actualizarReceta: async (id, recetaData) => {
        if (!recetaData.nombre) throw new Error('El nombre de la receta es obligatorio');

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
            throw error;
        } finally {
            connection.release();
        }
    },

    // Eliminar receta
    eliminarReceta: async (id) => {
        try {
            await Receta.delete(id);
            logger.info(`Receta ${id} eliminada (borrado lógico)`);
        } catch (error) {
            logger.error('Error al eliminar receta:', error);
            throw new Error('Error al eliminar la receta');
        }
    },

    // Verificar si hay suficiente stock para preparar platillos (Tomando en cuenta mermas)
    verificarStockParaPedido: async (items, almacenId) => {
        try {
            const errores = [];

            for (const item of items) {
                const recetaId = item.id_platillo; 
                const cantidad = item.cantidad;

                const ingredientes = await Receta.getByPlatilloAndAlmacen(recetaId, almacenId);

                for (const ingrediente of ingredientes) {
                    const factorMerma = ingrediente.porcentaje_merma > 0 ? (1 + (ingrediente.porcentaje_merma / 100)) : 1;
                    const cantidadRequerida = ingrediente.cantidad_requerida * cantidad * factorMerma;

                    if (ingrediente.stock_disponible < cantidadRequerida) {
                        errores.push({
                            platillo: ingrediente.receta_id,
                            ingrediente: ingrediente.producto_nombre,
                            disponible: parseFloat(ingrediente.stock_disponible),
                            requerido: parseFloat(cantidadRequerida.toFixed(4))
                        });
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
    descontarStockPedido: async (items, almacenId) => {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction(); 
            const movimientos = [];

            for (const item of items) {
                const recetaId = item.id_platillo;
                const cantidad = item.cantidad;

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
                            (lote_id, tipo, cantidad, motivo, usuario_id, fecha) 
                            VALUES (?, 'salida', ?, 'Venta / Production Receta', NULL, NOW())`,
                            [lote.id, cantidadADescontar]
                        );

                        movimientos.push({
                            lote_id: lote.id,
                            producto: ingrediente.producto_nombre,
                            cantidad: cantidadADescontar
                        });

                        cantidadPendiente -= cantidadADescontar;
                    }

                    if (cantidadPendiente > 0.0001) { 
                        throw new Error(`Inconsistencia de inventario de última hora: Stock insuficiente para el insumo "${ingrediente.producto_nombre}". Faltaron ${cantidadPendiente.toFixed(3)} unidades.`);
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
    }
};

module.exports = RecetaService;