package com.focusonlife.app.device

/**
 * Default block targets and the permanent safety allowlist.
 * Emergency calling, telephony and essential system components must
 * NEVER be suspended. The management app itself must never be suspended.
 */
object BlockingPolicy {
    val defaultBlockedPackages: List<String> = listOf(
        "com.facebook.katana",      // Facebook
        "com.facebook.lite",        // Facebook Lite
        "com.instagram.android",    // Instagram
        "com.zhiliaoapp.musically", // TikTok
        "com.ss.android.ugc.trill"  // TikTok (alternate)
    )

    val defaultBlockedDomains: List<String> = listOf(
        "facebook.com", "www.facebook.com", "m.facebook.com",
        "fb.com", "fbcdn.net", "instagram.com", "www.instagram.com",
        "tiktok.com", "www.tiktok.com"
    )

    /**
     * FACEBOOK IS LOCAL-ONLY (user decision, 2026-11-05).
     * Facebook app + facebook.com / fbcdn.net are enforced on-device
     * only and are NEVER uploaded to Supabase / cloud sync.
     * See sync/SupabaseSync.kt — facebook entries are stripped
     * before any cloud upload.
     */
    val localOnlyPackages: Set<String> = setOf(
        "com.facebook.katana", "com.facebook.lite"
    )
    val localOnlyDomains: Set<String> = setOf(
        "facebook.com", "www.facebook.com", "m.facebook.com",
        "fb.com", "fbcdn.net"
    )

    /** Packages that must never be suspended, under any session. */
    private val safetyAllowlist: Set<String> = setOf(
        "com.focusonlife.app",              // this management app
        "com.android.phone",                // telephony
        "com.android.dialer",
        "com.samsung.android.dialer",
        "com.android.emergency",
        "com.android.server.telecom",
        "com.android.systemui",
        "com.android.settings",
        "android"
    )

    fun isSafetyAllowlisted(packageName: String): Boolean =
        safetyAllowlist.contains(packageName) ||
            packageName.startsWith("com.android.") && packageName.contains("emergency")
}
