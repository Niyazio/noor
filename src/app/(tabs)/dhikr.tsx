import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import { AppText, Button, Card, Chip, IconButton, Notice, Screen, SectionHeader, ToggleRow } from '@/components/ui';
import { useDhikrTotals } from '@/data/queries';
import { CounterView } from '@/features/dhikr/CounterView';
import { DHIKR_PRESETS, findPreset } from '@/features/dhikr/presets';
import { useCounter } from '@/features/dhikr/useCounter';
import { addDaysToLocalDate, deviceTimeZone, localDateKey, zonedLocalDate } from '@/lib/time';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/ThemeProvider';

const TARGETS = [33, 34, 99, 100, 1000];

export default function DhikrScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { counter, active, tap, undo, reset, select, setTarget, custom } = useCounter();
  const haptics = useSettings((s) => s.haptics);
  const setSetting = useSettings((s) => s.set);
  const tz = useSettings((s) => s.location?.timezone) ?? deviceTimeZone();
  const today = zonedLocalDate(new Date(), tz);
  const todayKey = localDateKey(today);
  const weekStart = localDateKey(addDaysToLocalDate(today, -6));
  const todayTotals = useDhikrTotals(todayKey, todayKey);
  const weekTotals = useDhikrTotals(weekStart, todayKey);
  const sum = (rows?: { total: number }[]) => rows?.reduce((a, r) => a + r.total, 0) ?? 0;
  const label = (id: string) => findPreset(id)?.transliteration ?? custom.data?.find((c) => c.id === id)?.title ?? id;

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <AppText variant="title" accessibilityRole="header">
          {t('dhikr.title')}
        </AppText>
        <IconButton icon="expand-outline" label={t('dhikr.fullScreen')} onPress={() => router.push('/dhikr/focus')} color={theme.colors.primary} />
      </View>

      <Card>
        <CounterView counter={counter} active={active} onTap={tap} />
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
          <Button style={{ flex: 1 }} variant="secondary" icon="arrow-undo" title={t('dhikr.undo')} onPress={undo} disabled={!counter.undoStack.length} />
          <Button style={{ flex: 1 }} variant="ghost" icon="refresh" title={t('common.reset')} onPress={reset} disabled={!counter.count} />
        </View>
      </Card>

      {active.reference ? (
        <Notice icon="book-outline">
          <AppText variant="caption">
            {t('dhikr.reference')}: {active.reference}
            {active.reviewed ? '' : ` · ${t('dhikr.pendingReview')}`}
          </AppText>
        </Notice>
      ) : null}

      <SectionHeader title={t('dhikr.target')} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Chip label={t('dhikr.noTarget')} selected={counter.target == null} onPress={() => setTarget(null)} />
        {TARGETS.map((n) => (
          <Chip key={n} label={String(n)} selected={counter.target === n} onPress={() => setTarget(n)} />
        ))}
      </ScrollView>

      <SectionHeader title={t('dhikr.presets')} action={t('dhikr.addCustom')} onAction={() => router.push('/dhikr/custom')} />
      <View style={{ gap: 8 }}>
        {DHIKR_PRESETS.map((p) => (
          <Card key={p.id} onPress={() => select(p.id, p.defaultTarget)} accessibilityLabel={p.transliteration} style={{ paddingVertical: 12, borderColor: counter.dhikrId === p.id ? theme.colors.primary : theme.colors.border, borderWidth: counter.dhikrId === p.id ? 1.5 : 0.5 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyStrong">{p.transliteration}</AppText>
                <AppText variant="caption" tone="muted">
                  {p.translation}
                </AppText>
              </View>
              <AppText style={{ fontFamily: 'AmiriQuran_400Regular', fontSize: 20, lineHeight: 34, color: theme.colors.primary }}>{p.arabic}</AppText>
            </View>
          </Card>
        ))}
        {custom.data?.map((c) => (
          <Card key={c.id} onPress={() => select(c.id, c.target)} style={{ paddingVertical: 12, borderColor: counter.dhikrId === c.id ? theme.colors.primary : theme.colors.border, borderWidth: counter.dhikrId === c.id ? 1.5 : 0.5 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyStrong">{c.title}</AppText>
                {c.notes ? <AppText variant="caption" tone="muted">{c.notes}</AppText> : null}
              </View>
              {c.arabic ? <AppText style={{ fontFamily: 'AmiriQuran_400Regular', fontSize: 20, lineHeight: 34, color: theme.colors.primary }}>{c.arabic}</AppText> : null}
              <IconButton icon="create-outline" label={t('common.change')} onPress={() => router.push(`/dhikr/custom?id=${c.id}`)} color={theme.colors.textMuted} size={18} />
            </View>
          </Card>
        ))}
      </View>

      <SectionHeader title={t('dhikr.history')} />
      <Card>
        <View style={{ flexDirection: 'row' }}>
          <View style={{ flex: 1 }}>
            <AppText variant="overline" tone="muted">{t('dhikr.today')}</AppText>
            <AppText variant="title">{sum(todayTotals.data)}</AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="overline" tone="muted">{t('dhikr.thisWeek')}</AppText>
            <AppText variant="title">{sum(weekTotals.data)}</AppText>
          </View>
        </View>
        {weekTotals.data?.slice(0, 5).map((r) => (
          <View key={r.dhikr_id} style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
            <AppText variant="caption">{label(r.dhikr_id)}</AppText>
            <AppText variant="caption" tone="muted">
              {r.total} · {t('dhikr.sessions', { count: r.sessions })}
            </AppText>
          </View>
        ))}
      </Card>

      <Card style={{ paddingVertical: 4 }}>
        <ToggleRow title={t('dhikr.haptics')} icon="phone-portrait-outline" value={haptics} onValueChange={(v) => setSetting('haptics', v)} />
      </Card>
    </Screen>
  );
}
