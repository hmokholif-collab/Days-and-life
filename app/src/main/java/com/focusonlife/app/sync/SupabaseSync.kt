package com.focusonlife.app.sync

import android.content.Context
import com.focusonlife.app.device.BlockingPolicy
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/**
 * Supabase sync — REST (PostgREST) via HttpURLConnection, no extra SDK.
 *
 * Configuration is NEVER hardcoded: the user enters Supabase URL +
 * anon key in the app (stored in private SharedPreferences) or leaves
 * sync off. If either is blank, sync is off and everything stays local.
 *
 * FACEBOOK IS LOCAL-ONLY: facebook packages/domains are stripped
 * before any upload (see BlockingPolicy.localOnly*). The cloud never
 * receives them.
 *
 * Tables (see supabase/migrations/001_init.sql):
 *   devices, policies, focus_sessions, emergency_overrides
 *
 * A cloud outage must not disable a locally stored active policy —
 * sync failures are logged and ignored locally.
 * NOT TESTED against a live Supabase project.
 */
data class SupabaseConfig(val url: String, val anonKey: String) {
    val isConfigured: Boolean get() = url.isNotBlank() && anonKey.isNotBlank()
}

class SupabaseSync(private val context: Context) {
    private val prefs = context.getSharedPreferences("supabase", Context.MODE_PRIVATE)

    fun config(): SupabaseConfig = SupabaseConfig(
        url = prefs.getString("url", "")?.trim()?.trimEnd('/') ?: "",
        anonKey = prefs.getString("anon_key", "") ?: ""
    )

    fun saveConfig(url: String, anonKey: String) {
        prefs.edit().putString("url", url.trim()).putString("anon_key", anonKey.trim()).apply()
    }

    fun stripLocalOnlyPackages(packages: List<String>): List<String> =
        packages.filterNot { BlockingPolicy.localOnlyPackages.contains(it) }

    fun stripLocalOnlyDomains(domains: List<String>): List<String> =
        domains.filterNot { BlockingPolicy.localOnlyDomains.contains(it) }

    /** Upload a completed/active session row. Returns true on HTTP 2xx. */
    fun uploadSession(deviceId: String, startMillis: Long, endMillis: Long, status: String): Boolean {
        val cfg = config()
        if (!cfg.isConfigured) return false
        return try {
            val body = JSONObject().apply {
                put("device_id", deviceId)
                put("start_at", startMillis)
                put("end_at", endMillis)
                put("status", status)
            }
            post(cfg, "focus_sessions", body.toString())
        } catch (_: Exception) {
            false
        }
    }

    private fun post(cfg: SupabaseConfig, table: String, json: String): Boolean {
        val conn = (URL("${cfg.url}/rest/v1/$table").openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            setRequestProperty("apikey", cfg.anonKey)
            setRequestProperty("Authorization", "Bearer ${cfg.anonKey}")
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("Prefer", "return=minimal")
            doOutput = true
            connectTimeout = 10_000
            readTimeout = 10_000
        }
        conn.outputStream.use { it.write(json.toByteArray(Charsets.UTF_8)) }
        val code = conn.responseCode
        conn.disconnect()
        return code in 200..299
    }
}
