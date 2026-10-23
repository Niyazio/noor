import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, TextInput, View } from 'react-native';

import { AppText, ArabicText, Chip, EmptyState, Icon } from '@/components/ui';
import { SURAHS } from '@/content/generated/surahs';
import { keys, useSearchHistory } from '@/data/queries';
import { getContentDb, getUserDb } from '@/db';
import { parseAyahReference, searchAyahs, searchSurahs, type SearchHit } from '@/features/quran/repository';
import { addSearchHistory, clearSearchHistory } from '@/features/userdata/repository';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/ThemeProvider';

const LIMIT = 100;
type Scope = 'all' | 'arabic' | 'translation';

export default function SearchScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const qc = useQueryClient();
  const editions = useSettings((s) => s.reading.translationIds);
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<Scope>('all');
  const history = useSearchHistory();

  useEffect(() => {
    const id = setTimeout(() => setQuery(text.trim()), 250);
    return () => clearTimeout(id);
  }, [text]);

  const ref = useMemo(() => parseAyahReference(query), [query]);
  const surahs = useMemo(() => (query && !ref ? searchSurahs(query).slice(0, 5) : []), [query, ref]);
  const results = useQuery({
    queryKey: ['search', query, scope, editions.join(',')],
    queryFn: () => searchAyahs(getContentDb(), query, { scope, editionIds: editions }, LIMIT),
    enabled: query.length >= 2 && !ref,
    staleTime: 60_000,
  });

  const remember = () => {
    if (query.length >= 2) addSearchHistory(getUserDb(), query).then(() => qc.invalidateQueries({ queryKey: keys.searchHistory }));
  };
  const open = (surah: number, ayah: number) => {
    remember();
    router.push(`/quran/${surah}?ayah=${ayah}`);
  };

  const hits = results.data ?? [];
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ title: t('common.search') }} />
      <View style={{ padding: 16, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, minHeight: 48, borderRadius: 24, backgroundColor: theme.colors.surface, borderWidth: 0.5, borderColor: theme.colors.border }}>
          <Icon name="search" size={18} color={theme.colors.textMuted} />
          <TextInput
            value={text}
            onChangeText={setText}
            onSubmitEditing={remember}
            placeholder={t('quran.searchPlaceholder')}
            placeholderTextColor={theme.colors.textMuted}
            autoFocus
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel={t('common.search')}
            style={{ flex: 1, color: theme.colors.text, fontFamily: theme.fonts.ui, fontSize: 16, paddingVertical: 10 }}
          />
          {text ? (
            <Pressable onPress={() => setText('')} accessibilityLabel={t('common.cancel')} hitSlop={10}>
              <Icon name="close-circle" size={18} color={theme.colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['all', 'arabic', 'translation'] as const).map((s) => (
            <Chip key={s} label={s === 'all' ? t('common.all') : s === 'arabic' ? t('quran.inArabic') : t('quran.inTranslation')} selected={scope === s} onPress={() => setScope(s)} />
          ))}
        </View>
      </View>

      <FlatList
        data={hits}
        keyExtractor={(h) => `${h.ayahId}-${h.match}`}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        ListHeaderComponent={
          <View style={{ gap: 8 }}>
            {ref ? (
              <ResultRow icon="arrow-forward-circle" title={t('quran.goTo', { ref: `${ref.surah}:${ref.ayah}` })} subtitle={SURAHS[ref.surah - 1].nameTranslit} onPress={() => open(ref.surah, ref.ayah)} />
            ) : null}
            {surahs.map((s) => (
              <ResultRow key={s.id} icon="book-outline" title={`${s.id}. ${s.nameTranslit}`} subtitle={s.nameEn} arabic={s.nameAr} onPress={() => open(s.id, 1)} />
            ))}
            {!query && history.data?.length ? (
              <View style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <AppText variant="overline" tone="muted">
                    {t('quran.history')}
                  </AppText>
                  <Pressable onPress={() => clearSearchHistory(getUserDb()).then(() => qc.invalidateQueries({ queryKey: keys.searchHistory }))} accessibilityRole="button">
                    <AppText variant="label" tone="primary">
                      {t('common.clear')}
                    </AppText>
                  </Pressable>
                </View>
                {history.data.map((h) => (
                  <ResultRow key={h} icon="time-outline" title={h} onPress={() => setText(h)} />
                ))}
              </View>
            ) : null}
            {query.length >= 2 && !ref && results.data ? (
              <AppText variant="caption" tone="muted" style={{ marginTop: 8 }}>
                {hits.length >= LIMIT ? t('quran.resultsLimited', { count: LIMIT }) : t('quran.resultsCount', { count: hits.length })}
              </AppText>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          query.length >= 2 && !ref && results.data && !surahs.length ? (
            <EmptyState icon="search-outline" title={t('quran.noResults', { query })} body={t('quran.noResultsHint')} />
          ) : undefined
        }
        renderItem={({ item }) => <HitRow hit={item} onPress={() => open(item.surah, item.ayah)} />}
      />
    </View>
  );
}

function ResultRow({ icon, title, subtitle, arabic, onPress }: { icon: React.ComponentProps<typeof Icon>['name']; title: string; subtitle?: string; arabic?: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, opacity: pressed ? 0.6 : 1 })}>
      <Icon name={icon} size={20} color={theme.colors.primary} />
      <View style={{ flex: 1 }}>
        <AppText variant="bodyStrong">{title}</AppText>
        {subtitle ? <AppText variant="caption" tone="muted">{subtitle}</AppText> : null}
      </View>
      {arabic ? <ArabicText size={20}>{arabic}</ArabicText> : null}
    </Pressable>
  );
}

function HitRow({ hit, onPress }: { hit: SearchHit; onPress: () => void }) {
  const theme = useTheme();
  const s = SURAHS[hit.surah - 1];
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => ({ paddingVertical: 12, gap: 6, borderBottomWidth: 0.5, borderBottomColor: theme.colors.border, opacity: pressed ? 0.6 : 1 })}>
      <AppText variant="label" tone="primary">
        {s.nameTranslit} {hit.surah}:{hit.ayah}
      </AppText>
      <ArabicText size={22} numberOfLines={3}>
        {hit.text}
      </ArabicText>
      {hit.match === 'translation' ? (
        <AppText variant="caption" tone="muted" numberOfLines={3}>
          {hit.snippet}
        </AppText>
      ) : null}
    </Pressable>
  );
}
