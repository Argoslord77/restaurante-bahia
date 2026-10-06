package com.cajafacil.app.printer

import com.getcapacitor.PluginCall

/**
 * Destino de impresión normalizado y VALIDADO.
 *
 * `from()` es la única puerta de entrada: si algo viene mal formado, lanza
 * PrintError (invalid_transport) aquí, nunca a mitad de un socket abierto.
 * Lógica pura → unit-testeable sin Android (ver matriz B.5).
 */
data class Target(
    val transport: String, // bluetooth | usb | wifi
    val address: String? = null, // bluetooth: MAC AA:BB:CC:DD:EE:FF
    val vendorId: Int = -1, // usb
    val productId: Int = -1, // usb
    val host: String? = null, // wifi
    val port: Int = 9100, // wifi
    val timeoutMs: Int = DEFAULT_TIMEOUT_MS
) {
    /** Clave de cola: un trabajo a la vez por dispositivo FÍSICO. */
    val queueKey: String
        get() = when (transport) {
            "bluetooth" -> "bt:$address"
            "usb" -> "usb:$vendorId:$productId"
            else -> "wifi:$host:$port"
        }

    companion object {
        const val DEFAULT_TIMEOUT_MS = 15_000
        private val MAC = Regex("^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$")

        fun from(call: PluginCall): Target {
            val t = call.getString("transport") ?: throw PrintError(PrintError.INVALID_TRANSPORT)
            val timeout = call.data.optInt("timeoutMs", DEFAULT_TIMEOUT_MS).coerceIn(2_000, 60_000)
            return when (t) {
                "bluetooth" -> {
                    val mac = call.getString("address") ?: throw PrintError(PrintError.INVALID_TRANSPORT)
                    if (!MAC.matches(mac)) throw PrintError(PrintError.INVALID_TRANSPORT)
                    Target(t, address = mac.uppercase(), timeoutMs = timeout)
                }
                "usb" -> {
                    val vid = call.data.optInt("vendorId", -1)
                    val pid = call.data.optInt("productId", -1)
                    if (vid <= 0 || pid <= 0) throw PrintError(PrintError.INVALID_TRANSPORT)
                    Target(t, vendorId = vid, productId = pid, timeoutMs = timeout)
                }
                "wifi" -> {
                    val host = call.getString("host")?.trim().orEmpty()
                    if (host.isEmpty()) throw PrintError(PrintError.INVALID_TRANSPORT)
                    val port = call.data.optInt("port", 9100).coerceIn(1, 65535)
                    Target(t, host = host, port = port, timeoutMs = timeout)
                }
                else -> throw PrintError(PrintError.INVALID_TRANSPORT)
            }
        }
    }
}
