import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useCustomDhikr } from '@/data/queries';
import { getUserDb } from '@/db';
import { deviceTimeZone, localDateKey, zonedLocalDate } from '@/lib/time';
import { useSettings } from '@/store/settings';
import type { CounterState } from './counter';
import { findPreset } from './presets';
import { saveSession } from './repository';
import { useDhikrStore } from './store';

export interface ActiveDhikr {
  id: string;
  title: string;
  arabic: string | null;
  transliteration: string | null;
  translation: string | null;
  reference: string | null;
  reviewed: boolean;
}

/** Counter actions with haptics and session persistence wired in. */
export function useCounter() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const counter = useDhikrStore((s) => s.counter);
  const store = useDhikrStore;
  const haptics = useSettings((s) => s.haptics);
  const tz = useSettings((s) => s.location?.timezone) ?? deviceTimeZone();
  const custom = useCustomDhikr();

  const persist = useCallback(
    async (s: CounterState | null) => {
      if (!s || s.count <= 0) return;
      await saveSession(getUserDb(), {
        dhikrId: s.dhikrId,
        count: s.count,
        target: s.target,
        startedAt: s.startedAt ?? Date.now(),
        endedAt: s.lastChangedAt ?? Date.now(),
        dateKey: localDateKey(zonedLocalDate(new Date(s.lastChangedAt ?? Date.now()), tz)),
      });
      qc.invalidateQueries({ queryKey: ['dhikrTotals'] });
    },
    [qc, tz],
  );

  const tap = useCallback(() => {
    const { reachedTarget } = store.getState().tap();
    if (!haptics) return;
    if (reachedTarget) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  }, [haptics, store]);

  const undo = useCallback(() => store.getState().undo(), [store]);

  const reset = useCallback(() => {
    Alert.alert(t('dhikr.reset'), t('dhikr.resetConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.reset'),
        style: 'destructive',
        onPress: () => {
          const before = store.getState().counter;
          void persist(before);
          store.getState().reset();
        },
      },
    ]);
  }, [persist, store, t]);

  const select = useCallback(
    (id: string, target: number | null) => {
      const finished = store.getState().select(id, target);
      void persist(finished);
    },
    [persist, store],
  );

  const preset = findPreset(counter.dhikrId);
  const c = custom.data?.find((d) => d.id === counter.dhikrId);
  const active: ActiveDhikr = preset
    ? { id: preset.id, title: preset.transliteration, arabic: preset.arabic, transliteration: preset.transliteration, translation: preset.translation, reference: preset.reference, reviewed: preset.reviewed }
    : { id: counter.dhikrId, title: c?.title ?? '…', arabic: c?.arabic ?? null, transliteration: null, translation: c?.notes ?? null, reference: null, reviewed: true };

  return { counter, active, tap, undo, reset, select, setTarget: store.getState().setTarget, custom };
}
