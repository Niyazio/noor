import { useMemo } from 'react';

import { useSettings } from '@/store/settings';
import { localDateKey } from '@/lib/time';
import { currentAndNext, PrayerCalculationError, type PrayerMoment } from './engine';
import type { DayPrayerTimes, PrayerLocation } from './types';

export type PrayerTimesState =
  | { status: 'no-location' }
  | { status: 'error'; reason: PrayerCalculationError['reason'] | 'unknown'; message: string }
  | {
      status: 'ok';
      location: PrayerLocation & { name: string };
      today: DayPrayerTimes;
      todayKey: string;
      current: PrayerMoment | null;
      next: PrayerMoment;
    };

/**
 * Prayer times for the saved location. Recomputes when `now` crosses into a new minute,
 * or when location/settings change. Never returns placeholder times.
 */
export function usePrayerTimes(now: Date): PrayerTimesState {
  const location = useSettings((s) => s.location);
  const prayer = useSettings((s) => s.prayer);
  const minuteKey = Math.floor(now.getTime() / 60_000);
  return useMemo<PrayerTimesState>(() => {
    if (!location) return { status: 'no-location' };
    try {
      const r = currentAndNext(location, prayer, now);
      return {
        status: 'ok',
        location: { latitude: location.latitude, longitude: location.longitude, timezone: location.timezone, name: location.name },
        today: r.today,
        todayKey: localDateKey(r.today.date),
        current: r.current,
        next: r.next,
      };
    } catch (e) {
      if (e instanceof PrayerCalculationError) return { status: 'error', reason: e.reason, message: e.message };
      return { status: 'error', reason: 'unknown', message: String(e) };
    }
    // Recomputed once per minute; the countdown itself ticks from `next.time`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, prayer, minuteKey]);
}
