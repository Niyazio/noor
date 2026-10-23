import { useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, Share, TextInput, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, ArabicText, Button, Card, EmptyState, Icon, IconButton, Skeleton, type IconName } from '@/components/ui';
import { CONTENT_MANIFEST } from '@/content/generated/contentManifest';
import { SURAHS } from '@/content/generated/surahs';
import {
  invalidateReading, useBismillah, useEditions, useNote, useSaveNote, useSurahAyahs, useSurahMarks, useToggleBookmark,
} from '@/data/queries';
import { getUserDb } from '@/db';
import { formatAyahForSharing, type Ayah } from '@/features/quran/repository';
import { recordReadingPosition, markAyahsRead } from '@/features/userdata/repository';
import { deviceTimeZone, localDateKey, zonedLocalDate } from '@/lib/time';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/ThemeProvider';

export default function ReaderScreen() {
  const params = useLocalSearchParams<{ surah: string; ayah?: string }>();
  const surahNum = Number(params.surah);
  const valid = Number.isInteger(surahNum) && surahNum >= 1 && surahNum <= 114;
  if (!valid) return <InvalidSurah />;
  return <Reader key={`${surahNum}-${params.ayah ?? ''}`} surah={surahNum} initialAyah={Number(params.ayah) || 1} />;
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
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const info = SURAHS[surah - 1];
  const reading = useSettings((s) => s.reading);
  const location = useSettings((s) => s.location);
  const editionIds = reading.showTranslation ? reading.translationIds : [];
  const ayahs = useSurahAyahs(surah, editionIds);
  const bismillah = useBismillah(surah);
  const marks = useSurahMarks(surah);
  const listRef = useRef<FlatList<Ayah>>(null);
  const [selected, setSelected] = useState<Ayah | null>(null);
  const [visibleAyah, setVisibleAyah] = useState(initialAyah);
  const didInitialScroll = useRef(initialAyah <= 1);

  // ---- reading position: debounce the top visible ayah, then persist.
  const pending = useRef<Ayah | null>(null);
  const seen = useRef(new Set<number>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flush = useCallback(async () => {
    const a = pending.current;
    const ids = [...seen.current];
    seen.current.clear();
    if (!a) return;
    const dateKey = localDateKey(zonedLocalDate(new Date(), location?.timezone ?? deviceTimeZone()));
    try {
      await recordReadingPosition(getUserDb(), { ayahId: a.id, surah: a.surah, ayah: a.ayah }, dateKey);
      await markAyahsRead(getUserDb(), ids, dateKey);
      invalidateReading(qc);
    } catch {
      // A failed history write must never interrupt reading.
    }
  }, [location?.timezone, qc]);

  const flushRef = useRef(flush);
  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    void flushRef.current();
  }, []);

  // Must be referentially stable for FlatList; reads only refs and state setters.
  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: { item: Ayah | null; isViewable: boolean }[] }) => {
    const items = viewableItems.filter((v) => v.isViewable && v.item);
    if (!items.length || !didInitialScroll.current) return;
    for (const v of items) seen.current.add(v.item!.id);
    const top = items[0].item!;
    setVisibleAyah(top.ayah);
    pending.current = top;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flushRef.current(), 1500);
  }, []);

  // ---- initial scroll to a requested ayah.
  useEffect(() => {
    if (didInitialScroll.current || !ayahs.data) return;
    const index = Math.min(initialAyah, ayahs.data.length) - 1;
    const id = setTimeout(() => {
      listRef.current?.scrollToIndex({ index, animated: false, viewPosition: 0 });
      didInitialScroll.current = true;
    }, 50);
    return () => clearTimeout(id);
  }, [ayahs.data, initialAyah]);

  const header = useMemo(
    () => (
      <View style={{ paddingTop: 8, paddingBottom: 12, gap: 14 }}>
        <Card style={{ alignItems: 'center', gap: 4, backgroundColor: theme.colors.primarySoft, borderWidth: 0 }}>
          <ArabicText size={30} style={{ textAlign: 'center', color: theme.colors.primary }}>
            {info.nameAr}
          </ArabicText>
          <AppText variant="heading">{info.nameTranslit}</AppText>
          <AppText variant="caption" tone="muted">
            {info.nameEn} · {t(info.revelation === 'meccan' ? 'quran.meccan' : 'quran.medinan')} · {t('quran.ayahs', { count: info.ayahCount })}
          </AppText>
        </Card>
        {bismillah.data ? (
          <ArabicText size={Math.round(reading.arabicSize * 0.95)} style={{ textAlign: 'center' }} accessibilityLanguage="ar">
            {bismillah.data}
          </ArabicText>
        ) : null}
      </View>
    ),
    [info, bismillah.data, reading.arabicSize, theme, t],
  );

  const footer = (
    <View style={{ flexDirection: 'row', gap: 10, paddingVertical: 24 }}>
      {surah > 1 ? <Button style={{ flex: 1 }} variant="secondary" icon="chevron-back" title={t('quran.prevSurah')} onPress={() => router.replace(`/quran/${surah - 1}`)} /> : null}
      {surah < 114 ? <Button style={{ flex: 1 }} variant="secondary" icon="chevron-forward" title={t('quran.nextSurah')} onPress={() => router.replace(`/quran/${surah + 1}`)} /> : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ paddingTop: insets.top, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 0.5, borderBottomColor: theme.colors.border }}>
        <IconButton icon="chevron-back" label={t('common.back')} onPress={() => router.back()} color={theme.colors.primary} />
        <View style={{ flex: 1, alignItems: 'center', paddingVertical: 8 }}>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {surah}. {info.nameTranslit}
          </AppText>
          <AppText variant="caption" tone="muted">
            {surah}:{visibleAyah} · {ayahs.data ? t('quran.juzN', { n: ayahs.data[Math.max(0, visibleAyah - 1)]?.juz ?? info.juzStart }) : ''}
          </AppText>
        </View>
        <IconButton icon="text-outline" label={t('quran.readingSettings')} onPress={() => router.push('/settings/reading')} color={theme.colors.primary} />
      </View>

      {ayahs.isLoading ? (
        <View style={{ padding: 16, gap: 16 }}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={{ gap: 8 }}>
              <Skeleton height={34} />
              <Skeleton height={14} width="80%" />
            </View>
          ))}
        </View>
      ) : ayahs.error ? (
        <EmptyState icon="alert-circle-outline" title={t('common.error')} body={String(ayahs.error)} />
      ) : (
        <FlatList
          ref={listRef}
          data={ayahs.data}
          keyExtractor={(a) => String(a.id)}
          ListHeaderComponent={header}
          ListFooterComponent={footer}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 16 }}
          renderItem={({ item }) => (
            <AyahItem
              ayah={item}
              bookmarked={marks.data?.bookmarks.has(item.id) ?? false}
              hasNote={marks.data?.notes.has(item.id) ?? false}
              compact={reading.layout === 'compact'}
              translationSize={reading.translationSize}
              onSelect={setSelected}
            />
          )}
          initialNumToRender={Math.max(12, initialAyah + 4)}
          maxToRenderPerBatch={12}
          windowSize={9}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60, minimumViewTime: 400 }}
          onScrollToIndexFailed={(e) => {
            listRef.current?.scrollToOffset({ offset: e.averageItemLength * e.index, animated: false });
            setTimeout(() => listRef.current?.scrollToIndex({ index: e.index, animated: false }), 120);
          }}
        />
      )}

      <AyahActions key={selected?.id ?? 'none'} ayah={selected} surah={surah} bookmarked={selected ? marks.data?.bookmarks.has(selected.id) ?? false : false} onClose={() => setSelected(null)} />
    </View>
  );
}

