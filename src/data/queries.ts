import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getContentDb, getUserDb } from '@/db';
import * as quran from '@/features/quran/repository';
import * as user from '@/features/userdata/repository';
import * as dhikr from '@/features/dhikr/repository';
import type { ObligatoryPrayer } from '@/features/prayer/types';

export const queryClient = new QueryClient({
  defaultOptions: {
    // Everything here is local SQLite: no retries, no refetch-on-focus storms.
    queries: { retry: false, staleTime: Infinity, refetchOnWindowFocus: false, networkMode: 'always' },
    mutations: { networkMode: 'always' },
  },
});

export const keys = {
  surah: (surah: number, editions: string[]) => ['surah', surah, editions.join(',')] as const,
  ayah: (id: number, editions: string[]) => ['ayah', id, editions.join(',')] as const,
  editions: ['editions'] as const,
  contentMeta: ['contentMeta'] as const,
  bismillah: (surah: number) => ['bismillah', surah] as const,
  bookmarks: ['bookmarks'] as const,
  surahMarks: (surah: number) => ['surahMarks', surah] as const,
  note: (ayahId: number) => ['note', ayahId] as const,
  lastRead: ['lastRead'] as const,
  history: ['history'] as const,
  readToday: (dateKey: string) => ['readToday', dateKey] as const,
  khatm: ['khatm'] as const,
  prayerLog: (dateKey: string) => ['prayerLog', dateKey] as const,
  customDhikr: ['customDhikr'] as const,
  dhikrTotals: (from: string, to: string) => ['dhikrTotals', from, to] as const,
  searchHistory: ['searchHistory'] as const,
};

export function useSurahAyahs(surah: number, editions: string[]) {
  return useQuery({ queryKey: keys.surah(surah, editions), queryFn: () => quran.getSurahAyahs(getContentDb(), surah, editions) });
}

export function useAyah(id: number | null, editions: string[]) {
  return useQuery({
    queryKey: keys.ayah(id ?? 0, editions),
    queryFn: () => quran.getAyahById(getContentDb(), id!, editions),
    enabled: id != null,
  });
}

export function useBismillah(surah: number) {
  return useQuery({ queryKey: keys.bismillah(surah), queryFn: () => quran.getSurahBismillah(getContentDb(), surah) });
}

export function useEditions() {
  return useQuery({ queryKey: keys.editions, queryFn: () => quran.getTranslationEditions(getContentDb()) });
}

export function useContentMeta() {
  return useQuery({ queryKey: keys.contentMeta, queryFn: () => quran.getContentMeta(getContentDb()) });
}

export function useBookmarks() {
  return useQuery({ queryKey: keys.bookmarks, queryFn: () => user.listBookmarks(getUserDb()) });
}

export function useSurahMarks(surah: number) {
  return useQuery({
    queryKey: keys.surahMarks(surah),
    queryFn: async () => ({
      bookmarks: await user.bookmarkedAyahIds(getUserDb(), surah),
      notes: await user.noteAyahIds(getUserDb(), surah),
    }),
  });
}

export function useNote(ayahId: number | null) {
  return useQuery({ queryKey: keys.note(ayahId ?? 0), queryFn: () => user.getNote(getUserDb(), ayahId!), enabled: ayahId != null });
}

export function useLastRead() {
  return useQuery({ queryKey: keys.lastRead, queryFn: () => user.getLastRead(getUserDb()) });
}

export function useReadingHistory() {
  return useQuery({ queryKey: keys.history, queryFn: () => user.getReadingHistory(getUserDb()) });
}

export function useReadToday(dateKey: string) {
  return useQuery({ queryKey: keys.readToday(dateKey), queryFn: () => user.ayahsReadOn(getUserDb(), dateKey) });
}

export function useKhatmProgress() {
  return useQuery({ queryKey: keys.khatm, queryFn: () => user.distinctAyahsRead(getUserDb()) });
}

export function usePrayerLog(dateKey: string | null) {
  return useQuery({
    queryKey: keys.prayerLog(dateKey ?? ''),
    queryFn: () => user.getPrayerLog(getUserDb(), dateKey!),
    enabled: !!dateKey,
  });
}

export function useSetPrayerStatus(dateKey: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ prayer, status }: { prayer: ObligatoryPrayer; status: 'prayed' | 'missed' | null }) =>
      user.setPrayerStatus(getUserDb(), dateKey, prayer, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.prayerLog(dateKey) }),
  });
}

export function useToggleBookmark(surah: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ayahId, ayah, bookmarked }: { ayahId: number; ayah: number; bookmarked: boolean }) => {
      if (bookmarked) await user.removeBookmark(getUserDb(), ayahId);
      else await user.addBookmark(getUserDb(), { ayahId, surah, ayah });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.surahMarks(surah) });
      qc.invalidateQueries({ queryKey: keys.bookmarks });
    },
  });
}

export function useSaveNote(surah: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ayahId, ayah, body }: { ayahId: number; ayah: number; body: string }) =>
      user.saveNote(getUserDb(), { ayahId, surah, ayah }, body),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: keys.note(v.ayahId) });
      qc.invalidateQueries({ queryKey: keys.surahMarks(surah) });
    },
  });
}

export function useCustomDhikr() {
  return useQuery({ queryKey: keys.customDhikr, queryFn: () => dhikr.listCustomDhikr(getUserDb()) });
}

export function useDhikrTotals(from: string, to: string) {
  return useQuery({ queryKey: keys.dhikrTotals(from, to), queryFn: () => dhikr.dhikrTotals(getUserDb(), from, to) });
}

export function useSearchHistory() {
  return useQuery({ queryKey: keys.searchHistory, queryFn: () => user.getSearchHistory(getUserDb()) });
}

/** Invalidate everything derived from reading progress. */
export function invalidateReading(qc: QueryClient) {
  for (const k of [keys.lastRead, keys.history, keys.khatm, ['readToday']]) qc.invalidateQueries({ queryKey: k });
}
