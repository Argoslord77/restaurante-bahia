package com.cajafacil.app.printer

import kotlinx.coroutines.async
import kotlinx.coroutines.delay
import kotlinx.coroutines.joinAll
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Test
import java.util.Collections

/**
 * La cola FIFO es lo que impide tickets entrelazados: se prueba aquí con
 * tiempo virtual (runTest), no imprimiendo dos tickets a la vez.
 */
class PrintQueueTest {

    @Test fun `serializa trabajos de la misma llave en orden`() = runTest {
        val q = PrintQueue()
        val orden = Collections.synchronizedList(mutableListOf<String>())
        val a = async { q.enqueue("bt:X") { delay(50); orden += "a" } }
        val b = async { q.enqueue("bt:X") { orden += "b" } }
        joinAll(a, b)
        assertEquals(listOf("a", "b"), orden)
    }

    @Test fun `llaves distintas no se bloquean`() = runTest {
        val q = PrintQueue()
        val orden = Collections.synchronizedList(mutableListOf<String>())
        val a = async { q.enqueue("bt:X") { delay(50); orden += "a" } }
        val b = async { q.enqueue("usb:1:2") { orden += "b" } }
        joinAll(a, b)
        assertEquals("b", orden.first()) // b no esperó a a
    }

    @Test fun `una excepcion no traba la cola`() = runTest {
        val q = PrintQueue()
        try {
            q.enqueue("bt:X") { throw RuntimeException("boom") }
        } catch (_: RuntimeException) {
        }
        var paso = false
        q.enqueue("bt:X") { paso = true }
        assertEquals(true, paso)
    }
}
