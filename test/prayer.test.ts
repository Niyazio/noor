import { calculateDay, calculateRange, currentAndNext, PrayerCalculationError } from '@/features/prayer/engine';
import { suggestMethodForCountry, CALCULATION_METHODS } from '@/features/prayer/methods';
import { DEFAULT_PRAYER_SETTINGS, PRAYER_NAMES, type PrayerLocation, type PrayerSettings } from '@/features/prayer/types';
import { formatTime, zonedLocalDate, zonedParts } from '@/lib/time';

const MAKKAH: PrayerLocation = { latitude: 21.4225, longitude: 39.8262, timezone: 'Asia/Riyadh' };
const BENGALURU: PrayerLocation = { latitude: 12.97, longitude: 77.56, timezone: 'Asia/Kolkata' };
const NEW_YORK: PrayerLocation = { latitude: 40.7128, longitude: -74.006, timezone: 'America/New_York' };
const TROMSO: PrayerLocation = { latitude: 69.6492, longitude: 18.9553, timezone: 'Europe/Oslo' };

const settings = (patch: Partial<PrayerSettings> = {}): PrayerSettings => ({ ...DEFAULT_PRAYER_SETTINGS, ...patch });
const minutes = (a: Date, b: Date) => (a.getTime() - b.getTime()) / 60_000;

