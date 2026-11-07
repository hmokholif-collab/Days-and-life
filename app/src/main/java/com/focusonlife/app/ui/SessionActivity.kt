package com.focusonlife.app.ui

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.focusonlife.app.R
import com.focusonlife.app.device.BlockingPolicy
import com.focusonlife.app.device.DeviceOwnerManager
import com.focusonlife.app.session.FocusForegroundService
import com.focusonlife.app.session.FocusSession
import com.focusonlife.app.session.SessionRepository
import java.util.UUID

/**
 * Focus session screen (v1: fixed 60-minute strict session).
 * A strict session cannot be cancelled normally; an emergency
 * override is recorded with a reason and remains visible in the
 * session record. NOT TESTED on a physical Galaxy A24.
 */
class SessionActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_session)

        val owner = DeviceOwnerManager(this)
        val repo = SessionRepository(this)
        findViewById<TextView>(R.id.sessionInfo).text =
            "Strict session: 60 minutes (v1 default).\n" +
            "Blocks: ${BlockingPolicy.defaultBlockedPackages.joinToString()}\n" +
            "Domains: ${BlockingPolicy.defaultBlockedDomains.joinToString()}\n" +
            "Device Owner: ${if (owner.isDeviceOwner) "YES" else "NO — suspension will not work"}"

        findViewById<Button>(R.id.btnStartSession).setOnClickListener {
            val now = System.currentTimeMillis()
            val packages = BlockingPolicy.defaultBlockedPackages
                .joinToString(prefix = "[", postfix = "]") { "\"$it\"" }
            val domains = BlockingPolicy.defaultBlockedDomains
                .joinToString(prefix = "[", postfix = "]") { "\"$it\"" }
            repo.startSession(
                FocusSession(
                    deviceId = UUID.randomUUID().toString(),
                    startEpochMillis = now,
                    endEpochMillis = now + 60 * 60 * 1000,
                    blockedPackagesJson = packages,
                    blockedDomainsJson = domains,
                    strict = true,
                    status = "ACTIVE"
                )
            )
            startForegroundService(Intent(this, FocusForegroundService::class.java))
            Toast.makeText(this, "Focus session started (60 min)", Toast.LENGTH_SHORT).show()
        }
    }
}
