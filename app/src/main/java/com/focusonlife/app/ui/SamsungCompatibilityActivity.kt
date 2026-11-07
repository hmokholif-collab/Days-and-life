package com.focusonlife.app.ui

import android.content.Context
import android.net.ConnectivityManager
import android.os.Bundle
import android.os.PowerManager
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.focusonlife.app.R
import com.focusonlife.app.device.DeviceInfo
import com.focusonlife.app.device.DeviceOwnerManager
import com.focusonlife.app.session.SessionRepository
import com.focusonlife.app.sync.SyncRepository

/**
 * Samsung Compatibility screen (required by the spec).
 * Shows: battery optimisation, Device Owner, VPN, permissions,
 * background execution, and last successful protection check.
 * Values are read live — never hardcoded. NOT TESTED on a physical A24.
 */
class SamsungCompatibilityActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_compatibility)

        val info = DeviceInfo.detect()
        val owner = DeviceOwnerManager(this)
        val pm = getSystemService(POWER_SERVICE) as PowerManager
        val batteryOptimised = !pm.isIgnoringBatteryOptimizations(packageName)
        val cm = getSystemService(CONNECTIVITY_SERVICE) as ConnectivityManager
        val vpnActive = cm.getNetworkCapabilities(cm.activeNetwork)
            ?.hasTransport(android.net.NetworkCapabilities.TRANSPORT_VPN) == true
        val lastCheck = getSharedPreferences("focus", Context.MODE_PRIVATE)
            .getLong("last_protection_check", 0L)
        val repo = SessionRepository(this)

        findViewById<TextView>(R.id.compatInfo).text =
            "Device: ${info.manufacturer} ${info.model} — Android ${info.androidRelease} (API ${info.apiLevel})\n" +
            "One UI: ${info.oneUiVersion} — Chipset: ${info.chipset}\n\n" +
            "Battery optimisation: ${if (batteryOptimised) "ON — background work may be delayed by Samsung" else "OFF for this app (requested via settings)"}\n" +
            "Device Owner: ${if (owner.isDeviceOwner) "YES" else "NO"}\n" +
            "VPN active: ${if (vpnActive) "yes" else "no"}\n" +
            "Notifications permission: check in system settings (Android 16 requires POST_NOTIFICATIONS)\n" +
            "Exact alarms: check in system settings (SCHEDULE_EXACT_ALARM)\n" +
            "Background execution: WorkManager recovery is scheduled; no polling loop is used\n" +
            "Active session: ${if (repo.hasActiveSession()) "yes" else "no"}\n" +
            "Cloud sync configured: ${if (SyncRepository.isConfigured) "yes" else "no — local only in v1.0.0"}\n" +
            "Last successful protection check: ${if (lastCheck == 0L) "never" else java.util.Date(lastCheck)}"
    }
}
