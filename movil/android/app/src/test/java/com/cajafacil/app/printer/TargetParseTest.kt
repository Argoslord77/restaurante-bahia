package com.cajafacil.app.printer

import org.junit.Assert.assertEquals
import org.junit.Assert.fail
import org.junit.Test

/**
 * JVM puro (./gradlew :app:testDebugUnitTest): Target.parse() no toca
 * Android ni Capacitor. La validación que protege al hardware se prueba aquí,
 * no contra una impresora física.
 */
class TargetParseTest {

    @Test fun `bluetooth valido normaliza MAC a mayusculas`() {
        val t = Target.parse("bluetooth", "aa:bb:cc:dd:ee:ff", null, -1, -1, 9100, 15_000)
        assertEquals("AA:BB:CC:DD:EE:FF", t.address)
        assertEquals("bt:AA:BB:CC:DD:EE:FF", t.queueKey)
    }

    @Test fun `bluetooth rechaza MAC mala o ausente`() {
        assertInvalid { Target.parse("bluetooth", "NO-MAC", null, -1, -1, 9100, 15_000) }
        assertInvalid { Target.parse("bluetooth", null, null, -1, -1, 9100, 15_000) }
        assertInvalid { Target.parse("bluetooth", "AA:BB:CC:DD:EE", null, -1, -1, 9100, 15_000) }
    }

    @Test fun `usb valido y rechaza vid-pid malos`() {
        val t = Target.parse("usb", null, null, 1155, 22304, 9100, 15_000)
        assertEquals("usb:1155:22304", t.queueKey)
        assertInvalid { Target.parse("usb", null, null, 0, 22304, 9100, 15_000) }
        assertInvalid { Target.parse("usb", null, null, 1155, -1, 9100, 15_000) }
    }

    @Test fun `wifi recorta host y fija puerto`() {
        val t = Target.parse("wifi", null, "  10.0.0.9  ", -1, -1, 99999, 15_000)
        assertEquals("10.0.0.9", t.host)
        assertEquals(65535, t.port)
        assertEquals("wifi:10.0.0.9:65535", t.queueKey)
        assertInvalid { Target.parse("wifi", null, "   ", -1, -1, 9100, 15_000) }
        assertInvalid { Target.parse("wifi", null, null, -1, -1, 9100, 15_000) }
    }

    @Test fun `transporte desconocido o nulo es invalid_transport`() {
        assertInvalid { Target.parse("serie", null, null, -1, -1, 9100, 15_000) }
        assertInvalid { Target.parse(null, null, null, -1, -1, 9100, 15_000) }
    }

    @Test fun `timeout se fija entre 2s y 60s`() {
        assertEquals(
            2_000,
            Target.parse("bluetooth", "AA:BB:CC:DD:EE:FF", null, -1, -1, 9100, 100).timeoutMs
        )
        assertEquals(
            60_000,
            Target.parse("bluetooth", "AA:BB:CC:DD:EE:FF", null, -1, -1, 9100, 999_999).timeoutMs
        )
    }

    private fun assertInvalid(block: () -> Target) {
        try {
            block()
            fail("debió lanzar PrintError")
        } catch (e: PrintError) {
            assertEquals(PrintError.INVALID_TRANSPORT, e.code)
        }
    }
}
