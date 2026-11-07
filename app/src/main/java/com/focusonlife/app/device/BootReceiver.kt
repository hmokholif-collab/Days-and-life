package com.focusonlife.app.device

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.focusonlife.app.session.SessionRepository

/**
 * Reboot recovery: re-enforce an active session's locally stored policy
 * after BOOT_COMPLETED, without requiring cloud access.
 * A cloud outage must not disable a locally stored active policy.
 * NOT TESTED on a physical Galaxy A24.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED &&
            intent.action != Intent.ACTION_MY_PACKAGE_REPLACED
        ) return
        val repo = SessionRepository(context)
        if (repo.hasActiveSession()) {
            // Re-apply suspension + restart VPN via WorkManager (see
            // session/RecoveryWorker.kt). Do not start a foreground
            // service directly from this receiver on Android 16.
            RecoveryScheduler.enqueue(context)
        }
    }
}
