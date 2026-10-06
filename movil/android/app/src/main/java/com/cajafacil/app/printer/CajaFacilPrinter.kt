package com.cajafacil.app.printer

import android.bluetooth.BluetoothManager
import android.content.pm.PackageManager
import android.os.SystemClock
import android.util.Base64
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import android.Manifest
import android.os.Build
import com.getcapacitor.PermissionState
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import java.util.concurrent.atomic.AtomicReference

/**
 * Plugin Capacitor PROPIO de CajaFácil (M1 del dojo, Parte B).
 *
 * Contrato JS:
 * - list({transport}) → {devices[]} (wifi → [] en M1: el JS guarda últimas usadas)
 * - print({transport, address|vendorId+productId|host+port, data: base64, timeoutMs?})
 *   → {bytes, ms}
 * - status() → {bluetooth, usbHost, lastError?}
 *
 * Decisiones (ver ADR-001):
 * - El formato ESC/POS vive en JS; aquí SOLO transporte de bytes.
 * - Los métodos llegan en el hilo principal → se despachan a Dispatchers.IO
 *   y vuelven de inmediato. Bloquear el bridge = ANR.
 * - Cola FIFO por dispositivo; `use {}` siempre; timeout en TODO;
 *   al JS solo viaja el código de error (PrintError).
 * - Registro en MainActivity.registerPlugin() (plugin dentro del app module).
 */
@CapacitorPlugin(name = "CajaFacilPrinter",
    permissions = [Permission(strings = [Manifest.permission.BLUETOOTH_CONNECT], alias = "bt")])
class CajaFacilPrinter : Plugin() {

    // Alcance PROPIO atado al plugin. NUNCA GlobalScope: se cancela en onDestroy.
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val queue = PrintQueue()
    private val lastError = AtomicReference<String?>(null)

    @PluginMethod
    fun list(call: PluginCall) {
        scope.launch {
            try {
                val t = call.getString("transport")
                    ?: return@launch call.retorno(PrintError.INVALID_TRANSPORT)
                val ctx = requireCtx()
                val arr = JSArray()
                when (t) {
                    "bluetooth" -> BluetoothSpp.list(ctx).forEach {
                        val o = JSObject()
                        o.put("address", it.address)
                        o.put("name", it.name)
                        arr.put(o)
                    }
                    "usb" -> UsbThermal.list(ctx).forEach {
                        val o = JSObject()
                        o.put("vendorId", it.vendorId)
                        o.put("productId", it.productId)
                        o.put("name", it.name)
                        arr.put(o)
                    }
                    "wifi" -> { /* M1: sin descubrimiento; ver contrato */ }
                    else -> return@launch call.retorno(PrintError.INVALID_TRANSPORT)
                }
                val ret = JSObject()
                ret.put("devices", arr)
                call.resolve(ret)
            } catch (e: PrintError) {
                fail(call, e)
            } catch (e: Exception) {
                fail(call, PrintError(PrintError.UNAVAILABLE, e))
            }
        }
    }

    @PluginMethod
    fun print(call: PluginCall) {
        scope.launch {
            val t0 = SystemClock.elapsedRealtime()
            try {
                val target = Target.from(call) // valida TODO antes de tocar hardware
                val b64 = call.getString("data") ?: throw PrintError(PrintError.INVALID_DATA)
                val bytes = try {
                    Base64.decode(b64, Base64.DEFAULT)
                } catch (e: IllegalArgumentException) {
                    throw PrintError(PrintError.INVALID_DATA, e)
                }
                // Sin límite, un ticket corrupto intenta imprimir MB y cuelga el hilo BT.
                if (bytes.isEmpty() || bytes.size > MAX_JOB_BYTES) {
                    throw PrintError(PrintError.INVALID_DATA)
                }
                lastError.set(null)
                val n = queue.enqueue(target.queueKey) {
                    openTransport(target).use { it.write(bytes) }
                }
                val ret = JSObject()
                ret.put("bytes", n)
                ret.put("ms", SystemClock.elapsedRealtime() - t0)
                call.resolve(ret)
            } catch (e: PrintError) {
                fail(call, e)
            } catch (e: Exception) {
                // Imprevisto: WRITE_FAILED genérico, jamás el mensaje crudo al JS.
                fail(call, PrintError(PrintError.WRITE_FAILED, e))
            }
        }
    }

    /**
     * Pre-autorizacion bluetooth (CONNECT en Android 12+).
     * Sin esto, el primer print fallaria con permission_denied SIN mostrar dialogo.
     * USB pregunta al imprimir; WiFi no pide nada.
     */
    @PluginMethod
    fun solicitarPermiso(call: PluginCall) {
        if (call.getString("transport") != "bluetooth" || Build.VERSION.SDK_INT < 31) {
            val ret = JSObject()
            ret.put("granted", true)
            call.resolve(ret)
            return
        }
        requestPermissionForAlias("bt", call, "permisoBtCallback")
    }

    @PermissionCallback
    private fun permisoBtCallback(call: PluginCall) {
        val ret = JSObject()
        ret.put("granted", getPermissionState("bt") == PermissionState.GRANTED)
        call.resolve(ret)
    }

    @PluginMethod
    fun status(call: PluginCall) {
        scope.launch {
            val ctx = context
            val btOn = try {
                ctx?.getSystemService(BluetoothManager::class.java)?.adapter?.isEnabled == true
            } catch (_: SecurityException) {
                false
            }
            val usbHost = ctx?.packageManager?.hasSystemFeature(PackageManager.FEATURE_USB_HOST) == true
            val ret = JSObject()
            ret.put("bluetooth", btOn)
            ret.put("usbHost", usbHost)
            lastError.get()?.let { ret.put("lastError", it) }
            call.resolve(ret)
        }
    }

    private suspend fun openTransport(t: Target): Transport {
        val ctx = requireCtx()
        return when (t.transport) {
            "bluetooth" -> BluetoothSpp.open(ctx, t.address!!, t.timeoutMs)
            "usb" -> UsbThermal.open(ctx, t.vendorId, t.productId, t.timeoutMs)
            else -> WlanThermal.open(t.host!!, t.port, t.timeoutMs)
        }
    }

    private fun requireCtx() = context ?: throw PrintError(PrintError.UNAVAILABLE)

    private fun fail(call: PluginCall, e: PrintError) {
        lastError.set(e.code)
        call.retorno(e.code) // al JS viaja SOLO el código (message); printer-nativo.js lo mapea
    }

    override fun handleOnDestroy() {
        scope.cancel() // cancela en curso + los que esperan en cola (withLock es cancelable)
        queue.cancelAll()
    }

    companion object {
        const val MAX_JOB_BYTES = 262_144 // 256 KB: un ticket real pesa < 20 KB
    }
}
