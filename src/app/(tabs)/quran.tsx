import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, ArabicText, EmptyState, Icon, Segmented, Skeleton } from '@/components/ui';
import { JUZ_STARTS, SURAHS } from '@/content/generated/surahs';
import type { SurahInfo } from '@/content/types';
import { useBookmarks, useKhatmProgress, useLastRead, useReadingHistory } from '@/data/queries';
import { useTheme } from '@/theme/ThemeProvider';

type Tab = 'surahs' | 'juz' | 'bookmarks';

export default function QuranScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tab?: Tab }>();
  const [tab, setTab] = useState<Tab>(params.tab ?? 'surahs');
  const [lastParam, setLastParam] = useState(params.tab);
  if (params.tab !== lastParam) {
    // Navigating here with a new ?tab= selects it (state adjusted during render, not in an effect).
    setLastParam(params.tab);
    if (params.tab) setTab(params.tab);
  }

  const header = (
    <View style={{ gap: 14, paddingBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <AppText variant="title" accessibilityRole="header">
          {t('quran.title')}
        </AppText>
        <Pressable onPress={() => router.push('/settings/reading')} accessibilityRole="button" accessibilityLabel={t('quran.readingSettings')} hitSlop={10}>
          <Icon name="text-outline" color={theme.colors.primary} />
        </Pressable>
      </View>
      <Pressable
        onPress={() => router.push('/quran/search')}
        accessibilityRole="search"
        accessibilityLabel={t('quran.searchPlaceholder')}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 46, paddingHorizontal: 14, borderRadius: theme.radius.pill, backgroundColor: theme.colors.surface, borderWidth: 0.5, borderColor: theme.colors.border }}
      >
        <Icon name="search" size={18} color={theme.colors.textMuted} />
        <AppText tone="muted" numberOfLines={1} style={{ flex: 1 }}>
          {t('quran.searchPlaceholder')}
        </AppText>
      </Pressable>
      <LastReadBanner />
      <Segmented<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: 'surahs', label: t('quran.surahs') },
          { value: 'juz', label: t('quran.juz') },
          { value: 'bookmarks', label: t('quran.bookmarks') },
        ]}
      />
    </View>
  );

  const listProps = {
    contentContainerStyle: { paddingHorizontal: 16, paddingTop: insets.top + 8, paddingBottom: 32 },
    style: { flex: 1, backgroundColor: theme.colors.background },
    ListHeaderComponent: header,
  };

  if (tab === 'surahs') {
    return (
      <FlatList
        {...listProps}
        data={SURAHS as SurahInfo[]}
        keyExtractor={(s) => String(s.id)}
        renderItem={({ item }) => <SurahRow surah={item} />}
        initialNumToRender={16}
        windowSize={11}
        getItemLayout={(_, index) => ({ length: 68, offset: 68 * index, index })}
      />
    );
  }
  if (tab === 'juz') {
    return (
      <FlatList
        {...listProps}
        data={JUZ_STARTS as (typeof JUZ_STARTS)[number][]}
        keyExtractor={(j) => String(j.juz)}
        renderItem={({ item }) => {
          const s = SURAHS[item.surah - 1];
          return (
            <ListItem
              badge={String(item.juz)}
              title={t('quran.juzN', { n: item.juz })}
              subtitle={`${s.nameTranslit} ${item.surah}:${item.ayah}`}
              onPress={() => router.push(`/quran/${item.surah}?ayah=${item.ayah}`)}
            />
          );
        }}
      />
    );
  }
  return <BookmarksTab listProps={listProps} />;
}

function SurahRow({ surah }: { surah: SurahInfo }) {
  const { t } = useTranslation();
  return (
    <ListItem
      badge={String(surah.id)}
      title={surah.nameTranslit}
      subtitle={`${surah.nameEn} · ${t(surah.revelation === 'meccan' ? 'quran.meccan' : 'quran.medinan')} · ${t('quran.ayahs', { count: surah.ayahCount })}`}
      arabic={surah.nameAr}
      onPress={() => router.push(`/quran/${surah.id}`)}
    />
  );
}

