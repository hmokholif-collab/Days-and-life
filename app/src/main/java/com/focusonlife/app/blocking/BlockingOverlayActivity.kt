package com.focusonlife.app.blocking

import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.focusonlife.app.R

/**
 * Simple blocking screen shown when a blocked app is opened
 * during a focus session. No countdown bypass, no "just this once"
 * button in strict mode — the session ends on its own schedule,
 * or via a recorded emergency override (see SessionActivity).
 */
class BlockingOverlayActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_blocking_overlay)
        val pkg = intent.getStringExtra("blocked_package") ?: "this app"
        findViewById<TextView>(R.id.blockingText).text =
            "FOCUS ON LIFE\n\n$pkg is blocked during your focus session.\n" +
            "The session ends on schedule. An emergency override is recorded."
        findViewById<Button>(R.id.btnBackHome).setOnClickListener { finish() }
    }
}
