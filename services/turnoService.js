// services/turnoService.js
const TurnoModel = require('../models/turnoModel');

class TurnoService {
    /**
     * Retorna el turno activo actual
     */
    static async obtenerTurnoActivo() {
        return await TurnoModel.findActive();
    }

    /**
     * Retorna el conjunto del historial junto con el estado del turno actual
     */
    static async obtenerDatosParaVista() {
        const turnoActivo = await TurnoModel.findActive();
        const historial = await TurnoModel.getHistorialCompleto(15);
        return { turnoActivo, historial };
    }

    /**
     * Gestiona las reglas para abrir un turno nuevo
     */
    static async abrirNuevoTurno(usuarioId, montoApertura, observaciones) {
        // Validar si ya existe uno abierto
        const turnoExistente = await TurnoModel.findActive();
        if (turnoExistente) {
            throw new Error("Operación denegada. Ya existe un turno de servicio activo.");
        }

        const turnoId = await TurnoModel.createApertura(usuarioId, montoApertura, observaciones);
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
}

module.exports = TurnoService;