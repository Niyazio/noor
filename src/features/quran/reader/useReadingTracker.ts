import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';

import { invalidateReading } from '@/data/queries';
import { getUserDb } from '@/db';
import { markAyahsRead, recordReadingPosition } from '@/features/userdata/repository';
import { deviceTimeZone, localDateKey, zonedLocalDate } from '@/lib/time';
import { useSettings } from '@/store/settings';

type Ref = { id: number; surah: number; ayah: number };

/**
 * Debounced persistence of the reading position (last read, history, daily goal).
 * `report` can be called on every scroll/page change; writes happen 1.5 s after it settles
 * and once more when the reader closes. Write failures never interrupt reading.
 */
export function useReadingTracker() {
  const qc = useQueryClient();
  const tz = useSettings((s) => s.location?.timezone) ?? deviceTimeZone();
  const pending = useRef<Ref | null>(null);
  const seen = useRef(new Set<number>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(async () => {
    const a = pending.current;
    const ids = [...seen.current];
    seen.current.clear();
    pending.current = null;
    if (!a) return;
    const dateKey = localDateKey(zonedLocalDate(new Date(), tz));
    try {
      await recordReadingPosition(getUserDb(), { ayahId: a.id, surah: a.surah, ayah: a.ayah }, dateKey);
      await markAyahsRead(getUserDb(), ids, dateKey);
      invalidateReading(qc);
    } catch {
      // ignore
    }
  }, [qc, tz]);

  const flushRef = useRef(flush);
  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      void flushRef.current();
    },
    [],
  );

  /** `position` = the ayah shown at the top; `visible` = all ayahs on screen (counted as read). */
  return useCallback((position: Ref, visible: Ref[]) => {
    for (const v of visible) seen.current.add(v.id);
    pending.current = position;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flushRef.current(), 1500);
  }, []);
}
