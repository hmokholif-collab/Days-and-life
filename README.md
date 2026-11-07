# FOCUS ON LIFE

**App ID:** `com.focusonlife.app`
**Primary target:** Samsung Galaxy A24, Android 16 (API 36), One UI — detected at runtime, never hardcoded.
**Version:** 1.1.0 — source scaffold, **NOT compiled and NOT tested on a physical device.**
**Mode (user decision, 2026-11-05): NO_RESET — personal device, no factory reset.**

## What changed in v1.1.0

The user will **not** do a factory reset. That changes the design honestly:

- **Device Owner is now optional, not the default.** Without it, `setPackagesSuspended()` does not work and uninstall cannot be prevented.
- **NO_RESET blocking (default):** AccessibilityService detects a blocked app in the foreground and shows a blocking overlay + returns to Home, plus the local VPN does DNS filtering for blocked domains. This is weaker than Device Owner — the user can turn Accessibility / VPN off in Settings — and the app says so in the UI.
- **Facebook is local-only.** Facebook app + facebook.com / fbcdn.net are enforced on-device only and are **never** uploaded to Supabase. See `device/BlockingPolicy.kt` and `sync/SupabaseSync.kt`.
- **GitHub + Supabase + Vercel are now wired in:** GitHub Actions builds a debug APK, Supabase stores devices / policies / sessions / overrides, and `web/` is a static Vercel dashboard.

## What this is NOT

- Not an APK. No APK is included. Build it with GitHub Actions (see below) or Android Studio.
- Not tested. Every feature in `docs/VALIDATION_CHECKLIST.md` is **Not Tested** until it passes on a real Galaxy A24 running Android 16.
- Not Device Owner strength in NO_RESET mode. Do not claim it is.

## GitHub → APK (no Android Studio needed)

1. Create a GitHub repo, push this folder.
2. Push to `main` (or run the workflow manually).
3. Actions → Android APK → Artifacts → download `focus-on-life-debug-apk`.
4. Install the debug APK on your A24 (your own device only).

## Supabase

1. Create a project, run `supabase/migrations/001_init.sql` in the SQL Editor.
2. Copy Project URL + anon key.
3. Android app: Settings → Supabase → paste them (stored on-device only).
4. See `supabase/README.md`. Tighten RLS with Supabase Auth before sharing the dashboard publicly.

## Vercel dashboard

1. Vercel → import the GitHub repo → **Root Directory: `web`** → Deploy.
2. Open the site, paste Supabase URL + anon key in the page (browser localStorage only).
3. See `web/README.md`. The dashboard is read-only and never shows Facebook.

## Build locally (optional)

Android Studio (Ladybug+) + JDK 17 + Android SDK 36 → open this folder → Gradle sync → build.

## Structure

```
app/src/main/java/com/focusonlife/app/
  device/   DeviceInfo, DeviceOwnerManager (optional), BlockingPolicy, BootReceiver
  blocking/ BlockingMode, AppBlocker, BlockingAccessibilityService, BlockingOverlayActivity
  vpn/      FilterVpnService, DnsFilter (DNS-level only)
  session/  FocusSession, SessionRepository, FocusForegroundService, RecoveryWorker
  data/     AppDatabase (Room, offline-first)
  sync/     SupabaseSync (REST, no hardcoded keys), SyncRepository (legacy stub)
  ui/       MainActivity, SamsungCompatibilityActivity, EnrollmentActivity, SessionActivity
supabase/migrations/001_init.sql   devices, policies, focus_sessions, emergency_overrides
web/        Static Vercel dashboard (index.html, app.js, styles.css, vercel.json)
.github/workflows/android.yml      Debug APK build on push to main
docs/       ENROLLMENT_GUIDE.md, VALIDATION_CHECKLIST.md
```

## Honest limits (do not remove these)

- **DNS filtering only.** No full URL-level filtering, no inspection of encrypted traffic. Encrypted DNS (DoH/DoT) and custom DNS can bypass it.
- **DnsFilter is a v1 reference implementation.** Best-effort parsing; validate against real traffic on the A24 before any blocking claim.
- **NO_RESET is bypassable by the device owner** (turn off Accessibility / VPN, uninstall the app). That is the trade-off for no factory reset. Strict, unbypassable enforcement requires Device Owner after a factory reset — which the user declined.
- **Cloud sync is opt-in.** With no Supabase URL/key configured, everything stays local. A cloud outage never disables a locally stored active policy.
- **Samsung / Knox.** Knox compatibility is not a Knox Manage licence.

## Docs

- `docs/ENROLLMENT_GUIDE.md` — read before enabling anything (no-reset version).
- `docs/VALIDATION_CHECKLIST.md` — the 14 physical-device tests, all Not Tested.
