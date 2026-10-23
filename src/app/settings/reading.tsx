import { router, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText, ArabicText, Card, Divider, ListRow, Screen, SectionHeader, Segmented, Stepper, ToggleRow } from '@/components/ui';
import { CONTENT_MANIFEST } from '@/content/generated/contentManifest';
import { useAyah, useEditions } from '@/data/queries';
import { useSettings } from '@/store/settings';

export default function ReadingSettings() {
  const { t } = useTranslation();
  const reading = useSettings((s) => s.reading);
  const update = useSettings((s) => s.update);
  const editions = useEditions();
  // Preview uses Al-Fatiha 1:1 straight from the verified content database.
  const preview = useAyah(1, reading.translationIds.slice(0, 1));

  const toggleEdition = (id: string, on: boolean) => {
    const next = on ? [...reading.translationIds, id] : reading.translationIds.filter((x) => x !== id);
    update('reading', { translationIds: next });
  };

  const row = (label: string, control: React.ReactNode) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 52 }}>
      <AppText style={{ flex: 1 }}>{label}</AppText>
      {control}
    </View>
  );

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: t('quran.readingSettings') }} />
      <Card style={{ gap: 8 }}>
        {preview.data ? <ArabicText accessibilityLanguage="ar">{preview.data.text}</ArabicText> : null}
        {reading.showTranslation && preview.data?.translations[0] ? (
          <AppText style={{ fontSize: reading.translationSize, lineHeight: Math.round(reading.translationSize * 1.55) }} tone="muted">
            {preview.data.translations[0].text}
          </AppText>
        ) : null}
      </Card>

      <Card style={{ gap: 6 }}>
        <AppText variant="label" tone="muted">{t('quran.arabicFont')}</AppText>
        <Segmented
          value={reading.arabicFont}
          onChange={(v) => update('reading', { arabicFont: v })}
          options={[
            { value: 'amiri', label: 'Amiri Quran' },
            { value: 'scheherazade', label: 'Scheherazade' },
          ]}
        />
        {row(t('quran.arabicSize'), <Stepper value={reading.arabicSize} min={20} max={48} step={2} onChange={(v) => update('reading', { arabicSize: v })} />)}
        <Divider />
        {row(t('quran.translationSize'), <Stepper value={reading.translationSize} min={12} max={26} onChange={(v) => update('reading', { translationSize: v })} />)}
        <Divider />
        {row(t('quran.lineSpacing'), <Stepper value={reading.lineHeight} min={1.5} max={2.6} step={0.1} format={(v) => v.toFixed(1)} onChange={(v) => update('reading', { lineHeight: v })} />)}
        <Divider />
        <Segmented
          value={reading.layout}
          onChange={(v) => update('reading', { layout: v })}
          options={[
            { value: 'comfortable', label: t('quran.layoutComfortable') },
            { value: 'compact', label: t('quran.layoutCompact') },
          ]}
        />
        {row(t('home.readingGoal'), <Stepper value={reading.dailyGoalAyahs} min={1} max={300} step={5} onChange={(v) => update('reading', { dailyGoalAyahs: Math.max(1, v) })} />)}
      </Card>

      <SectionHeader title={t('quran.translations')} />
      <Card style={{ paddingVertical: 4 }}>
        <ToggleRow title={t('quran.showTranslation')} value={reading.showTranslation} onValueChange={(v) => update('reading', { showTranslation: v })} />
        {editions.data?.map((e) => (
          <View key={e.id}>
            <Divider />
            <ToggleRow
              title={`${e.name} (${e.language.toUpperCase()})`}
              subtitle={`${e.translator} · ${e.source}`}
              value={reading.translationIds.includes(e.id)}
              onValueChange={(v) => toggleEdition(e.id, v)}
            />
          </View>
        ))}
      </Card>
      <AppText variant="caption" tone="muted">
        {t('quran.dataSource', { source: `${CONTENT_MANIFEST.quran.name} ${CONTENT_MANIFEST.quran.version} — tanzil.net` })}
      </AppText>
      <Card style={{ paddingVertical: 4 }}>
        <ListRow title={t('more.sources')} icon="library-outline" onPress={() => router.push('/sources')} />
      </Card>
    </Screen>
  );
}
