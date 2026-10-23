import { useQueryClient } from '@tanstack/react-query';
import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { FlatList, Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';

import { ARABIC_FONT_FAMILY, ArabicText, Icon, Skeleton } from '@/components/ui';
import { useBismillah, useBookmarkedIds, usePageAyahs } from '@/data/queries';
import { getContentDb } from '@/db';
import { useRecitingKey } from '@/features/audio/player';
import { ayahMarker, getAyahPage, getPageAyahs, toArabicDigits, TOTAL_PAGES, type PageAyah } from '@/features/quran/repository';
import { useSettings } from '@/store/settings';
import type { ReadingTheme } from '@/theme/themes';
import type { AyahRef } from './AyahActions';
import { PageFrame, SurahBanner } from './ornaments';
import { useReadingTracker } from './useReadingTracker';

const PAGES = Array.from({ length: TOTAL_PAGES }, (_, i) => i + 1);
// Pages run right-to-left. Native uses an inverted list; React Native Web mirrors inverted
// horizontal lists (breaking index scrolling), so the web build reverses the data instead.
const WEB = Platform.OS === 'web';
const DATA = WEB ? [...PAGES].reverse() : PAGES;
const indexOfPage = (page: number) => (WEB ? TOTAL_PAGES - page : page - 1);

export interface PageInfo {
  page: number;
  juz: number;
  surah: number;
  ayah: number;
}

/**
 * Page-by-page Mushaf (Madani 604-page layout), swiped right-to-left like a printed Quran.
 * Ayah text is rendered exactly as stored; end-of-ayah, quarter (۞) and sajdah (۩) ornaments
 * are display-only.
 */
export function MushafView({
  startPage,
  rt,
  onPageChange,
  onSelect,
  selectedId,
}: {
  startPage: number;
  rt: ReadingTheme;
  onPageChange: (info: PageInfo) => void;
  onSelect: (a: AyahRef) => void;
  selectedId: number | null;
}) {
  const { width } = useWindowDimensions();
  const qc = useQueryClient();
  const listRef = useRef<FlatList<number>>(null);
  const currentPage = useRef(startPage);
  const track = useReadingTracker();
  const recitingKey = useRecitingKey();
  const onPageChangeRef = useRef(onPageChange);
  useEffect(() => {
    onPageChangeRef.current = onPageChange;
  }, [onPageChange]);

  const announce = useCallback(
    async (page: number) => {
      currentPage.current = page;
      const ayahs = await qc.fetchQuery({ queryKey: ['page', page], queryFn: () => getPageAyahs(getContentDb(), page) });
      if (!ayahs.length) return;
      const first = ayahs[0];
      // Like a printed Mushaf header: name the surah that begins on this page, if any.
      const main = ayahs.find((a) => a.ayah === 1) ?? first;
      onPageChangeRef.current({ page, juz: main.juz, surah: main.surah, ayah: main.ayah });
      track(first, ayahs);
    },
    [qc, track],
  );

  useEffect(() => {
    void announce(startPage);
  }, [announce, startPage]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: { item: number | null; isViewable: boolean }[] }) => {
      const v = viewableItems.find((x) => x.isViewable && x.item != null);
      if (v && v.item !== currentPage.current) void announce(v.item!);
    },
    [announce],
  );

  // Follow the recitation onto the next page.
  useEffect(() => {
    if (!recitingKey) return;
    const [s, a] = recitingKey.split(':').map(Number);
    let cancelled = false;
    getAyahPage(getContentDb(), s, a).then((page) => {
      if (!cancelled && page !== currentPage.current) listRef.current?.scrollToIndex({ index: indexOfPage(page), animated: true });
    });
    return () => {
      cancelled = true;
    };
  }, [recitingKey]);

  const goTo = useCallback((page: number) => {
    if (page >= 1 && page <= TOTAL_PAGES) listRef.current?.scrollToIndex({ index: indexOfPage(page), animated: true });
  }, []);

  return (
    <FlatList
      ref={listRef}
      data={DATA}
      horizontal
      inverted={!WEB}
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      keyExtractor={String}
      initialScrollIndex={indexOfPage(startPage)}
      getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
      initialNumToRender={1}
      maxToRenderPerBatch={2}
      windowSize={3}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
      style={{ backgroundColor: rt.canvas }}
      renderItem={({ item }) => (
        <MushafPage page={item} width={width} rt={rt} onSelect={onSelect} selectedId={selectedId} recitingKey={recitingKey} onGoTo={goTo} />
      )}
    />
  );
}