const AyahItem = memo(function AyahItem({
  ayah, bookmarked, hasNote, compact, translationSize, onSelect,
}: {
  ayah: Ayah; bookmarked: boolean; hasNote: boolean; compact: boolean; translationSize: number; onSelect: (a: Ayah) => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const editions = useEditions();
  return (
    <Pressable
      onLongPress={() => {
        Haptics.selectionAsync().catch(() => undefined);
        onSelect(ayah);
      }}
      onPress={() => onSelect(ayah)}
      delayLongPress={300}
      accessibilityHint={t('quran.shareAyah')}
      style={({ pressed }) => ({
        paddingVertical: compact ? 10 : 18,
        borderBottomWidth: 0.5,
        borderBottomColor: theme.colors.border,
        backgroundColor: pressed ? theme.colors.surfaceAlt : 'transparent',
        gap: compact ? 6 : 12,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ minWidth: 34, height: 26, paddingHorizontal: 6, borderRadius: 13, borderWidth: 1, borderColor: theme.colors.gold, alignItems: 'center', justifyContent: 'center' }}>
          <AppText variant="caption" tone="gold">
            {ayah.surah}:{ayah.ayah}
          </AppText>
        </View>
        {ayah.sajdah ? <Badge icon="arrow-down-circle-outline" label={t('quran.sajdah')} /> : null}
        <View style={{ flex: 1 }} />
        {hasNote ? <Icon name="create-outline" size={16} color={theme.colors.textMuted} /> : null}
        {bookmarked ? <Icon name="bookmark" size={16} color={theme.colors.primary} /> : null}
      </View>
      <ArabicText accessibilityLanguage="ar">{ayah.text}</ArabicText>
      {ayah.translations.map((tr) => {
        const ed = editions.data?.find((e) => e.id === tr.editionId);
        const rtl = ed?.direction === 'rtl';
        return (
          <View key={tr.editionId}>
            <AppText
              style={{ fontSize: translationSize, lineHeight: Math.round(translationSize * 1.55), writingDirection: rtl ? 'rtl' : 'ltr', textAlign: rtl ? 'right' : 'left' }}
              accessibilityLanguage={ed?.language}
            >
              {tr.text}
            </AppText>
            {ayah.translations.length > 1 && ed ? (
              <AppText variant="caption" tone="muted">
                — {ed.translator}
              </AppText>
            ) : null}
          </View>
        );
      })}
    </Pressable>
  );
});

function Badge({ icon, label }: { icon: IconName; label: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, height: 24, borderRadius: 12, backgroundColor: theme.colors.goldSoft }}>
      <Icon name={icon} size={14} color={theme.colors.gold} />
      <AppText variant="caption" tone="gold">
        {label}
      </AppText>
    </View>
  );
}

