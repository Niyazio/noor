# Prayer alerts — platform behaviour and test matrix

## What is implemented

| Area | Android | iOS |
|---|---|---|
| Trigger | Local DATE trigger; `setExactAndAllowWhileIdle` (`bestEffort`) or `setAlarmClock` (`alarmClock`, opt-in) | Local calendar/date trigger |
| Exact timing | Requires user-granted “Alarms & reminders” (`SCHEDULE_EXACT_ALARM`), requested from Prayer alerts settings | Delivered at the scheduled minute by the OS |
| Sound | Channel `prayer-sound-v1` (default sound). Channels are immutable → versioned ids | `default` sound; custom clips must be ≤30 s, .caf/.wav/.aiff |
| Vibrate / silent | Separate channels | Silent = no sound; vibration follows system settings |
| Reminder before | Optional per prayer (5–30 min), low-priority channel | Same |
| Quiet hours | Sound alerts become silent; never dropped | Same |
| Focus / DND | — | `timeSensitive` interruption level (entitlement in `app.config.ts`) |
| Pending window | 7 days, max 56 alerts | Same (iOS keeps max 64 pending per app) |
| Re-sync | launch, foreground, settings/location/language change, background task (≥12 h) | Same; background task timing is at iOS’s discretion |
| Reboot | expo-notifications re-registers scheduled alarms on `BOOT_COMPLETED` | OS persists pending notifications |
| Duplicates | Deterministic ids + diff; concurrent syncs share one run | Same |

## Honest limitations (shown to users)

- A full-length Adhan cannot be guaranteed when the app is closed or the phone is locked. iOS caps notification
  sounds at 30 s; Android OEM battery managers may delay or kill background work.
- If the user never grants exact alarms, Android may deliver an alert a few minutes late.
- If the app is not opened for more than ~7 days and the OS never runs the background task, alerts stop until
  the next launch.

## Manual device test matrix (not yet executed — no devices in the build environment)

For each of: Android 14+ (Pixel), Android 12–13 (Samsung, Xiaomi), iOS 18+ (iPhone):
1. Grant notifications; set a prayer adjustment so an alert fires in 2 minutes → fires with chosen mode.
2. Same with app in background, app swiped away, screen locked.
3. Reboot the device before the alert → still fires.
4. Change method/Asr/location → old alerts replaced (check count in Prayer alerts screen), no duplicates.
5. Change device time zone → times re-planned on next foreground.
6. Deny permission → app shows guidance, no crash; re-enable in system settings → alerts return.
7. Android: revoke exact alarms → status shown; enable alarm-clock delivery → status-bar alarm icon appears.
8. Quiet hours spanning Fajr → Fajr alert is silent, not missing.
9. Tap a notification → app opens on the Prayer tab.
