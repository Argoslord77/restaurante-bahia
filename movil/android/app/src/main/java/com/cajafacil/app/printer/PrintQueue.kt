package com.cajafacil.app.printer

import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import java.util.concurrent.ConcurrentHashMap

/**
 * Cola FIFO por dispositivo físico.
 *
 * Dos tickets simultáneos al mismo Bluetooth sin serializar = bytes
 * entrelazados = basura impresa. La élite serializa; el novato "abre y reza".
 * Dispositivos DISTINTOS imprimen en paralelo (un Mutex por queueKey).
 */
class PrintQueue {
    private val locks = ConcurrentHashMap<String, Mutex>()

    suspend fun <T> enqueue(key: String, block: suspend () -> T): T {
        val m = locks.getOrPut(key) { Mutex() }
        return m.withLock { block() } // cancelable: si el scope muere, los que esperan abortan
    }

    /**
     * Best-effort al destruir el plugin. Los trabajos EN CURSO los cancela el
     * scope (Dispatchers.IO + withLock son cancelables); esto solo suelta el mapa.
     */
    fun cancelAll() = locks.clear()
}
