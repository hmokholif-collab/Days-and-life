package com.focusonlife.app.session

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.focusonlife.app.device.DeviceOwnerManager
import com.focusonlife.app.vpn.FilterVpnService

/**
 * WorkManager recovery after reboot / app update / network change.
 * Re-applies the active session's locally stored policy. No polling
 * loop — event-driven via WorkManager + BOOT_COMPLETED only.
 * NOT TESTED on a physical Galaxy A24.
 */
class RecoveryWorker(ctx: Context, params: WorkerParameters) : CoroutineWorker(ctx, params) {
    override suspend fun doWork(): Result {
        val repo = SessionRepository(applicationContext)
        val session = repo.activeSession() ?: return Result.success()
        val owner = DeviceOwnerManager(applicationContext)
        val packages = session.blockedPackagesJson.trim('[', ']').split(",")
            .map { it.trim().trim('"') }.filter { it.isNotBlank() }
        owner.suspendPackages(packages)
        FilterVpnService.start(applicationContext)
        return Result.success()
    }
}
