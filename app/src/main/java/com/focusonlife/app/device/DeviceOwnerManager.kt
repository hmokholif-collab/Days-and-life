package com.focusonlife.app.device

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build

/**
 * Device Owner checks and policy enforcement.
 * setPackagesSuspended() is a Device Owner API on Android 16.
 * A normally installed app cannot suspend other apps — do not claim
 * otherwise. All calls are no-ops (returning false) when not Device Owner.
 * NOT TESTED on a physical Galaxy A24.
 */
class DeviceOwnerManager(private val context: Context) {
    private val dpm: DevicePolicyManager =
        context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
    private val admin = ComponentName(context, FocusDeviceAdminReceiver::class.java)

    val isDeviceOwner: Boolean get() = dpm.isDeviceOwnerApp(context.packageName)
    val isAdminActive: Boolean get() = dpm.isAdminActive(admin)

    /** Suspend [packages] only while a focus session is active. */
    fun suspendPackages(packages: List<String>): Boolean {
        if (!isDeviceOwner) return false
        val safe = packages.filterNot { BlockingPolicy.isSafetyAllowlisted(it) }
        return try {
            dpm.setPackagesSuspended(admin, safe.toTypedArray(), true)
        } catch (_: Exception) {
            false
        }
    }

    fun unsuspendPackages(packages: List<String>): Boolean {
        if (!isDeviceOwner) return false
        return try {
            dpm.setPackagesSuspended(admin, packages.toTypedArray(), false)
        } catch (_: Exception) {
            false
        }
    }

    fun isPackageSuspended(packageName: String): Boolean {
        if (!isDeviceOwner) return false
        return try {
            dpm.isPackageSuspended(admin, packageName)
        } catch (_: Exception) {
            false
        }
    }

    /** Prevent uninstall of this app where the platform supports it (Device Owner). */
    fun setUninstallBlocked(blocked: Boolean) {
        if (!isDeviceOwner) return
        try {
            dpm.setUninstallBlocked(admin, context.packageName, blocked)
        } catch (_: Exception) {
            // Not supported on this build — record as "Not supported", never fake success.
        }
    }

    fun installedPackages(): List<String> = try {
        if (Build.VERSION.SDK_INT >= 33) {
            context.packageManager.getInstalledApplications(
                PackageManager.ApplicationInfoFlags.of(0)
            ).map { it.packageName }
        } else {
            @Suppress("DEPRECATION")
            context.packageManager.getInstalledApplications(0).map { it.packageName }
        }
    } catch (_: Exception) {
        emptyList()
    }
}
