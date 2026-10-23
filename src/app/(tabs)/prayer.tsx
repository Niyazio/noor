import { router } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Share, View } from 'react-native';

import { AppText, Card, HeroCard, Icon, Notice, Screen, SectionHeader } from '@/components/ui';
import { usePrayerLog, useSetPrayerStatus } from '@/data/queries';
import { calculateRange } from '@/features/prayer/engine';
import { CALCULATION_METHODS } from '@/features/prayer/methods';
import { PrayerStateNotice, PrayerTimesList } from '@/features/prayer/components';
import { OBLIGATORY_PRAYERS, PRAYER_NAMES } from '@/features/prayer/types';
import { usePrayerTimes } from '@/features/prayer/usePrayerTimes';
import { useNow } from '@/hooks/useNow';
import { formatCountdown, formatTime } from '@/lib/time';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/ThemeProvider';

export default function PrayerScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const now = useNow(1000);
  const state = usePrayerTimes(now);
  const settings = useSettings((s) => s.prayer);
  const location = useSettings((s) => s.location);
  const timeFormat = useSettings((s) => s.timeFormat);
  const dateKey = state.status === 'ok' ? state.todayKey : null;
  const log = usePrayerLog(dateKey);
  const setStatus = useSetPrayerStatus(dateKey ?? '');
  const method = CALCULATION_METHODS.find((m) => m.id === settings.method);

  const dayKey = state.status === 'ok' ? state.todayKey : '';
  const week = useMemo(() => {
    if (!location || state.status !== 'ok') return null;
    try {
      return calculateRange(location, settings, new Date(), 7);
    } catch {
      return null;
    }
    // Recompute when the local day changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, settings, dayKey]);

  const shareTimetable = () => {
    if (!week || !location) return;
    const fmt = (d: Date) => formatTime(d, location.timezone, timeFormat, i18n.language);
    const lines = [
      `${t('prayer.title')} — ${location.name}`,
      `${method?.label ?? settings.method} · Asr ${settings.asr === 'hanafi' ? t('prayer.asrHanafi') : t('prayer.asrStandard')}`,
      '',
      ...week.map((d) =>
        [`${d.date.year}-${String(d.date.month).padStart(2, '0')}-${String(d.date.day).padStart(2, '0')}`, ...PRAYER_NAMES.map((p) => `${t(`prayer.names.${p}`)} ${fmt(d.times[p])}`)].join(' | '),
      ),
    ];
    Share.share({ message: lines.join('\n') }).catch(() => undefined);
  };

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <AppText variant="title" accessibilityRole="header">
          {t('prayer.title')}
        </AppText>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <Pressable onPress={() => router.push('/settings/notifications')} accessibilityRole="button" accessibilityLabel={t('prayer.alerts')} hitSlop={10}>
            <Icon name="notifications-outline" color={theme.colors.primary} />
          </Pressable>
          <Pressable onPress={() => router.push('/settings/prayer')} accessibilityRole="button" accessibilityLabel={t('prayer.settings')} hitSlop={10}>
            <Icon name="options-outline" color={theme.colors.primary} />
          </Pressable>
        </View>
      </View>

      {state.status !== 'ok' ? (
        <PrayerStateNotice state={state} />
      ) : (
        <>
          <HeroCard>
            <Pressable onPress={() => router.push('/location')} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="location" size={14} color={theme.colors.onHeroMuted} />
              <AppText variant="label" tone="onHeroMuted" numberOfLines={1}>
                {state.location.name}
              </AppText>
            </Pressable>
            <AppText variant="display" tone="onHero" style={{ marginTop: 10, fontVariant: ['tabular-nums'] }}>
              {formatCountdown(state.next.time.getTime() - now.getTime())}
            </AppText>
            <AppText variant="bodyStrong" tone="onHeroMuted">
              {t('prayer.next', { prayer: t(`prayer.names.${state.next.name}`) })} · {formatTime(state.next.time, state.location.timezone, timeFormat, i18n.language)}
            </AppText>
          </HeroCard>

          <Card style={{ paddingHorizontal: 8 }}>
            <PrayerTimesList
              day={state.today}
              timezone={state.location.timezone}
              highlight={state.next.time.getTime() <= state.today.times.isha.getTime() ? state.next.name : null}
              log={log.data}
              onToggle={(p) => setStatus.mutate({ prayer: p, status: log.data?.[p] === 'prayed' ? null : 'prayed' })}
            />
          </Card>
          <AppText variant="caption" tone="muted">
            {t('prayer.sunriseNote')}
          </AppText>

          <Pressable onPress={() => router.push('/settings/prayer')} accessibilityRole="button">
            <Notice icon="calculator-outline">
              <AppText variant="caption">
                {t('prayer.usingMethod', { method: method?.label ?? settings.method, asr: settings.asr === 'hanafi' ? t('prayer.asrHanafi') : t('prayer.asrStandard') })}
              </AppText>
            </Notice>
          </Pressable>

          {week ? (
            <>
              <SectionHeader title={t('prayer.week')} action={t('prayer.shareTimetable')} onAction={shareTimetable} />
              <Card style={{ paddingHorizontal: 10 }}>
                <View style={{ flexDirection: 'row', paddingBottom: 8 }}>
                  <AppText variant="caption" tone="muted" style={{ width: 56 }}> </AppText>
                  {OBLIGATORY_PRAYERS.map((p) => (
                    <AppText key={p} variant="caption" tone="muted" style={{ flex: 1, textAlign: 'center' }} numberOfLines={1}>
                      {t(`prayer.names.${p}`)}
                    </AppText>
                  ))}
                </View>
                {week.map((d, i) => (
                  <View key={i} style={{ flexDirection: 'row', paddingVertical: 7, borderTopWidth: 0.5, borderTopColor: theme.colors.border }}>
                    <AppText variant="label" style={{ width: 56 }} tone={i === 0 ? 'primary' : 'default'}>
                      {new Intl.DateTimeFormat(i18n.language, { weekday: 'short', day: 'numeric', timeZone: 'UTC' }).format(Date.UTC(d.date.year, d.date.month - 1, d.date.day))}
                    </AppText>
                    {OBLIGATORY_PRAYERS.map((p) => (
                      <AppText key={p} variant="caption" style={{ flex: 1, textAlign: 'center', fontVariant: ['tabular-nums'] }}>
                        {formatTime(d.times[p], state.location.timezone, '24h', i18n.language)}
                      </AppText>
                    ))}
                  </View>
                ))}
              </Card>
            </>
          ) : null}
        </>
      )}
    </Screen>
  );
}
