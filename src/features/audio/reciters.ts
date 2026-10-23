/**
 * Recitation sources. Every URL pattern below was taken from Quran.com's own open-source apps
 * or SDK (not typed from memory) — see `source` on each entry and docs/AUDIO.md.
 * Audio is streamed; nothing is bundled with the app.
 *
 * - `ayah`: one file per ayah  → verse highlighting, repeat ayah, start anywhere.
 * - `surah`: one gapless file per surah → surah-level controls only (no timing data bundled).
 */
export type ReciterKind = 'ayah' | 'surah';

export interface Reciter {
  id: string;
  name: string;
  nameAr: string;
  style: 'Murattal' | 'Mujawwad';
  kind: ReciterKind;
  baseUrl: string;
  source: string;
}

export const RECITERS: readonly Reciter[] = [
  {
    id: 'minshawi_mujawwad',
    name: 'Mohamed Siddiq al-Minshawi',
    nameAr: 'محمد صديق المنشاوي',
    style: 'Mujawwad',
    kind: 'ayah',
    baseUrl: 'https://mirrors.quranicaudio.com/everyayah/Minshawy_Mujawwad_192kbps/',
    source: 'quran/quran-ios Example/QuranEngineApp/Resources/reciters.plist (id 16)',
  },
  {
    id: 'abdulbaset_murattal',
    name: 'Abdul Basit Abdul Samad',
    nameAr: 'عبد الباسط عبد الصمد',
    style: 'Murattal',
    kind: 'ayah',
    baseUrl: 'https://verses.quran.com/AbdulBaset/Murattal/mp3/',
    source: '@quranjs/api 3.15 documentation example (verses.quran.com/AbdulBaset/Murattal/mp3/002255.mp3)',
  },
  {
    id: 'husary_gapless',
    name: 'Mahmoud Khalil al-Husary',
    nameAr: 'محمود خليل الحصري',
    style: 'Murattal',
    kind: 'surah',
    baseUrl: 'https://download.quranicaudio.com/quran/mahmood_khaleel_al-husaree/',
    source: 'quran/quran-ios Example/QuranEngineApp/Resources/reciters.plist (id 1)',
  },
  {
    id: 'abdulbaset_mujawwad_gapless',
    name: 'Abdul Basit Abdul Samad',
    nameAr: 'عبد الباسط عبد الصمد',
    style: 'Mujawwad',
    kind: 'surah',
    baseUrl: 'https://download.quranicaudio.com/quran/abdulbaset_mujawwad/',
    source: 'quran/quran-ios Example/QuranEngineApp/Resources/reciters.plist (id 23)',
  },
];

export function findReciter(id: string): Reciter {
  return RECITERS.find((r) => r.id === id) ?? RECITERS[0];
}

const pad3 = (n: number) => String(n).padStart(3, '0');

/** Per-ayah file name: SSSAAA.mp3 (e.g. 002255.mp3 for 2:255). */
export function ayahAudioUrl(reciter: Reciter, surah: number, ayah: number): string {
  if (reciter.kind !== 'ayah') throw new Error(`${reciter.id} has no per-ayah audio`);
  return `${reciter.baseUrl}${pad3(surah)}${pad3(ayah)}.mp3`;
}

/** Gapless per-surah file name: SSS.mp3 (e.g. 036.mp3 for Ya-Sin). */
export function surahAudioUrl(reciter: Reciter, surah: number): string {
  if (reciter.kind !== 'surah') throw new Error(`${reciter.id} has per-ayah audio`);
  return `${reciter.baseUrl}${pad3(surah)}.mp3`;
}
