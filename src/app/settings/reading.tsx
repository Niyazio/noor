import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { AppText, ArabicText, Card, Divider, ListRow, Screen, SectionHeader, Segmented, Stepper, ToggleRow } from '@/components/ui';
import { CONTENT_MANIFEST } from '@/content/generated/contentManifest';
import { useAyah, useEditions } from '@/data/queries';
import { ReciterSheet } from '@/features/audio/MiniPlayer';
import { findReciter } from '@/features/audio/reciters';
import { useReadingTheme } from '@/features/quran/reader/useReadingTheme';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/ThemeProvider';
import { READING_THEMES, READING_THEME_DEFS, type ReadingThemeId } from '@/theme/themes';

export default function ReadingSettings() {
  const { t } = useTranslation();
  const reading = useSettings((s) => s.reading);
  const update = useSettings((s) => s.update);
  const editions = useEditions();
  // Preview uses Al-Fatiha 1:1 straight from the verified content database.
  const preview = useAyah(1, reading.translationIds.slice(0, 1));
  const rt = useReadingTheme();
  const theme = useTheme();
  const reciterId = useSettings((s) => s.audio.reciterId);
  const [reciters, setReciters] = useState(false);

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
      <View style={{ gap: 8, padding: 16, borderRadius: 18, backgroundColor: rt.page, borderWidth: 2, borderColor: rt.frame }}>
        {preview.data ? <ArabicText accessibilityLanguage="ar" style={{ color: rt.ink }}>{preview.data.text}</ArabicText> : null}
        {reading.showTranslation && preview.data?.translations[0] ? (
          <AppText style={{ fontSize: reading.translationSize, lineHeight: Math.round(reading.translationSize * 1.55), color: rt.inkMuted }}>
            {preview.data.translations[0].text}
          </AppText>
        ) : null}
      </View>

      <Card style={{ gap: 10 }}>
        <AppText variant="label" tone="muted">{t('quran.readerMode')}</AppText>
        <Segmented
          value={reading.mode}
          onChange={(v) => update('reading', { mode: v })}
          options={[
            { value: 'mushaf', label: t('quran.modeMushaf') },
            { value: 'translation', label: t('quran.modeTranslation') },
          ]}
        />
        <AppText variant="label" tone="muted">{t('quran.readingTheme')}</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {(['auto', ...READING_THEMES] as ReadingThemeId[]).map((id) => {
            const def = id === 'auto' ? null : READING_THEME_DEFS[id];
            const selected = reading.theme === id;
            return (
              <Pressable
                key={id}
                onPress={() => update('reading', { theme: id })}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                style={{ width: 92, alignItems: 'center', gap: 6 }}
              >
                <View
                  style={{
                    width: 84, height: 64, borderRadius: 12, borderWidth: selected ? 3 : 1,
                    borderColor: selected ? theme.colors.primary : theme.colors.border,
                    backgroundColor: def?.page ?? theme.colors.surfaceAlt, alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {def ? (
                    <View style={{ width: 60, height: 40, borderWidth: 2, borderColor: def.frame, borderRadius: 4, alignItems: 'center', justifyContent: 'center' }}>
                      <AppText style={{ fontFamily: 'AmiriQuran_400Regular', fontSize: 16, lineHeight: 28, color: def.ink }}>نور</AppText>
                    </View>
                  ) : (
                    <AppText variant="label" tone="muted">A</AppText>
                  )}
                </View>
                <AppText variant="caption">{t(`quran.themes.${id}`)}</AppText>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card style={{ paddingVertical: 4 }}>
        <ListRow icon="mic-outline" title={t('audio.reciter')} value={findReciter(reciterId).name} onPress={() => setReciters(true)} />
      </Card>
      <ReciterSheet rt={rt} visible={reciters} onClose={() => setReciters(false)} />

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
