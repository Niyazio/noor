import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, Share, StyleSheet, View } from 'react-native';

import { AppText, ArabicText, Button, EmptyState, GeometricPattern, Icon, Skeleton, type IconName } from '@/components/ui';
import { CONTENT_MANIFEST } from '@/content/generated/contentManifest';
import { SURAHS } from '@/content/generated/surahs';
import { useBismillah, useEditions, useSurahAyahs, useSurahMarks, useToggleBookmark } from '@/data/queries';
import { useAudio, useRecitingKey } from '@/features/audio/player';
import { formatAyahForSharing, toArabicDigits, type Ayah } from '@/features/quran/repository';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/ThemeProvider';
import type { ReadingTheme } from '@/theme/themes';
import type { AyahRef } from './AyahActions';
import { useReadingTracker } from './useReadingTracker';

/** Verse-by-verse view with translation and per-ayah actions. */
export function TranslationView({
  surah,
  initialAyah,
  rt,
  onVisibleAyah,
  onSelect,
}: {
  surah: number;
  initialAyah: number;
  rt: ReadingTheme;
  onVisibleAyah: (a: { ayah: number; juz: number; page: number }) => void;
  onSelect: (a: AyahRef) => void;
}) {
  const { t } = useTranslation();
  const reading = useSettings((s) => s.reading);
  const editionIds = reading.showTranslation ? reading.translationIds : [];
  const ayahs = useSurahAyahs(surah, editionIds);
  const marks = useSurahMarks(surah);
  const listRef = useRef<FlatList<Ayah>>(null);
  const didInitialScroll = useRef(initialAyah <= 1);
  const track = useReadingTracker();
  const recitingKey = useRecitingKey();
  const onVisibleRef = useRef(onVisibleAyah);
  useEffect(() => {
    onVisibleRef.current = onVisibleAyah;
  }, [onVisibleAyah]);

  useEffect(() => {
    if (didInitialScroll.current || !ayahs.data) return;
    const index = Math.min(initialAyah, ayahs.data.length) - 1;
    const id = setTimeout(() => {
      listRef.current?.scrollToIndex({ index, animated: false, viewPosition: 0 });
      didInitialScroll.current = true;
    }, 50);
    return () => clearTimeout(id);
  }, [ayahs.data, initialAyah]);

  // Keep the recited ayah on screen. Follow continuous playback into the next surah only when the
  // recitation moves on from *this* surah (not when audio is playing elsewhere).
  const prevKey = useRef<string | null>(null);
  useEffect(() => {
    const previous = prevKey.current;
    prevKey.current = recitingKey;
    if (!recitingKey || !ayahs.data) return;
    const [s, a] = recitingKey.split(':').map(Number);
    if (s !== surah) {
      if (previous && Number(previous.split(':')[0]) === surah) router.replace(`/quran/${s}?ayah=${a}`);
      return;
    }
    listRef.current?.scrollToIndex({ index: a - 1, animated: true, viewPosition: 0.2 });
  }, [recitingKey, ayahs.data, surah]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: { item: Ayah | null; isViewable: boolean }[] }) => {
      const items = viewableItems.filter((v) => v.isViewable && v.item).map((v) => v.item!);
      if (!items.length || !didInitialScroll.current) return;
      onVisibleRef.current({ ayah: items[0].ayah, juz: items[0].juz, page: items[0].page });
      track(items[0], items);
    },
    [track],
  );

  if (ayahs.isLoading) {
    return (
      <View style={{ padding: 16, gap: 16, backgroundColor: rt.canvas, flex: 1 }}>
        <Skeleton height={160} radius={22} />
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ gap: 8 }}>
            <Skeleton height={40} radius={14} />
            <Skeleton height={34} />
            <Skeleton height={14} width="80%" />
          </View>
        ))}
      </View>
    );
  }
  if (ayahs.error || !ayahs.data) return <EmptyState icon="alert-circle-outline" title={t('common.error')} body={String(ayahs.error)} />;

  return (
    <FlatList
      ref={listRef}
      data={ayahs.data}
      keyExtractor={(a) => String(a.id)}
      style={{ backgroundColor: rt.canvas }}
      contentContainerStyle={{ padding: 16, paddingBottom: 140, gap: 12 }}
      ListHeaderComponent={<SurahHero surah={surah} rt={rt} />}
      ListFooterComponent={<SurahNav surah={surah} />}
      renderItem={({ item }) => (
        <AyahCard
          ayah={item}
          rt={rt}
          active={recitingKey === `${item.surah}:${item.ayah}`}
          bookmarked={marks.data?.bookmarks.has(item.id) ?? false}
          hasNote={marks.data?.notes.has(item.id) ?? false}
          onSelect={onSelect}
        />
      )}
      initialNumToRender={Math.max(10, initialAyah + 3)}
      maxToRenderPerBatch={10}
      windowSize={9}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={{ itemVisiblePercentThreshold: 50, minimumViewTime: 300 }}
      onScrollToIndexFailed={(e) => {
        listRef.current?.scrollToOffset({ offset: e.averageItemLength * e.index, animated: false });
        setTimeout(() => listRef.current?.scrollToIndex({ index: e.index, animated: false }), 120);
      }}
    />
  );
}

