package com.focusonlife.app.ui

import android.os.Bundle
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.focusonlife.app.R

/**
 * Enrollment screen — text only. The actual provisioning flow is the
 * legitimate Android Enterprise QR flow on a factory-reset device.
 * This screen must be read BEFORE enrollment. See docs/ENROLLMENT_GUIDE.md.
 * Do not claim enrollment succeeded until the system confirms it.
 */
class EnrollmentActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_enrollment)
        findViewById<TextView>(R.id.enrollmentInfo).text =
            "BEFORE YOU ENROLL — READ THIS\n\n" +
            "1. Device Owner provisioning usually REQUIRES a factory reset.\n" +
            "   Back up your data first. A reset erases the device.\n\n" +
            "2. Full device management means FOCUS ON LIFE can suspend\n" +
            "   selected apps, block selected domains, and prevent its own\n" +
            "   uninstall while it is Device Owner.\n\n" +
            "3. Emergency calling, telephony and essential system apps are\n" +
            "   never suspended. Factory reset and legitimate administrator\n" +
            "   recovery always remain possible.\n\n" +
            "4. Samsung Knox compatibility is NOT the same as a Knox Manage\n" +
            "   licence or an automatically available enterprise service.\n\n" +
            "5. After provisioning, this screen must show Device Owner: YES\n" +
            "   before any blocking is claimed to work.\n\n" +
            "Full guide: docs/ENROLLMENT_GUIDE.md"
    }
}
