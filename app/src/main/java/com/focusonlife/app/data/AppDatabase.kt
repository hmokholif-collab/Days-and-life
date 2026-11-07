package com.focusonlife.app.data

import android.content.Context
import androidx.room.Dao
import androidx.room.Database
import androidx.room.Insert
import androidx.room.Query
import androidx.room.Room
import androidx.room.RoomDatabase
import com.focusonlife.app.session.FocusSession

@Dao
interface SessionDao {
    @Query("SELECT * FROM focus_sessions WHERE status = 'ACTIVE' AND endEpochMillis > :now")
    suspend fun activeSessions(now: Long): List<FocusSession>

    @Insert
    suspend fun insert(session: FocusSession): Long

    @Query("UPDATE focus_sessions SET status = 'EMERGENCY_OVERRIDE', emergencyOverrideReason = :reason, emergencyOverrideAtMillis = :at WHERE id = :id")
    suspend fun markEmergencyOverride(id: Long, reason: String, at: Long)
}

@Database(entities = [FocusSession::class], version = 1, exportSchema = false)
abstract class AppDatabase : RoomDatabase() {
    abstract fun sessionDao(): SessionDao

    companion object {
        @Volatile private var instance: AppDatabase? = null
        fun get(context: Context): AppDatabase =
            instance ?: synchronized(this) {
                instance ?: Room.databaseBuilder(
                    context, AppDatabase::class.java, "focus-on-life.db"
                ).build().also { instance = it }
            }
    }
}