function ListItem({ badge, title, subtitle, arabic, onPress }: { badge: string; title: string; subtitle: string; arabic?: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${badge}. ${title}. ${subtitle}`}
      style={({ pressed }) => ({ height: 68, flexDirection: 'row', alignItems: 'center', gap: 14, opacity: pressed ? 0.6 : 1 })}
    >
      <View style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '45deg' }], borderRadius: 10, borderWidth: 1.5, borderColor: theme.colors.gold }}>
        <AppText variant="label" style={{ transform: [{ rotate: '-45deg' }] }}>
          {badge}
        </AppText>
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {title}
        </AppText>
        <AppText variant="caption" tone="muted" numberOfLines={1}>
          {subtitle}
        </AppText>
      </View>
      {arabic ? (
        <ArabicText size={22} tone="default" style={{ color: theme.colors.primary, lineHeight: 34 }}>
          {arabic}
        </ArabicText>
      ) : null}
    </Pressable>
  );
}

function LastReadBanner() {
  const { t } = useTranslation();
  const theme = useTheme();
  const last = useLastRead();
  const khatm = useKhatmProgress();
  if (!last.data) return null;
  const s = SURAHS[last.data.surah - 1];
  const percent = Math.floor(((khatm.data ?? 0) / 6236) * 1000) / 10;
  return (
    <Pressable
      onPress={() => router.push(`/quran/${last.data!.surah}?ayah=${last.data!.ayah}`)}
      accessibilityRole="button"
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: theme.radius.lg, backgroundColor: theme.colors.primarySoft }}
    >
      <Icon name="bookmark" size={20} color={theme.colors.primary} />
      <View style={{ flex: 1 }}>
        <AppText variant="label" tone="primary">
          {t('quran.lastRead')}: {s.nameTranslit} {last.data.surah}:{last.data.ayah}
        </AppText>
        <AppText variant="caption" tone="muted">
          {t('quran.khatmProgress', { percent })}
        </AppText>
      </View>
      <Icon name="arrow-forward" size={18} color={theme.colors.primary} />
    </Pressable>
  );
}

function BookmarksTab({ listProps }: { listProps: object }) {
  const { t } = useTranslation();
  const bookmarks = useBookmarks();
  const history = useReadingHistory();
  if (bookmarks.isLoading) {
    return (
      <FlatList {...listProps} data={[1, 2, 3]} keyExtractor={String} renderItem={() => <View style={{ paddingVertical: 10 }}><Skeleton height={48} /></View>} />
    );
  }
  const items = bookmarks.data ?? [];
  return (
    <FlatList
      {...listProps}
      data={items}
      keyExtractor={(b) => String(b.id)}
      ListEmptyComponent={<EmptyState icon="bookmark-outline" title={t('quran.noBookmarks')} body={t('quran.noBookmarksHint')} />}
      renderItem={({ item }) => {
        const s = SURAHS[item.surah - 1];
        return (
          <ListItem
            badge={String(item.surah)}
            title={`${s.nameTranslit} ${item.surah}:${item.ayah}`}
            subtitle={item.collection}
            onPress={() => router.push(`/quran/${item.surah}?ayah=${item.ayah}`)}
          />
        );
      }}
      ListFooterComponent={
        history.data && history.data.length ? (
          <View style={{ marginTop: 20 }}>
            <AppText variant="overline" tone="muted">
              {t('quran.history')}
            </AppText>
            {history.data.slice(0, 10).map((h) => {
              const s = SURAHS[h.surah - 1];
              return (
                <ListItem
                  key={`${h.ayahId}-${h.readAt}`}
                  badge={String(h.surah)}
                  title={`${s.nameTranslit} ${h.surah}:${h.ayah}`}
                  subtitle={new Date(h.readAt).toLocaleString()}
                  onPress={() => router.push(`/quran/${h.surah}?ayah=${h.ayah}`)}
                />
              );
            })}
          </View>
        ) : undefined
      }
    />
  );
}
