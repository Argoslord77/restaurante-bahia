package com.cajafacil.app.printer

import com.getcapacitor.PluginCall

/**
 * Destino de impresión normalizado y VALIDADO.
 *
 * `from()` es la única puerta de entrada: extrae del bridge y delega en
 * `parse()`, que es lógica PURA (cero Android, cero Capacitor) → se prueba
 * con JUnit directo en la JVM (TargetParseTest). Si algo viene mal formado,
 * lanza PrintError (invalid_transport) aquí, nunca a mitad de un socket abierto.
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

        /** Puerta Capacitor: extrae y delega en parse() puro. */
        fun from(call: PluginCall): Target = parse(
            transport = call.getString("transport"),
            address = call.getString("address"),
            host = call.getString("host"),
            vendorId = call.data.optInt("vendorId", -1),
            productId = call.data.optInt("productId", -1),
            port = call.data.optInt("port", 9100),
            timeoutMs = call.data.optInt("timeoutMs", DEFAULT_TIMEOUT_MS)
        )

        /** Lógica pura: JVM directa, sin Android. Ver TargetParseTest. */
        fun parse(
            transport: String?,
            address: String?,
            host: String?,
            vendorId: Int,
            productId: Int,
            port: Int,
            timeoutMs: Int
        ): Target {
            val t = transport ?: throw PrintError(PrintError.INVALID_TRANSPORT)
            val timeout = timeoutMs.coerceIn(2_000, 60_000)
            return when (t) {
                "bluetooth" -> {
                    val mac = address ?: throw PrintError(PrintError.INVALID_TRANSPORT)
                    if (!MAC.matches(mac)) throw PrintError(PrintError.INVALID_TRANSPORT)
                    Target(t, address = mac.uppercase(), timeoutMs = timeout)
                }
                "usb" -> {
                    val vid = vendorId
                    val pid = productId
                    if (vid <= 0 || pid <= 0) throw PrintError(PrintError.INVALID_TRANSPORT)
                    Target(t, vendorId = vid, productId = pid, timeoutMs = timeout)
                }
                "wifi" -> {
                    val h = host?.trim().orEmpty()
                    if (h.isEmpty()) throw PrintError(PrintError.INVALID_TRANSPORT)
                    val p = port.coerceIn(1, 65535)
                    Target(t, host = h, port = p, timeoutMs = timeout)
                }
                else -> throw PrintError(PrintError.INVALID_TRANSPORT)
            }
        }
    }
}
