package com.cajafacil.app.printer

import java.io.Closeable
import java.io.OutputStream

/**
 * Un transporte ABIERTO y listo para escribir.
 *
 * Contrato: se usa SIEMPRE con `use {}` (cierra aunque falle). Socket o claim
 * USB que no se cierra = descriptor fugado = la 5ª impresión falla sin explicación.
 */
interface Transport : Closeable {
    /**
     * Escribe TODO o lanza PrintError(WRITE_FAILED / TIMEOUT).
     * Éxito parcial NO existe: retorna los bytes escritos (= bytes.size).
     */
    fun write(bytes: ByteArray): Int
}

/** Escritura por trozos con flush: evita saturar el buffer del socket BT. */
internal fun writeChunked(out: OutputStream, bytes: ByteArray, chunk: Int) {
    var off = 0
    while (off < bytes.size) {
        val n = minOf(chunk, bytes.size - off)
        out.write(bytes, off, n)
        out.flush()
        off += n
    }
}

internal fun Closeable?.closeQuietly() {
    try {
        this?.close()
    } catch (_: Exception) {
        // Cerrar nunca debe enmascarar el error real.
    }
}