describe('prayer time calculation', () => {
  it('returns all six times in chronological order for every method', () => {
    for (const m of CALCULATION_METHODS) {
      for (const loc of [MAKKAH, BENGALURU, NEW_YORK]) {
        const day = calculateDay(loc, { year: 2026, month: 10, day: 23 }, settings({ method: m.id }));
        const ts = PRAYER_NAMES.map((n) => day.times[n].getTime());
        expect([...ts].sort((a, b) => a - b)).toEqual(ts);
        // Every time falls on the requested local date.
        for (const n of PRAYER_NAMES) expect(zonedLocalDate(day.times[n], loc.timezone)).toEqual(day.date);
      }
    }
  });

  it('places Dhuhr near local solar noon', () => {
    const day = calculateDay(MAKKAH, { year: 2026, month: 10, day: 23 }, settings());
    const { hour, minute } = zonedParts(day.times.dhuhr, MAKKAH.timezone);
    const local = hour * 60 + minute;
    expect(local).toBeGreaterThan(11 * 60 + 50);
    expect(local).toBeLessThan(12 * 60 + 30);
  });

  it('makes Hanafi Asr later than standard Asr and leaves other prayers unchanged', () => {
    const date = { year: 2026, month: 6, day: 1 };
    const std = calculateDay(BENGALURU, date, settings({ asr: 'standard' }));
    const han = calculateDay(BENGALURU, date, settings({ asr: 'hanafi' }));
    expect(minutes(han.times.asr, std.times.asr)).toBeGreaterThan(30);
    for (const n of ['fajr', 'sunrise', 'dhuhr', 'maghrib', 'isha'] as const) {
      expect(han.times[n].getTime()).toBe(std.times[n].getTime());
    }
  });

  it('uses different twilight angles per method', () => {
    const date = { year: 2026, month: 3, day: 1 };
    const karachi = calculateDay(BENGALURU, date, settings({ method: 'Karachi' }));
    const isna = calculateDay(BENGALURU, date, settings({ method: 'NorthAmerica' }));
    // 18° Fajr is earlier than 15° Fajr; 18° Isha is later than 15° Isha.
    expect(karachi.times.fajr.getTime()).toBeLessThan(isna.times.fajr.getTime());
    expect(karachi.times.isha.getTime()).toBeGreaterThan(isna.times.isha.getTime());
  });

  it('applies Umm al-Qura Isha as 90 minutes after Maghrib', () => {
    const day = calculateDay(MAKKAH, { year: 2026, month: 10, day: 23 }, settings({ method: 'UmmAlQura' }));
    expect(minutes(day.times.isha, day.times.maghrib)).toBe(90);
  });

  it('applies manual minute adjustments exactly', () => {
    const date = { year: 2026, month: 10, day: 23 };
    const base = calculateDay(BENGALURU, date, settings());
    const adj = calculateDay(BENGALURU, date, settings({ adjustments: { ...DEFAULT_PRAYER_SETTINGS.adjustments, fajr: 3, isha: -2 } }));
    expect(minutes(adj.times.fajr, base.times.fajr)).toBe(3);
    expect(minutes(adj.times.isha, base.times.isha)).toBe(-2);
    expect(adj.times.dhuhr.getTime()).toBe(base.times.dhuhr.getTime());
  });

  it('handles daylight-saving transitions (New York, 8 March 2026)', () => {
    const before = calculateDay(NEW_YORK, { year: 2026, month: 3, day: 7 }, settings({ method: 'NorthAmerica' }));
    const after = calculateDay(NEW_YORK, { year: 2026, month: 3, day: 8 }, settings({ method: 'NorthAmerica' }));
    const localDhuhr = (d: Date) => { const p = zonedParts(d, NEW_YORK.timezone); return p.hour * 60 + p.minute; };
    // Clock time of Dhuhr jumps by about an hour while the true solar time barely moves.
    expect(localDhuhr(after.times.dhuhr) - localDhuhr(before.times.dhuhr)).toBeGreaterThanOrEqual(59);
    expect(localDhuhr(after.times.dhuhr) - localDhuhr(before.times.dhuhr)).toBeLessThanOrEqual(61);
    expect(Math.abs(minutes(after.times.dhuhr, before.times.dhuhr) - 24 * 60)).toBeLessThan(2);
  });

  it('is independent of the device time zone', () => {
    const original = process.env.TZ;
    const results: number[][] = [];
    for (const tz of ['UTC', 'America/Los_Angeles', 'Asia/Tokyo', 'Pacific/Kiritimati']) {
      process.env.TZ = tz;
      const day = calculateDay(BENGALURU, { year: 2026, month: 10, day: 23 }, settings({ method: 'Karachi' }));
      results.push(PRAYER_NAMES.map((n) => day.times[n].getTime()));
    }
    process.env.TZ = original;
    results.forEach((r) => expect(r).toEqual(results[0]));
  });

  it('computes "today" at the location, across midnight boundaries', () => {
    // 20:00 UTC on 23 Oct is already 24 Oct (01:30) in India.
    const now = new Date(Date.UTC(2026, 9, 23, 20, 0));
    const [today] = calculateRange(BENGALURU, settings(), now, 1);
    expect(today.date).toEqual({ year: 2026, month: 10, day: 24 });
  });

  it('finds the next prayer, rolling over to tomorrow’s Fajr after Isha', () => {
    const day = calculateDay(BENGALURU, { year: 2026, month: 10, day: 23 }, settings());
    const afterIsha = new Date(day.times.isha.getTime() + 60_000);
    const r = currentAndNext(BENGALURU, settings(), afterIsha);
    expect(r.current?.name).toBe('isha');
    expect(r.next.name).toBe('fajr');
    expect(zonedLocalDate(r.next.time, BENGALURU.timezone)).toEqual({ year: 2026, month: 10, day: 24 });

    const beforeAsr = new Date(day.times.asr.getTime() - 60_000);
    expect(currentAndNext(BENGALURU, settings(), beforeAsr)).toMatchObject({ current: { name: 'dhuhr' }, next: { name: 'asr' } });
  });

  it('never returns fabricated times at extreme latitudes', () => {
    // Midsummer in Tromsø: the sun does not set. Either valid times via the high-latitude
    // rule, or an explicit error — never NaN or a hard-coded fallback.
    for (const rule of ['recommended', 'middleofthenight', 'seventhofthenight', 'twilightangle'] as const) {
      try {
        const day = calculateDay(TROMSO, { year: 2026, month: 6, day: 21 }, settings({ highLatitude: rule }));
        for (const n of PRAYER_NAMES) expect(Number.isNaN(day.times[n].getTime())).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(PrayerCalculationError);
      }
    }
  });

  it('rejects invalid coordinates and time zones', () => {
    const date = { year: 2026, month: 1, day: 1 };
    expect(() => calculateDay({ ...MAKKAH, latitude: 91 }, date, settings())).toThrow(PrayerCalculationError);
    expect(() => calculateDay({ ...MAKKAH, longitude: Number.NaN }, date, settings())).toThrow(PrayerCalculationError);
    expect(() => calculateDay({ ...MAKKAH, timezone: 'Mars/Olympus' }, date, settings())).toThrow(PrayerCalculationError);
  });

  it('formats times in 12h and 24h at the location', () => {
    const d = new Date(Date.UTC(2026, 9, 23, 13, 5)); // 18:35 in India
    expect(formatTime(d, 'Asia/Kolkata', '24h')).toBe('18:35');
    expect(formatTime(d, 'Asia/Kolkata', '12h').replace(/\s/g, ' ')).toMatch(/^6:35 PM$/);
  });

  it('only suggests methods, defaulting sensibly by region', () => {
    expect(suggestMethodForCountry('IN')).toBe('Karachi');
    expect(suggestMethodForCountry('SA')).toBe('UmmAlQura');
    expect(suggestMethodForCountry('GB')).toBe('MuslimWorldLeague');
    expect(suggestMethodForCountry(undefined)).toBe('MuslimWorldLeague');
  });
});
