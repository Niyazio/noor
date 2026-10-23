/**
 * Built-in dhikr presets. Arabic text uses standard wording; references point to the
 * primary sources commonly cited for each phrase. No reward claims are included.
 *
 * `reviewed` stays false until a qualified reviewer signs off (see docs/CONTENT_REVIEW.md);
 * the UI labels unreviewed references.
 */
export interface DhikrPreset {
  id: string;
  arabic: string;
  transliteration: string;
  translation: string;
  defaultTarget: number | null;
  reference: string | null;
  reviewed: boolean;
}

export const DHIKR_PRESETS: readonly DhikrPreset[] = [
  {
    id: 'subhanallah',
    arabic: 'سُبْحَانَ ٱللَّهِ',
    transliteration: 'Subḥān Allāh',
    translation: 'Glory be to Allah',
    defaultTarget: 33,
    reference: 'Sahih Muslim 597 (after the obligatory prayer, 33 times)',
    reviewed: false,
  },
  {
    id: 'alhamdulillah',
    arabic: 'ٱلْحَمْدُ لِلَّهِ',
    transliteration: 'Al-ḥamdu lillāh',
    translation: 'All praise is for Allah',
    defaultTarget: 33,
    reference: 'Sahih Muslim 597 (after the obligatory prayer, 33 times)',
    reviewed: false,
  },
  {
    id: 'allahuakbar',
    arabic: 'ٱللَّهُ أَكْبَرُ',
    transliteration: 'Allāhu akbar',
    translation: 'Allah is the Greatest',
    defaultTarget: 33,
    reference: 'Sahih Muslim 597 (after the obligatory prayer, 33 times)',
    reviewed: false,
  },
  {
    id: 'tahlil',
    arabic: 'لَا إِلَٰهَ إِلَّا ٱللَّهُ',
    transliteration: 'Lā ilāha illā Allāh',
    translation: 'There is no god but Allah',
    defaultTarget: 100,
    reference: null,
    reviewed: false,
  },
  {
    id: 'astaghfirullah',
    arabic: 'أَسْتَغْفِرُ ٱللَّهَ',
    transliteration: 'Astaghfiru Allāh',
    translation: 'I seek the forgiveness of Allah',
    defaultTarget: 100,
    reference: 'Sahih Muslim 591 (said three times after the prayer)',
    reviewed: false,
  },
  {
    id: 'subhanallahi-wa-bihamdihi',
    arabic: 'سُبْحَانَ ٱللَّهِ وَبِحَمْدِهِ',
    transliteration: 'Subḥān Allāhi wa bi-ḥamdih',
    translation: 'Glory be to Allah and praise be to Him',
    defaultTarget: 100,
    reference: 'Sahih al-Bukhari 6405; Sahih Muslim 2691',
    reviewed: false,
  },
  {
    id: 'salawat',
    arabic: 'ٱللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ',
    transliteration: 'Allāhumma ṣalli ʿalā Muḥammad',
    translation: 'O Allah, send blessings upon Muhammad ﷺ',
    defaultTarget: 100,
    reference: 'Quran 33:56 (the command to send blessings upon the Prophet ﷺ)',
    reviewed: false,
  },
];

export function findPreset(id: string): DhikrPreset | undefined {
  return DHIKR_PRESETS.find((p) => p.id === id);
}
