package com.focusonlife.app.vpn

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Intent
import android.net.VpnService
import android.os.ParcelFileDescriptor
import android.util.Log
import java.io.FileInputStream
import java.io.FileOutputStream
import java.net.InetAddress

/**
 * Local DNS-filtering VPN.
 *
 * SCOPE — read this before claiming anything about blocking:
 * - This is DNS-level domain filtering only.
 * - It does NOT do full URL-level filtering.
 * - It does NOT inspect encrypted traffic contents.
 * - Encrypted DNS (DoH/DoT) and custom DNS can bypass DNS filtering;
 *   that limitation is reported in the UI, not hidden.
 * - IPv4 and IPv6 DNS queries are both handled (see DnsFilter).
 *
 * The service runs as a foreground service on Android 16 with a
 * persistent notification, and is restarted by WorkManager after
 * reboot / network change. NOT TESTED on a physical Galaxy A24.
 */
class FilterVpnService : VpnService() {
    private var vpnInterface: ParcelFileDescriptor? = null
    private var running = false

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForeground(NOTIFICATION_ID, buildNotification())
        if (!running) {
            running = true
            Thread(::runVpnLoop, "focus-vpn").start()
        }
        return START_STICKY
    }

    private fun runVpnLoop() {
        try {
            val builder = Builder()
                .setSession("FOCUS ON LIFE")
                .addAddress("10.0.0.2", 32)
                .addAddress("fd00::2", 128)
                .addRoute("0.0.0.0", 0)
                .addRoute("::", 0)
                .addDnsServer("8.8.8.8")
                .addDnsServer("1.1.1.1")
                .setBlocking(true)
            // Do not route the management app itself through the tunnel.
            try { builder.addDisallowedApplication(packageName) } catch (_: Exception) { }
            vpnInterface = builder.establish() ?: run {
                Log.e(TAG, "VPN establish() returned null — user may have denied VPN permission")
                stopSelf()
                return
            }
            val input = FileInputStream(vpnInterface!!.fileDescriptor)
            val output = FileOutputStream(vpnInterface!!.fileDescriptor)
            val buffer = ByteArray(32767)
            val filter = DnsFilter(this)
            while (running) {
                val length = input.read(buffer)
                if (length <= 0) continue
                val out = filter.processPacket(buffer.copyOf(length))
                if (out != null) output.write(out)
            }
        } catch (e: Exception) {
            Log.e(TAG, "VPN loop ended", e)
        } finally {
            running = false
            try { vpnInterface?.close() } catch (_: Exception) { }
            vpnInterface = null
        }
    }

    override fun onRevoke() {
        running = false
        stopSelf()
        super.onRevoke()
    }

    override fun onDestroy() {
        running = false
        try { vpnInterface?.close() } catch (_: Exception) { }
        super.onDestroy()
    }

    private fun buildNotification(): Notification {
        val channelId = "focus-vpn"
        val nm = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        nm.createNotificationChannel(
            NotificationChannel(channelId, "Focus protection", NotificationManager.IMPORTANCE_LOW)
        )
        return Notification.Builder(this, channelId)
            .setContentTitle("FOCUS ON LIFE — protection active")
            .setContentText("DNS filtering is on. Tap to open the app.")
            .setSmallIcon(android.R.drawable.ic_lock_lock)
            .build()
    }

    companion object {
        private const val TAG = "FilterVpnService"
        private const val NOTIFICATION_ID = 1001

        fun start(context: android.content.Context) {
            context.startForegroundService(Intent(context, FilterVpnService::class.java))
        }
    }
}
