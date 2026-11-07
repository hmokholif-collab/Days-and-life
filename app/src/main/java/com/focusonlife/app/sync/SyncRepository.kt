package com.focusonlife.app.sync

/**
 * Legacy stub — superseded by SupabaseSync in v1.1.0.
 * Kept only so older callers still compile. New code must use
 * SupabaseSync, which reads URL + anon key from device storage.
 */
object SyncRepository {
    val isConfigured: Boolean = false
    fun syncNow(): Boolean = false // use SupabaseSync instead
}
