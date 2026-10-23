# Noor — Architecture & Implementation Plan

Status date: 2026-10-23. This document answers the ten planning questions in the project brief and records what
is implemented. "Implemented" means code exists, type-checks, bundles for Android and iOS, and — where stated —
was exercised by tests or by browser QA. **Nothing has yet been run on a physical Android or iOS device.**

---

## 1. Technical architecture

```
┌──────────────────────────── React Native (Expo SDK 58, RN 0.88, Hermes) ───────────────────────────┐
│ Expo Router screens (src/app)  ── thin UI, no business logic                                       │
│        │                                                                                           │
│ Hooks / TanStack Query (src/data/queries.ts) ── caching of local SQLite reads, mutations          │
│        │                                                                                           │
│ Feature modules (src/features/*) ── pure TypeScript, unit-tested in Node                           │
│   quran · prayer · notifications · dhikr · qibla · hijri · location · userdata                    │
│        │                               │                                │                          │
│  content.db (read-only, bundled)   noor.db (user data, migrations)   kv-store (settings, zustand)  │
│  Tanzil text, translations, cities  bookmarks, notes, history, logs   preferences, counter state   │
└────────────────────────────────────────────────────────────────────────────────────────────────────┘
          ▲ build time only                                         ▲ Phase 7 (optional)
  scripts/content/build-content.ts                          Supabase: auth, sync, CMS, storage
  (pinned verbatim sources → checks → content.db)
```

Key decisions

| Concern | Choice | Why |
|---|---|---|
| App framework | Expo SDK 58 + Expo Router (typed routes) | Current stable SDK; CNG keeps `ios/` and `android/` generated from `app.config.ts`. |
| State | zustand + `persist` on `expo-sqlite/kv-store` | Tiny, synchronous reads, survives restarts, no extra native module. |
| Data fetching | TanStack Query over local SQLite | Uniform loading/error states, cache invalidation after writes. |
| Content storage | Prebuilt, versioned, read-only `content.db` | No per-ayah network/DB writes at runtime; content update never touches user data. |
| User data | Separate `noor.db` with append-only migrations | Bookmarks/history isolated from replaceable content. |
| Prayer times | `adhan` 4.4.6 (Batoul Apps, MIT) on device | Recognised library, all major methods, no network. |
| Hijri | `@tabby_ai/hijri-converter` (Umm al-Qura, 1343–1500 AH) | Tested day-by-day against ICU’s `islamic-umalqura` for 2024–2027 (0 mismatches). |
| Notifications | `expo-notifications` local DATE triggers + `expo-background-task` top-up | See §7. |
| Audio (Phase 3) | `expo-audio` (background playback enabled in config) | Evaluate lock-screen/queue needs against `react-native-track-player` before Phase 3. |
| Fonts | Amiri Quran, Scheherazade New (OFL), Inter | Correct rendering of Tanzil Uthmani marks (verified visually in QA screenshots). |
| i18n | i18next; en complete, ar/ur/hi/kn/ml/ta partial with English fallback | RTL via `I18nManager.forceRTL` (requires restart — RN limitation). |

## 2. Folder structure (as built)

```
app.config.ts              brand-driven Expo config, permissions, plugins
eas.json                   development / preview / production profiles
content-sources/           pinned VERBATIM inputs + manifest.json (sha256, licence, provenance)
scripts/content/           build-content.ts → assets/content/content.db + src/content/generated/*
assets/content/content.db  read-only content database shipped with the app (~10 MB)
src/
  app/                     Expo Router routes
    (tabs)/                index (Home), quran, prayer, dhikr, more
    quran/[surah].tsx      reader          quran/search.tsx
    settings/              appearance, language, reading, prayer, notifications, privacy
    onboarding.tsx location.tsx qibla.tsx calendar.tsx sources.tsx dhikr/{focus,custom}.tsx
  components/ui/           design system: Text/ArabicText, Card, Button, ListRow, Segmented, Stepper,
                           Notice, EmptyState, Skeleton, HeroCard, GeometricPattern, ProgressRing
  config/brand.json        app name, identifiers, colours (single place to rebrand)
  content/                 generated surah/juz metadata + content manifest (do not edit)
  data/queries.ts          TanStack Query hooks and keys
  db/                      SqlDb interface, database opening/verification, user migrations
  features/
    quran/                 repository (reading, search, sharing), Arabic/Latin normalisation
    prayer/                engine (adhan wrapper), methods, hook, list components
    notifications/         plan (pure), scheduler (native), background task, sync component
    dhikr/                 counter state machine, store, presets, repository, views
    qibla/ hijri/ location/ userdata/
  i18n/                    i18next setup, languages, locales
  store/                   settings store, kv adapter
  theme/                   light / navy dark / AMOLED themes, emerald & neutral accents
test/                      Jest suites (run against the real content.db via node:sqlite)
docs/                      this file, CONTENT_SOURCES, NOTIFICATIONS, QA, LOCALIZATION, CONTENT_REVIEW
```

