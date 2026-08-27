// services/salidaManualService.js - Servicio para gestión de salidas manuales de inventario
const SalidaManual = require('../models/salidaManualModel');
const logger = require('../config/logger');

const SalidaManualService = {
    // Obtener todas las salidas manuales
    listarTodas: async () => {
        try {
            return await SalidaManual.getAll();
        } catch (error) {
            logger.error('Error al listar salidas manuales:', error);
            throw new Error('Error al listar las salidas manuales');
        }
    },

    // Obtener salidas por tipo
    listarPorTipo: async (tipo) => {
        try {
            return await SalidaManual.getByTipo(tipo);
        } catch (error) {
            logger.error('Error al listar salidas por tipo:', error);
            throw new Error('Error al listar las salidas');
        }
    },

    // Obtener salidas por almacén
    listarPorAlmacen: async (almacenId) => {
        try {
            return await SalidaManual.getByAlmacen(almacenId);
        } catch (error) {
            logger.error('Error al listar salidas por almacén:', error);
            throw new Error('Error al listar las salidas');
        }
    },

    // Obtener salida por ID
    obtenerPorId: async (id) => {
        try {
            return await SalidaManual.getById(id);
        } catch (error) {
            logger.error('Error al obtener salida manual:', error);
            throw new Error('Error al obtener la salida manual');
        }
    },

    // Registrar nueva salida manual
    registrarSalida: async (salidaData) => {
        try {
            const db = require('../config/db');
            
            // Validaciones
            if (!salidaData.almacen_id) {
                throw new Error('El almacén es obligatorio');
            }
            if (!salidaData.producto_id) {
                throw new Error('El producto es obligatorio');
            }
            if (!salidaData.cantidad || salidaData.cantidad <= 0) {
                throw new Error('La cantidad debe ser mayor a 0');
            }
            if (!salidaData.tipo) {
                throw new Error('El tipo de salida es obligatorio');
            }
            if (!salidaData.usuario_id) {
                throw new Error('El usuario es obligatorio');
            }

            // Verificar stock disponible
            const stockDisponible = await SalidaManual.verificarStock(
                salidaData.almacen_id,
                salidaData.producto_id,
                salidaData.cantidad
            );

            if (!stockDisponible) {
                throw new Error('No hay suficiente stock en el almacén');
            }

            const connection = await db.getConnection();
            try {
                await connection.beginTransaction();

                // Obtener lotes disponibles (FIFO por vencimiento)
                const lotes = await SalidaManual.obtenerLotes(
                    salidaData.almacen_id,
                    salidaData.producto_id
                );

                let cantidadPendiente = salidaData.cantidad;
                const movimientos = [];

                // Descontar de lotes
                for (const lote of lotes) {
                    if (cantidadPendiente <= 0) break;

                    const cantidadADescontar = Math.min(lote.cantidad_actual, cantidadPendiente);
                    const stockAnterior = parseFloat(lote.cantidad_actual);
                    const stockNuevo = stockAnterior - cantidadADescontar;
                    const costoUnitario = parseFloat(lote.costo_unitario || 0);

                    await connection.query(
                        'UPDATE lotes SET cantidad_actual = cantidad_actual - ? WHERE id = ?',
                        [cantidadADescontar, lote.id]
                    );

                    movimientos.push({
                        lote_id: lote.id,
                        cantidad: cantidadADescontar,
                        vencimiento: lote.fecha_vencimiento,
                        stock_anterior: stockAnterior,
                        stock_nuevo: stockNuevo,
                        costo_unitario: costoUnitario
                    });

                    cantidadPendiente -= cantidadADescontar;
                }

                // Registrar salida manual
                const salidaId = await SalidaManual.create(salidaData);

                // Registrar los movimientos de inventario (kardex) con el esquema real
                // de `movimientos_inventario` (tipo_movimiento enum + documento_numero).
                const tipoMovimientoMap = { merma: 'MERMA', rotura: 'MERMA', perdida: 'AJUSTE_NEGATIVO' };
                const tipoMovimiento = tipoMovimientoMap[String(salidaData.tipo).toLowerCase()] || 'AJUSTE_NEGATIVO';

                for (const mov of movimientos) {
                    await connection.query(
                        `INSERT INTO movimientos_inventario
                        (producto_id, almacen_id, lote_id, tipo_movimiento, referencia_tipo, referencia_id,
                         cantidad, costo_unitario, costo_total, stock_anterior, stock_nuevo,
                         usuario_id, documento_numero, observaciones)
                        VALUES (?, ?, ?, ?, 'salida_manual', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            salidaData.producto_id,
                            salidaData.almacen_id,
                            mov.lote_id,
                            tipoMovimiento,
                            salidaId,
                            mov.cantidad,
                            mov.costo_unitario,
                            mov.costo_unitario * mov.cantidad,
                            mov.stock_anterior,
                            mov.stock_nuevo,
                            salidaData.usuario_id,
                            `SM-${String(salidaId).padStart(6, '0')}`,
                            `Salida manual (${salidaData.tipo})${salidaData.motivo ? ': ' + salidaData.motivo : ''}`
                        ]
                    );
                }

                await connection.commit();
                logger.info(`Salida manual ${salidaId} registrada. Movimientos: ${movimientos.length}`);
                return { success: true, id: salidaId, movimientos };
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
        } catch (error) {
            logger.error('Error al registrar salida manual:', error);
            throw error;
        }
    },

    // Obtener resumen por tipo
    obtenerResumenPorTipo: async (fechaInicio = null, fechaFin = null) => {
        try {
            return await SalidaManual.getResumenPorTipo(fechaInicio, fechaFin);
        } catch (error) {
            logger.error('Error al obtener resumen por tipo:', error);
            throw new Error('Error al obtener el resumen');
        }
    },

    // Obtener salidas por período
    listarPorPeriodo: async (fechaInicio, fechaFin) => {
        try {
            return await SalidaManual.getByPeriodo(fechaInicio, fechaFin);
        } catch (error) {
            logger.error('Error al listar salidas por período:', error);
            throw new Error('Error al listar las salidas');
        }
    }
};

module.exports = SalidaManualService;
