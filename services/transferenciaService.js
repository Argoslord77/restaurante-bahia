// services/transferenciaService.js - Servicio para gestión de transferencias entre almacenes
const Transferencia = require('../models/transferenciaModel');
const logger = require('../config/logger');

const TransferenciaService = {
    // Obtener todas las transferencias
    listarTodas: async () => {
        try {
            return await Transferencia.getAll();
        } catch (error) {
            logger.error('Error al listar transferencias:', error);
            throw new Error('Error al listar las transferencias');
        }
    },

    // Obtener transferencias por estado
    listarPorEstado: async (estado) => {
        try {
            return await Transferencia.getByEstado(estado);
        } catch (error) {
            logger.error('Error al listar transferencias por estado:', error);
            throw new Error('Error al listar las transferencias');
        }
    },

    // Obtener transferencia por ID
    obtenerPorId: async (id) => {
        try {
            return await Transferencia.getById(id);
        } catch (error) {
            logger.error('Error al obtener transferencia:', error);
            throw new Error('Error al obtener la transferencia');
        }
    },

    // Crear nueva solicitud de transferencia
    crearSolicitud: async (transferenciaData) => {
        try {
            // Validaciones
            if (!transferenciaData.almacen_origen_id) {
                throw new Error('El almacén de origen es obligatorio');
            }
            if (!transferenciaData.almacen_destino_id) {
                throw new Error('El almacén de destino es obligatorio');
            }
            if (transferenciaData.almacen_origen_id === transferenciaData.almacen_destino_id) {
                throw new Error('El almacén de origen y destino deben ser diferentes');
            }
            if (!transferenciaData.producto_id) {
                throw new Error('El producto es obligatorio');
            }
            if (!transferenciaData.cantidad || transferenciaData.cantidad <= 0) {
                throw new Error('La cantidad debe ser mayor a 0');
            }
            if (!transferenciaData.solicitante_id) {
                throw new Error('El solicitante es obligatorio');
            }

            // Verificar stock disponible en origen
            const stockDisponible = await Transferencia.verificarStockOrigen(
                transferenciaData.almacen_origen_id,
                transferenciaData.producto_id,
                transferenciaData.cantidad
            );

            if (!stockDisponible) {
                throw new Error('No hay suficiente stock en el almacén de origen');
            }

            const id = await Transferencia.create(transferenciaData);
            logger.info(`Solicitud de transferencia ${id} creada`);
            return id;
        } catch (error) {
            logger.error('Error al crear solicitud de transferencia:', error);
            throw error;
        }
    },

    // Aprobar transferencia
    aprobarTransferencia: async (id, aprobadorId) => {
        try {
            const transferencia = await Transferencia.getById(id);
            
            if (!transferencia) {
                throw new Error('Transferencia no encontrada');
            }
            
            if (transferencia.estado !== 'pendiente') {
                throw new Error('Solo se pueden aprobar transferencias pendientes');
            }

            // Verificar nuevamente stock disponible
            const stockDisponible = await Transferencia.verificarStockOrigen(
                transferencia.almacen_origen_id,
                transferencia.producto_id,
                transferencia.cantidad
            );

            if (!stockDisponible) {
                throw new Error('No hay suficiente stock en el almacén de origen');
            }

            await Transferencia.updateEstado(id, 'aprobada', aprobadorId);
            logger.info(`Transferencia ${id} aprobada por usuario ${aprobadorId}`);
        } catch (error) {
            logger.error('Error al aprobar transferencia:', error);
            throw error;
        }
    },

    // Rechazar transferencia
    rechazarTransferencia: async (id) => {
        try {
            const transferencia = await Transferencia.getById(id);
            
            if (!transferencia) {
                throw new Error('Transferencia no encontrada');
            }
            
            if (transferencia.estado !== 'pendiente') {
                throw new Error('Solo se pueden rechazar transferencias pendientes');
            }

            await Transferencia.updateEstado(id, 'rechazada');
            logger.info(`Transferencia ${id} rechazada`);
        } catch (error) {
            logger.error('Error al rechazar transferencia:', error);
            throw error;
        }
    },

    // Completar transferencia (ejecutar movimiento físico)
    completarTransferencia: async (id) => {
        try {
            const db = require('../config/db');
            const transferencia = await Transferencia.getById(id);
            
            if (!transferencia) {
                throw new Error('Transferencia no encontrada');
            }
            
            if (transferencia.estado !== 'aprobada') {
                throw new Error('Solo se pueden completar transferencias aprobadas');
            }

            const connection = await db.getConnection();
            try {
                await connection.beginTransaction();

                // Obtener lotes del almacén origen (FIFO por vencimiento)
                const lotes = await Transferencia.obtenerLotesOrigen(
                    transferencia.almacen_origen_id,
                    transferencia.producto_id
                );

                let cantidadPendiente = transferencia.cantidad;
                const movimientos = [];

                // Descontar de lotes origen
                for (const lote of lotes) {
                    if (cantidadPendiente <= 0) break;

                    const cantidadADescontar = Math.min(lote.cantidad_actual, cantidadPendiente);

                    await connection.query(
                        'UPDATE lotes SET cantidad_actual = cantidad_actual - ? WHERE id = ?',
                        [cantidadADescontar, lote.id]
                    );

                    // Registrar movimiento de salida
                    await connection.query(
                        `INSERT INTO movimientos_inventario 
                        (lote_id, tipo, cantidad, motivo, usuario_id, fecha) 
                        VALUES (?, 'salida', ?, ?, NULL, NOW())`,
                        [lote.id, cantidadADescontar, `Transferencia #${id} a almacén ${transferencia.almacen_destino_nombre}`]
                    );

                    movimientos.push({
                        lote_id: lote.id,
                        cantidad: cantidadADescontar,
                        tipo: 'salida'
                    });

                    cantidadPendiente -= cantidadADescontar;
                }

                // Agregar al almacén destino (buscar lote existente o crear nuevo)
                const [lotesDestino] = await connection.query(
                    `SELECT id FROM lotes 
                    WHERE producto_id = ? AND almacen_id = ? 
                    ORDER BY id ASC LIMIT 1`,
                    [transferencia.producto_id, transferencia.almacen_destino_id]
                );

                if (lotesDestino.length > 0) {
                    // Agregar a lote existente
                    await connection.query(
                        'UPDATE lotes SET cantidad_actual = cantidad_actual + ? WHERE id = ?',
                        [transferencia.cantidad, lotesDestino[0].id]
                    );

                    // Registrar movimiento de entrada
                    await connection.query(
                        `INSERT INTO movimientos_inventario 
                        (lote_id, tipo, cantidad, motivo, usuario_id, fecha) 
                        VALUES (?, 'entrada', ?, ?, NULL, NOW())`,
                        [lotesDestino[0].id, transferencia.cantidad, `Transferencia #${id} desde almacén ${transferencia.almacen_origen_nombre}`]
                    );

                    movimientos.push({
                        lote_id: lotesDestino[0].id,
                        cantidad: transferencia.cantidad,
                        tipo: 'entrada'
                    });
                } else {
                    // Crear nuevo lote en destino
                    const [nuevoLote] = await connection.query(
                        `INSERT INTO lotes (producto_id, almacen_id, cantidad_actual, numero_lote, fecha_vencimiento)
                        VALUES (?, ?, ?, NULL, NULL)`,
                        [transferencia.producto_id, transferencia.almacen_destino_id, transferencia.cantidad]
                    );

                    // Registrar movimiento de entrada
                    await connection.query(
                        `INSERT INTO movimientos_inventario 
                        (lote_id, tipo, cantidad, motivo, usuario_id, fecha) 
                        VALUES (?, 'entrada', ?, ?, NULL, NOW())`,
                        [nuevoLote.insertId, transferencia.cantidad, `Transferencia #${id} desde almacén ${transferencia.almacen_origen_nombre}`]
                    );

                    movimientos.push({
                        lote_id: nuevoLote.insertId,
                        cantidad: transferencia.cantidad,
                        tipo: 'entrada'
                    });
                }

                // Actualizar estado de transferencia
                await connection.query(
                    `UPDATE transferencias SET estado = 'completada', fecha_completado = NOW() WHERE id = ?`,
                    [id]
                );

                await connection.commit();
                logger.info(`Transferencia ${id} completada. Movimientos: ${movimientos.length}`);
                return { success: true, movimientos };
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
        } catch (error) {
            logger.error('Error al completar transferencia:', error);
            throw error;
        }
    },

    // Obtener transferencias por almacén
    listarPorAlmacen: async (almacenId, tipo = 'todos') => {
        try {
            return await Transferencia.getByAlmacen(almacenId, tipo);
        } catch (error) {
            logger.error('Error al listar transferencias por almacén:', error);
            throw new Error('Error al listar las transferencias');
        }
    }
};

module.exports = TransferenciaService;
