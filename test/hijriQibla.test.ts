import { formatHijri, fromHijri, hijriMonthLength, toHijri } from '@/features/hijri/hijri';
import { angleDelta, distanceToKaabaKm, headingQuality, qiblaBearing } from '@/features/qibla/qibla';
import { addDaysToLocalDate } from '@/lib/time';

describe('Hijri (Umm al-Qura)', () => {
  const icu = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', {
    year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'UTC',
  });
  const icuHijri = (y: number, m: number, d: number) => {
    const parts = icu.formatToParts(Date.UTC(y, m - 1, d));
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
    return { year: get('relatedYear') ? get('year') : get('year'), month: get('month'), day: get('day') };
  };

  it('agrees with ICU’s Umm al-Qura calendar for every day of 2024–2027', () => {
    let date = { year: 2024, month: 1, day: 1 };
    let mismatches = 0;
    while (date.year < 2028) {
      const ours = toHijri(date);
      const ref = icuHijri(date.year, date.month, date.day);
      if (!ours || ours.year !== ref.year || ours.month !== ref.month || ours.day !== ref.day) mismatches++;
      date = addDaysToLocalDate(date, 1);
    }
    expect(mismatches).toBe(0);
  });

  it('matches well-known dates', () => {
    expect(toHijri({ year: 2025, month: 3, day: 1 })).toEqual({ year: 1446, month: 9, day: 1 });
    expect(toHijri({ year: 2024, month: 6, day: 16 })).toEqual({ year: 1445, month: 12, day: 10 });
  });

  it('applies a manual moon-sighting offset and round-trips', () => {
    expect(toHijri({ year: 2025, month: 3, day: 1 }, -1)).toEqual({ year: 1446, month: 8, day: 29 });
    expect(fromHijri({ year: 1446, month: 9, day: 1 })).toEqual({ year: 2025, month: 3, day: 1 });
    expect(fromHijri({ year: 1446, month: 9, day: 1 }, 1)).toEqual({ year: 2025, month: 2, day: 28 });
  });

  it('reports month lengths of 29 or 30 days', () => {
    for (let m = 1; m <= 12; m++) expect([29, 30]).toContain(hijriMonthLength(1447, m));
  });

  it('returns null outside the supported range instead of guessing', () => {
    expect(toHijri({ year: 2090, month: 1, day: 1 })).toBeNull();
  });

  it('formats in English and Arabic', () => {
    expect(formatHijri({ year: 1448, month: 9, day: 1 })).toBe('1 Ramadan 1448 AH');
    expect(formatHijri({ year: 1448, month: 9, day: 1 }, 'ar')).toContain('رَمَضَان');
  });
});

describe('Qibla', () => {
  // Reference bearings published in the adhan library's own test-suite.
  it.each([
    ['Washington DC', 38.9072, -77.0369, 56.56],
    ['New York', 40.7128, -74.0059, 58.481],
    ['London', 51.5074, -0.1278, 118.987],
    ['Islamabad', 33.7294, 73.0931, 255.882],
    ['Tokyo', 35.6895, 139.6917, 293.021],
  ])('bearing from %s', (_name, lat, lng, expected) => {
    expect(qiblaBearing(lat, lng)).toBeCloseTo(expected, 2);
  });

  it('has a sensible bearing and distance from Bengaluru', () => {
    const b = qiblaBearing(12.97, 77.56);
    expect(b).toBeGreaterThan(285);
    expect(b).toBeLessThan(300);
    const km = distanceToKaabaKm(12.97, 77.56);
    expect(km).toBeGreaterThan(3800);
    expect(km).toBeLessThan(4200);
  });

  it('rejects invalid coordinates', () => {
    expect(() => qiblaBearing(100, 0)).toThrow();
  });

  it('computes the shortest turn', () => {
    expect(angleDelta(350, 10)).toBe(20);
    expect(angleDelta(10, 350)).toBe(-20);
    expect(angleDelta(0, 180)).toBe(180);
  });

  it('maps platform heading accuracy honestly', () => {
    expect(headingQuality(-1, 'ios')).toBe('unavailable');
    expect(headingQuality(10, 'ios')).toBe('good');
    expect(headingQuality(45, 'ios')).toBe('poor');
    expect(headingQuality(3, 'android')).toBe('good');
    expect(headingQuality(0, 'android')).toBe('unavailable');
    expect(headingQuality(null, 'android')).toBe('unavailable');
  });
});

describe('compass declination (web)', () => {
  const { magneticDeclination, magneticToTrue } = jest.requireActual('@/features/qibla/qibla') as typeof import('@/features/qibla/qibla');
  it('uses the World Magnetic Model', () => {
    const date = new Date('2026-10-23');
    const ny = magneticDeclination(40.71, -74.0, date)!;
    expect(ny).toBeLessThan(-11);
    expect(ny).toBeGreaterThan(-14);
    expect(Math.abs(magneticDeclination(12.97, 77.59, date)!)).toBeLessThan(3);
    expect(magneticDeclination(0, 0, new Date('1990-01-01'))).toBeNull();
  });
  it('converts magnetic to true headings', () => {
    expect(magneticToTrue(350, 15)).toBe(5);
    expect(magneticToTrue(10, -12.5)).toBeCloseTo(357.5);
  });
});
