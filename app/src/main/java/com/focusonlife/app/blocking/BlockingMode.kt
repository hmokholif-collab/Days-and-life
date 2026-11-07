package com.focusonlife.app.blocking

/**
 * Blocking mode — decided by the user on 2026-11-05:
 * Personal Galaxy A24, NO factory reset.
 *
 * NO_RESET (default now): no Device Owner, no setPackagesSuspended().
 * Blocking is done with:
 *  - AccessibilityService: detect a blocked app in the foreground and
 *    show a blocking overlay / return to Home.
 *  - UsageStatsManager: confirm which app is in the foreground.
 *  - Local VPN: DNS filtering for blocked domains.
 * This is weaker than Device Owner: a determined user can disable
 * Accessibility / VPN in Settings, and uninstall cannot be prevented.
 * The app must say so in the UI — never claim Device Owner strength
 * in NO_RESET mode.
 *
 * DEVICE_OWNER (optional, only after a factory reset + QR provisioning):
 * setPackagesSuspended() + uninstall blocking. Not used by default.
 */
enum class BlockingMode { NO_RESET, DEVICE_OWNER }
