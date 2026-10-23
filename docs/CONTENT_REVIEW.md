# Items awaiting qualified review before release

| Item | Location | What to review |
|---|---|---|
| Dhikr preset wording, transliteration, translation and references (Muslim 597, Muslim 591, Bukhari 6405 / Muslim 2691, Quran 33:56) | `src/features/dhikr/presets.ts` | Accuracy of references and wording. Set `reviewed: true` per item after sign-off. |
| Calendar observances (Mawlid, Isra’ & Mi‘raj, mid-Sha‘ban) | `src/features/hijri/events.ts`, i18n `calendar.events` | Labels say these are observed by many communities, not universal obligations. Confirm wording; make regional toggles if needed. |
| Calculation-method suggestions per country | `src/features/prayer/methods.ts` | Suggestions only — users always confirm. Validate against local authorities for priority markets (India, GCC). |
| Hindi translation credit | `content-sources/manifest.json` | Confirm translator name against tanzil.net. |