function AyahActions({ ayah, surah, bookmarked, onClose }: { ayah: Ayah | null; surah: number; bookmarked: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const editions = useEditions();
  const toggle = useToggleBookmark(surah);
  const note = useNote(ayah?.id ?? null);
  const saveNote = useSaveNote(surah);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [copied, setCopied] = useState(false);

  if (!ayah) return null;
  const shareText = () =>
    formatAyahForSharing(ayah, editions.data ?? [], `${CONTENT_MANIFEST.quran.name} ${CONTENT_MANIFEST.quran.version}`);

  const action = (icon: IconName, label: string, onPress: () => void) => (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 52, opacity: pressed ? 0.6 : 1 })}>
      <Icon name={icon} size={22} color={theme.colors.primary} />
      <AppText variant="body">{label}</AppText>
    </Pressable>
  );

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }} onPress={onClose} accessibilityLabel={t('common.close')} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ backgroundColor: theme.colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: insets.bottom + 16, gap: 4 }}>
          <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.border, marginBottom: 8 }} />
          <AppText variant="heading">
            {SURAHS[ayah.surah - 1].nameTranslit} {ayah.surah}:{ayah.ayah}
          </AppText>
          <AppText variant="caption" tone="muted">
            {t('quran.juzN', { n: ayah.juz })} · {t('quran.page', { n: ayah.page })}
          </AppText>
          {editing ? (
            <View style={{ gap: 10, marginTop: 10 }}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder={t('quran.notePlaceholder')}
                placeholderTextColor={theme.colors.textMuted}
                multiline
                autoFocus
                style={{ minHeight: 100, borderRadius: 12, padding: 12, backgroundColor: theme.colors.surfaceAlt, color: theme.colors.text, fontFamily: theme.fonts.ui, fontSize: 15, textAlignVertical: 'top' }}
              />
              <Button
                title={t('common.save')}
                loading={saveNote.isPending}
                onPress={() => saveNote.mutate({ ayahId: ayah.id, ayah: ayah.ayah, body: draft }, { onSuccess: () => setEditing(false) })}
              />
            </View>
          ) : (
            <View style={{ marginTop: 6 }}>
              {note.data ? (
                <View style={{ padding: 12, borderRadius: 12, backgroundColor: theme.colors.goldSoft, marginBottom: 6 }}>
                  <AppText variant="body">{note.data.body}</AppText>
                </View>
              ) : null}
              {action(bookmarked ? 'bookmark' : 'bookmark-outline', bookmarked ? t('quran.removeBookmark') : t('quran.bookmark'), () =>
                toggle.mutate({ ayahId: ayah.id, ayah: ayah.ayah, bookmarked }, { onSuccess: onClose }),
              )}
              {action('create-outline', note.data ? t('quran.editNote') : t('quran.addNote'), () => {
                setDraft(note.data?.body ?? '');
                setEditing(true);
              })}
              {action(copied ? 'checkmark' : 'copy-outline', copied ? t('common.copied') : t('quran.copyAyah'), async () => {
                await Clipboard.setStringAsync(shareText());
                setCopied(true);
              })}
              {action('share-outline', t('quran.shareAyah'), () => {
                Share.share({ message: shareText() }).catch(() => undefined);
              })}
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
