package com.cajafacil.app.printer

import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.hardware.usb.UsbConstants
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbDeviceConnection
import android.hardware.usb.UsbEndpoint
import android.hardware.usb.UsbInterface
import android.hardware.usb.UsbManager
import android.os.Build
import androidx.core.content.ContextCompat
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

/**
 * Transporte USB host (OTG).
 *
 * Cicatrices documentadas para no repetirlas:
 * 1. El PendingIntent del permiso DEBE ser MUTABLE en Android 12+. Con IMMUTABLE
 *    el callback jamás llega y parece "permiso colgado". Semanas quemadas por esto.
 * 2. bulkTransfer() puede enviar PARCIAL o -1: se avanza lo real, se reintenta
 *    el resto, jamás se asume éxito.
 * 3. Se prefiere interfaz clase PRINTER (7) pero se acepta cualquier bulk-out:
 *    las térmicas baratas suelen declarar clase vendor.
 * 4. claimInterface puede fallar si otro driver la tomó (kernel): es CONNECT_FAILED.
 */
object UsbThermal {
    const val ACTION_USB_PERMISSION = "com.cajafacil.app.USB_PERMISSION"
    private const val CHUNK = 16384

    data class UsbDeviceInfo(val vendorId: Int, val productId: Int, val name: String)

    private fun manager(ctx: Context): UsbManager =
        ctx.getSystemService(Context.USB_SERVICE) as? UsbManager
            ?: throw PrintError(PrintError.UNAVAILABLE)

    /** Candidatos: dispositivos con al menos un endpoint bulk-out. */
    fun list(ctx: Context): List<UsbDeviceInfo> {
        val mgr = try {
            manager(ctx)
        } catch (e: PrintError) {
            return emptyList() // sin USB host → lista vacía, no error
        }
        return mgr.deviceList.values
            .filter { hasBulkOut(it) }
            .map { UsbDeviceInfo(it.vendorId, it.productId, it.productName ?: "USB ${it.vendorId}:${it.productId}") }
    }

    suspend fun open(ctx: Context, vendorId: Int, productId: Int, timeoutMs: Int): Transport {
        val mgr = manager(ctx)
        val dev = mgr.deviceList.values.firstOrNull { it.vendorId == vendorId && it.productId == productId }
            ?: throw PrintError(PrintError.NOT_FOUND)
        if (!mgr.hasPermission(dev) && !requestPermission(ctx, mgr, dev)) {
            throw PrintError(PrintError.PERMISSION_DENIED)
        }
        val conn = mgr.openDevice(dev) ?: throw PrintError(PrintError.CONNECT_FAILED)
        val (iface, ep) = findBulkOut(dev) ?: run {
            conn.close()
            throw PrintError(PrintError.CONNECT_FAILED)
        }
        if (!conn.claimInterface(iface, true)) {
            conn.close()
            throw PrintError(PrintError.CONNECT_FAILED)
        }
        return BulkTransport(conn, iface, ep, timeoutMs)
    }

    /** Pide permiso al usuario y suspende hasta su respuesta (cancelable). */
    private suspend fun requestPermission(ctx: Context, mgr: UsbManager, dev: UsbDevice): Boolean =
        suspendCancellableCoroutine { cont ->
            val receiver = object : BroadcastReceiver() {
                override fun onReceive(c: Context, intent: Intent) {
                    if (intent.action != ACTION_USB_PERMISSION) return
                    try {
                        ctx.unregisterReceiver(this)
                    } catch (_: Exception) {
                    }
                    if (cont.isCompleted) return
                    cont.resume(intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false))
                }
            }
            cont.invokeOnCancellation {
                try {
                    ctx.unregisterReceiver(receiver)
                } catch (_: Exception) {
                }
            }
            ContextCompat.registerReceiver(ctx, receiver, IntentFilter(ACTION_USB_PERMISSION), ContextCompat.RECEIVER_NOT_EXPORTED)
            val flags = if (Build.VERSION.SDK_INT >= 31) PendingIntent.FLAG_MUTABLE else 0
            val pi = PendingIntent.getBroadcast(
                ctx, dev.deviceId,
                Intent(ACTION_USB_PERMISSION).setPackage(ctx.packageName), flags
            )
            mgr.requestPermission(dev, pi)
        }

    private fun hasBulkOut(dev: UsbDevice): Boolean = findBulkOut(dev) != null

    private fun findBulkOut(dev: UsbDevice): Pair<UsbInterface, UsbEndpoint>? {
        var fallback: Pair<UsbInterface, UsbEndpoint>? = null
        for (i in 0 until dev.interfaceCount) {
            val iface = dev.getInterface(i)
            for (e in 0 until iface.endpointCount) {
                val ep = iface.getEndpoint(e)
                if (ep.direction == UsbConstants.USB_DIR_OUT && ep.type == UsbConstants.USB_ENDPOINT_XFER_BULK) {
                    if (iface.interfaceClass == UsbConstants.USB_CLASS_PRINTER) return iface to ep
                    if (fallback == null) fallback = iface to ep
                }
            }
        }
        return fallback
    }

    private class BulkTransport(
        private val conn: UsbDeviceConnection,
        private val iface: UsbInterface,
        private val ep: UsbEndpoint,
        private val timeoutMs: Int
    ) : Transport {
        override fun write(bytes: ByteArray): Int {
            var off = 0
            while (off < bytes.size) {
                val n = minOf(CHUNK, bytes.size - off)
                val sent = conn.bulkTransfer(ep, bytes, off, n, timeoutMs)
                if (sent <= 0) throw PrintError(PrintError.WRITE_FAILED)
                off += sent
            }
            return bytes.size
        }

        override fun close() {
            try {
                conn.releaseInterface(iface)
            } catch (_: Exception) {
            }
            try {
                conn.close()
            } catch (_: Exception) {
            }
        }
    }
}