## 3. Dependencies

All Expo modules were installed with `expo install` resolved against the SDK’s `bundledNativeModules.json`
(the Expo versions API is unreachable from the build sandbox, so `EXPO_OFFLINE=1` was used; the pins are the
same). Key packages: `expo@58.0.17`, `react-native@0.88.0`, `expo-router@58`, `expo-sqlite@58`,
`expo-notifications@58.1`, `expo-location`, `expo-audio`, `expo-background-task`, `expo-crypto`,
`react-native-reanimated@4.7`, `react-native-svg@15.16`, `adhan@4.4.6`, `quran-meta@7` (build-time only),
`@tabby_ai/hijri-converter@1.0.5`, `zustand@5`, `@tanstack/react-query@5`, `i18next@26`.

Compatibility notes
- `quran-meta` is ESM-only and used only by the Node build script, so it never enters the app bundle or Jest.
- `react-native` 0.88 no longer exports `ViewToken`; the reader declares the shape it needs.
- Tabs come from `expo-router/js-tabs` in this SDK.
- Native modules need a development build (`eas build --profile development`); Expo Go is not sufficient for
  background tasks, exact alarms or custom notification channels.

## 4. Content source strategy

See `docs/CONTENT_SOURCES.md` for full provenance. Summary:

| Content | Source | Status |
|---|---|---|
| Quran Arabic (Uthmani, Hafs) | Tanzil Quran Text 1.0.2, verbatim XML with copyright block; md5 verified | Bundled. Upgrade to latest Tanzil release before launch. |
| Structure (juz, hizb, rub, page, ruku, sajdah, Makki/Madani) | `quran-meta` (Tanzil-derived), cross-checked ayah-by-ayah at build | Bundled |
| Translations | Tanzil en.shakir, ur.jawadi, hi.hindi (verbatim) | Bundled; **non-commercial terms — licence review required** |
| Kannada, Malayalam, Tamil translations | Not yet sourced verbatim (sandbox could not reach tanzil.net / quranenc.com) | Pipeline ready: drop Tanzil `sura|aya|text` file + manifest entry |
| Recitation audio (Phase 3) | Must be an authorised provider (e.g. Quran.com / QuranicAudio with permission) | Not started — needs licence confirmation |
| Hadith, duas, Moulid texts (Phase 6) | Needs licensed, graded datasets / authorised editions | Not started — none bundled, nothing invented |
| Prayer times | Calculated on device (adhan) | Implemented |
| Hijri dates | Umm al-Qura table (1343–1500 AH) + user offset | Implemented |
| Cities | `city-timezones` (MIT) — name, lat/lng, IANA zone | Bundled, 7,281 cities |

Integrity controls: pinned SHA-256 of every input; build aborts on any mismatch; 114/6236 counts and per-surah
counts checked against independent metadata; the test-suite re-parses the Tanzil XML and asserts **byte
equality for every ayah** and every basmala; canonical-text SHA-256 checked at build, in tests, and on demand
on the device (Sources screen). Startup performs a fast version + count check.

## 5. Local database schema

`content.db` (read-only, replaced per content version, file name `content-<version>.db`)
- `meta(key, value)` — dataset name/version, source + text checksums, licence, copyright block
- `surahs(id, name_ar, name_translit, name_en, ayah_count, revelation, revelation_order, ruku_count, first_ayah_id, start_page, bismillah)`
- `ayahs(id 1..6236, surah, ayah, text, text_search, juz, hizb, rub, page, ruku, sajdah)`
- `translation_editions(id, language, direction, name, translator, source, source_url, license, commercial_use_cleared, text_sha256)`
- `translations(edition_id, ayah_id, text, text_search)` (folded search column only for Latin scripts)
- `cities(id, name, name_search, province, country, lat, lng, timezone, population)`

`noor.db` (user data; `PRAGMA user_version` migrations in `src/db/userMigrations.ts`)
- `bookmarks(ayah_id, surah, ayah, collection, …)` — named collections, unique per (ayah, collection)
- `notes(ayah_id PK, body, …)`, `reading_history(…)`, `ayah_reads(ayah_id, date_key)` (daily goal + khatm)
- `custom_dhikr(…)`, `dhikr_sessions(…)`, `prayer_log(date_key, prayer, status)`, `search_history(query)`

Settings and the live tasbeeh counter are persisted in the SQLite-backed kv-store.

## 6. Supabase design (Phase 7 — not implemented)

Principles: the app works fully without an account; only the anon key ships in the app; privileged work in
Edge Functions with the service role key held server-side.

