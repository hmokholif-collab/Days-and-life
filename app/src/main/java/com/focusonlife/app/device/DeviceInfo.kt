package com.focusonlife.app.device

import android.os.Build

/**
 * Runtime device detection. NEVER hardcode a model variant.
 * The spec lists SM-A245F / SM-A245M / SM-A245N as candidates to
 * investigate — the exact model is read from Build at runtime.
 * NOT TESTED on a physical Galaxy A24.
 */
data class DeviceInfo(
    val manufacturer: String,
    val model: String,
    val device: String,
    val androidRelease: String,
    val apiLevel: Int,
    val oneUiVersion: String,
    val chipset: String,
    val isGalaxyA24Family: Boolean
) {
    companion object {
        fun detect(): DeviceInfo {
            val model = Build.MODEL ?: "UNKNOWN"
            val manufacturer = Build.MANUFACTURER ?: "UNKNOWN"
            // One UI version is not exposed as a stable public API.
            // Read the Samsung system property when present; fall back to
            // "UNKNOWN" instead of guessing 8.x.
            val oneUi = readSystemProperty("ro.build.version.oneui")
                ?: readSystemProperty("ro.build.version.sep")
                ?: "UNKNOWN"
            val chipset = readSystemProperty("ro.board.platform")
                ?: readSystemProperty("ro.hardware.chipname")
                ?: "UNKNOWN"
            val isA24 = model.uppercase().contains("SM-A245") ||
                model.uppercase().contains("A24")
            return DeviceInfo(
                manufacturer = manufacturer,
                model = model,
                device = Build.DEVICE ?: "UNKNOWN",
                androidRelease = Build.VERSION.RELEASE ?: "UNKNOWN",
                apiLevel = Build.VERSION.SDK_INT,
                oneUiVersion = oneUi,
                chipset = chipset,
                isGalaxyA24Family = isA24
            )
        }

        private fun readSystemProperty(key: String): String? = try {
            val c = Class.forName("android.os.SystemProperties")
            val m = c.getMethod("get", String::class.java)
            (m.invoke(null, key) as? String)?.takeIf { it.isNotBlank() }
        } catch (_: Exception) {
            null
        }
    }
}
