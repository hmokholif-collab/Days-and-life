package com.focusonlife.app.device

import android.app.admin.DeviceAdminReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * Device Admin receiver. Device Owner provisioning is a separate,
 * legitimate Android Enterprise flow (QR provisioning on a factory-reset
 * device). This receiver alone does NOT make the app a Device Owner.
 * See docs/ENROLLMENT_GUIDE.md.
 */
class FocusDeviceAdminReceiver : DeviceAdminReceiver() {
    override fun onEnabled(context: Context, intent: Intent) {
        Log.i(TAG, "Device admin enabled (not necessarily Device Owner)")
    }

    override fun onDisableRequested(context: Context, intent: Intent): CharSequence {
        return "Disabling FOCUS ON LIFE admin will stop focus protection. " +
            "An active focus session may still be enforced by Device Owner policy."
    }

    override fun onDisabled(context: Context, intent: Intent) {
        Log.w(TAG, "Device admin disabled — protection status must be re-checked")
    }

    companion object {
        private const val TAG = "FocusDeviceAdmin"
    }
}
