// models/entradaModel.js - Sincronizado para Restaurante Bahía
const db = require('../config/db');
const UnidadMedidaService = require('../services/unidadMedidaService');

const Entrada = {
    // Obtener el historial de entradas / Lotes activos
    getAll: async () => {
        const query = `
            SELECT 
                l.id AS lote_id,
                l.numero_lote,
                l.fecha_ingreso,
                l.fecha_vencimiento,
                l.cantidad_inicial,
                l.cantidad_actual,
                l.costo_unitario,
                l.unidad_medida_id,
                l.cantidad_ingresada,
                um.nombre AS unidad_medida_nombre,
                um.abreviatura AS unidad_medida_abreviatura,
                p.unidad_inventario_id,
                ui.abreviatura AS unidad_inventario_abreviatura,
                l.estado,
                p.nombre AS producto_nombre,
                p.codigo AS producto_codigo,
                a.nombre AS almacen_nombre
            FROM lotes l
            INNER JOIN productos p ON l.producto_id = p.id
            INNER JOIN almacenes a ON l.almacen_id = a.id
            LEFT JOIN unidades_medida um ON l.unidad_medida_id = um.id
            LEFT JOIN unidades_medida ui ON p.unidad_inventario_id = ui.id
            ORDER BY l.created_at DESC
        `;
        const [rows] = await db.query(query);
        return rows;
    },

    // Registrar entrada con numeración de lote atómica (LOT-YYYY-XXX)
    registrarEntradaAtomica: async (data) => {
        const conn = await db.getConnection();
        await conn.beginTransaction();

        try {
            if (!data.unidad_medida_id) {
                throw new Error('La unidad de medida de la entrada es obligatoria.');
            }
            if (!Number.isFinite(Number(data.cantidad)) || Number(data.cantidad) <= 0) {
                throw new Error('La cantidad de la entrada debe ser mayor que cero.');
            }
            if (!Number.isFinite(Number(data.costo_unitario)) || Number(data.costo_unitario) < 0) {
                throw new Error('El costo unitario de la entrada no es válido.');
            }

            // La cantidad que opera inventario queda normalizada a la unidad
            // canónica del producto. Se conserva la cantidad/unidad original
            // para auditoría y para mostrar qué se recibió físicamente.
            const unidadEntrada = await UnidadMedidaService.validarUnidadParaEntrada(
                data.producto_id,
                data.unidad_medida_id
            );
            const factorInventario = Number(unidadEntrada.factor_a_inventario) || 1;
            const cantidadInventario = Number(data.cantidad) * factorInventario;
            const costoInventario = Number(data.costo_unitario) / factorInventario;

            // 1. Año del lote: el de la fecha de ingreso real (fallback: año actual)
            const anioLote = new Date(data.fecha_ingreso || Date.now()).getFullYear() || new Date().getFullYear();

            // 2. La numeración se toma de `secuencias_lotes` en una MINI-TRANSACCIÓN
            //    propia (UPDATE con bloqueo de fila + LAST_INSERT_ID), con reintentos
            //    ante deadlock o carrera de primer insert del año. Puede dejar huecos
            //    si la entrada posterior falla, pero JAMÁS duplica un número.
            const siguienteConsecutivo = await Entrada._siguienteSecuencia(anioLote);

            // 3. Rellenar con ceros a la izquierda para garantizar los 3 dígitos (Ej: 001)
            const consecutivoFormateado = String(siguienteConsecutivo).padStart(3, '0');
            const numeroLoteGenerado = `LOT-${anioLote}-${consecutivoFormateado}`;

            // 4. Insertar el lote en estado ACTIVO con la cantidad sincronizada
            const queryLote = `
                INSERT INTO lotes
                (producto_id, almacen_id, numero_lote, fecha_ingreso, fecha_vencimiento,
                 cantidad_inicial, cantidad_actual, costo_unitario, unidad_medida_id,
                 cantidad_ingresada, estado, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVO', NOW(), NOW())
            `;
            
            const [result] = await conn.query(queryLote, [
                data.producto_id,
                data.almacen_id,
                numeroLoteGenerado,
                data.fecha_ingreso || new Date(),
                data.fecha_vencimiento || null,
                cantidadInventario,
                cantidadInventario,
                costoInventario,
                unidadEntrada.unidad.id,
                data.cantidad
            ]);

            // 5. Kardex de la entrada (movimientos_inventario, esquema real)
            await conn.query(`
                INSERT INTO movimientos_inventario
                (producto_id, almacen_id, lote_id, tipo_movimiento, referencia_tipo, referencia_id,
                 cantidad, costo_unitario, costo_total, stock_anterior, stock_nuevo,
                 documento_numero, observaciones)
                VALUES (?, ?, ?, 'AJUSTE_POSITIVO', 'entrada_almacen', ?, ?, ?, ?, 0, ?, ?, 'Entrada manual de inventario (lote nuevo)')
            `, [
                data.producto_id,
                data.almacen_id,
                result.insertId,
                result.insertId,
                cantidadInventario,
                costoInventario,
                costoInventario * cantidadInventario,
                cantidadInventario,
                numeroLoteGenerado
            ]);

            await conn.commit();
            return { insertId: result.insertId, numero_lote: numeroLoteGenerado };
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    }
};

module.exports = Entrada;// Nota: _siguienteSecuencia se define tras el objeto para permitir la autorreferencia.
Entrada._siguienteSecuencia = async function (anio) {
    for (let intento = 0; intento < 4; intento++) {
        const conn = await db.getConnection();
        try {
            await conn.beginTransaction();
            const [up] = await conn.query(
                'UPDATE secuencias_lotes SET siguiente = LAST_INSERT_ID(siguiente + 1) WHERE anio = ?',
                [anio]
            );
            let numero;
            if (up.affectedRows === 0) {
                // Primer lote del año: crear la fila (valor final 2 → el 1 es el que devolvemos)
                await conn.query('INSERT INTO secuencias_lotes (anio, siguiente) VALUES (?, 2)', [anio]);
                numero = 1;
            } else {
                const [sel] = await conn.query('SELECT LAST_INSERT_ID() AS n');
                numero = parseInt(sel[0].n, 10);
            }
            await conn.commit();
            conn.release();
            return numero;
        } catch (e) {
            try { await conn.rollback(); } catch (_) { /* ya revertida por el servidor */ }
            conn.release();
            // Deadlock entre concurrentes o carrera al crear la fila del año: reintentar
            if ((e.code === 'ER_LOCK_DEADLOCK' || e.code === 'ER_DUP_ENTRY') && intento < 3) continue;
            throw e;
        }
    }
    throw new Error('No se pudo obtener la numeración de lote tras varios intentos.');
};
