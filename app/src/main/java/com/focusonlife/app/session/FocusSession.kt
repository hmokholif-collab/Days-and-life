package com.focusonlife.app.session

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "focus_sessions")
data class FocusSession(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val deviceId: String,
    val startEpochMillis: Long,
    val endEpochMillis: Long,
    val blockedPackagesJson: String,
    val blockedDomainsJson: String,
    val strict: Boolean,
    val status: String, // ACTIVE | COMPLETED | EMERGENCY_OVERRIDE | CANCELLED_BY_ADMIN
    val emergencyOverrideReason: String? = null,
    val emergencyOverrideAtMillis: Long? = null
)
