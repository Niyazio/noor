# Quran recitation audio

Audio is streamed (not bundled) from the servers Quran.com's own apps use. Every URL pattern in
`src/features/audio/reciters.ts` was taken from Quran.com's open-source code — nothing typed from memory:

| Reciter | Type | Base URL | Source |
|---|---|---|---|
| Mohamed Siddiq al-Minshawi (Mujawwad) | per ayah | `mirrors.quranicaudio.com/everyayah/Minshawy_Mujawwad_192kbps/` | quran/quran-ios `reciters.plist` id 16 |
| Abdul Basit (Murattal) | per ayah | `verses.quran.com/AbdulBaset/Murattal/mp3/` | `@quranjs/api` 3.15 docs example |
| Mahmoud Khalil al-Husary | whole surah | `download.quranicaudio.com/quran/mahmood_khaleel_al-husaree/` | quran/quran-ios `reciters.plist` id 1 |
| Abdul Basit (Mujawwad) | whole surah | `download.quranicaudio.com/quran/abdulbaset_mujawwad/` | quran/quran-ios `reciters.plist` id 23 |

File names follow quran_android's `AudioUtils.kt`: per ayah `%03d%03d.mp3` (e.g. `002255.mp3`), whole surah
`%03d.mp3`. Per-ayah reciters support highlighting the recited ayah, repeat ×1/2/3/5/∞, and starting at any
ayah; the basmala before each surah (except 1 and 9) is played from 1:1, as Quran.com's apps do.

**Not yet verified by playback:** the build environment cannot reach these servers, so playback was tested only
for the error path. Test on a phone before release. To add reciters, copy entries from Quran.com's apps the same
way and record the source. Confirm the providers' terms before any commercial use.

Playback: background audio and lock-screen controls (`expo-audio`, `shouldPlayInBackground`, `doNotMix`),
speed 0.75–1.5×, continuous play into the next surah, follow-along page turning in the Mushaf view.
