import {
  CalculationMethod,
  Coordinates,
  HighLatitudeRule,
  Madhab,
  PrayerTimes,
} from 'adhan';

import { addDaysToLocalDate, zonedLocalDate } from '@/lib/time';
import {
  OBLIGATORY_PRAYERS,
  PRAYER_NAMES,
  type DayPrayerTimes,
  type LocalDate,
  type ObligatoryPrayer,
  type PrayerLocation,
  type PrayerName,
  type PrayerSettings,
} from './types';

export class PrayerCalculationError extends Error {
  constructor(
    public readonly reason: 'invalid-location' | 'invalid-timezone' | 'unresolvable-times',
    message: string,
  ) {
    super(message);
    this.name = 'PrayerCalculationError';
  }
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz }).format(0);
    return true;
  } catch {
    return false;
  }
}

function validateLocation(loc: PrayerLocation) {
  const { latitude, longitude } = loc;
  if (
    !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 || Math.abs(longitude) > 180
  ) {
    throw new PrayerCalculationError('invalid-location', 'Coordinates are missing or out of range.');
  }
  if (!loc.timezone || !isValidTimeZone(loc.timezone)) {
    throw new PrayerCalculationError('invalid-timezone', `Unknown time zone "${loc.timezone}".`);
  }
}

function buildParams(loc: PrayerLocation, settings: PrayerSettings) {
  const params = CalculationMethod[settings.method]();
  params.madhab = settings.asr === 'hanafi' ? Madhab.Hanafi : Madhab.Shafi;
  const coords = new Coordinates(loc.latitude, loc.longitude);
  params.highLatitudeRule =
    settings.highLatitude === 'recommended'
      ? HighLatitudeRule.recommended(coords)
      : settings.highLatitude;
  // Adjustments are applied by adhan before rounding to the nearest minute.
  params.adjustments = { ...settings.adjustments };
  return { params, coords };
}

/**
 * Calculates prayer times for a calendar date *at the location* (not the device's
 * time zone). Returns absolute instants. Throws instead of returning fabricated
 * times when calculation is not possible.
 */
export function calculateDay(loc: PrayerLocation, date: LocalDate, settings: PrayerSettings): DayPrayerTimes {
  validateLocation(loc);
  const { params, coords } = buildParams(loc, settings);
  // adhan reads the year/month/day components of the Date it receives; the instants it
  // returns are absolute, so the device time zone does not affect the result.
  const pt = new PrayerTimes(coords, new Date(date.year, date.month - 1, date.day, 12), params);
  const times = {} as Record<PrayerName, Date>;
  for (const name of PRAYER_NAMES) {
    const t = pt[name];
    if (!(t instanceof Date) || Number.isNaN(t.getTime())) {
      throw new PrayerCalculationError(
        'unresolvable-times',
        `${name} cannot be calculated for this location and date with the selected settings.`,
      );
    }
    times[name] = t;
  }
  return { date, times };
}

/** Prayer times for `days` consecutive local dates starting with the location's "today". */
export function calculateRange(
  loc: PrayerLocation,
  settings: PrayerSettings,
  now: Date,
  days: number,
  startOffsetDays = 0,
): DayPrayerTimes[] {
  const today = zonedLocalDate(now, loc.timezone);
  return Array.from({ length: days }, (_, i) =>
    calculateDay(loc, addDaysToLocalDate(today, i + startOffsetDays), settings),
  );
}

export interface PrayerMoment {
  name: ObligatoryPrayer;
  time: Date;
}

/** Current and next obligatory prayer relative to `now`. */
export function currentAndNext(
  loc: PrayerLocation,
  settings: PrayerSettings,
  now: Date,
): { current: PrayerMoment | null; next: PrayerMoment; today: DayPrayerTimes } {
  const [yesterday, today, tomorrow] = calculateRange(loc, settings, now, 3, -1);
  const timeline: PrayerMoment[] = [yesterday, today, tomorrow].flatMap((d) =>
    OBLIGATORY_PRAYERS.map((name) => ({ name, time: d.times[name] })),
  );
  const nextIndex = timeline.findIndex((p) => p.time.getTime() > now.getTime());
  return {
    current: nextIndex > 0 ? timeline[nextIndex - 1] : null,
    next: timeline[nextIndex],
    today,
  };
}
