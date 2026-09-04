// services/salidaManualService.js - Servicio para gestión de salidas manuales de inventario
const SalidaManual = require('../models/salidaManualModel');
const UnidadMedidaService = require('./unidadMedidaService');
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

            // ── Unidad de medida ─────────────────────────────────────────
            // La salida se registra en la unidad elegida por el usuario, pero el
            // descuento de lotes y el kardex operan en la unidad de INVENTARIO
            // del producto (mismo criterio que las entradas de almacén).
            // Si no se envía unidad, se asume la unidad de inventario (factor 1).
            let cantidadInventario = Number(salidaData.cantidad);
            let infoUnidad = null;

            if (salidaData.unidad_medida_id) {
                infoUnidad = await UnidadMedidaService.validarUnidadParaEntrada(
                    salidaData.producto_id,
                    salidaData.unidad_medida_id
                );
                const factor = Number(infoUnidad.factor_a_inventario) || 1;
                cantidadInventario = cantidadInventario * factor;
            }

            // Verificar stock disponible (en unidades de inventario)
            const stockDisponible = await SalidaManual.verificarStock(
                salidaData.almacen_id,
                salidaData.producto_id,
                cantidadInventario
            );

            if (!stockDisponible) {
                throw new Error('No hay suficiente stock en el almacén' +
                    (infoUnidad ? ` para la cantidad indicada en ${infoUnidad.unidad.abreviatura}` : ''));
            }

            const connection = await db.getConnection();
            try {
                await connection.beginTransaction();

                // Obtener lotes disponibles (FIFO por vencimiento)
                const lotes = await SalidaManual.obtenerLotes(
                    salidaData.almacen_id,
                    salidaData.producto_id
                );

                let cantidadPendiente = cantidadInventario;
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
                return {
                    success: true,
                    id: salidaId,
                    movimientos,
                    unidad: infoUnidad ? {
                        id: infoUnidad.unidad.id,
                        abreviatura: infoUnidad.unidad.abreviatura,
                        factor_a_inventario: Number(infoUnidad.factor_a_inventario) || 1,
                        cantidad_inventario: cantidadInventario
                    } : null
                };
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
    },

    // ─────────────────────────────────────────────────────────────────────
    // Panel profesional de análisis (kardex)
    // ─────────────────────────────────────────────────────────────────────

    // Listado filtrado, ordenado y paginado para la vista principal
    listarFiltrado: async (filtros = {}) => {
        try {
            return await SalidaManual.getFiltrado(filtros);
        } catch (error) {
            logger.error('Error al listar salidas con filtros:', error);
            throw new Error('Error al listar las salidas');
        }
    },

    // Resumen por tipo con los filtros del panel aplicados
    resumenFiltrado: async (filtros = {}) => {
        try {
            return await SalidaManual.getResumenFiltrado(filtros);
        } catch (error) {
            logger.error('Error al obtener resumen filtrado:', error);
            return [];
        }
    },

    // Usuarios que han registrado salidas (filtro especializado)
    usuariosConSalidas: async () => {
        try {
            return await SalidaManual.getUsuariosConSalidas();
        } catch (error) {
            logger.error('Error al listar usuarios con salidas:', error);
            return [];
        }
    },

    /**
     * Exporta a CSV el listado con los filtros aplicados del panel.
     * Mismas convenciones que la exportación de auditoría: separador ';',
     * BOM UTF-8 para Excel y todos los campos entrecomillados.
     */
    exportarCSV: async (filtros = {}, limite = 20000) => {
        try {
            const rows = await SalidaManual.getParaExportar(filtros, limite);

            const escaparCampo = (valor) => {
                if (valor === null || valor === undefined) return '';
                const texto = String(valor).replace(/"/g, '""').replace(/\r?\n/g, ' ');
                return `"${texto}"`;
            };

            const cabecera = [
                'ID', 'Documento', 'Fecha', 'Almacen', 'Producto', 'Codigo',
                'Cantidad', 'Unidad', 'Tipo', 'Motivo', 'Notas', 'Usuario', 'Costo impactado'
            ].join(';');

            const lineas = rows.map(r => [
                r.id,
                `SM-${String(r.id).padStart(6, '0')}`,
                r.fecha_registro ? new Date(r.fecha_registro).toISOString() : '',
                r.almacen_nombre,
                r.producto_nombre,
                r.producto_codigo || '',
                r.cantidad,
                r.unidad_abreviatura || '',
                r.tipo,
                r.motivo || '',
                r.notas || '',
                r.usuario_nombre || '',
                Number(r.costo_total || 0).toFixed(2)
            ].map(escaparCampo).join(';'));

            // BOM para que Excel reconozca el UTF-8 y respete los acentos
            return { csv: '\ufeff' + [cabecera, ...lineas].join('\r\n'), filas: rows.length };
        } catch (error) {
            logger.error('Error al exportar salidas manuales a CSV:', error);
            throw new Error('Error al exportar las salidas');
        }
    }
};

module.exports = SalidaManualService;
