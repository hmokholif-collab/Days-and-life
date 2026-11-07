package com.focusonlife.app.session

import android.content.Context
import com.focusonlife.app.data.AppDatabase
import kotlinx.coroutines.runBlocking

/**
 * Local session store. Sessions are stored offline first so a cloud
 * outage never disables an active locally stored protection policy.
 */
class SessionRepository(context: Context) {
    private val dao = AppDatabase.get(context.applicationContext).sessionDao()

    fun hasActiveSession(): Boolean = runBlocking {
        dao.activeSessions(System.currentTimeMillis()).isNotEmpty()
    }

    fun activeSession(): FocusSession? = runBlocking {
        dao.activeSessions(System.currentTimeMillis()).firstOrNull()
    }

    fun startSession(session: FocusSession): Long = runBlocking {
        dao.insert(session)
    }

    fun recordEmergencyOverride(sessionId: Long, reason: String) = runBlocking {
        dao.markEmergencyOverride(sessionId, reason, System.currentTimeMillis())
    }
}
