package com.cajafacil.app.printer

import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothSocket
import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.runInterruptible
import kotlinx.coroutines.withTimeout
import java.io.IOException
import java.util.UUID

/**
 * Transporte Bluetooth clásico (SPP): el que usan las térmicas de 58/80mm.
 *
 * Reglas grabadas a fuego:
 * 1. cancelDiscovery() ANTES de conectar: discovery activo sabotea el connect.
 * 2. connect() bloquea → corre en Dispatchers.IO con timeout real.
 * 3. Intento SEGURO primero, fallback INSEGURO (muchas térmicas viejas solo
 *    emparejan bien en inseguro), y recién entonces error.
 * 4. Cerrar el socket desbloquea un connect() huérfano (no responde a interrupts).
 */
object BluetoothSpp {
    private val SPP_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")
    private const val CHUNK = 4096

    data class BtDevice(val address: String, val name: String)

    /** Solo emparejados (M1): sin discovery, sin permisos extra, sin sorpresas. */
    fun list(ctx: Context): List<BtDevice> {
        val adapter = ctx.getSystemService(BluetoothManager::class.java)?.adapter
            ?: throw PrintError(PrintError.UNAVAILABLE)
        if (!adapter.isEnabled) return emptyList() // apagado ≠ error; status() lo reporta
        return try {
            adapter.bondedDevices.orEmpty().map { BtDevice(it.address, it.name ?: it.address) }
        } catch (se: SecurityException) {
            throw PrintError(PrintError.PERMISSION_DENIED, se) // sin BLUETOOTH_CONNECT en 12+
        }
    }

    suspend fun open(ctx: Context, address: String, timeoutMs: Int): Transport {
        val adapter = ctx.getSystemService(BluetoothManager::class.java)?.adapter
            ?: throw PrintError(PrintError.UNAVAILABLE)
        if (!adapter.isEnabled) throw PrintError(PrintError.UNAVAILABLE)
        try {
            adapter.cancelDiscovery()
        } catch (_: SecurityException) {
            // En 12+ pide BLUETOOTH_SCAN; si falta, se sigue igual (casi nunca hay discovery activo).
        }
        val device = try {
            adapter.getRemoteDevice(address)
        } catch (e: IllegalArgumentException) {
            throw PrintError(PrintError.NOT_FOUND, e)
        } catch (se: SecurityException) {
            throw PrintError(PrintError.PERMISSION_DENIED, se)
        }
        var last: Throwable? = null
        for (insecure in listOf(false, true)) {
            val sock = try {
                if (insecure) device.createInsecureRfcommSocketToServiceRecord(SPP_UUID)
                else device.createRfcommSocketToServiceRecord(SPP_UUID)
            } catch (se: SecurityException) {
                throw PrintError(PrintError.PERMISSION_DENIED, se)
            } catch (e: IOException) {
                last = e
                continue
            }
            try {
                connectWithTimeout(sock, timeoutMs)
                return SocketTransport(sock)
            } catch (e: PrintError) {
                last = e
                sock.closeQuietly()
            }
        }
        throw PrintError(PrintError.CONNECT_FAILED, last)
    }

    private suspend fun connectWithTimeout(sock: BluetoothSocket, timeoutMs: Int) {
        try {
            withTimeout(timeoutMs.toLong()) {
                runInterruptible(Dispatchers.IO) { sock.connect() }
            }
        } catch (t: TimeoutCancellationException) {
            // connect() ignora interrupts: cerrar el socket lo desbloquea con IOException.
            sock.closeQuietly()
            throw PrintError(PrintError.TIMEOUT, t)
        } catch (e: IOException) {
            throw PrintError(PrintError.CONNECT_FAILED, e)
        }
    }

    private class SocketTransport(private val sock: BluetoothSocket) : Transport {
        override fun write(bytes: ByteArray): Int {
            try {
                writeChunked(sock.outputStream, bytes, CHUNK)
                return bytes.size
            } catch (e: IOException) {
                throw PrintError(PrintError.WRITE_FAILED, e)
            }
        }

        override fun close() = sock.closeQuietly()
    }
}
