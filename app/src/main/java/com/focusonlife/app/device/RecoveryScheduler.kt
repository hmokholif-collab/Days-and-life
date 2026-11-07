package com.focusonlife.app.device

import android.content.Context
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import com.focusonlife.app.session.RecoveryWorker

object RecoveryScheduler {
    fun enqueue(context: Context) {
        val work = OneTimeWorkRequestBuilder<RecoveryWorker>().build()
        WorkManager.getInstance(context).enqueueUniqueWork(
            "focus-recovery",
            ExistingWorkPolicy.REPLACE,
            work
        )
    }
}