function SurahHero({ surah, rt }: { surah: number; rt: ReadingTheme }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const info = SURAHS[surah - 1];
  const bismillah = useBismillah(surah);
  const playFrom = useAudio((s) => s.playFrom);
  return (
    <View style={{ borderRadius: 24, overflow: 'hidden', marginBottom: 6 }}>
      <LinearGradient colors={rt.dark ? ['#1B3A33', '#0C1620'] : [theme.colors.heroFrom, theme.colors.heroTo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <GeometricPattern color="rgba(255,255,255,0.10)" />
      <View style={{ padding: 22, alignItems: 'center', gap: 4 }}>
        <AppText variant="title" tone="onHero">
          {info.nameTranslit}
        </AppText>
        <AppText tone="onHeroMuted">{info.nameEn}</AppText>
        <View style={{ height: 1, alignSelf: 'stretch', backgroundColor: 'rgba(255,255,255,0.25)', marginVertical: 10 }} />
        <AppText variant="overline" tone="onHeroMuted">
          {t(info.revelation === 'meccan' ? 'quran.meccan' : 'quran.medinan')} · {t('quran.ayahs', { count: info.ayahCount })}
        </AppText>
        {bismillah.data ? (
          <ArabicText size={26} tone="onHero" style={{ textAlign: 'center', marginTop: 10 }}>
            {bismillah.data}
          </ArabicText>
        ) : null}
        <Pressable
          onPress={() => playFrom(surah, 1)}
          accessibilityRole="button"
          style={({ pressed }) => ({ marginTop: 14, flexDirection: 'row', gap: 8, alignItems: 'center', paddingHorizontal: 18, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)', opacity: pressed ? 0.7 : 1 })}
        >
          <Icon name="play" size={16} color="#FFFFFF" />
          <AppText variant="label" tone="onHero">
            {t('audio.playSurah')}
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

const AyahCard = memo(function AyahCard({
  ayah, rt, active, bookmarked, hasNote, onSelect,
}: {
  ayah: Ayah; rt: ReadingTheme; active: boolean; bookmarked: boolean; hasNote: boolean; onSelect: (a: AyahRef) => void;
}) {
  const { t } = useTranslation();
  const reading = useSettings((s) => s.reading);
  const editions = useEditions();
  const toggle = useToggleBookmark(ayah.surah);
  const playFrom = useAudio((s) => s.playFrom);
  const ref = useMemo(() => ({ id: ayah.id, surah: ayah.surah, ayah: ayah.ayah }), [ayah]);
  const share = () =>
    Share.share({ message: formatAyahForSharing(ayah, editions.data ?? [], `${CONTENT_MANIFEST.quran.name} ${CONTENT_MANIFEST.quran.version}`) }).catch(() => undefined);

  const action = (icon: IconName, label: string, onPress: () => void, color = rt.ornament) => (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={8} style={({ pressed }) => ({ padding: 6, opacity: pressed ? 0.5 : 1 })}>
      <Icon name={icon} size={20} color={color} />
    </Pressable>
  );

  return (
    <Pressable
      onLongPress={() => onSelect(ref)}
      delayLongPress={300}
      style={{
        borderRadius: 18,
        padding: 14,
        gap: 12,
        backgroundColor: active ? rt.highlight : rt.page,
        borderWidth: 1,
        borderColor: active ? rt.ornament : rt.frameInner,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: rt.chipBg, borderRadius: 14, paddingHorizontal: 8, paddingVertical: 4 }}>
        <View style={{ minWidth: 30, height: 30, borderRadius: 15, paddingHorizontal: 6, backgroundColor: rt.ornament, alignItems: 'center', justifyContent: 'center' }}>
          <AppText variant="label" style={{ color: rt.page }}>
            {ayah.ayah}
          </AppText>
        </View>
        {ayah.sajdah ? (
          <AppText variant="caption" style={{ color: rt.ornament, marginLeft: 8 }}>
            {t('quran.sajdah')} ۩
          </AppText>
        ) : null}
        <View style={{ flex: 1 }} />
        {hasNote ? action('create', t('quran.editNote'), () => onSelect(ref)) : null}
        {action('share-social-outline', t('quran.shareAyah'), share)}
        {action(active ? 'volume-high' : 'play-outline', t('quran.playFrom'), () => playFrom(ayah.surah, ayah.ayah))}
        {action(bookmarked ? 'bookmark' : 'bookmark-outline', bookmarked ? t('quran.removeBookmark') : t('quran.bookmark'), () =>
          toggle.mutate({ ayahId: ayah.id, ayah: ayah.ayah, bookmarked }),
        )}
        {action('ellipsis-horizontal', t('common.open'), () => onSelect(ref))}
      </View>
      <ArabicText accessibilityLanguage="ar" style={{ color: rt.ink }}>
        {ayah.text}
        <ArabicText size={Math.round(reading.arabicSize * 0.9)} style={{ color: rt.ornament }}>{` ۝${toArabicDigits(ayah.ayah)}`}</ArabicText>
      </ArabicText>
      {ayah.translations.map((tr) => {
        const ed = editions.data?.find((e) => e.id === tr.editionId);
        const rtl = ed?.direction === 'rtl';
        return (
          <View key={tr.editionId}>
            <AppText
              style={{ color: rt.ink, fontSize: reading.translationSize, lineHeight: Math.round(reading.translationSize * 1.55), writingDirection: rtl ? 'rtl' : 'ltr', textAlign: rtl ? 'right' : 'left' }}
              accessibilityLanguage={ed?.language}
            >
              {tr.text}
            </AppText>
            {ayah.translations.length > 1 && ed ? (
              <AppText variant="caption" style={{ color: rt.inkMuted }}>
                — {ed.translator}
              </AppText>
            ) : null}
          </View>
        );
      })}
    </Pressable>
  );
});

function SurahNav({ surah }: { surah: number }) {
  const { t } = useTranslation();
  return (
    <View style={{ flexDirection: 'row', gap: 10, paddingVertical: 16 }}>
      {surah > 1 ? <Button style={{ flex: 1 }} variant="secondary" icon="chevron-back" title={t('quran.prevSurah')} onPress={() => router.replace(`/quran/${surah - 1}`)} /> : null}
      {surah < 114 ? <Button style={{ flex: 1 }} variant="secondary" icon="chevron-forward" title={t('quran.nextSurah')} onPress={() => router.replace(`/quran/${surah + 1}`)} /> : null}
    </View>
  );
}
