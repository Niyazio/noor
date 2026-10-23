import { Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText, Card, IconButton, Notice, Screen, SectionHeader, Stepper } from '@/components/ui';
import { HIJRI_EVENTS } from '@/features/hijri/events';
import { HIJRI_MONTHS_AR, HIJRI_MONTHS_EN, fromHijri, hijriMonthLength, toHijri } from '@/features/hijri/hijri';
import { addDaysToLocalDate, deviceTimeZone, sameLocalDate, zonedLocalDate } from '@/lib/time';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/ThemeProvider';

export default function CalendarScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const offset = useSettings((s) => s.hijriOffsetDays);
  const set = useSettings((s) => s.set);
  const tz = useSettings((s) => s.location?.timezone) ?? deviceTimeZone();
  const today = zonedLocalDate(new Date(), tz);
  const todayHijri = toHijri(today, offset);
  const [cursor, setCursor] = useState(() => (todayHijri ? { year: todayHijri.year, month: todayHijri.month } : { year: 1448, month: 1 }));

  const month = useMemo(() => {
    const start = fromHijri({ ...cursor, day: 1 }, offset);
    const length = hijriMonthLength(cursor.year, cursor.month);
    if (!start || !length) return null;
    const startWeekday = new Date(Date.UTC(start.year, start.month - 1, start.day)).getUTCDay();
    const days = Array.from({ length }, (_, i) => ({ hijriDay: i + 1, greg: addDaysToLocalDate(start, i) }));
    return { start, startWeekday, days };
  }, [cursor, offset]);

  const move = (delta: number) =>
    setCursor((c) => {
      const m = c.month + delta;
      return m < 1 ? { year: c.year - 1, month: 12 } : m > 12 ? { year: c.year + 1, month: 1 } : { year: c.year, month: m };
    });

  const events = HIJRI_EVENTS.filter((e) => e.month === cursor.month);
  const weekdays = Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(i18n.language, { weekday: 'narrow', timeZone: 'UTC' }).format(Date.UTC(2023, 0, 1 + i)));
  const cells = month ? [...Array(month.startWeekday).fill(null), ...month.days] : [];

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: t('calendar.title') }} />
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <IconButton icon="chevron-back" label="Previous month" onPress={() => move(-1)} color={theme.colors.primary} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <AppText variant="heading">
              {HIJRI_MONTHS_EN[cursor.month - 1]} {cursor.year}
            </AppText>
            <AppText style={{ fontFamily: 'AmiriQuran_400Regular', fontSize: 18, lineHeight: 30, color: theme.colors.gold }}>{HIJRI_MONTHS_AR[cursor.month - 1]}</AppText>
          </View>
          <IconButton icon="chevron-forward" label="Next month" onPress={() => move(1)} color={theme.colors.primary} />
        </View>
        {month ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
            {weekdays.map((w, i) => (
              <AppText key={`w${i}`} variant="caption" tone="muted" style={{ width: `${100 / 7}%`, textAlign: 'center', paddingVertical: 4 }}>
                {w}
              </AppText>
            ))}
            {cells.map((d, i) => {
              if (!d) return <View key={`e${i}`} style={{ width: `${100 / 7}%`, height: 52 }} />;
              const isToday = sameLocalDate(d.greg, today);
              const event = events.find((e) => e.day === d.hijriDay);
              return (
                <View key={d.hijriDay} style={{ width: `${100 / 7}%`, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: isToday ? theme.colors.primary : 'transparent' }}>
                  <AppText variant="bodyStrong" tone={isToday ? 'onPrimary' : event ? 'gold' : 'default'}>
                    {d.hijriDay}
                  </AppText>
                  <AppText variant="caption" tone={isToday ? 'onPrimary' : 'muted'} style={{ fontSize: 10, lineHeight: 12 }}>
                    {d.greg.day === 1 || d.hijriDay === 1 ? `${d.greg.day}/${d.greg.month}` : d.greg.day}
                  </AppText>
                </View>
              );
            })}
          </View>
        ) : (
          <AppText tone="muted">{t('common.error')}</AppText>
        )}
      </Card>

      {events.length && month ? (
        <>
          <SectionHeader title={t('calendar.title')} />
          <Card style={{ gap: 10 }}>
            {events.map((e) => {
              const g = month.days[e.day - 1]?.greg;
              return (
                <View key={e.key} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                  <AppText style={{ flex: 1 }}>{t(`calendar.events.${e.key}`)}</AppText>
                  <AppText variant="caption" tone="muted">
                    {e.day} {HIJRI_MONTHS_EN[e.month - 1]}
                    {g ? ` · ${new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(Date.UTC(g.year, g.month - 1, g.day))}` : ''}
                  </AppText>
                </View>
              );
            })}
          </Card>
        </>
      ) : null}

      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <AppText variant="bodyStrong">{t('calendar.adjustment')}</AppText>
          <AppText variant="caption" tone="muted">
            {t('calendar.adjustmentHint')}
          </AppText>
        </View>
        <Stepper value={offset} min={-2} max={2} format={(v) => (v > 0 ? `+${v}` : String(v))} onChange={(v) => set('hijriOffsetDays', v)} />
      </Card>
      <Notice tone="warning">{t('calendar.disclaimer')}</Notice>
    </Screen>
  );
}
