import type { LocalDate } from '@/features/prayer/types';

const partsFormatterCache = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string) {
  let f = partsFormatterCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hourCycle: 'h23',
    });
    partsFormatterCache.set(timeZone, f);
  }
  return f;
}

export function zonedParts(date: Date, timeZone: string) {
  const parts = partsFormatter(timeZone).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour') % 24, minute: get('minute') };
}

/** The calendar date at `timeZone` for an absolute instant. */
export function zonedLocalDate(date: Date, timeZone: string): LocalDate {
  const { year, month, day } = zonedParts(date, timeZone);
  return { year, month, day };
}

export function addDaysToLocalDate(d: LocalDate, days: number): LocalDate {
  const utc = new Date(Date.UTC(d.year, d.month - 1, d.day + days));
  return { year: utc.getUTCFullYear(), month: utc.getUTCMonth() + 1, day: utc.getUTCDate() };
}

export function localDateKey(d: LocalDate): string {
  return `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
}

export function parseLocalDateKey(key: string): LocalDate {
  const [year, month, day] = key.split('-').map(Number);
  return { year, month, day };
}

export function sameLocalDate(a: LocalDate, b: LocalDate) {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

export function formatTime(
  date: Date,
  timeZone: string,
  format: '12h' | '24h',
  locale = 'en',
): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    hourCycle: format === '24h' ? 'h23' : 'h12',
  }).format(date);
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** Weekday + Gregorian date for display, in the given zone. */
export function formatGregorian(date: Date, timeZone: string, locale = 'en'): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
