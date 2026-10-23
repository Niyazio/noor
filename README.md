# Noor — The Islamic Companion

Offline-first Islamic app for Android and iOS (Expo SDK 58 / React Native 0.88 / TypeScript).
Quran reader with verified Tanzil text, on-device prayer times and alerts, Qibla, Hijri calendar and tasbeeh.
Name, identifiers and colours are configurable in `src/config/brand.json`.

## Quick start

```bash
npm install
npm run content:build      # rebuild assets/content/content.db from pinned verbatim sources (already committed)
npm test                   # Jest: content integrity, prayer, hijri, qibla, notifications, user data
npm run typecheck && npm run lint
npx eas-cli@latest build --profile development --platform android   # dev client (native modules required)
npx expo start --dev-client
```

Expo Go is not sufficient: background tasks, notification channels and exact alarms need a development build.

## What works today

- **Quran** — 114 surahs, juz navigation, reader with translations (en/ur/hi), deep links to any ayah,
  bookmarks (named collections), private notes, copy/share with reference and source, automatic last-read,
  reading history, daily goal, khatm %, search by surah/reference/Arabic (diacritic-insensitive)/translation.
- **Prayer** — 12 calculation methods, Hanafi/standard Asr, high-latitude rules, per-prayer minute offsets,
  12/24 h, GPS or 7,281-city offline picker, today + week, prayer tracker, shareable timetable.
- **Alerts** — per-prayer sound/vibrate/silent/off, reminders before, quiet hours, test notification,
  Android exact-alarm and alarm-clock options, de-duplicated rolling schedule. See `docs/NOTIFICATIONS.md`.
- **Dhikr** — tasbeeh with targets, rounds, haptics, undo, confirmed reset, focus mode, custom dhikr, statistics.
- **Qibla** — true-north bearing and distance, live compass with accuracy, honest fallback when unavailable.
- **Calendar** — Umm al-Qura Hijri month view, events, manual moon-sighting adjustment, clear disclaimer.
- **Design** — light, navy dark, AMOLED; emerald or neutral accent; Amiri Quran / Scheherazade fonts.

## Not yet built

Audio recitation, Dua/Adhkar library, Hadith, Moulid, Ramadan mode, learning centre, accounts/sync,
widgets, mosque finder. These depend on licensed content or later phases — see `docs/ARCHITECTURE.md` §9.

## Documentation

- `docs/ARCHITECTURE.md` — architecture, schema, Supabase design, credentials, phase status
- `docs/CONTENT_SOURCES.md` — provenance and licences of every bundled dataset
- `docs/NOTIFICATIONS.md` — Android/iOS behaviour, limitations, device test matrix
- `docs/QA.md` — what was tested and how
- `docs/CONTENT_REVIEW.md`, `docs/LOCALIZATION.md` — items needing human review
