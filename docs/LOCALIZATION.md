# Localisation

- Source strings: `src/i18n/locales/en.ts` (complete). Other languages: `src/i18n/locales/others.ts` — partial
  drafts (navigation, greetings, prayer names, common actions); missing keys fall back to English.
- **All non-English UI strings are drafts and need native-speaker review** (ar, ur, hi, kn, ml, ta), in
  particular prayer-name conventions (e.g. Malayalam “സുബ്ഹ്” for Fajr is a regional choice).
- Religious text is never translated here; translations of the Quran come only from licensed editions.
- RTL: choosing Arabic or Urdu calls `I18nManager.forceRTL`, which takes effect after an app restart (React
  Native limitation); the UI tells the user. Arabic Quran text is always rendered RTL regardless of UI language.
- Dates/times use `Intl` with the selected language; numbers in Arabic Hijri formatting use `ar-SA` digits.
