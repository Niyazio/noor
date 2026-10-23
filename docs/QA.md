# QA record

## Automated (run on 2026-10-23)

| Check | Command | Result |
|---|---|---|
| Unit/integration tests | `npm test` | 4 suites, **58 passed** |
| Type check | `npm run typecheck` | clean |
| Lint | `npm run lint` | 0 errors, 2 warnings (idiomatic `i18n.use`/`changeLanguage`) |
| Android bundle | `expo export --platform android` | Hermes bundle built, `content.db` packaged |
| iOS bundle | `expo export --platform ios` | Hermes bundle built, `content.db` packaged |

Test coverage highlights
- Quran: 114 surahs / 6,236 ayahs; per-surah counts; contiguous stable ids; **byte-equality with the Tanzil XML
  for every ayah and basmala**; canonical checksum; copyright block; juz/page/rub/sajdah structure; translation
  alignment (3 × 6,236); reference parsing; Arabic diacritic-insensitive and translation search with filters;
  LIKE-wildcard escaping; share formatting.
- Prayer: chronological order for all 12 methods × 3 cities; Dhuhr near solar noon; Hanafi vs standard Asr;
  method angle differences; Umm al-Qura Isha = Maghrib + 90; manual offsets; New York DST transition;
  independence from device time zone; location-local “today” across midnight; next-prayer rollover after Isha;
  Tromsø midsummer never yields NaN/fabricated times; invalid coordinates/zones rejected; 12/24 h formatting.
- Hijri: every day 2024–2027 equals ICU `islamic-umalqura`; known anchors; offsets; out-of-range → null.
- Qibla: reference bearings (Washington, New York, London, Islamabad, Tokyo) to 0.01°; accuracy mapping.
- Notifications: future-only, enabled-only, sorted, unique ids, limit, per-prayer modes, reminders, quiet hours,
  diff-based rescheduling (no-op, moved, obsolete, other apps untouched).
- User data: idempotent migrations; bookmarks/notes/last-read persist across reopen; history coalescing;
  prayer log; custom dhikr validation; session totals; tasbeeh counter/undo/reset/rounds.

## Browser end-to-end (Chromium via Playwright, 390×844, light + dark)

The web build is used only as a QA harness (expo-sqlite runs via WebAssembly). Flows exercised with **zero
runtime errors** (only expected “not supported on web” warnings for notifications/file-system/compass):
onboarding (language, GPS location, city search “Kozhikode”/“Makkah”, method suggestion, skip notifications) →
Home (Hijri date, next prayer countdown, tracker, reading goal, ayah of the day) → Quran list → reader deep link
`/quran/2?ayah=255` → ayah actions → bookmark → **page reload** → Continue reading + Bookmarks + Recently read
restored → Prayer (timetable, week, method notice) → Dhikr (3 taps, ring progress) → Qibla (bearing + honest
“Compass unavailable” after a fix for a hang when no heading is ever reported) → Calendar → Sources
(**device-side SHA-256 of all 6,236 ayahs matched**).

## Not yet done

- Physical Android/iOS testing (notifications in background/terminated/reboot, compass, haptics, RTL layout,
  screen readers, font scaling, small/large devices) — see `docs/NOTIFICATIONS.md` matrix.
- Maestro/Detox E2E on devices; performance profiling; store builds.
