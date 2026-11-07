package com.focusonlife.app.session

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.os.IBinder
import com.focusonlife.app.blocking.AppBlocker
import com.focusonlife.app.vpn.FilterVpnService

/**
 * Foreground service for an active strict focus session.
 * Enforces suspension + VPN, monitors admin-permission changes, and
 * records emergency overrides. It does NOT prevent factory reset or
 * legitimate administrator recovery.
 * NOT TESTED on a physical Galaxy A24.
 */
class FocusForegroundService : Service() {
    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForeground(1002, buildNotification())
        val repo = SessionRepository(this)
        val session = repo.activeSession()
        if (session != null) {
            // NO_RESET mode: suspension returns false (no Device Owner).
            // Blocking is then done by BlockingAccessibilityService + VPN.
            // DEVICE_OWNER mode: suspension works as before.
            val blocker = AppBlocker(this)
            val packages = parseJsonList(session.blockedPackagesJson)
            blocker.suspendForSession(packages)
            FilterVpnService.start(this)
        } else {
            stopSelf()
        }
        return START_STICKY
    }

    private fun parseJsonList(json: String): List<String> =
        json.trim('[', ']').split(",")
            .map { it.trim().trim('"') }
            .filter { it.isNotBlank() }

    private fun buildNotification(): Notification {
        val channelId = "focus-session"
        val nm = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        nm.createNotificationChannel(
            NotificationChannel(channelId, "Focus session", NotificationManager.IMPORTANCE_LOW)
        )
        return Notification.Builder(this, channelId)
            .setContentTitle("FOCUS ON LIFE — focus session active")
            .setContentText("Blocked apps and sites are restricted until the session ends.")
            .setSmallIcon(android.R.drawable.ic_lock_lock)
            .build()
    }
}
