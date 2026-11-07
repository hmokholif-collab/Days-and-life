# Enrollment Guide — FOCUS ON LIFE (NO_RESET mode)

**User decision, 2026-11-05: personal Galaxy A24, NO factory reset.**
**This guide is the no-reset version. There is no Device Owner enrolment here.**

## 1. What NO_RESET means

Without a factory reset there is **no Device Owner**. That means:

- ❌ App suspension via `setPackagesSuspended()` — **not available**
- ❌ Preventing uninstall — **not available**
- ✅ Accessibility blocking — available, user-enabled
- ✅ Local VPN DNS filtering — available, user-approved
- ✅ Focus sessions, offline schedules, reboot recovery — available

Do not claim Device Owner strength in this mode.

## 2. Setup (on your A24, in order)

1. Install the debug APK from GitHub Actions.
2. Open FOCUS ON LIFE → grant **Notifications**.
3. Settings → Accessibility → FOCUS ON LIFE → **turn on**. The app cannot enable itself.
4. Settings → Apps → Special access → Usage access → FOCUS ON LIFE → **allow**.
5. Start a focus session → approve the **VPN** prompt.
6. Optional: Settings → Battery → FOCUS ON LIFE → allow background activity / remove battery optimisation, so Samsung does not kill the foreground service.
7. Optional Supabase: Settings → Supabase → paste URL + anon key (see `supabase/README.md`).

## 3. Consent

By enabling Accessibility + VPN, you agree that the app can detect when a blocked app opens during a focus session and show a blocking screen, and that DNS queries go through its local filter. It does not read screen content (`canRetrieveWindowContent=false`).

Emergency calling, telephony and essential system apps are never blocked. You can turn Accessibility / VPN off at any time in Settings, and you can uninstall the app — that is the honest trade-off for no factory reset.

## 4. Verify before claiming anything works

Main screen must show the mode, and the Compatibility screen must show Accessibility + VPN status. Then test: open Facebook during a session — you should see the blocking overlay. Record the result in `docs/VALIDATION_CHECKLIST.md`.

## 5. If you ever change your mind

Device Owner (strongest blocking) is still in the code as an optional mode, but it requires a factory reset + QR provisioning. That path is documented in the git history / v1.0.0 README, not in this guide, because you declined it.
