export const LANGUAGES = [
  { code: 'en', name: 'English', native: 'English', rtl: false },
  { code: 'ar', name: 'Arabic', native: 'العربية', rtl: true },
  { code: 'ur', name: 'Urdu', native: 'اردو', rtl: true },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', rtl: false },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', rtl: false },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം', rtl: false },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்', rtl: false },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]['code'];

export function isRtl(code: string): boolean {
  return LANGUAGES.some((l) => l.code === code && l.rtl);
}

export function isSupportedLanguage(code: string): code is LanguageCode {
  return LANGUAGES.some((l) => l.code === code);
}
