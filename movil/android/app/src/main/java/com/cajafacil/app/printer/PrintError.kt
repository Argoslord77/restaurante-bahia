package com.cajafacil.app.printer

/**
 * Taxonomía estable de errores del plugin de impresión.
 *
 * Los `code` son API PÚBLICA: los consume el JS (printer-nativo.js → impresora.js).
 * Reglas de élite: se documentan, se congelan y jamás se renombran sin migración.
 * Al JS solo viaja el código; el detalle humano vive en el mapa ERRORES del JS.
 */
class PrintError(val code: String, cause: Throwable? = null) : Exception(code, cause) {
    companion object {
        const val UNAVAILABLE = "unavailable"           // sin hardware / BT apagado / sin USB host
        const val NOT_FOUND = "not_found"               // dirección/MAC/VID:PID inexistente
        const val PERMISSION_DENIED = "permission_denied" // BLUETOOTH_CONNECT o USB denegado
        const val CONNECT_FAILED = "connect_failed"     // socket no conecta (apagada, lejos, ocupada)
        const val WRITE_FAILED = "write_failed"         // se cortó a la mitad
        const val TIMEOUT = "timeout"                   // excedió timeoutMs
        const val INVALID_TRANSPORT = "invalid_transport" // destino mal formado
        const val INVALID_DATA = "invalid_data"         // base64 vacío/corrupto o > MAX_JOB_BYTES
    }
}