Tables (all with RLS `user_id = auth.uid()` for user-owned rows):
`profiles`, `user_settings` (JSON, versioned), `bookmarks`, `notes`, `reading_progress`
(last-read with `updated_at` + device id for conflict resolution: newest wins, never deletes),
`reading_goals`, `custom_dhikr`, `prayer_log` (opt-in sync only).
Content/CMS tables (read: public; write: `role = 'editor'` via custom JWT claim, every change audited):
`content_editions`, `licences`, `reciters`, `audio_sources`, `moulid_texts`, `moulid_editions`,
`courses`, `lessons`, `calendar_events`, `announcements`, `content_releases` (publish/rollback),
`audit_log` (insert-only via trigger), `reports`.
Account deletion: Edge Function deleting the auth user (cascade) + storage objects; data export as JSON.
Sync: per-row `updated_at`/`deleted_at` tombstones, pull-then-push, last-writer-wins per row except reading
position (max `updated_at`) — never silently delete local data.

## 7. Notification strategy (implemented — see `docs/NOTIFICATIONS.md`)

- Pure planner builds the desired set for the next 7 days (capped at 56 to respect iOS’s 64 pending limit),
  deterministic ids `noor.prayer.<date>.<prayer>.<kind>`; a diff against the OS’s pending list cancels only
  obsolete/moved alerts and schedules missing ones → no duplicates.
- Re-sync on launch, foreground, and any change to location, method, alert settings, language or time format;
  `expo-background-task` (≥12 h, OS-controlled) tops up the window.
- Android: versioned channels (sound / vibrate / silent / reminder), `SCHEDULE_EXACT_ALARM` requested only from
  settings, optional `alarmClock` delivery, battery-optimisation guidance. Boot persistence relies on
  expo-notifications’ own `RECEIVE_BOOT_COMPLETED` handling — **must be verified on devices**.
- iOS: time-sensitive interruption level (entitlement added), default sound; custom Adhan clips must be ≤30 s.
- Full-length Adhan is explicitly **not** promised; the limitation is explained in onboarding and settings.

## 8. Credentials & licensing still required

| Item | Needed for | How |
|---|---|---|
| Expo account + EAS project id | builds, submissions | `npx eas-cli@latest init` |
| Apple Developer account, App Store Connect app | iOS release, time-sensitive entitlement | developer.apple.com |
| Google Play Console | Android release; declare exact-alarm use in the Play policy form | play.google.com/console |
| Tanzil translation permission or alternative licensed translations | commercial distribution | Contact publishers listed on tanzil.net/trans, or use QuranEnc editions under their terms |
| Recitation audio licence | Phase 3 | Written permission from the provider (e.g. Quran.com/QuranicAudio, EveryAyah sources) |
| Licensed Adhan recordings | custom alert sounds | Commission/licence; add to `assets/sounds` + `expo-notifications` `sounds` |
| Hadith / dua datasets with grading | Home hadith card, Dua library | Licensed dataset (e.g. sunnah.com API key) + scholarly review |
| Moulid texts & recordings | Phase 6 | Rights holders per edition |
| Supabase project (URL + anon key) | Phase 7 | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` |
| Map/places provider | Mosque finder | Provider key + ToS review |

## 9. Phased plan & status

| Phase | Scope | Status |
|---|---|---|
| 1 Foundation | Expo/TS/Router, theme system, onboarding, Home, settings, persistence | **Done** |
| 2 Quran | Verified dataset, surah/juz lists, reader, translations, search, bookmarks, notes, history, daily goal, khatm % | **Done** (page view, word-by-word, transliteration, highlights not yet) |
| 3 Audio | Reciters, playback engine, background/lock-screen, queue, downloads, memorisation | Not started — blocked on audio licence |
| 4 Prayer & Azan | Location (GPS + 7,281 cities), engine, dashboard, week table, alerts scheduler, Android/iOS specifics | **Done** except monthly view and custom Adhan sounds |
| 5 Dhikr & Qibla | Counter, presets, custom dhikr, history, focus mode; Qibla compass with honest fallback | **Done** (map-based Qibla not yet) |
| 6 Islamic content | Calendar ✅; Ramadan mode, Dua library, Moulid, Learning | Calendar done; rest blocked on licensed content |
| 7 Backend & sync | Supabase | Design only |
| 8 Advanced | Widgets, shortcuts, share cards, mosque finder, premium | Not started |
| 9 Production QA | Device testing, profiling, security review, store assets | Not started |

## 10. Verification performed

See `docs/QA.md`. In short: 58 Jest tests pass; `tsc` clean; ESLint 0 errors; Android and iOS Hermes bundles
build; browser-based end-to-end runs (Chromium, phone viewport, light and dark) covered onboarding, GPS and city
selection, Home, reader deep-link to 2:255, bookmarking, persistence across reload, search, prayer, dhikr,
Qibla fallback, calendar and sources (device-side checksum verified) with zero runtime errors.
