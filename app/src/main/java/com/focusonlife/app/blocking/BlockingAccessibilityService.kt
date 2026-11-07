package com.focusonlife.app.blocking

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Intent
import android.view.accessibility.AccessibilityEvent
import com.focusonlife.app.device.BlockingPolicy
import com.focusonlife.app.session.SessionRepository

/**
 * NO_RESET blocking: AccessibilityService.
 *
 * When a focus session is active and a blocked app comes to the
 * foreground, this service shows the blocking overlay (via
 * BlockingOverlayActivity) and sends the user back to Home.
 *
 * LIMITS — the UI must state these:
 * - The user can turn this service off in Settings > Accessibility.
 * - It cannot prevent uninstall.
 * - It cannot suspend an app the way Device Owner can; it can only
 *   intercept and redirect. A fast user may glimpse the app briefly.
 * - It must never intercept emergency / telephony / system apps
 *   (see BlockingPolicy safety allowlist).
 *
 * The service is enabled by the user in system Settings. The app
 * only opens that Settings page — it cannot enable itself.
 * NOT TESTED on a physical Galaxy A24.
 */
class BlockingAccessibilityService : AccessibilityService() {

    override fun onServiceConnected() {
        val info = AccessibilityServiceInfo().apply {
            eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
            feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
            notificationTimeout = 100
        }
        serviceInfo = info
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event?.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
        val pkg = event.packageName?.toString() ?: return
        if (BlockingPolicy.isSafetyAllowlisted(pkg)) return
        if (!BlockingPolicy.defaultBlockedPackages.contains(pkg)) return
        if (!SessionRepository(this).hasActiveSession()) return

        // Blocked app in foreground during an active session.
        val intent = Intent(this, BlockingOverlayActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            putExtra("blocked_package", pkg)
        }
        startActivity(intent)
        // Return to Home so the blocked app is not left visible.
        val home = Intent(Intent.ACTION_MAIN).apply {
            addCategory(Intent.CATEGORY_HOME)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        startActivity(home)
    }

    override fun onInterrupt() {}
}
