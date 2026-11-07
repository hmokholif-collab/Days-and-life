package com.focusonlife.app.ui

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.focusonlife.app.R
import com.focusonlife.app.blocking.AppBlocker
import com.focusonlife.app.device.DeviceInfo
import com.focusonlife.app.device.DeviceOwnerManager

/**
 * Main screen. Shows runtime-detected device info — never a hardcoded
 * model — plus Device Owner status and a link to the Samsung
 * Compatibility screen. NOT TESTED on a physical Galaxy A24.
 */
class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val info = DeviceInfo.detect()
        val owner = DeviceOwnerManager(this)
        findViewById<TextView>(R.id.deviceInfo).text =
            "Manufacturer: ${info.manufacturer}\n" +
            "Model: ${info.model}\n" +
            "Android: ${info.androidRelease} (API ${info.apiLevel})\n" +
            "One UI: ${info.oneUiVersion}\n" +
            "Chipset: ${info.chipset}\n" +
            "Galaxy A24 family: ${if (info.isGalaxyA24Family) "yes" else "not detected"}\n" +
            "Device Owner: ${if (owner.isDeviceOwner) "YES" else "NO — app suspension unavailable"}\n" +
            "Blocking mode: ${AppBlocker(this).mode} (NO_RESET = Accessibility + VPN, no factory reset)\n" +
            "Facebook: local-only, never synced to cloud\n" +
            "Device Admin active: ${if (owner.isAdminActive) "yes" else "no"}"

        findViewById<Button>(R.id.btnCompatibility).setOnClickListener {
            startActivity(Intent(this, SamsungCompatibilityActivity::class.java))
        }
        findViewById<Button>(R.id.btnEnrollment).setOnClickListener {
            startActivity(Intent(this, EnrollmentActivity::class.java))
        }
        findViewById<Button>(R.id.btnSession).setOnClickListener {
            startActivity(Intent(this, SessionActivity::class.java))
        }
    }
}