const MushafPage = memo(function MushafPage({
  page, width, rt, onSelect, selectedId, recitingKey, onGoTo,
}: {
  page: number; width: number; rt: ReadingTheme; onSelect: (a: AyahRef) => void; selectedId: number | null; recitingKey: string | null;
  onGoTo: (page: number) => void;
}) {
  const q = usePageAyahs(page);
  const bookmarks = useBookmarkedIds();
  const groups = useMemo(() => {
    const out: { surah: number; ayahs: PageAyah[] }[] = [];
    for (const a of q.data ?? []) {
      const last = out[out.length - 1];
      if (last && last.surah === a.surah) last.ayahs.push(a);
      else out.push({ surah: a.surah, ayahs: [a] });
    }
    return out;
  }, [q.data]);

  return (
    <ScrollView style={{ width }} contentContainerStyle={{ padding: 14, paddingBottom: 120 }}>
      <PageFrame rt={rt}>
        {q.isLoading ? (
          <View style={{ gap: 14 }}>
            {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} height={28} />)}
          </View>
        ) : (
          groups.map((g) => (
            <SurahBlock key={g.surah} group={g} rt={rt} onSelect={onSelect} selectedId={selectedId} recitingKey={recitingKey} bookmarks={bookmarks} />
          ))
        )}
        {/* Page arrows (useful on PCs, where there is no swipe). Arabic books turn to the left. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18, marginTop: 14 }}>
          <PageArrow rt={rt} icon="chevron-back" label="Next page" disabled={page >= TOTAL_PAGES} onPress={() => onGoTo(page + 1)} />
          <Text style={{ color: rt.inkMuted, fontFamily: ARABIC_FONT_FAMILY.amiri, fontSize: 16 }}>{toArabicDigits(page)}</Text>
          <PageArrow rt={rt} icon="chevron-forward" label="Previous page" disabled={page <= 1} onPress={() => onGoTo(page - 1)} />
        </View>
      </PageFrame>
    </ScrollView>
  );
});

function PageArrow({ rt, icon, label, disabled, onPress }: { rt: ReadingTheme; icon: 'chevron-back' | 'chevron-forward'; label: string; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => ({ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: rt.chipBg, opacity: disabled ? 0.3 : pressed ? 0.6 : 1 })}
    >
      <Icon name={icon} size={18} color={rt.chipInk} />
    </Pressable>
  );
}

function SurahBlock({
  group, rt, onSelect, selectedId, recitingKey, bookmarks,
}: {
  group: { surah: number; ayahs: PageAyah[] };
  rt: ReadingTheme;
  onSelect: (a: AyahRef) => void;
  selectedId: number | null;
  recitingKey: string | null;
  bookmarks: Set<number>;
}) {
  const reading = useSettings((s) => s.reading);
  const startsHere = group.ayahs[0].ayah === 1;
  const bismillah = useBismillah(group.surah);
  const fontFamily = ARABIC_FONT_FAMILY[reading.arabicFont];
  const size = reading.arabicSize;
  return (
    <View>
      {startsHere ? <SurahBanner surah={group.surah} rt={rt} /> : null}
      {startsHere && bismillah.data ? (
        <ArabicText size={Math.round(size * 0.92)} style={{ textAlign: 'center', color: rt.ink, marginBottom: 4 }}>
          {bismillah.data}
        </ArabicText>
      ) : null}
      <Text
        style={{
          fontFamily,
          fontSize: size,
          lineHeight: Math.round(size * reading.lineHeight),
          color: rt.ink,
          writingDirection: 'rtl',
          textAlign: 'justify',
        }}
      >
        {group.ayahs.map((a) => {
          const active = recitingKey === `${a.surah}:${a.ayah}`;
          const selected = selectedId === a.id;
          return (
            <Text
              key={a.id}
              onPress={() => onSelect({ id: a.id, surah: a.surah, ayah: a.ayah })}
              suppressHighlighting
              accessibilityLabel={`${a.surah}:${a.ayah}`}
              style={{
                backgroundColor: active || selected ? rt.highlight : undefined,
                textDecorationLine: bookmarks.has(a.id) ? 'underline' : 'none',
                textDecorationColor: rt.ornament,
              }}
            >
              {a.rubStart ? <Text style={{ color: rt.ornament }}>{'۞ '}</Text> : null}
              {a.text}
              <Text style={{ color: rt.ornament }}>{` ${ayahMarker(a.ayah)}`}</Text>
              {a.sajdah ? <Text style={{ color: rt.ornament }}>{' ۩'}</Text> : null}
              {' '}
            </Text>
          );
        })}
      </Text>
    </View>
  );
}
