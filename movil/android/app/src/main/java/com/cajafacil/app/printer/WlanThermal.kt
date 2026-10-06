package com.cajafacil.app.printer

import kotlinx.coroutines.delay
import java.io.IOException
import java.net.InetSocketAddress
import java.net.Socket

/**
 * Transporte WiFi/TCP (puerto 9100, raw): el más simple y el más traicionero.
 *
 * Las térmicas WiFi baratas cierran conexiones inactivas agresivamente y a veces
 * rechazan el primer connect tras reposo → UN reintento con backoff de 500ms,
 * ni cero (frágil) ni N (cuelga la UX). El timeout cubre connect y cada write.
 */
object WlanThermal {
    private const val CHUNK = 8192

    suspend fun open(host: String, port: Int, timeoutMs: Int): Transport {
        var last: IOException? = null
        repeat(2) { attempt ->
            if (attempt > 0) delay(500)
            val sock = Socket()
            try {
                sock.connect(InetSocketAddress(host, port), timeoutMs)
                sock.soTimeout = timeoutMs
                return SocketTransport(sock)
            } catch (e: IllegalArgumentException) {
                sock.closeQuietly()
                throw PrintError(PrintError.INVALID_TRANSPORT, e)
            } catch (e: IOException) {
                last = e
                sock.closeQuietly()
            }
        }
        throw PrintError(PrintError.CONNECT_FAILED, last)
    }

    private class SocketTransport(private val sock: Socket) : Transport {
        override fun write(bytes: ByteArray): Int {
            try {
                writeChunked(sock.getOutputStream(), bytes, CHUNK)
                return bytes.size
            } catch (e: IOException) {
                throw PrintError(PrintError.WRITE_FAILED, e)
            }
        }

        override fun close() = sock.closeQuietly()
    }
}
