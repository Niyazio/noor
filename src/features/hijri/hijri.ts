import { gregorianToHijri, hijriToGregorian } from '@tabby_ai/hijri-converter';

import { addDaysToLocalDate } from '@/lib/time';
import type { LocalDate } from '@/features/prayer/types';

export interface HijriDate {
  year: number;
  month: number; // 1-12
  day: number;
}

export const HIJRI_MONTHS_EN = [
  'Muharram', 'Safar', "Rabi' al-Awwal", "Rabi' al-Thani", 'Jumada al-Ula', 'Jumada al-Akhirah',
  'Rajab', "Sha'ban", 'Ramadan', 'Shawwal', "Dhu al-Qa'dah", 'Dhu al-Hijjah',
] as const;

export const HIJRI_MONTHS_AR = [
  'مُحَرَّم', 'صَفَر', 'رَبِيع الأَوَّل', 'رَبِيع الآخِر', 'جُمَادَى الأُولَى', 'جُمَادَى الآخِرَة',
  'رَجَب', 'شَعْبَان', 'رَمَضَان', 'شَوَّال', 'ذُو القَعْدَة', 'ذُو الحِجَّة',
] as const;

/**
 * Converts a Gregorian calendar date to the Umm al-Qura Hijri calendar.
 *
 * `offsetDays` lets the user follow a local moon-sighting authority. The result is a
 * calculated date, not an official announcement. Returns null outside the supported
 * range (1343–1500 AH) rather than guessing.
 */
export function toHijri(date: LocalDate, offsetDays = 0): HijriDate | null {
  const shifted = addDaysToLocalDate(date, offsetDays);
  try {
    return gregorianToHijri({ year: shifted.year, month: shifted.month, day: shifted.day });
  } catch {
    return null;
  }
}

export function fromHijri(h: HijriDate, offsetDays = 0): LocalDate | null {
  try {
    const g = hijriToGregorian(h);
    return addDaysToLocalDate(g, -offsetDays);
  } catch {
    return null;
  }
}

/** Number of days in a Hijri month (29 or 30) under Umm al-Qura, or null if unknown. */
export function hijriMonthLength(year: number, month: number): number | null {
  const start = fromHijri({ year, month, day: 1 });
  const next = month === 12 ? fromHijri({ year: year + 1, month: 1, day: 1 }) : fromHijri({ year, month: month + 1, day: 1 });
  if (!start || !next) return null;
  const ms = Date.UTC(next.year, next.month - 1, next.day) - Date.UTC(start.year, start.month - 1, start.day);
  return Math.round(ms / 86_400_000);
}

export function formatHijri(h: HijriDate, lang: 'en' | 'ar' = 'en'): string {
  if (lang === 'ar') {
    return `${h.day.toLocaleString('ar-SA')} ${HIJRI_MONTHS_AR[h.month - 1]} ${h.year.toLocaleString('ar-SA', { useGrouping: false })} هـ`;
  }
  return `${h.day} ${HIJRI_MONTHS_EN[h.month - 1]} ${h.year} AH`;
}
