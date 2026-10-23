/**
 * Search normalisation shared by the content build script (Node) and the app.
 *
 * The canonical Quran text is never modified; these functions only produce a
 * separate, search-only representation so that a user typing plain Arabic
 * (without diacritics) can find Uthmani-script ayahs.
 *
 * Keep this file free of TypeScript-only runtime syntax (enums, namespaces,
 * parameter properties) so Node can run it with type stripping.
 */

// Harakat, Quranic annotation marks, superscript alef, tatweel and small high letters.
const ARABIC_MARKS =
  /[ؐ-ًؚ-ٰٟۖ-ۜ۟-۪ۨ-ۭـ]/g;

const ARABIC_LETTER_FOLDS: Record<string, string> = {
  'ٱ': 'ا', // ٱ alef wasla -> ا
  'آ': 'ا', // آ -> ا
  'أ': 'ا', // أ -> ا
  'إ': 'ا', // إ -> ا
  'ٲ': 'ا',
  'ٳ': 'ا',
  'ى': 'ي', // ى -> ي
  'ی': 'ي', // Farsi yeh -> ي
  'ة': 'ه', // ة -> ه
  'ؤ': 'و', // ؤ -> و
  'ئ': 'ي', // ئ -> ي
  'ک': 'ك', // keheh -> ك
};

const FOLD_PATTERN = new RegExp(`[${Object.keys(ARABIC_LETTER_FOLDS).join('')}]`, 'g');

export function normalizeArabic(input: string): string {
  return input
    .normalize('NFC')
    .replace(ARABIC_MARKS, '')
    .replace(FOLD_PATTERN, (ch) => ARABIC_LETTER_FOLDS[ch] ?? ch)
    .replace(/\s+/g, ' ')
    .trim();
}

/** Lower-cases and strips Latin diacritics so "Ibrāhīm" matches "ibrahim". */
export function normalizeLatin(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[‘’ʼʻ`']/g, "'")
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function containsArabic(input: string): boolean {
  return /[؀-ۿݐ-ݿࢠ-ࣿ]/.test(input);
}

/** Normalises a query in whichever script it was typed. */
export function normalizeQuery(input: string): string {
  return containsArabic(input) ? normalizeArabic(input) : normalizeLatin(input);
}
