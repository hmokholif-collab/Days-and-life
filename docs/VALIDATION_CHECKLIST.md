# Physical Device Validation Checklist

**Device:** Samsung Galaxy A24 (user has one — exact model to be confirmed at runtime)
**Android:** 16 (API 36)
**Mode:** NO_RESET (no factory reset, no Device Owner)
**Status of every item below: Not Tested**

No feature may be reported as functional until it passes on the actual device. Use exactly one status per test: **Passed / Failed / Not supported / Not tested.**

| # | Test | Status | Notes / result |
|---|------|--------|----------------|
| 1 | Device Owner provisioning (QR, factory-reset device) | Not tested | **Not applicable in NO_RESET mode** — user declined factory reset. Mark "Not supported" in this mode, not Passed. |
| 2 | Facebook app blocking via Accessibility overlay | Not tested | Local-only |
| 3 | Facebook website filtering (DNS) | Not tested | Local-only |
| 4 | Instagram / TikTok app blocking via Accessibility | Not tested | |
| 5 | Scheduled focus sessions | Not tested | |
| 6 | Strict session protection (no normal cancellation) | Not tested | Note: owner can still disable Accessibility/VPN in Settings in NO_RESET mode |
| 7 | Device reboot — restrictions restored | Not tested | |
| 8 | Samsung battery-saving mode behaviour | Not tested | |
| 9 | Wi-Fi and mobile data switching | Not tested | |
| 10 | VPN recovery after network change | Not tested | |
| 11 | Offline scheduling (no cloud) | Not tested | |
| 12 | Cloud synchronization (Supabase) | Not tested | Requires Supabase URL + anon key configured |
| 13 | Emergency recovery / override recording | Not tested | |
| 14 | Application uninstall restrictions | Not tested | **Not supported in NO_RESET mode** — uninstall cannot be prevented without Device Owner |

## Also check on-device

- [ ] Exact model reported by the app
- [ ] One UI version reported by the app (not assumed 8.x)
- [ ] Accessibility service enabled and stays enabled
- [ ] VPN prompt approved, VPN active in system settings
- [ ] GitHub Actions debug APK installs and launches
- [ ] Supabase tables created, dashboard on Vercel loads sessions
- [ ] Facebook entries do NOT appear in Supabase (local-only check)
- [ ] Battery consumption over a 24h focus day
