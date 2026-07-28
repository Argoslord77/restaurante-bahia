// services/turnoService.js
const TurnoModel = require('../models/turnoModel');
const db = require('../config/db');

class TurnoService {
    /**
     * Retorna el turno activo actual
     */
    static async obtenerTurnoActivo() {
        return await TurnoModel.findActive();
    }

    /**
     * Retorna el conjunto del historial junto con el estado del turno actual y monedas disponibles
     */
    static async obtenerDatosParaVista() {
        const turnoActivo = await TurnoModel.findActive();
        const historial = await TurnoModel.getHistorialCompleto(15);
        
        // Obtener catálogo de monedas activas para el panel de apertura
        const [monedas] = await db.query("SELECT id, codigo, nombre, simbolo, es_moneda_base, factor_cambio FROM monedas WHERE activo = 1 ORDER BY es_moneda_base DESC, codigo ASC");
        
        return { turnoActivo, historial, monedas };
    }

    /**
     * Gestiona las reglas para abrir un turno nuevo guardando el snapshot de tasas
     */
    static async abrirNuevoTurno(usuarioId, montoApertura, observaciones, monedasTurno = []) {
        // Validar si ya existe uno abierto
        const turnoExistente = await TurnoModel.findActive();
        if (turnoExistente) {
            throw new Error("Operación denegada. Ya existe un turno de servicio activo.");
        }

        const turnoId = await TurnoModel.createAperturaConMonedas(usuarioId, montoApertura, observaciones, monedasTurno);
        return turnoId;
    }

    /**
     * Procesa los cálculos y el cierre total de la caja
     */
    static async cerrarTurnoActivo(usuarioCierreId, montoCierreReal, observacionesCierre) {
        // 1. Validar existencia de turno operativo
        const turnoActivo = await TurnoModel.findActive();
        if (!turnoActivo) {
            throw new Error("No se encontró ningún turno de servicio activo para cerrar.");
        }

        const turnoId = turnoActivo.id;

        // 2. Ejecutar cálculos de cuadre automatizado
        const totalVentasTurno = await TurnoModel.sumVentasPorTurno(turnoId);
        const montoEsperado = parseFloat(turnoActivo.monto_apertura) + totalVentasTurno;

        // 3. Concatenar bitácora de observaciones de auditoría
        let notasFinales = observacionesCierre;
        if (turnoActivo.observaciones) {
            notasFinales = `Apertura: ${turnoActivo.observaciones} | Cierre: ${observacionesCierre || ''}`;
        }

        // 4. Persistir cierre definitivo en BD
        await TurnoModel.updateCierre(turnoId, usuarioCierreId, montoEsperado, montoCierreReal, notasFinales);

        // 5. Construir balance y diferencias de retorno
        const diferencia = montoCierreReal - montoEsperado;
        const balance = diferencia === 0 ? "Cuadre Perfecto" : (diferencia > 0 ? "Sobrante" : "Faltante");

        return {
            turnoId,
            fondoApertura: turnoActivo.monto_apertura,
            ventasRegistradas: totalVentasTurno,
            montoEsperadoEnCaja: montoEsperado,
            montoRealEntregado: montoCierreReal,
            diferencia,
            balance
        };
    }

    /**
     * Obtiene las monedas habilitadas y sus tasas congeladas para el turno activo actual
     */
    static async obtenerMonedasTurnoActivo() {
        const turnoActivo = await TurnoModel.findActive();
        if (!turnoActivo) {
            throw new Error("No hay un turno de servicio activo.");
        }

        // Consulta las monedas vinculadas al turno activo
        const query = `
            SELECT 
                m.id AS moneda_id,
                m.codigo,
                m.nombre,
                m.simbolo,
                m.es_moneda_base,
                COALESCE(mt.factor_cambio_turno, m.factor_cambio) AS factor_cambio
            FROM monedas_turno mt
            INNER JOIN monedas m ON mt.moneda_id = m.id
            WHERE mt.turno_servicio_id = ? AND m.activo = 1
        `;
        const [rows] = await db.query(query, [turnoActivo.id]);

        // Fallback de seguridad: Si el turno fue abierto antes de la tabla monedas_turno
        if (rows.length === 0) {
            const [monedasGlobales] = await db.query(
                "SELECT id AS moneda_id, codigo, nombre, simbolo, es_moneda_base, factor_cambio FROM monedas WHERE activo = 1"
            );
            return { turno_id: turnoActivo.id, monedas: monedasGlobales };
        }

        return { turno_id: turnoActivo.id, monedas: rows };
    }
}

module.exports = TurnoService;