import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Button, EmptyState, IconButton, Skeleton } from '@/components/ui';
import { SURAHS } from '@/content/generated/surahs';
import { useAyahPage } from '@/data/queries';
import { MiniPlayer } from '@/features/audio/MiniPlayer';
import { AyahActions, type AyahRef } from '@/features/quran/reader/AyahActions';
import { MushafView, type PageInfo } from '@/features/quran/reader/MushafView';
import { TranslationView } from '@/features/quran/reader/TranslationView';
import { useReadingTheme } from '@/features/quran/reader/useReadingTheme';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/ThemeProvider';
import { READING_THEMES, type ReadingTheme, type ReadingThemeId } from '@/theme/themes';

export default function ReaderScreen() {
  const params = useLocalSearchParams<{ surah: string; ayah?: string }>();
  const surah = Number(params.surah);
  const valid = Number.isInteger(surah) && surah >= 1 && surah <= 114;
  if (!valid) return <InvalidSurah />;
  const ayah = Math.min(Math.max(1, Number(params.ayah) || 1), SURAHS[surah - 1].ayahCount);
  return <Reader key={`${surah}-${ayah}`} surah={surah} initialAyah={ayah} />;
}

function InvalidSurah() {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <View style={{ flex: 1, justifyContent: 'center', backgroundColor: theme.colors.background }}>
      <EmptyState icon="alert-circle-outline" title={t('common.error')} action={<Button title={t('common.back')} onPress={() => router.back()} />} />
    </View>
  );
}

function Reader({ surah, initialAyah }: { surah: number; initialAyah: number }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const rt = useReadingTheme();
  const mode = useSettings((s) => s.reading.mode);
  const themeId = useSettings((s) => s.reading.theme);
  const update = useSettings((s) => s.update);
  const startPage = useAyahPage(surah, initialAyah);
  const [selected, setSelected] = useState<AyahRef | null>(null);
  const [where, setWhere] = useState<{ surah: number; ayah: number; juz: number; page: number | null }>({
    surah, ayah: initialAyah, juz: SURAHS[surah - 1].juzStart, page: null,
  });

  const onPageChange = useCallback((p: PageInfo) => setWhere({ surah: p.surah, ayah: p.ayah, juz: p.juz, page: p.page }), []);
  const onVisibleAyah = useCallback((a: { ayah: number; juz: number; page: number }) => setWhere({ surah, ayah: a.ayah, juz: a.juz, page: a.page }), [surah]);

  const cycleTheme = () => {
    const order: ReadingThemeId[] = ['auto', ...READING_THEMES];
    update('reading', { theme: order[(order.indexOf(themeId) + 1) % order.length] });
  };
  const info = SURAHS[where.surah - 1];

  return (
    <View style={{ flex: 1, backgroundColor: rt.canvas }}>
      <StatusBar style={rt.dark ? 'light' : 'dark'} />
      <View style={{ paddingTop: insets.top + 4, paddingHorizontal: 6, paddingBottom: 8, backgroundColor: rt.canvas, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <IconButton icon="chevron-back" label={t('common.back')} onPress={() => router.back()} color={rt.ink} />
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <HeaderChip rt={rt} label={t('quran.juzN', { n: where.juz }).toUpperCase()} />
          {where.page ? <AppText variant="label" style={{ color: rt.ink, minWidth: 30, textAlign: 'center' }}>{where.page}</AppText> : null}
          <HeaderChip rt={rt} label={`${where.surah} ${info.nameTranslit.toUpperCase()}`} flex />
        </View>
        <IconButton
          icon={mode === 'mushaf' ? 'list-outline' : 'book-outline'}
          label={mode === 'mushaf' ? t('quran.modeTranslation') : t('quran.modeMushaf')}
          onPress={() => update('reading', { mode: mode === 'mushaf' ? 'translation' : 'mushaf' })}
          color={rt.ink}
        />
        <IconButton icon="color-palette-outline" label={t('quran.readingTheme')} onPress={cycleTheme} color={rt.ink} />
        <IconButton icon="text-outline" label={t('quran.readingSettings')} onPress={() => router.push('/settings/reading')} color={rt.ink} />
      </View>

      {mode === 'mushaf' ? (
        startPage.data ? (
          <MushafView startPage={startPage.data} rt={rt} onPageChange={onPageChange} onSelect={setSelected} selectedId={selected?.id ?? null} />
        ) : (
          <View style={{ padding: 16, gap: 12 }}>
            <Skeleton height={420} radius={8} />
          </View>
        )
      ) : (
        <TranslationView surah={surah} initialAyah={initialAyah} rt={rt} onVisibleAyah={onVisibleAyah} onSelect={setSelected} />
      )}

      <MiniPlayer rt={rt} startAt={{ surah: where.surah, ayah: where.ayah }} />
      <AyahActions key={selected?.id ?? 'none'} target={selected} onClose={() => setSelected(null)} />
    </View>
  );
}

function HeaderChip({ rt, label, flex }: { rt: ReadingTheme; label: string; flex?: boolean }) {
  return (
    <Pressable
      onPress={() => router.push('/quran')}
      accessibilityRole="button"
      style={{ flexShrink: flex ? 1 : 0, paddingHorizontal: 12, height: 30, borderRadius: 8, borderWidth: 1, borderColor: rt.frame, backgroundColor: rt.chipBg, justifyContent: 'center' }}
    >
      <AppText variant="caption" numberOfLines={1} style={{ color: rt.chipInk, fontWeight: '600' }}>
        {label}
      </AppText>
    </Pressable>
  );
}
