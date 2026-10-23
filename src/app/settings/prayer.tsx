import { router, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { AppText, Card, Divider, Icon, ListRow, Notice, Screen, SectionHeader, Segmented, Stepper } from '@/components/ui';
import { CALCULATION_METHODS } from '@/features/prayer/methods';
import { PRAYER_NAMES, type HighLatitudeSetting } from '@/features/prayer/types';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/ThemeProvider';

export default function PrayerSettingsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const prayer = useSettings((s) => s.prayer);
  const location = useSettings((s) => s.location);
  const update = useSettings((s) => s.update);

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: t('prayer.settings') }} />
      <Card style={{ paddingVertical: 4 }}>
        <ListRow icon="location-outline" title={t('location.title')} value={location?.name ?? t('common.notSet')} onPress={() => router.push('/location')} />
      </Card>

      <SectionHeader title={t('prayer.method')} />
      <Card style={{ paddingVertical: 4 }}>
        {CALCULATION_METHODS.map((m, i) => (
          <View key={m.id}>
            {i > 0 ? <Divider /> : null}
            <Pressable
              onPress={() => update('prayer', { method: m.id, confirmed: true })}
              accessibilityRole="radio"
              accessibilityState={{ checked: prayer.method === m.id }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}
            >
              <Icon name={prayer.method === m.id ? 'radio-button-on' : 'radio-button-off'} size={20} color={prayer.method === m.id ? theme.colors.primary : theme.colors.textMuted} />
              <View style={{ flex: 1 }}>
                <AppText variant={prayer.method === m.id ? 'bodyStrong' : 'body'}>{m.label}</AppText>
                <AppText variant="caption" tone="muted">
                  {m.region} · {m.detail}
                </AppText>
              </View>
            </Pressable>
          </View>
        ))}
      </Card>

      <SectionHeader title={t('prayer.asr')} />
      <Segmented
        value={prayer.asr}
        onChange={(v) => update('prayer', { asr: v })}
        options={[
          { value: 'standard', label: t('prayer.asrStandard') },
          { value: 'hanafi', label: t('prayer.asrHanafi') },
        ]}
      />

      <SectionHeader title={t('prayer.highLatitude')} />
      <Card style={{ paddingVertical: 4 }}>
        {(
          [
            ['recommended', t('prayer.highLatitudeRecommended')],
            ['middleofthenight', t('prayer.highLatitudeMiddle')],
            ['seventhofthenight', t('prayer.highLatitudeSeventh')],
            ['twilightangle', t('prayer.highLatitudeTwilight')],
          ] as [HighLatitudeSetting, string][]
        ).map(([value, label], i) => (
          <View key={value}>
            {i > 0 ? <Divider /> : null}
            <ListRow
              title={label}
              onPress={() => update('prayer', { highLatitude: value })}
              right={<Icon name={prayer.highLatitude === value ? 'radio-button-on' : 'radio-button-off'} size={20} color={prayer.highLatitude === value ? theme.colors.primary : theme.colors.textMuted} />}
            />
          </View>
        ))}
      </Card>

      <SectionHeader title={t('prayer.adjustments')} />
      <Notice>{t('prayer.adjustmentsHint')}</Notice>
      <Card style={{ paddingVertical: 4 }}>
        {PRAYER_NAMES.map((p, i) => (
          <View key={p}>
            {i > 0 ? <Divider /> : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 52 }}>
              <AppText style={{ flex: 1 }}>{t(`prayer.names.${p}`)}</AppText>
              <Stepper
                value={prayer.adjustments[p]}
                min={-30}
                max={30}
                format={(v) => (v > 0 ? `+${v}` : String(v))}
                onChange={(v) => update('prayer', { adjustments: { ...prayer.adjustments, [p]: v } })}
              />
            </View>
          </View>
        ))}
      </Card>
    </Screen>
  );
}
