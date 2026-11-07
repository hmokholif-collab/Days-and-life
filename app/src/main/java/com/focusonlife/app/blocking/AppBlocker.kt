package com.focusonlife.app.blocking

import android.content.Context
import com.focusonlife.app.device.BlockingPolicy
import com.focusonlife.app.device.DeviceOwnerManager

/**
 * Chooses the enforcement path at runtime.
 * - If the app IS Device Owner, use suspension (strongest).
 * - Otherwise (the user's case: no factory reset) use the
 *   Accessibility + VPN path. The Accessibility service does the
 *   actual foreground-app interception; this class is the policy
 *   decision point so the rest of the app does not need to know
 *   which mode is active.
 */
class AppBlocker(private val context: Context) {
    private val owner = DeviceOwnerManager(context)

    val mode: BlockingMode
        get() = if (owner.isDeviceOwner) BlockingMode.DEVICE_OWNER else BlockingMode.NO_RESET

    val canSuspendApps: Boolean get() = owner.isDeviceOwner
    val canPreventUninstall: Boolean get() = owner.isDeviceOwner

    fun isBlocked(packageName: String, activeSession: Boolean): Boolean {
        if (!activeSession) return false
        return BlockingPolicy.defaultBlockedPackages.contains(packageName)
    }

    /** Device Owner path only. Returns false in NO_RESET mode. */
    fun suspendForSession(packages: List<String>): Boolean {
        if (mode != BlockingMode.DEVICE_OWNER) return false
        return owner.suspendPackages(packages)
    }

    fun unsuspend(packages: List<String>): Boolean {
        if (mode != BlockingMode.DEVICE_OWNER) return false
        return owner.unsuspendPackages(packages)
    }
}
